'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, ChevronDown } from 'lucide-react';

export default function Home() {
  const [input, setInput] = useState('');
  const router = useRouter();

  const handleBuild = () => {
    if (input.trim()) {
      // 跳转到工作页面，并传递初始消息
      router.push(`/workspace?prompt=${encodeURIComponent(input)}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBuild();
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* 地球光晕背景效果 */}
      <div className="absolute inset-0">
        {/* 渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />
        
        {/* 地球光晕效果 - 左下角 */}
        <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px]">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 via-cyan-500/10 to-transparent blur-3xl" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/30 via-cyan-600/15 to-transparent blur-2xl animate-pulse" />
        </div>
        
        {/* 额外的光晕效果 */}
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px]">
          <div className="absolute inset-0 rounded-full bg-gradient-to-bl from-purple-500/10 via-pink-500/5 to-transparent blur-3xl" />
        </div>
      </div>

      {/* 顶部导航 */}
      <nav className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Qwen Coder</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-white transition-colors text-sm">
                Community
              </button>
              <button className="text-gray-400 hover:text-white transition-colors text-sm">
                Enterprise
              </button>
              <button className="text-gray-400 hover:text-white transition-colors text-sm">
                Resources
              </button>
              <button className="text-gray-400 hover:text-white transition-colors text-sm">
                Careers
              </button>
              <button className="text-gray-400 hover:text-white transition-colors text-sm">
                Pricing
              </button>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm">
                Sign in
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div className="w-full max-w-4xl mx-auto text-center space-y-8">
          {/* 版本标签 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
            <Code2 className="w-4 h-4" />
            <span>Powered by Qwen Code SDK</span>
          </div>

          {/* 主标题 */}
          <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
            What will you{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
              build
            </span>{' '}
            today?
          </h1>

          {/* 副标题 */}
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Create stunning apps & websites by chatting with AI.
          </p>

          {/* 输入框区域 */}
          <div className="w-full max-w-3xl mx-auto mt-12">
            <div className="relative">
              {/* 主输入框 */}
              <div className="relative bg-gray-900/50 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Let's build a dashboard to track K..."
                  className="w-full px-6 py-6 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-lg"
                  rows={3}
                />
                
                {/* 底部工具栏 */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700/50">
                  <div className="flex items-center gap-4">
                    {/* 模型选择器 */}
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-sm text-gray-300 transition-colors">
                      <Code2 className="w-4 h-4" />
                      <span>Sonnet 4.5</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {/* 附件按钮 */}
                    <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                  </div>

                  {/* Build now 按钮 */}
                  <button
                    onClick={handleBuild}
                    disabled={!input.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                  >
                    Build now →
                  </button>
                </div>
              </div>
            </div>

            {/* 导入选项 */}
            <div className="mt-6 text-center">
              <span className="text-gray-500 text-sm">or import from </span>
              <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                Figma
              </button>
              <span className="text-gray-500 text-sm"> / </span>
              <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                GitHub
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 底部装饰 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
