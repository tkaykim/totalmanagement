'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Phone, Mail, X, Check, Upload, Image as ImageIcon, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BU, Dancer } from '@/types/database';
import {
  useDancers,
  useCreateDancer,
  useUpdateDancer,
  useDeleteDancer,
} from '@/features/erp/hooks';
import { NationalitySelector } from './NationalitySelector';
import { createClient } from '@/lib/supabase/client';

// 공통 모달 컴포넌트들
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 flex-shrink-0">
          <h3 className="font-black text-lg text-gray-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={18} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  if (type === 'date') {
    return (
      <label className="space-y-1.5">
        <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <input
          type="date"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
        />
      </label>
    );
  }

  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModalActions({
  onPrimary,
  onClose,
  primaryLabel,
}: {
  onPrimary: () => void;
  onClose: () => void;
  primaryLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
      >
        취소
      </button>
      <button
        onClick={onPrimary}
        className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-700 transition-colors"
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function StatusBadge({ type, text }: { type?: string; text: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    default: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300',
  };

  const key = type?.toLowerCase() || 'default';

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${styles[key] || styles.default}`}>
      {text}
    </span>
  );
}

// 이미지 업로드 필드 컴포넌트
function ImageUploadField({
  label,
  value,
  onChange,
  onFileSelect,
  uploading,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFileSelect: (file: File) => void;
  uploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">{label}</span>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 flex-shrink-0">
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading}
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              업로드 중...
            </>
          ) : (
            <>
              <Upload size={16} />
              {value ? '파일 변경' : '파일 선택'}
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {value && !uploading && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors"
          >
            <ImageIcon size={16} />
            미리보기
          </a>
        )}
      </div>
      {value && (
        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{value}</p>
      )}
    </div>
  );
}

// DancerModal 컴포넌트
function DancerModal({
  dancer,
  bu,
  onClose,
  onSubmit,
}: {
  dancer?: Dancer | null;
  bu: BU;
  onClose: () => void;
  onSubmit: (data: {
    bu_code: BU;
    name: string;
    nickname_ko?: string;
    nickname_en?: string;
    real_name?: string;
    photo?: string;
    team_name?: string;
    company?: string;
    nationality?: string;
    gender?: 'male' | 'female';
    contact?: string;
    bank_copy?: string;
    bank_name?: string;
    account_number?: string;
    id_document_type?: 'passport' | 'resident_registration' | 'alien_registration';
    id_document_file?: string;
    note?: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    nickname_ko: dancer?.nickname_ko || dancer?.name || '',
    nickname_en: dancer?.nickname_en || '',
    real_name: dancer?.real_name || '',
    photo: dancer?.photo || '',
    team_name: dancer?.team_name || '',
    company: dancer?.company || '',
    nationality: dancer?.nationality || '',
    gender: dancer?.gender || '',
    contact: dancer?.contact || '',
    bank_copy: dancer?.bank_copy || '',
    bank_name: dancer?.bank_name || '',
    account_number: dancer?.account_number || '',
    id_document_type: dancer?.id_document_type || '',
    id_document_file: dancer?.id_document_file || '',
    note: dancer?.note || '',
  });
  
  const [uploading, setUploading] = useState<{
    photo: boolean;
    idDocument: boolean;
    bankCopy: boolean;
  }>({
    photo: false,
    idDocument: false,
    bankCopy: false,
  });

  const handleFileUpload = async (file: File, type: 'photo' | 'idDocument' | 'bankCopy') => {
    setUploading((prev) => ({ ...prev, [type]: true }));
    try {
      const supabase = createClient();
      
      // 사용자 인증 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('로그인이 필요합니다. 페이지를 새로고침하고 다시 시도해주세요.');
      }
      
      // 파일 크기 제한 (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('파일 크기는 10MB 이하여야 합니다.');
      }
      
      // 파일 확장자 추출 및 검증
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(fileExt)) {
        throw new Error('지원하지 않는 파일 형식입니다. (jpg, png, gif, webp, pdf만 가능)');
      }
      
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      // 타입별 디렉토리 경로 설정
      const folderMap = {
        photo: 'photos',
        idDocument: 'id_documents',
        bankCopy: 'bank_copies',
      };
      
      const filePath = `${folderMap[type]}/${fileName}`;
      
      // Supabase Storage에 파일 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dancers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) {
        // RLS 정책 오류인 경우 더 명확한 메시지 제공
        if (uploadError.message.includes('row-level security') || uploadError.message.includes('RLS')) {
          throw new Error('파일 업로드 권한이 없습니다. 관리자에게 문의하거나 마이그레이션 0028을 실행해주세요.');
        }
        throw uploadError;
      }
      
      // Public URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('dancers')
        .getPublicUrl(filePath);
      
      // Form에 URL 설정
      if (type === 'photo') {
        setForm((prev) => ({ ...prev, photo: publicUrl }));
      } else if (type === 'idDocument') {
        setForm((prev) => ({ ...prev, id_document_file: publicUrl }));
      } else if (type === 'bankCopy') {
        setForm((prev) => ({ ...prev, bank_copy: publicUrl }));
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert(`파일 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSubmit = () => {
    if (!form.nickname_ko.trim() && !form.nickname_en.trim() && !form.real_name.trim()) {
      alert('닉네임(한글), 닉네임(영어), 본명 중 최소 하나는 입력해주세요.');
      return;
    }

    const toNullIfEmpty = (value: string) => (value.trim() === '' ? undefined : value.trim());

    // name 필드는 하위 호환성을 위해 nickname_ko 값을 사용 (없으면 nickname_en, 없으면 real_name)
    const nameValue = form.nickname_ko.trim() || form.nickname_en.trim() || form.real_name.trim();

    onSubmit({
      bu_code: bu,
      name: nameValue,
      nickname_ko: toNullIfEmpty(form.nickname_ko),
      nickname_en: toNullIfEmpty(form.nickname_en),
      real_name: toNullIfEmpty(form.real_name),
      photo: toNullIfEmpty(form.photo),
      team_name: toNullIfEmpty(form.team_name),
      company: toNullIfEmpty(form.company),
      nationality: toNullIfEmpty(form.nationality),
      gender: form.gender
        ? (form.gender as 'male' | 'female')
        : undefined,
      contact: toNullIfEmpty(form.contact),
      bank_copy: toNullIfEmpty(form.bank_copy),
      bank_name: toNullIfEmpty(form.bank_name),
      account_number: toNullIfEmpty(form.account_number),
      id_document_type: form.id_document_type
        ? (form.id_document_type as 'passport' | 'resident_registration' | 'alien_registration')
        : undefined,
      id_document_file: toNullIfEmpty(form.id_document_file),
      note: toNullIfEmpty(form.note),
    });
  };

  return (
    <ModalShell title={dancer ? '댄서 수정' : '댄서 추가'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="닉네임 (한글)"
            value={form.nickname_ko}
            onChange={(v) => setForm((prev) => ({ ...prev, nickname_ko: v }))}
            placeholder="닉네임 (한글)"
          />
          <InputField
            label="닉네임 (영어)"
            value={form.nickname_en}
            onChange={(v) => setForm((prev) => ({ ...prev, nickname_en: v }))}
            placeholder="Nickname (English)"
          />
        </div>
        <InputField
          label="본명"
          value={form.real_name}
          onChange={(v) => setForm((prev) => ({ ...prev, real_name: v }))}
          placeholder="본명"
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="소속팀"
            value={form.team_name}
            onChange={(v) => setForm((prev) => ({ ...prev, team_name: v }))}
            placeholder="소속팀 (선택사항)"
          />
          <InputField
            label="소속사"
            value={form.company}
            onChange={(v) => setForm((prev) => ({ ...prev, company: v }))}
            placeholder="소속사 (선택사항)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <NationalitySelector
            label="국적"
            value={form.nationality}
            onChange={(v) => setForm((prev) => ({ ...prev, nationality: v }))}
          />
          <SelectField
            label="성별"
            value={form.gender}
            onChange={(v) => setForm((prev) => ({ ...prev, gender: v }))}
            options={[
              { value: '', label: '선택 안함' },
              { value: 'male', label: '남' },
              { value: 'female', label: '여' },
            ]}
          />
        </div>

        <InputField
          label="연락처"
          value={form.contact}
          onChange={(v) => setForm((prev) => ({ ...prev, contact: v }))}
          placeholder="010-1234-5678"
        />

        {/* 이미지 업로드 필드 */}
        <ImageUploadField
          label="사진"
          value={form.photo}
          onChange={(v) => setForm((prev) => ({ ...prev, photo: v }))}
          onFileSelect={(file) => handleFileUpload(file, 'photo')}
          uploading={uploading.photo}
        />

        <SelectField
          label="신분증 유형"
          value={form.id_document_type}
          onChange={(val) => setForm((prev) => ({ ...prev, id_document_type: val }))}
          options={[
            { value: '', label: '선택 안함' },
            { value: 'passport', label: '여권' },
            { value: 'resident_registration', label: '주민등록증' },
            { value: 'alien_registration', label: '외국인등록증' },
          ]}
        />

        <ImageUploadField
          label="신분증 파일"
          value={form.id_document_file}
          onChange={(v) => setForm((prev) => ({ ...prev, id_document_file: v }))}
          onFileSelect={(file) => handleFileUpload(file, 'idDocument')}
          uploading={uploading.idDocument}
        />

        <ImageUploadField
          label="통장사본"
          value={form.bank_copy}
          onChange={(v) => setForm((prev) => ({ ...prev, bank_copy: v }))}
          onFileSelect={(file) => handleFileUpload(file, 'bankCopy')}
          uploading={uploading.bankCopy}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="은행명"
            value={form.bank_name}
            onChange={(v) => setForm((prev) => ({ ...prev, bank_name: v }))}
            placeholder="예: 국민은행, 신한은행"
          />
          <InputField
            label="계좌번호"
            value={form.account_number}
            onChange={(v) => setForm((prev) => ({ ...prev, account_number: v }))}
            placeholder="계좌번호"
          />
        </div>

        <label className="space-y-1.5">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">메모</span>
          <textarea
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="추가 정보 및 메모"
            rows={3}
            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
          />
        </label>

        <ModalActions onPrimary={handleSubmit} onClose={onClose} primaryLabel={dancer ? '수정' : '등록'} />
      </div>
    </ModalShell>
  );
}

// 대량 추가 모달 컴포넌트
function BulkAddDancerModal({
  bu,
  onClose,
  onSubmit,
}: {
  bu: BU;
  onClose: () => void;
  onSubmit: (dancers: Array<{
    bu_code: BU;
    name: string;
    nickname_ko?: string;
    nickname_en?: string;
    real_name?: string;
    team_name?: string;
    company?: string;
    nationality?: string;
    gender?: 'male' | 'female';
    contact?: string;
    bank_name?: string;
    account_number?: string;
  }>) => Promise<void>;
}) {
  const [textInput, setTextInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseDancers = (): Array<{
    bu_code: BU;
    name: string;
    nickname_ko?: string;
    nickname_en?: string;
    real_name?: string;
    team_name?: string;
    company?: string;
    nationality?: string;
    gender?: 'male' | 'female';
    contact?: string;
    bank_name?: string;
    account_number?: string;
  }> => {
    // 세미콜론(;)으로 댄서를 구분
    const dancerEntries = textInput
      .split(';')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    const dancers = dancerEntries.map((entry) => {
      // 각 댄서 내에서는 탭 또는 쉼표로 필드를 구분
      const parts = entry.split(/\t|,/).map((part) => part.trim());

      // 최소 1개 필드 (닉네임 한글 또는 영어 또는 본명)
      if (parts.length === 0) {
        return null;
      }

      const [
        nickname_ko = '',
        nickname_en = '',
        real_name = '',
        team_name = '',
        company = '',
        nationality = '',
        gender = '',
        contact = '',
        bank_name = '',
        account_number = '',
      ] = parts;

      // 필수 필드 검증: 닉네임(한글), 닉네임(영어), 본명 중 최소 하나
      if (!nickname_ko && !nickname_en && !real_name) {
        return null;
      }

      // name 필드는 하위 호환성을 위해 nickname_ko 값을 사용 (없으면 nickname_en, 없으면 real_name)
      const nameValue = nickname_ko || nickname_en || real_name;

      const toUndefinedIfEmpty = (value: string) => (value.trim() === '' ? undefined : value.trim());

      const genderValue = gender.trim().toLowerCase();
      // '남', '남성', 'male', 'm' 등을 'male'로, '여', '여성', 'female', 'f' 등을 'female'로 변환
      let validGender: 'male' | 'female' | undefined = undefined;
      if (genderValue === 'male' || genderValue === 'm' || genderValue === '남' || genderValue === '남성') {
        validGender = 'male';
      } else if (genderValue === 'female' || genderValue === 'f' || genderValue === '여' || genderValue === '여성') {
        validGender = 'female';
      }

      return {
        bu_code: bu,
        name: nameValue,
        nickname_ko: toUndefinedIfEmpty(nickname_ko),
        nickname_en: toUndefinedIfEmpty(nickname_en),
        real_name: toUndefinedIfEmpty(real_name),
        team_name: toUndefinedIfEmpty(team_name),
        company: toUndefinedIfEmpty(company),
        nationality: toUndefinedIfEmpty(nationality),
        gender: validGender,
        contact: toUndefinedIfEmpty(contact),
        bank_name: toUndefinedIfEmpty(bank_name),
        account_number: toUndefinedIfEmpty(account_number),
      };
    });

    return dancers.filter((dancer) => dancer !== null) as Array<{
      bu_code: BU;
      name: string;
      nickname_ko?: string;
      nickname_en?: string;
      real_name?: string;
      team_name?: string;
      company?: string;
      nationality?: string;
      gender?: 'male' | 'female';
      contact?: string;
      bank_name?: string;
      account_number?: string;
    }>;
  };

  const handleSubmit = async () => {
    const dancers = parseDancers();

    if (dancers.length === 0) {
      alert('등록할 댄서 정보가 없습니다. 형식에 맞게 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(dancers);
      setTextInput('');
      onClose();
    } catch (error) {
      console.error('Failed to bulk create dancers:', error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exampleText = `김철수	Kim	김철수	팀A	회사A	한국	male	010-1234-5678	국민은행	123-456-789;이영희	Lee	이영희	팀B			한국	female	010-9876-5432		;박민수	Park	박민수		회사C	한국	male			`;

  const parsedCount = parseDancers().length;

  return (
    <ModalShell title="댄서 대량 추가" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h4 className="text-sm font-black text-blue-900 dark:text-blue-100 mb-2">입력 형식</h4>
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
            세미콜론(<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">;</code>)으로 댄서를 구분하고, 각 댄서의 필드는 탭(\t) 또는 쉼표(,)로 구분합니다.
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2">
            형식: 닉네임(한글) | 닉네임(영어) | 본명 | 소속팀 | 소속사 | 국적 | 성별 | 연락처 | 은행명 | 계좌번호
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            * 성별: 남/여 또는 male/female (빈 값 가능)
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            * 필수: 닉네임(한글), 닉네임(영어), 본명 중 최소 하나
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            * 댄서 구분: 세미콜론(<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">;</code>)
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              댄서 정보 (세미콜론으로 구분)
            </label>
            {parsedCount > 0 && (
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {parsedCount}명이 등록됩니다
              </span>
            )}
          </div>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={exampleText}
            rows={12}
            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-3 text-sm font-mono outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-500/30"
          />
        </div>

        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3">
          <p className="text-xs text-gray-600 dark:text-slate-400 mb-1 font-medium">예시 (세미콜론으로 댄서 구분):</p>
          <pre className="text-xs text-gray-500 dark:text-slate-500 font-mono whitespace-pre-wrap break-all">
            {exampleText}
          </pre>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
            위 예시는 3명의 댄서를 세미콜론(<code className="bg-gray-200 dark:bg-slate-700 px-1 rounded">;</code>)으로 구분한 것입니다.
          </p>
        </div>

        <ModalActions
          onPrimary={handleSubmit}
          onClose={onClose}
          primaryLabel={isSubmitting ? '등록 중...' : `등록 (${parsedCount}명)`}
        />
      </div>
    </ModalShell>
  );
}

// DancersView 컴포넌트
export function DancersView({ bu }: { bu: BU }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [editDancer, setEditDancer] = useState<Dancer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: dancersData = [] } = useDancers(bu);
  const createDancerMutation = useCreateDancer();
  const updateDancerMutation = useUpdateDancer();
  const deleteDancerMutation = useDeleteDancer();

  const filteredDancers = useMemo(() => {
    if (!searchQuery.trim()) return dancersData;
    const query = searchQuery.toLowerCase();
    return dancersData.filter(
      (dancer) =>
        dancer.name.toLowerCase().includes(query) ||
        dancer.nickname_ko?.toLowerCase().includes(query) ||
        dancer.nickname_en?.toLowerCase().includes(query) ||
        dancer.real_name?.toLowerCase().includes(query) ||
        dancer.team_name?.toLowerCase().includes(query) ||
        dancer.company?.toLowerCase().includes(query) ||
        dancer.nationality?.toLowerCase().includes(query) ||
        dancer.contact?.toLowerCase().includes(query)
    );
  }, [dancersData, searchQuery]);

  const handleDelete = async (id: number) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDancerMutation.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete dancer:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleCreate = async (data: {
    bu_code: BU;
    name: string;
    nickname_ko?: string;
    nickname_en?: string;
    real_name?: string;
    photo?: string;
    team_name?: string;
    company?: string;
    nationality?: string;
    gender?: 'male' | 'female';
    contact?: string;
    bank_copy?: string;
    account_number?: string;
    id_document_type?: 'passport' | 'resident_registration' | 'alien_registration';
    id_document_file?: string;
    note?: string;
  }) => {
    try {
      await createDancerMutation.mutateAsync(data);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create dancer:', error);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (id: number, data: Partial<Dancer>) => {
    try {
      await updateDancerMutation.mutateAsync({ id, data });
      setEditDancer(null);
    } catch (error) {
      console.error('Failed to update dancer:', error);
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleBulkCreate = async (dancers: Array<{
    bu_code: BU;
    name: string;
    nickname_ko?: string;
    nickname_en?: string;
    real_name?: string;
    team_name?: string;
    company?: string;
    nationality?: string;
    gender?: 'male' | 'female';
    contact?: string;
    bank_name?: string;
    account_number?: string;
  }>) => {
    // 순차적으로 등록 (에러 발생 시 중단)
    for (const dancer of dancers) {
      await createDancerMutation.mutateAsync(dancer);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tighter">댄서 관리</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">참여댄서 정보 및 계약 정보를 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-xl text-sm font-black hover:bg-gray-700 transition-colors"
          >
            <Users size={16} />
            대량 추가
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            댄서 추가
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30 flex gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="이름, 소속팀, 소속사, 국적, 연락처 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-900 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-5">Name</th>
                <th className="px-6 py-5">성별</th>
                <th className="px-6 py-5">소속팀 / 소속사</th>
                <th className="px-6 py-5">국적</th>
                <th className="px-6 py-5">Contact</th>
                <th className="px-6 py-5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDancers.map((dancer) => (
                <tr key={dancer.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-black text-sm">
                        {(dancer.nickname_ko || dancer.nickname_en || dancer.real_name || dancer.name || '?')[0]}
                      </div>
                      <div>
                        <div className="font-black text-sm text-gray-900 dark:text-slate-100">
                          {(() => {
                            const parts: string[] = [];
                            if (dancer.nickname_ko) parts.push(dancer.nickname_ko);
                            if (dancer.nickname_en) parts.push(dancer.nickname_en);
                            if (parts.length === 0) {
                              // 한국어/영어가 모두 없으면 본명이나 name 사용
                              return dancer.real_name || dancer.name || '-';
                            }
                            return parts.join(' / ');
                          })()}
                        </div>
                        {dancer.real_name && (dancer.nickname_ko || dancer.nickname_en) && (
                          <div className="text-xs text-gray-500 dark:text-slate-400">본명: {dancer.real_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      {dancer.gender === 'male' ? '남' : dancer.gender === 'female' ? '여' : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      {dancer.team_name && (
                        <div className="text-xs text-gray-600 dark:text-slate-300">팀: {dancer.team_name}</div>
                      )}
                      {dancer.company && (
                        <div className="text-xs text-gray-600 dark:text-slate-300">소속사: {dancer.company}</div>
                      )}
                      {!dancer.team_name && !dancer.company && (
                        <span className="text-xs text-gray-400 dark:text-slate-500">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-xs font-black text-gray-700 dark:text-slate-300">
                    {dancer.nationality || 'N/A'}
                  </td>
                  <td className="px-6 py-5">
                    {dancer.contact && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                        <Phone size={12} />
                        <span>{dancer.contact}</span>
                      </div>
                    )}
                    {!dancer.contact && <span className="text-xs text-gray-400 dark:text-slate-500">N/A</span>}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setEditDancer(dancer)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(dancer.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDancers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">
                    {searchQuery ? '검색 결과가 없습니다.' : '등록된 댄서가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <DancerModal bu={bu} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreate} />
      )}

      {isBulkAddModalOpen && (
        <BulkAddDancerModal
          bu={bu}
          onClose={() => setIsBulkAddModalOpen(false)}
          onSubmit={handleBulkCreate}
        />
      )}

      {editDancer && (
        <DancerModal dancer={editDancer} bu={bu} onClose={() => setEditDancer(null)} onSubmit={(data) => handleUpdate(editDancer.id, data)} />
      )}
    </div>
  );
}

