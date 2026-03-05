'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DOCUMENT_ROOM_CATEGORY_LABELS,
  DOCUMENT_ROOM_CATEGORIES,
  type DocumentRoomCategory,
} from '../constants';
import {
  fetchDocumentRoomFiles,
  uploadDocumentRoomFile,
  getDocumentRoomDownloadUrl,
  deleteDocumentRoomFile,
  type DocumentRoomFile,
} from '../api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentRoomView() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<DocumentRoomCategory | 'all'>('all');
  const [uploadCategory, setUploadCategory] = useState<DocumentRoomCategory>('business_registration');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const categoryParam = categoryFilter === 'all' ? undefined : categoryFilter;
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['document-room', categoryParam],
    queryFn: () => fetchDocumentRoomFiles(categoryParam),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocumentRoomFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-room'] });
      setDeleteId(null);
    },
  });

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setUploadError(null);
    setUploading(true);
    try {
      await uploadDocumentRoomFile(selectedFile, uploadCategory);
      queryClient.invalidateQueries({ queryKey: ['document-room'] });
      setSelectedFile(null);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  }, [selectedFile, uploadCategory, queryClient]);

  const handleDownload = useCallback(async (file: DocumentRoomFile) => {
    try {
      const { url, file_name } = await getDocumentRoomDownloadUrl(file.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      if (file.download_url) {
        window.open(file.download_url, '_blank', 'noopener,noreferrer');
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* 업로드 영역 */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4 sm:p-6">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4" />
          파일 업로드
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <Select
            value={uploadCategory}
            onValueChange={(v) => setUploadCategory(v as DocumentRoomCategory)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="분류 선택" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_ROOM_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {DOCUMENT_ROOM_CATEGORY_LABELS[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex-1 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="truncate text-slate-600 dark:text-slate-400">
              {selectedFile ? selectedFile.name : '파일 선택'}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="shrink-0"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              '업로드'
            )}
          </Button>
        </div>
        {uploadError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
        )}
      </section>

      {/* 분류 필터 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition',
            categoryFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          전체
        </button>
        {DOCUMENT_ROOM_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              categoryFilter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {DOCUMENT_ROOM_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 p-4 flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          저장된 자료 ({files.length})
        </h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <FileText className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">등록된 파일이 없습니다.</p>
            <p className="text-xs mt-1">위에서 분류를 선택하고 파일을 업로드해 주세요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {file.file_name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {DOCUMENT_ROOM_CATEGORY_LABELS[file.category]} ·{' '}
                    {formatFileSize(file.file_size)} ·{' '}
                    {format(new Date(file.created_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownload(file)}
                    title="다운로드"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => setDeleteId(file.id)}
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 삭제 확인 모달 (간단 인라인) */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl bg-white dark:bg-slate-800 p-6 shadow-xl max-w-sm w-full">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
              이 파일을 삭제할까요?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                disabled={deleteMutation.isPending}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '삭제'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
