'use client';

import { useState } from 'react';
import { Link2, Unlink, Users, AlertCircle } from 'lucide-react';
import { useGowidMembers, useGowidMappings, useCreateMapping, useDeleteMapping } from '../hooks';
import { useUsers } from '@/features/erp/hooks';
import type { GowidMember, GowidUserMapping } from '../types';

export function GowidUserMappingManager() {
  const { data: gowidMembers, isLoading: membersLoading } = useGowidMembers();
  const { data: mappings, isLoading: mappingsLoading } = useGowidMappings();
  const { data: erpUsersData } = useUsers();
  const createMapping = useCreateMapping();
  const deleteMapping = useDeleteMapping();

  const [selectedGowidId, setSelectedGowidId] = useState<number | null>(null);
  const [selectedErpId, setSelectedErpId] = useState<string>('');

  const erpUsers: { id: string; name?: string; email?: string; bu_code?: string }[] =
    erpUsersData && 'users' in erpUsersData ? erpUsersData.users : Array.isArray(erpUsersData) ? erpUsersData : [];
  const mappedGowidIds = new Set(mappings?.map((m) => m.gowid_user_id) ?? []);
  const mappedErpIds = new Set(mappings?.map((m) => m.erp_user_id) ?? []);

  const handleCreateMapping = () => {
    if (!selectedGowidId || !selectedErpId) return;

    const gowidMember = gowidMembers?.find((m) => m.userId === selectedGowidId);
    if (!gowidMember) return;

    createMapping.mutate(
      {
        erp_user_id: selectedErpId,
        gowid_user_id: selectedGowidId,
        gowid_user_name: gowidMember.userName,
        gowid_email: gowidMember.email,
      },
      {
        onSuccess: () => {
          setSelectedGowidId(null);
          setSelectedErpId('');
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('이 매핑을 해제하시겠습니까?')) {
      deleteMapping.mutate(id);
    }
  };

  if (membersLoading || mappingsLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          새 매핑 추가
        </h4>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-500 mb-1 block">Gowid 멤버</label>
            <select
              value={selectedGowidId ?? ''}
              onChange={(e) => setSelectedGowidId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">선택...</option>
              {gowidMembers
                ?.filter((m) => !mappedGowidIds.has(m.userId))
                .filter((m) => m.status !== 'DELETED')
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.userName} ({m.email}) - {m.department?.name || '부서 없음'}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-slate-500 mb-1 block">ERP 사용자</label>
            <select
              value={selectedErpId}
              onChange={(e) => setSelectedErpId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">선택...</option>
              {erpUsers
                .filter((u) => !mappedErpIds.has(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} {u.bu_code ? `(${u.bu_code})` : ''}
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={handleCreateMapping}
            disabled={!selectedGowidId || !selectedErpId || createMapping.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            매핑
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Users className="h-4 w-4" />
            현재 매핑 목록 ({mappings?.length ?? 0})
          </h4>
        </div>

        {(!mappings || mappings.length === 0) && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">아직 매핑된 사용자가 없습니다.</p>
          </div>
        )}

        {mappings && mappings.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                <th className="px-4 py-2 text-left">Gowid 멤버</th>
                <th className="px-4 py-2 text-left">Gowid 이메일</th>
                <th className="px-4 py-2 text-left">ERP 사용자</th>
                <th className="px-4 py-2 text-left">사업부</th>
                <th className="px-4 py-2 text-center w-20">해제</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">{m.gowid_user_name}</td>
                  <td className="px-4 py-2 text-slate-500">{m.gowid_email || '-'}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{m.erp_user_name || m.erp_user_id}</td>
                  <td className="px-4 py-2 text-slate-500">{m.erp_user_bu_code || '-'}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deleteMapping.isPending}
                      className="rounded p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition"
                    >
                      <Unlink className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
