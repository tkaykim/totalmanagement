'use client';

import { useEffect, useState } from 'react';
import {
  formatChangeValue,
  formatChangedAtKst,
  formatInsertSummary,
  getChangeFieldLabel,
  getChangeLogUrl,
  getChangeSourceLabel,
  type ChangeLogItem,
  type ChangeLogKind,
  type ChangeLogResponse,
} from '../change-log';

/**
 * 변경 기록 목록 (spec R18·R19·R32).
 *
 * - `kind='financial-entry'`: 매출·지출 행 상세 화면용(관리자·행 사업부 리더·등록자)
 * - `kind='user'`: 직원 상세 화면용(관리자만)
 *
 * 스위치가 꺼졌거나(`enabled: false`), 권한이 없거나(403·404), 불러오기에 실패하면 아무것도 그리지 않는다.
 */
export function ChangeLogList({
  kind,
  id,
  className = '',
}: {
  kind: ChangeLogKind;
  id: string | number | null | undefined;
  className?: string;
}) {
  const [changes, setChanges] = useState<ChangeLogItem[] | null>(null);

  useEffect(() => {
    if (id === null || id === undefined || id === '') {
      setChanges(null);
      return;
    }
    let cancelled = false;
    setChanges(null);
    fetch(getChangeLogUrl(kind, id), { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = (await res.json()) as ChangeLogResponse;
        return body.enabled && Array.isArray(body.changes) ? body.changes : null;
      })
      .catch(() => null)
      .then((result) => {
        if (!cancelled) setChanges(result);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  if (!changes) return null;

  return (
    <section className={`rounded-lg border border-slate-200 dark:border-slate-700 ${className}`}>
      <h4 className="border-b border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
        변경 기록
      </h4>
      {changes.length === 0 ? (
        <p className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">변경 기록이 없습니다.</p>
      ) : (
        <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {changes.map((c) => (
            <li key={c.id} className="px-3 py-2 text-xs" style={{ wordBreak: 'keep-all' }}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {getChangeFieldLabel(kind, c.field)}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {c.action === 'insert'
                    ? formatInsertSummary(c.new_value)
                    : `${formatChangeValue(kind, c.field, c.old_value)} → ${formatChangeValue(kind, c.field, c.new_value)}`}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{formatChangedAtKst(c.changed_at)}</span>
                <span>{c.changed_by_name ?? (c.changed_by ? '알 수 없음' : '-')}</span>
                <span
                  className={
                    c.source === 'erp'
                      ? 'rounded bg-slate-100 px-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      : 'rounded bg-amber-50 px-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }
                >
                  {getChangeSourceLabel(c.source)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
