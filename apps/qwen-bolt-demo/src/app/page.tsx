'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Code2, History, Trash2, MessageSquare, File, Folder, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ModelSelector } from '@/components/ModelSelector';
import { ModelConfigSettings } from '@/components/ModelConfigSettings';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { FileAttachment, AttachedFile } from '@/components/FileAttachment';
import { useProject, UploadedFile } from '@/contexts/ProjectContext';

function AttachedFilesDisplay({ 
  attachedFiles, 
  onFileRemoved, 
  onFolderRemoved 
}: { 
  attachedFiles: AttachedFile[];
  onFileRemoved: (fileId: string) => void;
  onFolderRemoved: (folderName: string) => void;
}) {
  if (attachedFiles.length === 0) return null;

  // Group by folder
  const folderGroups = new Map<string, AttachedFile[]>();
  const standaloneFiles: AttachedFile[] = [];
  
  attachedFiles.forEach(file => {
    if (file.isFolder && file.folderName) {
      if (!folderGroups.has(file.folderName)) {
        folderGroups.set(file.folderName, []);
      }
      folderGroups.get(file.folderName)!.push(file);
    } else {
      standaloneFiles.push(file);
    }
  });

  return (
    <div className="mb-3 px-8 flex flex-wrap gap-2">
      {/* Display folders */}
      {Array.from(folderGroups.entries()).map(([folderName, files]) => (
        <div
          key={folderName}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs group"
        >
          <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {folderName}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-[10px]">
            ({files.length} files)
          </span>
          <button
            onClick={() => onFolderRemoved(folderName)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500/20 rounded"
            title="Remove folder"
          >
            <X className="w-3 h-3 text-red-500" />
          </button>
        </div>
      ))}
      
      {/* Display standalone files */}
      {standaloneFiles.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs group"
        >
          <File className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[150px]" title={file.path}>
            {file.name}
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-[10px]">
            {(file.size / 1024).toFixed(1)}KB
          </span>
          <button
            onClick={() => onFileRemoved(file.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500/20 rounded"
            title="Remove file"
          >
            <X className="w-3 h-3 text-red-500" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { addFiles, clearAllFiles } = useProject();
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const router = useRouter();

  // Handle build button click
  const handleBuild = () => {
    if (input.trim()) {
      // Save attached files to project context if any
      if (attachedFiles.length > 0) {
        const filesToUpload: UploadedFile[] = attachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          path: file.path,
          content: file.content,
          type: (file.isFolder ? 'folder' : 'file'),
          size: file.size,
          folderName: file.folderName
        }));
        
        // Clear previous files first to ensure fresh start (optional, maybe we want to append? but here it's new project)
        clearAllFiles();
        addFiles(filesToUpload);
      }

      // Navigate to workspace with initial prompt
      router.push(`/workspace?prompt=${encodeURIComponent(input)}`);
    }
  };

  const handleFilesAttached = (files: AttachedFile[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleFileRemoved = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFolderRemoved = (folderName: string) => {
    setAttachedFiles(prev => prev.filter(f => f.folderName !== folderName));
  };

  // Handle Enter key press (Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBuild();
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-black transition-colors">
      {/* Earth glow background effect */}
      <div className="absolute inset-0">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 dark:from-black dark:via-gray-900 dark:to-black" />
        
        {/* Earth glow effect - bottom left */}
        <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px]">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 via-cyan-500/10 to-transparent blur-3xl" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/30 via-cyan-600/15 to-transparent blur-2xl animate-pulse" />
        </div>
        
        {/* Additional glow effect */}
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px]">
          <div className="absolute inset-0 rounded-full bg-gradient-to-bl from-purple-500/10 via-pink-500/5 to-transparent blur-3xl" />
        </div>
      </div>

      {/* Top navigation */}
      <nav className="relative z-10 border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Qwen Coder</span>
            </div>
            <div className="flex items-center gap-3">
              <ModelSelector />
              <ModelConfigSettings />
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div className="w-full max-w-4xl mx-auto text-center space-y-8">
          {/* Version badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-full text-sm text-gray-600 dark:text-gray-300">
            <Code2 className="w-4 h-4" />
            <span>{t('home.poweredBy')}</span>
          </div>

          {/* Main title */}
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
            {t('home.titlePrefix')}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
              {t('home.build')}
            </span>{' '}
            {t('home.titleSuffix')}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>

          {/* Input area */}
          <div className="w-full max-w-4xl mx-auto mt-12">
            <div className="relative">
              {/* Main input box */}
              <div className="relative bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700/50 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
                <div className="pt-4">
                  <AttachedFilesDisplay 
                    attachedFiles={attachedFiles}
                    onFileRemoved={handleFileRemoved}
                    onFolderRemoved={handleFolderRemoved}
                  />
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('home.placeholder')}
                  className="w-full px-8 py-8 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none text-base"
                  rows={2}
                />
                
                {/* Bottom toolbar */}
                <div className="flex items-center justify-between px-8 py-5 border-t border-gray-200 dark:border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <FileAttachment 
                      attachedFiles={attachedFiles}
                      onFilesAttached={handleFilesAttached}
                      onFileRemoved={handleFileRemoved}
                    />
                  </div>

                  {/* Build now button */}
                  <button
                    onClick={handleBuild}
                    disabled={!input.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                  >
                    {t('home.buildButton')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Start Templates */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 opacity-80">
            <button 
              onClick={() => {
                const prompt = "Create a React project using Vite. The home page should display 'Hello', and the About page should display an introduction to Qwen Code.";
                router.push(`/workspace?prompt=${encodeURIComponent(prompt)}`);
              }}
              className="px-4 py-2 text-sm bg-gray-100/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-full transition-all text-gray-600 dark:text-gray-300 backdrop-blur-sm"
            >
              {t('home.template.react')}
            </button>
            <button 
               onClick={() => {
                const prompt = "Create a simple HTML page with a centered 'Hello World' heading and a gradient background.";
                router.push(`/workspace?prompt=${encodeURIComponent(prompt)}`);
              }}
              className="px-4 py-2 text-sm bg-gray-100/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-full transition-all text-gray-600 dark:text-gray-300 backdrop-blur-sm"
            >
              {t('home.template.html')}
            </button>
             <button 
               onClick={() => {
                const prompt = "Create a simple Counter app using React and Tailwind CSS. It should have increment, decrement, and reset buttons.";
                router.push(`/workspace?prompt=${encodeURIComponent(prompt)}`);
              }}
              className="px-4 py-2 text-sm bg-gray-100/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-full transition-all text-gray-600 dark:text-gray-300 backdrop-blur-sm"
            >
              {t('home.template.counter')}
            </button>
          </div>

        </div>
      </div>

      {/* Chat History Sidebar */}
      <ChatHistorySidebar />

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/10 to-transparent" />
    </div>
  );
}
