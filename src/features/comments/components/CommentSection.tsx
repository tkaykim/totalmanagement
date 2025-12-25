'use client';

import { useState, type ReactElement } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CommentInput } from './CommentInput';
import { Button } from '@/components/ui/button';
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from '@/features/erp/hooks';
import { useUsers } from '@/features/erp/hooks';
import type { CommentEntityType, Comment, AppUser } from '@/types/database';
import { Trash2, Edit2, X, Check } from 'lucide-react';

interface CommentSectionProps {
  entityType: CommentEntityType;
  entityId: number;
}

export function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const { data: comments = [], isLoading } = useComments(entityType, entityId);
  const { data: usersData } = useUsers();
  const users = usersData?.users || [];
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const getUserById = (id: string): AppUser | undefined => {
    return users.find((user: AppUser) => user.id === id);
  };

  const handleSubmit = async (content: string, mentionedUserIds: string[]) => {
    try {
      await createComment.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        content,
        mentioned_user_ids: mentionedUserIds,
      });
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId: number) => {
    try {
      await updateComment.mutateAsync({
        id: commentId,
        data: { content: editContent },
      });
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      await deleteComment.mutateAsync(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const renderContent = (content: string, mentionedUserIds: string[]) => {
    let result = content;
    const parts: (string | ReactElement)[] = [];
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
    return <div className="text-sm text-slate-500">댓글을 불러오는 중...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">댓글 ({comments.length})</h3>
        <CommentInput
          onSubmit={handleSubmit}
          isLoading={createComment.isPending}
          placeholder="댓글을 입력하세요... (@이름으로 멘션 가능)"
        />
      </div>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">아직 댓글이 없습니다.</div>
        ) : (
          comments.map((comment: Comment) => {
            const isEditing = editingId === comment.id;
            const author = getUserById(comment.author_id);

            return (
              <div key={comment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-slate-900">
                      {author?.name || comment.author_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </div>
                    {comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-slate-400">(수정됨)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(comment.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(comment)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(comment.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                ) : (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {renderContent(comment.content, comment.mentioned_user_ids)}
                  </div>
                )}

                {comment.mentioned_user_ids.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comment.mentioned_user_ids.map((userId) => {
                      const user = getUserById(userId);
                      return user ? (
                        <span
                          key={userId}
                          className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
                        >
                          @{user.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

