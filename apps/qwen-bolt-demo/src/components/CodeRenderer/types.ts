export interface FileOperations {
  onCreateFile?: (path: string, content: string) => void;
  onCreateFolder?: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
}

export interface MultiFileCodeRendererProps extends FileOperations {
  files: Record<string, string>;
  readOnly?: boolean;
  isComplete?: boolean;
  onCodeChange?: (code: string, filename: string) => void;
  onSaveFile?: (path: string, content: string) => void;
  activeFile?: string;
  onSelectFile?: (path: string) => void;
}

export interface CodeEditorPanelProps {
  file: string;
  code: string;
  readOnly?: boolean;
  isComplete?: boolean;
  onChange?: (code: string, filename?: string) => void;
  searchQuery?: string;
}

export interface FileTreeProps extends FileOperations {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (path: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isSearchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
}
