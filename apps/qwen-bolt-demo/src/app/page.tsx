'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Code2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ModelSelector } from '@/components/ModelSelector';

export default function Home() {
  const [input, setInput] = useState('');
  const router = useRouter();

  // Handle build button click
  const handleBuild = () => {
    if (input.trim()) {
      // Navigate to workspace with initial prompt
      router.push(`/workspace?prompt=${encodeURIComponent(input)}`);
    }
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
            <span>Powered by Qwen Code SDK</span>
          </div>

          {/* Main title */}
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
            What will you{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
              build
            </span>{' '}
            today?
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Create stunning apps & websites by chatting with AI.
          </p>

          {/* Input area */}
          <div className="w-full max-w-4xl mx-auto mt-12">
            <div className="relative">
              {/* Main input box */}
              <div className="relative bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700/50 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe what you want to build..."
                  className="w-full px-8 py-8 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none text-base"
                  rows={2}
                />
                
                {/* Bottom toolbar */}
                <div className="flex items-center justify-end px-8 py-5 border-t border-gray-200 dark:border-gray-700/50">
                  {/* Build now button */}
                  <button
                    onClick={handleBuild}
                    disabled={!input.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                  >
                    Build now →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/10 to-transparent" />
    </div>
  );
}
