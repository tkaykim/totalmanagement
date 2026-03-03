'use client';

import { FileText, Image as ImageIcon, File as FileIcon, Download, X } from 'lucide-react';

export type ProjectAttachment = {
  id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  public_url?: string;
};

function isPdf(mime: string, fileName?: string): boolean {
  if (mime === 'application/pdf') return true;
  if (fileName?.toLowerCase().endsWith('.pdf')) return true;
  return false;
}

function isImage(mime: string): boolean {
  return mime?.startsWith('image/') ?? false;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface ProjectAttachmentDisplayProps {
  attachment: ProjectAttachment;
  variant: 'view' | 'edit';
  onRemove?: () => void;
}

/**
 * 프로젝트 첨부파일 1건 표시
 * - 이미지: 링크 + 아이콘 (view에서 썸네일 가능)
 * - PDF: view에서 iframe 미리보기 + 다운로드 링크
 * - 기타(PSD, AI, ZIP 등): 파일 아이콘 + 다운로드 링크
 */
export function ProjectAttachmentDisplay({
  attachment,
  variant,
  onRemove,
}: ProjectAttachmentDisplayProps) {
  const url = attachment.public_url || '#';
  const pdf = isPdf(attachment.mime_type, attachment.file_name);
  const image = isImage(attachment.mime_type);

  if (variant === 'edit') {
    return (
      <div className="group relative flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs">
        {image ? (
          <ImageIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
        ) : pdf ? (
          <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
        ) : (
          <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[140px] truncate text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {attachment.file_name}
        </a>
        <span className="text-[10px] text-slate-400">
          {formatFileSize(attachment.file_size)}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // View mode
  return (
    <div className="space-y-1">
      {pdf && url !== '#' ? (
        <>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50">
            <iframe
              src={`${url}#toolbar=1`}
              title={attachment.file_name}
              className="w-full h-[320px] min-h-[200px]"
            />
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs hover:border-blue-300 dark:hover:border-blue-600 transition group"
          >
            <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
            <span className="max-w-[200px] truncate text-slate-700 dark:text-slate-300">{attachment.file_name}</span>
            <Download className="h-3 w-3 text-slate-400 group-hover:text-blue-500 transition flex-shrink-0" />
          </a>
        </>
      ) : image && url !== '#' ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs hover:border-blue-300 dark:hover:border-blue-600 transition group"
        >
          <ImageIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span className="max-w-[160px] truncate text-slate-700 dark:text-slate-300">{attachment.file_name}</span>
          <Download className="h-3 w-3 text-slate-400 group-hover:text-blue-500 transition flex-shrink-0" />
        </a>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download={attachment.file_name}
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs hover:border-blue-300 dark:hover:border-blue-600 transition group"
        >
          <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <span className="max-w-[160px] truncate text-slate-700 dark:text-slate-300">{attachment.file_name}</span>
          <span className="text-[10px] text-slate-400">{formatFileSize(attachment.file_size)}</span>
          <Download className="h-3 w-3 text-slate-400 group-hover:text-blue-500 transition flex-shrink-0" />
        </a>
      )}
    </div>
  );
}
