'use client';

import * as React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string; // Class for the wrapper div
  delay?: number;
}

export function Tooltip({ content, children, side = 'top', className = '', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <div 
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-[100] px-2.5 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100
          ${side === 'top' ? '-top-2 left-1/2 -translate-x-1/2 -translate-y-full mb-1' : ''}
          ${side === 'bottom' ? '-bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-1' : ''}
          ${side === 'left' ? '-left-2 top-1/2 -translate-y-1/2 -translate-x-full mr-1' : ''}
          ${side === 'right' ? '-right-2 top-1/2 -translate-y-1/2 translate-x-full ml-1' : ''}
        `}>
          {content}
          {/* Arrow */}
          <div className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 border-gray-700 transform rotate-45
            ${side === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r' : ''}
            ${side === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-t border-l' : ''}
            ${side === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r' : ''}
            ${side === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l' : ''}
          `} />
        </div>
      )}
    </div>
  );
}
