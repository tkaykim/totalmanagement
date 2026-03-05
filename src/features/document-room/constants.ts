export type DocumentRoomCategory = 'business_registration' | 'bank_copy' | 'introduction' | 'other';

export const DOCUMENT_ROOM_CATEGORY_LABELS: Record<DocumentRoomCategory, string> = {
  business_registration: '사업자등록증',
  bank_copy: '통장사본',
  introduction: '소개서',
  other: '기타',
};

export const DOCUMENT_ROOM_CATEGORIES: DocumentRoomCategory[] = [
  'business_registration',
  'bank_copy',
  'introduction',
  'other',
];
