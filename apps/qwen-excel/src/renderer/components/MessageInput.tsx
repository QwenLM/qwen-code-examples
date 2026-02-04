import React, { useState, useRef, KeyboardEvent, DragEvent } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string, files?: File[]) => Promise<void>;
  disabled?: boolean;
}

function MessageInput({ onSendMessage, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/pdf', // .pdf
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];
    const validExtensions = ['.xlsx', '.xls', '.pdf', '.docx', '.doc'];
    return (
      validTypes.includes(file.type) ||
      validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
    );
  };

  const handleSubmit = async () => {
    if (
      (message.trim() || selectedFiles.length > 0) &&
      !disabled &&
      !isUploading
    ) {
      setIsUploading(true);
      try {
        await onSendMessage(
          message,
          selectedFiles.length > 0 ? selectedFiles : undefined,
        );
        setMessage('');
        setSelectedFiles([]);
        textareaRef.current?.focus();
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleFileSelect = (files: File[]) => {
    const validFiles = files.filter(isValidFileType);
    const invalidFiles = files.filter((file) => !isValidFileType(file));

    if (invalidFiles.length > 0) {
      const invalidNames = invalidFiles.map((f) => f.name).join(', ');
      alert(
        `The following files are not supported: ${invalidNames}\n\nSupported formats: Excel (.xlsx, .xls), PDF (.pdf), Word (.docx, .doc)`,
      );
    }

    if (validFiles.length > 0) {
      // Check file size limit (10MB per file)
      const oversizedFiles = validFiles.filter(
        (file) => file.size > 10 * 1024 * 1024,
      );
      if (oversizedFiles.length > 0) {
        const oversizedNames = oversizedFiles.map((f) => f.name).join(', ');
        alert(
          `The following files are too large (max 10MB): ${oversizedNames}`,
        );
      }

      const acceptableFiles = validFiles.filter(
        (file) => file.size <= 10 * 1024 * 1024,
      );
      setSelectedFiles((prev) => [...prev, ...acceptableFiles]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    switch (ext) {
      case '.xlsx':
      case '.xls':
        return (
          <svg
            className="w-4 h-4 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
          </svg>
        );
      case '.pdf':
        return (
          <svg
            className="w-4 h-4 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        );
      case '.docx':
      case '.doc':
        return (
          <svg
            className="w-4 h-4 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  return (
    <div className="p-4 space-y-2">
      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs"
            >
              {getFileIcon(file.name)}
              <span className="text-gray-700 max-w-[120px] truncate">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700 ml-1"
                disabled={disabled}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end gap-2">
        <div
          className={`flex flex-col relative gap-2 w-full ${
            isDragOver ? 'ring-2 ring-gray-400 ring-opacity-50 rounded-lg' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            disabled={disabled}
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '150px' }}
          />
          <div className="flex justify-between w-full">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Attach files"
            >
              Attach Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.pdf,.docx,.doc"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                disabled ||
                (!message.trim() && selectedFiles.length === 0) ||
                isUploading
              }
              className="px-4 py-1 text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-w-[70px]"
              style={{ backgroundColor: '#217346' }}
            >
              {isUploading ? (
                <svg
                  className="animate-spin h-4 w-4 text-white mx-auto"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>

      {isDragOver && (
        <div className="text-xs text-gray-600 text-center">
          Drop files to attach • Excel, PDF, Word supported
        </div>
      )}
    </div>
  );
}

MessageInput.defaultProps = {
  disabled: false,
};

export default MessageInput;
