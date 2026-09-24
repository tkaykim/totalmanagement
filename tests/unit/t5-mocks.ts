/**
 * T5 라우트 테스트 공통 상태. 각 테스트 파일이 vi.mock 안에서 이 상태를 읽는다.
 */
import { NextResponse } from 'next/server';
import { FakeDb } from './t5-fake-supabase';

export const t5State: { db: FakeDb; guard: unknown } = {
  db: new FakeDb(),
  guard: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
};

export function signInAs(appUser: { id: string } & Record<string, unknown>) {
  t5State.guard = { user: { id: appUser.id }, appUser };
}

export function signOut() {
  t5State.guard = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function blocked() {
  t5State.guard = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
