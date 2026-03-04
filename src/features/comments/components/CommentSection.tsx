'use client';

import { useState, type ReactElement } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CommentInput } from './CommentInput';
import { Button } from '@/components/ui/button';
import { useComments, useCreateComment, useDeleteComment, useUpdateComment, useUploadCommentAttachment, useDeleteCommentAttachment } from '@/features/erp/hooks';
import { useUsers } from '@/features/erp/hooks';
import type { CommentEntityType, Comment, AppUser, CommentAttachment } from '@/types/database';
import { Trash2, Edit2, X, Check, FileText, Image, Download, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CommentSectionProps {
  entityType: CommentEntityType;
  entityId: number;
}

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

function getPublicUrl(filePath: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from('comment-attachments')
    .getPublicUrl(filePath);
  return data.publicUrl;
}

function AttachmentItem({
  attachment,
  onDelete,
  canDelete,
  isDeleting,
}: {
  attachment: CommentAttachment;
  onDelete: () => void;
  canDelete: boolean;
  isDeleting: boolean;
}) {
  const displayUrl =
    attachment.signed_url || getPublicUrl(attachment.file_path);
  const isImage = attachment.file_type.startsWith('image/');

  return (
    <div className="group relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
      {isImage ? (
        <div className="block">
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="aspect-square">
              <img
                src={displayUrl}
                alt={attachment.file_name}
                className="w-full h-full object-cover hover:opacity-95 transition"
                loading="lazy"
              />
            </div>
          </a>
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate min-w-0">
              {attachment.file_name}
            </p>
            <a
              href={displayUrl}
              download={attachment.file_name}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
            >
              <Download className="h-3 w-3" />
              다운로드
            </a>
          </div>
        </div>
      ) : (
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={attachment.file_name}
          className="flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
        >
          {getFileIcon(attachment.file_type)}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {attachment.file_name}
            </p>
            <p className="text-xs text-slate-400">
              {formatFileSize(attachment.file_size)}
            </p>
          </div>
          <Download className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        </a>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition hover:bg-red-600 disabled:opacity-50 shadow-md"
          title="삭제"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function CommentSection({ entityType, entityId }: CommentSectionProps) {
  const { data: comments = [], isLoading } = useComments(entityType, entityId);
  const { data: usersData } = useUsers();
  const users = usersData?.users || [];
  const currentUser = usersData?.currentUser;
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const uploadAttachment = useUploadCommentAttachment();
  const deleteAttachment = useDeleteCommentAttachment();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [uploadingCommentId, setUploadingCommentId] = useState<number | null>(null);

  const getUserById = (id: string): AppUser | undefined => {
    return users.find((user: AppUser) => user.id === id);
  };

  const handleSubmit = async (content: string, mentionedUserIds: string[], files: File[]) => {
    try {
      const finalContent = content.trim() || (files.length > 0 ? '(이미지)' : '');
      if (!finalContent && files.length === 0) return;

      // 1. 댓글 생성
      const comment = await createComment.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        content: finalContent,
        mentioned_user_ids: mentionedUserIds,
      });

      // 2. 첨부파일 업로드
      if (files.length > 0 && comment.id) {
        setUploadingCommentId(comment.id);
        for (const file of files) {
          try {
            await uploadAttachment.mutateAsync({
              commentId: comment.id,
              file,
            });
          } catch (error) {
            console.error('Failed to upload attachment:', error);
          }
        }
        setUploadingCommentId(null);
      }
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

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('첨부파일을 삭제하시겠습니까?')) return;

    try {
      await deleteAttachment.mutateAsync(attachmentId);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
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

    return parts.length > 0 ? parts : [result];
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">댓글을 불러오는 중...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">댓글 ({comments.length})</h3>
        <CommentInput
          onSubmit={handleSubmit}
          isLoading={createComment.isPending || uploadingCommentId !== null}
          placeholder="댓글을 입력하세요... (@멘션, 📎 첨부, Ctrl+V 이미지 붙여넣기)"
        />
      </div>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">아직 댓글이 없습니다.</div>
        ) : (
          comments.map((comment: Comment) => {
            const isEditing = editingId === comment.id;
            const author = getUserById(comment.author_id);
            const isOwner = currentUser?.id === comment.author_id;
            const attachments = comment.attachments || [];

            return (
              <div key={comment.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {author?.name || comment.author_name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </div>
                    {comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">(수정됨)</span>
                    )}
                  </div>
                  {isOwner && (
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
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                ) : (
                  <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {renderContent(comment.content, comment.mentioned_user_ids)}
                  </div>
                )}

                {/* 첨부파일 표시 */}
                {attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {attachments.map((attachment) => (
                      <AttachmentItem
                        key={attachment.id}
                        attachment={attachment}
                        onDelete={() => handleDeleteAttachment(attachment.id)}
                        canDelete={isOwner}
                        isDeleting={deleteAttachment.isPending}
                      />
                    ))}
                  </div>
                )}

                {comment.mentioned_user_ids.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comment.mentioned_user_ids.map((userId) => {
                      const user = getUserById(userId);
                      return user ? (
                        <span
                          key={userId}
                          className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300"
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
