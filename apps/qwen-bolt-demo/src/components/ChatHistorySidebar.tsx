'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Trash2, User, Plus, Search, PanelLeftClose, X, Check } from 'lucide-react';
import { getAllChatSessions, deleteChatSession, deleteAllChatSessions, type ChatSession } from '@/lib/chat-persistence';

interface TimeGroup {
  label: string;
  sessions: ChatSession[];
}

function groupSessionsByTime(sessions: ChatSession[], labels: { today: string; yesterday: string; past7Days: string; older: string }): TimeGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfPast7Days = startOfToday - 6 * 86_400_000;

  const groups: Record<string, ChatSession[]> = {
    today: [],
    yesterday: [],
    past7Days: [],
    older: [],
  };

  for (const session of sessions) {
    const timestamp = session.updatedAt;
    if (timestamp >= startOfToday) {
      groups.today.push(session);
    } else if (timestamp >= startOfYesterday) {
      groups.yesterday.push(session);
    } else if (timestamp >= startOfPast7Days) {
      groups.past7Days.push(session);
    } else {
      groups.older.push(session);
    }
  }

  const result: TimeGroup[] = [];
  if (groups.today.length > 0) result.push({ label: labels.today, sessions: groups.today });
  if (groups.yesterday.length > 0) result.push({ label: labels.yesterday, sessions: groups.yesterday });
  if (groups.past7Days.length > 0) result.push({ label: labels.past7Days, sessions: groups.past7Days });
  if (groups.older.length > 0) result.push({ label: labels.older, sessions: groups.older });

  return result;
}

export function ChatHistorySidebar() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Track which session is pending delete confirmation (inline)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Track whether "clear all" confirmation is showing
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    } else {
      // Reset states when sidebar closes
      setPendingDeleteId(null);
      setShowClearAllConfirm(false);
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

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const handleConfirmDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteChatSession(id);
    setPendingDeleteId(null);
    loadHistory();
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(null);
  };

  const handleClearAll = async () => {
    await deleteAllChatSessions();
    setShowClearAllConfirm(false);
    loadHistory();
  };

  const filteredHistory = history.filter(session => 
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const timeGroupLabels = useMemo(() => ({
    today: t('chatHistory.today'),
    yesterday: t('chatHistory.yesterday'),
    past7Days: t('chatHistory.past7Days'),
    older: t('chatHistory.older'),
  }), [t]);

  const groupedHistory = useMemo(
    () => groupSessionsByTime(filteredHistory, timeGroupLabels),
    [filteredHistory, timeGroupLabels]
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
                    {groupedHistory.map((group) => (
                      <div key={group.label}>
                        <div className="px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          {group.label}
                        </div>
                        {group.sessions.map((session) => {
                          const isPendingDelete = pendingDeleteId === session.id;
                          return (
                            <div
                              key={session.id}
                              onClick={() => {
                                if (isPendingDelete) return;
                                router.push(`/workspace?sessionId=${session.id}`);
                                setIsOpen(false);
                              }}
                              className={`group flex items-center justify-between gap-2 px-3 py-3 rounded-xl cursor-pointer transition-colors ${
                                isPendingDelete 
                                  ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30' 
                                  : 'hover:bg-gray-100 dark:hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare className={`w-4 h-4 shrink-0 ${isPendingDelete ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                <div className="flex flex-col min-w-0">
                                  {isPendingDelete ? (
                                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                                      {t('chatHistory.deleteConfirm')}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate font-medium">
                                        {session.title || t('chatHistory.untitled')}
                                      </span>
                                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                        {new Date(session.updatedAt).toLocaleDateString()}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {isPendingDelete ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={(e) => handleConfirmDelete(e, session.id)}
                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition-colors"
                                    title={t('chatHistory.confirmDelete')}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelDelete}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                                    title={t('chatHistory.cancelDelete')}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => handleDeleteClick(e, session.id)}
                                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-500 transition-all shrink-0"
                                  title={t('chatHistory.deleteTooltip')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                </div>
            )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0 space-y-3">
            {history.length > 0 && (
              showClearAllConfirm ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl">
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {t('chatHistory.clearAllConfirm')}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleClearAll}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                    >
                      {t('chatHistory.confirm')}
                    </button>
                    <button
                      onClick={() => setShowClearAllConfirm(false)}
                      className="px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {t('chatHistory.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearAllConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('chatHistory.clearAll')}</span>
                </button>
              )
            )}
            <div className="text-xs text-center text-gray-400 dark:text-gray-500">
              {t('chatHistory.storedConversations', { count: history.length })}
            </div>
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
