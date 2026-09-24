import { NextResponse } from 'next/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';

/**
 * 프로젝트 파트너 분배 설정 — 외부인·파트너 기능이라 누구에게나 막는다(R27).
 * 코드·테이블 칸은 남기고, 서버 접근만 403으로 닫는다. DB는 읽지도 쓰지도 않는다.
 */
async function blockedResponse(): Promise<NextResponse> {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  // permissions.ts의 canAccessExternalFeature와 같은 규칙(항상 거부, R27)
  return NextResponse.json({ error: '파트너 분배 설정은 사용할 수 없습니다.' }, { status: 403 });
}

export async function GET() {
  return blockedResponse();
}

export async function PATCH() {
  return blockedResponse();
}
