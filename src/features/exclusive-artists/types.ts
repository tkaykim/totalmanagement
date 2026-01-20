'use client';

export interface ExclusiveArtist {
  id: number;
  display_name: string;
  name_ko?: string;
  name_en?: string;
  nationality?: string;
  entity_type: 'person' | 'team';
  categories: string[];
  metadata: {
    visa_type?: string;
    visa_start?: string;
    visa_end?: string;
    contract_start?: string;
    contract_end?: string;
    gender?: string;
    photo?: string;
    note?: string;
    bank_name?: string;
    account_number?: string;
  };
  relation_id: number;
  relation_type: string;
  role_description?: string;
  relation_start_date?: string;
  relation_end_date?: string;
  is_active: boolean;
}

export interface ExclusiveArtistFormData {
  display_name: string;
  name_ko?: string;
  name_en?: string;
  nationality?: string;
  entity_type: 'person' | 'team';
  category_ids: number[];
  metadata: {
    visa_type?: string;
    visa_start?: string;
    visa_end?: string;
    contract_start?: string;
    contract_end?: string;
    gender?: string;
    photo?: string;
    note?: string;
    bank_name?: string;
    account_number?: string;
  };
  relation_type?: string;
  role_description?: string;
  relation_start_date?: string;
  relation_end_date?: string;
}

export const VISA_TYPES = [
  { value: 'N/A (내국인)', label: 'N/A (내국인)' },
  { value: 'E-6 (예술흥행)', label: 'E-6 (예술흥행)' },
  { value: 'E-2 (회화지도)', label: 'E-2 (회화지도)' },
  { value: 'D-10 (구직)', label: 'D-10 (구직)' },
  { value: 'F-2 (거주)', label: 'F-2 (거주)' },
  { value: 'F-4 (재외동포)', label: 'F-4 (재외동포)' },
  { value: 'F-5 (영주)', label: 'F-5 (영주)' },
  { value: 'F-6 (결혼이민)', label: 'F-6 (결혼이민)' },
  { value: 'H-1 (관광취업)', label: 'H-1 (관광취업)' },
  { value: '기타', label: '기타' },
];

export const GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
];
