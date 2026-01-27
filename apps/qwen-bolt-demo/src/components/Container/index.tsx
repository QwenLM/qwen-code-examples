'use client';

import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface ContainerProps {
  top?: React.ReactNode;
  bottom?: React.ReactNode;
  defaultSplit?: number;
  minTop?: number;
  minBottom?: number;
  style?: React.CSSProperties;
}

export interface ContainerRef {
  setSplit: (position: number) => void;
}

const Container = forwardRef<ContainerRef, ContainerProps>(
  ({ top, bottom, defaultSplit = 70, minTop = 20, minBottom = 10, style = {} }, ref) => {
    const [splitPosition, setSplitPosition] = useState<number>(defaultSplit);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      setSplit: (position: number) => {
        const bounded = Math.min(Math.max(position, minTop), 100 - minBottom);
        setSplitPosition(bounded);
      },
    }));

    const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    }, []);

    const handleDragEnd = useCallback(() => {
      setIsDragging(false);
    }, []);

    const handleDrag = useCallback(
      (e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const position = e.clientY - containerRect.top;
        const containerHeight = containerRef.current.offsetHeight;
        const newSplitPosition = Math.max(
          minTop,
          Math.min(100 - minBottom, (position / containerHeight) * 100)
        );

        setSplitPosition(newSplitPosition);
      },
      [isDragging, minTop, minBottom]
    );

    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
      }

      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }, [isDragging, handleDrag, handleDragEnd]);

    return (
      <div
        ref={containerRef}
        className="flex h-full w-full flex-col"
        style={style}
      >
        {/* Top Panel */}
        <div
          className="overflow-hidden"
          style={{ height: `${splitPosition}%` }}
        >
          {top}
        </div>

        {/* Drag Handle */}
        <div
          className="flex h-1 cursor-row-resize items-center justify-center bg-gray-700 hover:bg-blue-500 transition-colors"
          onMouseDown={handleDragStart}
        >
          <div className="h-0.5 w-12 rounded bg-gray-500" />
        </div>

        {/* Bottom Panel */}
        <div
          className="overflow-hidden"
          style={{ height: `${100 - splitPosition}%` }}
        >
          {bottom}
        </div>
      </div>
    );
  }
);

Container.displayName = 'Container';

export default Container;
