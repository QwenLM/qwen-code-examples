export interface MultiFileCodeRendererProps {
  files: Record<string, string>;
  readOnly?: boolean;
  isComplete?: boolean;
  onCodeChange?: (code: string, filename: string) => void;
  activeFile?: string;
  onSelectFile?: (path: string) => void;
}

export interface CodeEditorPanelProps {
  file: string;
  code: string;
  readOnly?: boolean;
  isComplete?: boolean;
  onChange?: (code: string, filename?: string) => void;
}

export interface FileTreeProps {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (path: string) => void;
}
