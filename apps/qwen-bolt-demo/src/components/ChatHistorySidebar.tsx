'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Trash2, User, Plus, Search, PanelLeftClose } from 'lucide-react';
import { getAllChatSessions, deleteChatSession, type ChatSession } from '@/lib/chat-persistence';

export function ChatHistorySidebar() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  // Also load initially to show count or just be ready
  useEffect(() => {
      loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const sessions = await getAllChatSessions();
      setHistory(sessions);
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t('chatHistory.deleteConfirm'))) {
      await deleteChatSession(id);
      loadHistory();
    }
  };

  const filteredHistory = history.filter(session => 
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div 
        className={`
          fixed top-0 left-0 bottom-0 w-80 z-50
          bg-white dark:bg-gray-900 
          border-r border-gray-200 dark:border-gray-800
          shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header Actions */}
        <div className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('chatHistory.title')}
            </h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={() => {
                router.push('/workspace?prompt=');
                setIsOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('chatHistory.startNew')}</span>
          </button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('chatHistory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-gray-200 placeholder-gray-400"
            />
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto min-h-0 py-2">
            {filteredHistory.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                    {searchTerm ? t('chatHistory.noMatching') : t('chatHistory.noRecent')}
                </div>
            ) : (
                <div className="px-3 space-y-1">
                    <div className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {t('chatHistory.recentChats')}
                    </div>
                    {filteredHistory.map((session) => (
                        <div
                            key={session.id}
                            onClick={() => {
                              router.push(`/workspace?sessionId=${session.id}`);
                              setIsOpen(false);
                            }}
                            className="group flex items-center justify-between gap-2 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium">
                                        {session.title || t('chatHistory.untitled')}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                        {new Date(session.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDeleteSession(e, session.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-500 transition-all shrink-0"
                                title={t('chatHistory.deleteTooltip')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        {/* Footer info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-xs text-center text-gray-400 dark:text-gray-500 shrink-0">
            {t('chatHistory.storedConversations', { count: history.length })}
        </div>
      </div>

      {/* Trigger Button - Floating (Visible only when closed) */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`
            fixed bottom-6 left-6 z-40
            w-12 h-12 rounded-full overflow-hidden 
            bg-white dark:bg-gray-800 
            border-2 transition-all duration-300 shadow-lg
            flex items-center justify-center
            ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 start-100 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:scale-105'}
        `}
        title={t('chatHistory.openHistory')}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 via-cyan-500 to-blue-400 opacity-90 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
        </div>
      </button>
    </>
  );
}
