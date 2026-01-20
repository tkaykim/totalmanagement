'use client';

import { useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BU, BU_TITLES } from '../types';

export function OrganizationView({
  bu,
  orgData,
  externalWorkersData,
  partnerWorkersData,
  partnerCompaniesData,
  usersData,
  currentUser,
  orgViewTab,
  onTabChange,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onAddExternalWorker,
  onEditExternalWorker,
  onDeleteExternalWorker,
  onEditUser,
  onAddUser,
}: {
  bu: BU | 'ALL';
  orgData: any[];
  externalWorkersData: any[];
  partnerWorkersData: any[];
  partnerCompaniesData: any[];
  usersData?: { users: any[]; currentUser: any };
  currentUser?: any;
  orgViewTab: 'org' | 'external' | 'users';
  onTabChange: (tab: 'org' | 'external' | 'users') => void;
  onAddMember: (orgUnitId: number) => void;
  onEditMember: (member: any) => void;
  onDeleteMember: (id: number) => void;
  onAddExternalWorker: () => void;
  onEditExternalWorker: (worker: any) => void;
  onDeleteExternalWorker: (id: number) => void;
  onEditUser: (user: any) => void;
  onAddUser: () => void;
}) {
  const isAdmin = currentUser?.profile?.role === 'admin';
  const users = usersData?.users || [];

  const internalEmployees = useMemo(() => {
    return users.filter((u: any) => u.bu_code != null);
  }, [users]);

  const externalWorkers = useMemo(() => {
    const usersWithoutBu = users.filter((u: any) => u.bu_code == null);
    const partnerWorkersAsUsers = partnerWorkersData.map((pw: any) => {
      const company = partnerCompaniesData.find((pc: any) => pc.id === pw.partner_company_id);
      return {
        id: `partner_${pw.id}`,
        name: pw.name_ko || pw.name_en || pw.name || '-',
        email: pw.email || null,
        role: 'viewer' as const,
        bu_code: pw.bu_code || null,
        position: null,
        created_at: pw.created_at,
        updated_at: pw.updated_at,
        artist_id: null,
        is_partner_worker: true,
        partner_worker_id: pw.id,
        worker_type: pw.worker_type,
        partner_company_id: pw.partner_company_id,
        partner_company_name: company ? (company.company_name_ko || company.company_name_en || '-') : null,
        phone: pw.phone,
        specialties: pw.specialties,
        is_active: pw.is_active !== false,
      };
    });
    return [...usersWithoutBu, ...partnerWorkersAsUsers];
  }, [users, partnerWorkersData, partnerCompaniesData]);

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex w-fit overflow-x-auto rounded-xl sm:rounded-2xl bg-slate-200/60 p-1 sm:p-1.5">
        <button
          onClick={() => onTabChange('org')}
          className={cn(
            'px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap',
            orgViewTab === 'org'
              ? 'tab-active rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 text-blue-600 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100',
          )}
        >
          내부 직원
        </button>
        <button
          onClick={() => onTabChange('external')}
          className={cn(
            'px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap',
            orgViewTab === 'external'
              ? 'tab-active rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 text-blue-600 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100',
          )}
        >
          외주 인력
        </button>
        <button
          onClick={() => onTabChange('users')}
          className={cn(
            'px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition whitespace-nowrap',
            orgViewTab === 'users'
              ? 'tab-active rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 text-blue-600 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100',
          )}
        >
          회원 관리
        </button>
      </div>

      {orgViewTab === 'org' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-6 shadow-sm">
            <div className="mb-3 sm:mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">내부 직원</h3>
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                총 {internalEmployees.length}명
              </span>
            </div>

            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full text-left text-[10px] sm:text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이름</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">소속사업부</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">직급</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">역할</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이메일</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">입사일</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {internalEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        등록된 내부 직원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    internalEmployees.map((user: any) => (
                      <tr key={user.id} className="transition hover:bg-slate-50 dark:bg-slate-900">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {user.bu_code ? BU_TITLES[user.bu_code] || user.bu_code : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.position || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                              user.role === 'admin'
                                ? 'bg-red-100 text-red-700'
                                : user.role === 'manager'
                                  ? 'bg-blue-100 text-blue-700'
                                  : user.role === 'member'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : user.role === 'artist'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                            )}
                          >
                            {user.role === 'admin'
                              ? '관리자'
                              : user.role === 'manager'
                                ? '매니저'
                                : user.role === 'member'
                                  ? '멤버'
                                  : user.role === 'artist'
                                    ? '아티스트'
                                    : '뷰어'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.email || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {user.hire_date ? new Date(user.hire_date).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onEditUser(user)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 hover:text-blue-600"
                            title="수정"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {orgViewTab === 'external' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">외주 인력 관리</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  총 {externalWorkers.length}명
                </span>
                <button
                  onClick={onAddExternalWorker}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  외주 인력 추가
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">구분</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이름</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">타입</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">회사명</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">소속사업부</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">전문분야</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">연락처</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">이메일</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">활성화</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {externalWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        등록된 외주 인력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    externalWorkers.map((w: any) => (
                      <tr key={w.id} className="transition hover:bg-slate-50 dark:bg-slate-900">
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                              w.is_partner_worker
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700',
                            )}
                          >
                            {w.is_partner_worker ? '파트너' : '사용자'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{w.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          {w.is_partner_worker ? (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                                w.worker_type === 'freelancer'
                                  ? 'bg-purple-100 text-purple-700'
                                  : w.worker_type === 'employee'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-100 text-slate-700',
                              )}
                            >
                              {w.worker_type === 'freelancer'
                                ? '프리랜서'
                                : w.worker_type === 'employee'
                                  ? '직원'
                                  : w.worker_type === 'contractor'
                                    ? '계약직'
                                    : '-'}
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                                w.role === 'admin'
                                  ? 'bg-red-100 text-red-700'
                                  : w.role === 'manager'
                                    ? 'bg-blue-100 text-blue-700'
                                    : w.role === 'member'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : w.role === 'artist'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                              )}
                            >
                              {w.role === 'admin'
                                ? '관리자'
                                : w.role === 'manager'
                                  ? '매니저'
                                  : w.role === 'member'
                                    ? '멤버'
                                    : w.role === 'artist'
                                      ? '아티스트'
                                      : '뷰어'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {w.is_partner_worker
                            ? w.partner_company_id
                              ? w.partner_company_name || '-'
                              : '개인'
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {w.bu_code ? BU_TITLES[w.bu_code] || w.bu_code : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {w.specialties && Array.isArray(w.specialties) && w.specialties.length > 0
                            ? w.specialties.join(', ')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{w.phone || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{w.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                              w.is_active !== false
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                            )}
                          >
                            {w.is_active !== false ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {w.is_partner_worker ? (
                              <>
                                <button
                                  onClick={() => onEditExternalWorker(w)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 hover:text-blue-600"
                                  title="수정"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteExternalWorker(w.partner_worker_id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                                  title="삭제"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => onEditUser(w)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 hover:text-blue-600"
                                title="수정"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {orgViewTab === 'users' && (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">회원 관리</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">전체 회원 리스트</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">총 {users.length}명</span>
              {isAdmin && (
                <button
                  onClick={onAddUser}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  회원 추가
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">이름</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">이메일</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">역할</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">소속사업부</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">직급</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-tight">입사일</th>
                  {isAdmin && (
                    <th className="px-4 py-3 font-bold uppercase tracking-tight">관리</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                      등록된 회원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => (
                    <tr key={u.id} className="transition hover:bg-slate-50 dark:bg-slate-900">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9px] font-semibold',
                            u.role === 'admin'
                              ? 'bg-red-100 text-red-700'
                              : u.role === 'manager'
                                ? 'bg-blue-100 text-blue-700'
                                : u.role === 'member'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : u.role === 'artist'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
                          )}
                        >
                          {u.role === 'admin'
                            ? '관리자'
                            : u.role === 'manager'
                              ? '매니저'
                              : u.role === 'member'
                                ? '멤버'
                                : u.role === 'artist'
                                  ? '아티스트'
                                  : '뷰어'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {u.bu_code ? BU_TITLES[u.bu_code] || u.bu_code : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.position || '-'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {u.hire_date ? new Date(u.hire_date).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onEditUser(u)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 hover:text-blue-600"
                            title="수정"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
