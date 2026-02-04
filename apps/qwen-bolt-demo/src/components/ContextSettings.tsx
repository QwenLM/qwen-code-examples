'use client';

import { Database, X, Upload, File, Folder, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';

export function ContextSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'files'>('knowledge');
  const { settings, updateKnowledge, addFiles, removeFile, clearAllFiles } = useProject();
  const [knowledgeText, setKnowledgeText] = useState(settings.knowledge);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // 当 settings 更新时或打开弹窗时，同步更新本地状态
  useEffect(() => {
    if (isOpen) {
      setKnowledgeText(settings.knowledge);
    }
  }, [settings.knowledge, isOpen]);

  const handleSaveAll = () => {
    updateKnowledge(knowledgeText);
    setIsOpen(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const uploadedFiles = await Promise.all(
      Array.from(files).map(async (file) => {
        const content = await file.text();
        return {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          path: file.webkitRelativePath || file.name,
          content,
          type: 'file' as const,
          size: file.size,
        };
      })
    );

    addFiles(uploadedFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* Context Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        aria-label="Context settings"
        title="Knowledge & Files - Manage project context and uploaded files"
      >
        <Database className="w-5 h-5 text-gray-400" />
      </button>

      {/* Context Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 border border-gray-200 dark:border-gray-700 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Context Settings
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'knowledge'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Knowledge
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'files'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Files ({settings.uploadedFiles.length})
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {activeTab === 'knowledge' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Project Instructions
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Define global instructions that will be applied to all AI interactions in this project.
                      This acts as a system prompt that guides the AI's behavior.
                    </p>
                    <textarea
                      value={knowledgeText}
                      onChange={(e) => setKnowledgeText(e.target.value)}
                      placeholder="e.g., For all designs I ask you to make, have them be beautiful, not cookie cutter. Make webpages that are fully featured and worthy for production."
                      className="w-full h-64 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload Files or Folders
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Upload files or folders to provide context to the AI. The AI can read and modify these files.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <File className="w-4 h-4" />
                        Upload Files
                      </button>
                    
                      {settings.uploadedFiles.length > 0 && (
                        <button
                          onClick={clearAllFiles}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear All
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <input
                      ref={folderInputRef}
                      type="file"
                      {...({ webkitdirectory: '', directory: '' } as any)}
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Uploaded Files List */}
                  {settings.uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Uploaded Files ({settings.uploadedFiles.length})
                      </h3>
                      <div className="space-y-1 max-h-96 overflow-y-auto">
                        {settings.uploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg group"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                  {file.path}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatFileSize(file.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(file.id)}
                              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settings.uploadedFiles.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No files uploaded yet</p>
                      <p className="text-xs mt-1">Upload files or folders to get started</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
