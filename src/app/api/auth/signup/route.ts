import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { isBuCode } from '@/lib/business-units';

/**
 * 가입 신청 (spec R20). 응답 계약은 reactstudio.kr `api/admin/signup`과 같다.
 *
 * - 로그인 없이 부르는 라우트다. 브라우저가 `app_users`에 직접 넣던 경로를 대신한다.
 * - 인증 계정은 이메일 확인 완료 상태로 만들고, `app_users`에 `pending` 행을 넣는다.
 *   `app_users` 삽입이 실패하면 인증 계정을 지워 되돌린다.
 * - 승인 전까지 `bu_code`는 비우고 `role='member'`로 둔다. 승인은 `api/users/signup-requests/[id]/approve`.
 */

const MIN_PASSWORD_LENGTH = 8;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

function isEmailExistsError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return true;
  return /already (been )?registered|already exists/i.test(error.message ?? '');
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return fail(400, '요청 형식이 올바르지 않습니다.');
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const requestedBuCode = body.requested_bu_code;
  const signupMessage =
    typeof body.signup_message === 'string' && body.signup_message.trim() ? body.signup_message.trim() : null;

  if (!name || !email || !password) {
    return fail(400, '이름·이메일·비밀번호를 입력하세요.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(400, `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
  }
  if (!isBuCode(requestedBuCode)) {
    return fail(400, '소속 사업부를 선택하세요.');
  }

  try {
    const admin = await createPureClient();

    const { data: existingRows, error: existingError } = await admin
      .from('app_users')
      .select('id, status')
      .eq('email', email)
      .limit(1);
    if (existingError) {
      return fail(500, '가입 확인 중 오류가 발생했습니다.');
    }
    const existing = (existingRows as Array<{ id: string; status: string | null }> | null)?.[0];
    if (existing) {
      return fail(
        409,
        existing.status === 'pending'
          ? '이미 신청된 이메일입니다. 승인을 기다려 주세요.'
          : '이미 가입된 이메일입니다.'
      );
    }

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (authError || !created?.user) {
      if (isEmailExistsError(authError)) {
        return fail(409, '이미 가입된 이메일입니다.');
      }
      return fail(500, '계정 생성에 실패했습니다.');
    }

    const { error: insertError } = await admin.from('app_users').insert({
      id: created.user.id,
      name,
      email,
      role: 'member',
      bu_code: null,
      status: 'pending',
      requested_bu_code: requestedBuCode,
      signup_message: signupMessage,
      signup_requested_at: new Date().toISOString(),
    });

    if (insertError) {
      // 되돌림: 방금 만든 인증 계정을 지운다(사람 행은 만들어지지 않았다).
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      return fail(500, '가입 신청 저장에 실패했습니다.');
    }

    return NextResponse.json({ ok: true });
  } catch {
    return fail(500, '서버 오류가 발생했습니다.');
  }
}
