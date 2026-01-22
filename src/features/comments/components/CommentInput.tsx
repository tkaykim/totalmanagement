'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUsers } from '@/features/erp/hooks';
import type { AppUser } from '@/types/database';
import { Paperclip, X, FileText, Image } from 'lucide-react';

interface CommentInputProps {
  onSubmit: (content: string, mentionedUserIds: string[], files: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function getFileIcon(type: string) {
  if (type.startsWith('image/')) {
    return <Image className="h-4 w-4 text-blue-500" />;
  }
  return <FileText className="h-4 w-4 text-slate-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function CommentInput({ onSubmit, isLoading = false, placeholder = '댓글을 입력하세요...' }: CommentInputProps) {
  const [content, setContent] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: usersData } = useUsers();
  const users = usersData?.users || [];

  const filteredUsers = users.filter((user: AppUser) =>
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(' ');

      if (!hasSpace) {
        setMentionQuery(textAfterAt);
        setShowMentionList(true);
        setSelectedMentionIndex(0);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }

    setContent(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionList && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        selectUser(filteredUsers[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentionList(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey && !showMentionList) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const selectUser = useCallback((user: AppUser) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = content.substring(cursorPosition);

    const newContent =
      content.substring(0, lastAtIndex) +
      `@${user.name} ` +
      textAfterCursor;

    setContent(newContent);
    setShowMentionList(false);
    setMentionQuery('');

    if (!mentionedUserIds.includes(user.id)) {
      setMentionedUserIds([...mentionedUserIds, user.id]);
    }

    setTimeout(() => {
      const newCursorPosition = lastAtIndex + user.name.length + 2;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      textarea.focus();
    }, 0);
  }, [content, mentionedUserIds]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setFileError(null);
    const newFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`${file.name}: 파일 크기는 10MB 이하만 가능합니다.`);
        continue;
      }
      
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError(`${file.name}: 지원하지 않는 파일 형식입니다.`);
        continue;
      }

      newFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    
    // 파일 입력 초기화 (같은 파일 다시 선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if ((!content.trim() && selectedFiles.length === 0) || isLoading) return;

    onSubmit(content.trim(), mentionedUserIds, selectedFiles);
    setContent('');
    setMentionedUserIds([]);
    setSelectedFiles([]);
    setShowMentionList(false);
    setFileError(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mentionListRef.current &&
        !mentionListRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowMentionList(false);
      }
    };

    if (showMentionList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMentionList]);

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[100px] resize-none pr-24"
          disabled={isLoading}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-8 w-8 p-0"
            title="첨부파일 추가"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={(!content.trim() && selectedFiles.length === 0) || isLoading}
            size="sm"
            className="h-8 px-3 text-xs"
          >
            {isLoading ? '작성 중...' : '작성'}
          </Button>
        </div>
      </div>

      {/* 선택된 파일 목록 */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1"
            >
              {getFileIcon(file.type)}
              <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[120px] truncate">
                {file.name}
              </span>
              <span className="text-xs text-slate-400">
                ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
              >
                <X className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 파일 에러 메시지 */}
      {fileError && (
        <p className="text-xs text-red-500">{fileError}</p>
      )}

      {showMentionList && filteredUsers.length > 0 && (
        <div
          ref={mentionListRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg"
        >
          {filteredUsers.map((user: AppUser, index: number) => (
            <div
              key={user.id}
              onClick={() => selectUser(user)}
              className={`cursor-pointer px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 ${
                index === selectedMentionIndex ? 'bg-slate-100 dark:bg-slate-700' : ''
              }`}
            >
              <div className="font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
              {user.email && (
                <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
