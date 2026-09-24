/**
 * 재무 화면 권한 — 구현은 `src/lib/financePermissions.ts`(판정은 `src/lib/permissions.ts`)에 있다.
 * 기존 import 경로 호환용 재수출이다. 여기에 규칙을 쓰지 않는다.
 */
export {
  checkFinancePermission,
  canViewFinanceForBu,
  filterFinanceEntriesForMember,
  canDeleteEntry,
  type FinancePermission,
} from '@/lib/financePermissions';
