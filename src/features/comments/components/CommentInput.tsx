'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUsers } from '@/features/erp/hooks';
import type { AppUser } from '@/types/database';

interface CommentInputProps {
  onSubmit: (content: string, mentionedUserIds: string[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function CommentInput({ onSubmit, isLoading = false, placeholder = '댓글을 입력하세요...' }: CommentInputProps) {
  const [content, setContent] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = () => {
    if (!content.trim() || isLoading) return;

    onSubmit(content.trim(), mentionedUserIds);
    setContent('');
    setMentionedUserIds([]);
    setShowMentionList(false);
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
    <div className="relative">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[100px] resize-none pr-12"
          disabled={isLoading}
        />
        <div className="absolute bottom-2 right-2">
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isLoading}
            size="sm"
            className="h-8 px-3 text-xs"
          >
            {isLoading ? '작성 중...' : '작성'}
          </Button>
        </div>
      </div>

      {showMentionList && filteredUsers.length > 0 && (
        <div
          ref={mentionListRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg"
        >
          {filteredUsers.map((user: AppUser, index: number) => (
            <div
              key={user.id}
              onClick={() => selectUser(user)}
              className={`cursor-pointer px-3 py-2 hover:bg-slate-100 ${
                index === selectedMentionIndex ? 'bg-slate-100' : ''
              }`}
            >
              <div className="font-medium text-slate-900">{user.name}</div>
              {user.email && (
                <div className="text-xs text-slate-500">{user.email}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


