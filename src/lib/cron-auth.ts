import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * 크론 요청 인증 판정.
 * - `Authorization: Bearer <CRON_SECRET>`만 받는다(Vercel Cron이 자동으로 붙인다).
 * - `CRON_SECRET`이 비어 있으면 항상 거부한다.
 */
export function isAuthorizedCronRequest(
  authHeader: string | null,
  cronSecret: string | undefined
): boolean {
  if (!cronSecret || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** 인증 실패 시 401 응답을, 통과 시 null을 돌려준다. */
export function rejectUnauthorizedCron(request: Request): NextResponse | null {
  if (isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return null;
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
