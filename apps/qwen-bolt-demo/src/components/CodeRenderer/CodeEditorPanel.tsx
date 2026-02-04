'use client';

import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { CodeEditorPanelProps } from './types';
import { getLanguageFromFilename } from './utils';
import { useEditor } from '@/contexts/EditorContext';
import { useTheme } from 'next-themes';

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  file,
  code,
  readOnly = true,
  isComplete = true,
  onChange,
  searchQuery,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { settings } = useEditor();
  const { resolvedTheme } = useTheme();

  // Handle search highlighting and scrolling
  const highlightSearchMatch = (view: EditorView, query: string) => {
    if (!query?.trim()) return;
    const doc = view.state.doc.toString();
    const idx = doc.toLowerCase().indexOf(query.toLowerCase());
    
    if (idx !== -1) {
      view.dispatch({
        selection: { anchor: idx, head: idx + query.length },
        effects: EditorView.scrollIntoView(idx, { y: 'center' })
      });
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;

    // 获取语言扩展
    const getLanguageExtension = () => {
      const lang = getLanguageFromFilename(file);
      switch (lang) {
        case 'javascript':
        case 'typescript':
          return javascript({ typescript: lang === 'typescript', jsx: file.endsWith('x') });
        case 'python':
          return python();
        case 'markdown':
          return markdown();
        default:
          return [];
      }
    };

    // Use property code when file changes, otherwise try to preserve state if needed (though usually file change implies code change)
    // To be safe and simple, we always prioritize the incoming 'code' prop when initializing or re-initializing
    // unless this is a style/theme update only. 
    // However, tracking 'precFile' is complex. 
    // Given the 'code' prop update effect handles synchronization, we can just use 'code' here for safety if we are switching files.
    // But to fix the specific bug:
    
    // Destroy old editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    // Create editor state
    const state = EditorState.create({
      doc: code, // Always use the 'code' prop when (re)creating the editor to avoid bleeding content across files
      extensions: [
        basicSetup,
        getLanguageExtension(),
        ...(resolvedTheme === 'dark' ? [oneDark] : []),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChange && !readOnly) {
            const newCode = update.state.doc.toString();
            onChange(newCode, file);
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: `${settings.fontSize}px`,
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: "'Fira Code', 'Consolas', monospace",
          },
          '.cm-content': {
            lineHeight: settings.lineHeight.toString(),
          },
        }),
      ],
    });

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Trigger search highlight immediately after creation
    if (searchQuery) {
      highlightSearchMatch(view, searchQuery);
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [file, readOnly, settings.fontSize, settings.lineHeight, resolvedTheme]); // Removing 'code' from dependency to avoid recreation on typing? No, code is needed for init.
  // Actually, if 'code' changes, we typically use the update listener (separate effect). 
  // We don't want to destroy the editor every time 'code' changes (e.g. typing).
  // The dependency array currently includes 'file'. It does NOT include 'code'.
  // This is correct behaviour: Only recreate if file/display settings change. Code updates via the other effect.

  // Effect to handle search query changes when the editor is ALREADY open
  useEffect(() => {
    if (viewRef.current && searchQuery) {
      highlightSearchMatch(viewRef.current, searchQuery);
    }
  }, [searchQuery]);

  // 更新代码内容
  useEffect(() => {
    if (viewRef.current && code !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: code,
        },
      });
      viewRef.current.dispatch(transaction);
    }
  }, [code]);

  return (
    <div className="h-full w-full bg-white dark:bg-[#282c34] overflow-hidden">
      <div ref={editorRef} className="h-full w-full" />
    </div>
  );
};
