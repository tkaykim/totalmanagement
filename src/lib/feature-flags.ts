/**
 * 서버 전환 스위치 (spec R32).
 *
 * `ERP_AUDIT_V2`: 새 DB 칸(`updated_by`, 변경 기록 테이블)에 의존하는 동작을 켠다.
 * - 꺼짐(기본값): `updated_by`를 쓰지 않고, 변경 기록 조회 API는 `{ changes: [], enabled: false }`를 돌려준다.
 * - 정확히 `'1'`일 때만 켜진다.
 *
 * 서버 환경변수다. `NEXT_PUBLIC_` 접두를 붙이지 않는다(화면은 API 응답의 `enabled`로 판단한다).
 */
export function isAuditV2Enabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.ERP_AUDIT_V2 === '1';
}
