'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import { TerminalPanel } from '@/components/TerminalPanel';
import { useChat } from '@/hooks/useChat';
import { useFiles } from '@/hooks/useFiles';
import { useDevServer } from '@/hooks/useDevServer';
import { useResizablePanel } from '@/hooks/useResizablePanel';
import {
  ChatHeader,
  MessageList,
  ChatInput,
  ViewModeToggle,
  CodePanel,
  PreviewPanel,
  ViewMode,
  AttachedFile,
} from '@/components/workspace';
import { ChatPanel } from '@/components/chat';
import { downloadProjectAsZip } from '@/lib/file-utils';
import logger from '@/lib/logger';

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';
  const initialSessionId = searchParams.get('sessionId') || '';
  const { settings, isLoaded, clearAllFiles } = useProject();
  const hasRestoredFilesRef = useRef(false);
  
  // UI state
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  
  // Custom Hooks
  // 1. Files & Session Management
  const { 
    files, 
    setFiles,
    activeFile, 
    setActiveFile, 
    sessionId, 
    setSessionId, 
    loadAllFiles,
    updateFile,
    deleteFile,
    renameFile,
    createFolder
  } = useFiles(initialSessionId);

  // 2. Chat Management
  const {
    input,
    setInput,
    messages,
    isLoading,
    currentResponse,
    attachedFiles,
    setAttachedFiles,
    sendMessage,
    stop
  } = useChat({
    settings,
    sessionId,
    setSessionId,
    loadAllFiles,
    onFileUpdate: (path, content) => {
        logger.debug('[Workspace] Streamed file update:', path);
        updateFile(path, content);
    },
    files, // Pass current files state
    onFilesLoaded: (loadedFiles) => {
       logger.debug('[Workspace] Restoring files from history');
       setFiles(loadedFiles);
    }
  });

  // 3. Dev Server & Preview Management
  const {
    previewUrl: initialPreviewUrl,
    devServer,
    isStartingServer,
    serverError,
    devServerLogs,
    startDevServer,
    restartDevServer,
    refreshPreview,
    isWebContainerLoading,
    webContainerError,
    projectType
  } = useDevServer(sessionId, files, isLoading);

  // Add local previewUrl state to allow updating previewUrl
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);

  useEffect(() => {
    if (initialPreviewUrl !== previewUrl) {
      setPreviewUrl(initialPreviewUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPreviewUrl]);

  // Add setDevServer state to allow updating devServer info
  const [localDevServer, setDevServer] = useState(devServer);
  useEffect(() => {
    if (devServer !== localDevServer) {
      setDevServer(devServer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devServer]);

  // 4. Resizable Terminal Panel
  const { 
    height: terminalHeight, 
    setHeight: setTerminalHeight,
    isDragging, 
    handleDragStart 
  } = useResizablePanel(320);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup: Stop dev server when component unmounts
  // With WebContainer, the browser manages the lifecycle, so explicit server-side cleanup is less critical for the runtime,
  // but we might still want to clean up the session folder on the backend if needed.
  // For now, we'll remove the explicit DELETE /api/dev-server call since we are using WebContainer.
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // Auto-send initial prompt
  useEffect(() => {
    // Only send if settings are loaded to ensure we have the correct model config auth keys
    if (initialPrompt && messages.length === 0 && !hasInitializedRef.current && isLoaded) {
       // If we have uploaded files from the home page, restore them first
      if (settings.uploadedFiles.length > 0 && !hasRestoredFilesRef.current) {
        hasRestoredFilesRef.current = true;
        const filesToAttach: AttachedFile[] = settings.uploadedFiles.map(f => ({
          id: f.id,
          name: f.name,
          path: f.path,
          content: f.content,
          size: f.size,
          isFolder: f.type === 'folder',
          folderName: f.folderName || (f.type === 'folder' ? f.path.split('/')[0] : undefined)
        }));
        
        logger.debug('[Workspace] Restoring attached files from Home:', filesToAttach);

        // Write files to the code panel so they are visible immediately
        filesToAttach.forEach(file => {
          if (file.content) {
            updateFile(file.path, file.content);
          }
        });

        clearAllFiles();

        // Send message with restored files directly to avoid state timing issues
        hasInitializedRef.current = true;
        logger.debug('[Workspace] Sending initial prompt with restored files:', settings.modelConfig);
        sendMessage(initialPrompt, filesToAttach);
        return;
      }

      hasInitializedRef.current = true;
      logger.debug('[Workspace] Sending initial prompt with loaded settings:', settings.modelConfig);
      sendMessage(initialPrompt);
    }
  }, [initialPrompt, messages.length, sendMessage, isLoaded, settings, setAttachedFiles, clearAllFiles]);

  // 5. Auto-Start is now handled inside useDevServer hook
  // It watches for: webcontainer ready + files available + not loading
  // This covers both new generation (isLoading: true->false) and history restore

  // Handle open in new tab
  const handleOpenInNewTab = () => {
    window.open(previewUrl, '_blank');
  };

  logger.debug('[Workspace Debug]', {
    sessionId,
    filesCount: Object.keys(files).length,
    previewUrl,
    devServer,
    isStartingServer,
    serverError,
  });

  return (
    <div className="flex h-screen bg-white dark:bg-black text-gray-900 dark:text-white relative transition-colors">
      {/* Left: Chat area */}
      <ChatPanel
        header={
          <ChatHeader onDownloadProject={() => downloadProjectAsZip(files)} />
        }
        messageList={
          <MessageList
            messages={messages}
            currentResponse={currentResponse}
            messagesEndRef={messagesEndRef}
            isLoading={isLoading}
          />
        }
        input={
          <ChatInput
            input={input}
            isLoading={isLoading}
            attachedFiles={attachedFiles}
            onInputChange={setInput}
            onSend={() => sendMessage()}
            onStop={stop}
            onFilesAttached={(newFiles) => {
              setAttachedFiles(prev => [...prev, ...newFiles]);
              newFiles.forEach(file => {
                if (!file.isFolder || (file.isFolder && file.content)) { 
                  updateFile(file.path, file.content); 
                }
              });
            }}
            onFileRemoved={(fileId) => setAttachedFiles(prev => prev.filter(f => f.id !== fileId))}
            onFolderRemoved={(folderName) => setAttachedFiles(prev => prev.filter(f => f.folderName !== folderName))}
          />
        }
      />

      {/* Middle & Right: Code editor and Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content area — both panels always mounted, toggled via CSS to avoid iframe reload */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            <div className={`w-full flex overflow-hidden ${viewMode === 'code' ? '' : 'hidden'}`}>
              <CodePanel
                files={files}
                activeFile={activeFile}
                sessionId={sessionId}
                isLoading={isLoading}
                onSelectFile={setActiveFile}
                onCodeChange={(code, filename) => logger.debug('Code changed:', filename)}
                onSaveFile={(path, content) => {
                  logger.debug('[Workspace] Saving file:', path);
                  updateFile(path, content);
                }}
                onCreateFile={(path, content) => {
                  logger.debug('[Workspace] Creating file:', path);
                  updateFile(path, content);
                }}
                onCreateFolder={(path) => {
                  logger.debug('[Workspace] Creating folder:', path);
                  createFolder(path);
                }}
                onDeleteFile={(path) => {
                  logger.debug('[Workspace] Deleting:', path);
                  deleteFile(path);
                }}
                onRenameFile={(oldPath, newPath) => {
                  logger.debug('[Workspace] Renaming:', oldPath, '→', newPath);
                  renameFile(oldPath, newPath);
                }}
              />
            </div>

            <div className={`w-full flex flex-col ${viewMode === 'preview' ? '' : 'hidden'}`}>
              <PreviewPanel
                previewUrl={previewUrl}
                devServer={devServer}
                isStartingServer={isStartingServer}
                serverError={serverError}
                hasFiles={Object.keys(files).length > 0}
                onOpenInNewTab={handleOpenInNewTab}
                projectType={projectType}
                isChatLoading={isLoading}
              />
            </div>
          </div>

          {/* Terminal Panel with Resizable Handle */}
          <div 
            ref={containerRef}
            className="flex flex-col relative shrink-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
            style={{ height: isTerminalOpen ? terminalHeight : '40px', minHeight: isTerminalOpen ? 100 : 40 }}
          >
            {/* Overlay to catch events when dragging over iframes */}
            {isDragging && (
                <div className="fixed inset-0 z-50 bg-transparent cursor-ns-resize" />
            )}
            {/* Drag Handle - serves as both border and resize handle */}
            {isTerminalOpen && (
              <>
                <div
                  onMouseDown={handleDragStart}
                  className={`h-2 flex-shrink-0 cursor-ns-resize transition-colors flex items-center justify-center group ${
                    isDragging ? 'bg-blue-500/20' : 'hover:bg-blue-500/10'
                  }`}
                  title="Drag to resize"
                >
                  <div className={`w-12 h-1 rounded-full transition-colors ${
                    isDragging ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-500 group-hover:bg-blue-400'
                  }`} />
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              </>
            )}
            <TerminalPanel 
              devServerLogs={devServerLogs} 
              sessionId={sessionId}
              isOpen={isTerminalOpen}
              onToggle={() => setIsTerminalOpen(!isTerminalOpen)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
