import { EditorView } from '@codemirror/view';

export const lightTheme = EditorView.theme({
  '&': {
    color: '#24292e',
    backgroundColor: '#ffffff',
  },
  '.cm-content': {
    caretColor: '#24292e',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#24292e',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#d7d4f0',
  },
  '.cm-panels': {
    backgroundColor: '#f5f5f5',
    color: '#24292e',
  },
  '.cm-searchMatch': {
    backgroundColor: '#ffd33d44',
    outline: '1px solid #ffd33d',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#ffd33d',
  },
  '.cm-activeLine': {
    backgroundColor: '#f6f8fa',
  },
  '.cm-selectionMatch': {
    backgroundColor: '#d7d4f0',
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: '#d7d4f0',
    outline: '1px solid #d7d4f0',
  },
  '.cm-gutters': {
    backgroundColor: '#ffffff',
    color: '#6e7781',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f6f8fa',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6e7781',
  },
  '.cm-tooltip': {
    border: 'none',
    backgroundColor: '#f5f5f5',
  },
  '.cm-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  '.cm-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: '#f5f5f5',
    borderBottomColor: '#f5f5f5',
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: '#d7d4f0',
      color: '#24292e',
    },
  },
}, { dark: false });
