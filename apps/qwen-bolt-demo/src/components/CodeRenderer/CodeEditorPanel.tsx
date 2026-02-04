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
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { settings } = useEditor();
  const { resolvedTheme } = useTheme();

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

    // 保存当前代码内容（如果编辑器已存在）
    const currentCode = viewRef.current ? viewRef.current.state.doc.toString() : code;

    // 销毁旧的编辑器实例
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    // 创建编辑器状态
    const state = EditorState.create({
      doc: currentCode,
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

    // 创建编辑器视图
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [file, readOnly, settings.fontSize, settings.lineHeight, resolvedTheme]);

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
