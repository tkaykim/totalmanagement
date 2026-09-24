import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { isGuardFailure, requireActiveStaff } from '@/lib/auth-guard';
import { STAFF_ROLES } from '@/lib/permissions';
import { isBuCode } from '@/lib/business-units';

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * 직원 목록 (재직 직원만, spec R1). 재직 가드 뒤 서비스 권한 클라이언트로 읽는다.
 * 응답: `{ users, retiredUsers, currentUser }`
 */
export async function GET() {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;

  try {
    const admin = await createPureClient();

    const { data: currentUser, error: currentError } = await admin
      .from('app_users')
      .select('*')
      .eq('id', guard.user.id)
      .maybeSingle();
    if (currentError) throw currentError;

    // 재직(active) 사용자만 기본 목록/선택용으로 사용
    const { data: activeUsers, error: activeError } = await admin
      .from('app_users')
      .select('*')
      .in('status', ['active'])
      .order('created_at', { ascending: false });
    if (activeError) throw activeError;

    // 휴면/퇴사 인원 별도 목록
    const { data: retiredUsers, error: retiredError } = await admin
      .from('app_users')
      .select('*')
      .in('status', ['dormant', 'retired'])
      .order('updated_at', { ascending: false });
    if (retiredError) throw retiredError;

    return NextResponse.json({
      users: activeUsers ?? [],
      retiredUsers: retiredUsers ?? [],
      currentUser: currentUser ?? guard.appUser,
    });
  } catch {
    return fail(500, '직원 목록을 불러오지 못했습니다.');
  }
}

/**
 * 관리자 직접 등록 (재직 상태로 생성). 관리자만.
 * 역할은 admin·leader·manager·member, 사업부는 7개 중 하나(비우면 null).
 * app_users 삽입이 실패하면 인증 계정을 지워 되돌린다.
 */
export async function POST(request: NextRequest) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  if (guard.appUser.role !== 'admin') {
    return fail(403, '관리자만 회원을 추가할 수 있습니다.');
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return fail(400, '요청 형식이 올바르지 않습니다.');
  }

  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  const name = String(body.name ?? '').trim();
  if (!email || !password || !name) {
    return fail(400, 'Missing required fields: email, password, name');
  }

  const role = body.role === undefined || body.role === '' ? 'member' : body.role;
  if (typeof role !== 'string' || !(STAFF_ROLES as readonly string[]).includes(role)) {
    return fail(400, '역할이 올바르지 않습니다.');
  }
  const buCode = body.bu_code === undefined || body.bu_code === '' || body.bu_code === null ? null : body.bu_code;
  if (buCode !== null && !isBuCode(buCode)) {
    return fail(400, '사업부가 올바르지 않습니다.');
  }

  try {
    const admin = await createPureClient();
    const { data: authData, error: signUpError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (signUpError || !authData?.user) {
      return fail(500, signUpError?.message || 'Failed to create user');
    }

    const { data: appUser, error: profileCreateError } = await admin
      .from('app_users')
      .insert({
        id: authData.user.id,
        name,
        email,
        role,
        bu_code: buCode,
        position: body.position || null,
        hire_date: body.hire_date || null,
        status: 'active',
      })
      .select()
      .single();

    if (profileCreateError) {
      await admin.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return fail(500, 'Failed to create user profile');
    }

    return NextResponse.json(appUser);
  } catch {
    return fail(500, '서버 오류가 발생했습니다.');
  }
}
