import type { DocumentRoomCategory } from './constants';

export interface DocumentRoomFile {
  id: number;
  category: DocumentRoomCategory;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  download_url?: string | null;
}

export async function fetchDocumentRoomFiles(
  category?: DocumentRoomCategory | null
): Promise<DocumentRoomFile[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const res = await fetch(`/api/document-room?${params.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '목록 조회에 실패했습니다.');
  }
  return res.json();
}

export async function uploadDocumentRoomFile(
  file: File,
  category: DocumentRoomCategory
): Promise<DocumentRoomFile> {
  const formData = new FormData();
  formData.set('file', file);
  formData.set('category', category);
  const res = await fetch('/api/document-room', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '업로드에 실패했습니다.');
  }
  return res.json();
}

export async function getDocumentRoomDownloadUrl(id: number): Promise<{ url: string; file_name: string }> {
  const res = await fetch(`/api/document-room/${id}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '다운로드 URL을 가져오지 못했습니다.');
  }
  return res.json();
}

export async function deleteDocumentRoomFile(id: number): Promise<void> {
  const res = await fetch(`/api/document-room/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '삭제에 실패했습니다.');
  }
}
