'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useMentionedComments, useMarkCommentAsRead, useCommentReads, useUsers } from '@/features/erp/hooks';
import type { Comment, AppUser } from '@/types/database';
import { CheckCircle2, Circle, Users, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MentionedCommentsSection() {
  const { data: mentionedComments = [], isLoading } = useMentionedComments();
  const { data: usersData } = useUsers();
  const users = usersData?.users || [];
  const markAsRead = useMarkCommentAsRead();
  const [expandedCommentId, setExpandedCommentId] = useState<number | null>(null);

  const unreadComments = mentionedComments.filter((c) => !c.is_read);
  const readComments = mentionedComments.filter((c) => c.is_read);

  const getUserById = (id: string): AppUser | undefined => {
    return users.find((user: AppUser) => user.id === id);
  };

  const getEntityName = (comment: Comment & { is_read: boolean; read_at: string | null }) => {
    if (comment.entity_type === 'project') {
      return '프로젝트';
    }
    return '할일';
  };

  const handleMarkAsRead = async (commentId: number) => {
    try {
      await markAsRead.mutateAsync(commentId);
    } catch (error) {
      console.error('Failed to mark comment as read:', error);
    }
  };

  const renderContent = (content: string, mentionedUserIds: string[]) => {
    let result = content;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    mentionedUserIds.forEach((userId) => {
      const user = getUserById(userId);
      if (user) {
        const mentionPattern = new RegExp(`@${user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
        let match;
        while ((match = mentionPattern.exec(result)) !== null) {
          if (match.index > lastIndex) {
            parts.push(result.substring(lastIndex, match.index));
          }
          parts.push(
            <span key={`${userId}-${match.index}`} className="font-semibold text-blue-600">
              @{user.name}
            </span>
          );
          lastIndex = match.index + match[0].length;
        }
      }
    });

    if (lastIndex < result.length) {
      parts.push(result.substring(lastIndex));
    }

    return parts.length > 0 ? parts : result;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
        <div className="text-sm text-gray-500">멘션된 댓글을 불러오는 중...</div>
      </div>
    );
  }

  if (mentionedComments.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-black text-gray-900">나를 멘션한 댓글</h3>
        {unreadComments.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadComments.length}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {unreadComments.length > 0 && (
          <>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              읽지 않음 ({unreadComments.length})
            </div>
            {unreadComments.map((comment) => (
              <MentionedCommentItem
                key={comment.id}
                comment={comment}
                users={users}
                onMarkAsRead={() => handleMarkAsRead(comment.id)}
                onToggleExpand={() =>
                  setExpandedCommentId(expandedCommentId === comment.id ? null : comment.id)
                }
                isExpanded={expandedCommentId === comment.id}
                getEntityName={getEntityName}
                renderContent={renderContent}
              />
            ))}
          </>
        )}

        {readComments.length > 0 && (
          <>
            {unreadComments.length > 0 && (
              <div className="border-t border-gray-200 pt-3 mt-3" />
            )}
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              읽음 ({readComments.length})
            </div>
            {readComments.map((comment) => (
              <MentionedCommentItem
                key={comment.id}
                comment={comment}
                users={users}
                onMarkAsRead={() => handleMarkAsRead(comment.id)}
                onToggleExpand={() =>
                  setExpandedCommentId(expandedCommentId === comment.id ? null : comment.id)
                }
                isExpanded={expandedCommentId === comment.id}
                getEntityName={getEntityName}
                renderContent={renderContent}
                isRead
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function MentionedCommentItem({
  comment,
  users,
  onMarkAsRead,
  onToggleExpand,
  isExpanded,
  getEntityName,
  renderContent,
  isRead = false,
}: {
  comment: Comment & { is_read: boolean; read_at: string | null };
  users: AppUser[];
  onMarkAsRead: () => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
  getEntityName: (comment: Comment) => string;
  renderContent: (content: string, mentionedUserIds: string[]) => (string | JSX.Element)[];
  isRead?: boolean;
}) {
  const { data: reads = [] } = useCommentReads(isExpanded ? comment.id : 0);
  const author = users.find((u) => u.id === comment.author_id);

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-colors cursor-pointer',
        isRead
          ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
          : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
      )}
      onClick={onToggleExpand}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
              {getEntityName(comment)}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
            {!isRead && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="text-sm text-gray-700 mb-2 line-clamp-2">
            {renderContent(comment.content, comment.mentioned_user_ids)}
          </div>
          <div className="text-xs text-gray-500">
            작성자: {author?.name || comment.author_name}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isRead && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead();
              }}
              className="h-7 px-2 text-xs"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              확인
            </Button>
          )}
          {isRead && (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
            {renderContent(comment.content, comment.mentioned_user_ids)}
          </div>
          {reads.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Users className="w-3 h-3" />
              <span className="font-semibold">확인한 사람:</span>
              <div className="flex flex-wrap gap-1">
                {reads.map((read: any) => {
                  const userName = read.user?.name || users.find((u) => u.id === read.user_id)?.name || '알 수 없음';
                  return (
                    <span
                      key={read.id}
                      className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                    >
                      {userName}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

