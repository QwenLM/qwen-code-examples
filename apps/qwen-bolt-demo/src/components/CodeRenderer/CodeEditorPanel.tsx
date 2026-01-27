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

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  file,
  code,
  readOnly = true,
  isComplete = true,
  onChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

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

    // 创建编辑器状态
    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        getLanguageExtension(),
        oneDark,
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
            fontSize: '14px',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: "'Fira Code', 'Consolas', monospace",
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
      view.destroy();
      viewRef.current = null;
    };
  }, [file, readOnly]);

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
    <div className="h-full w-full bg-[#282c34] overflow-hidden">
      <div ref={editorRef} className="h-full w-full" />
    </div>
  );
};
