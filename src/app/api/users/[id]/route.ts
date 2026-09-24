import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { isGuardFailure, requireActiveStaff } from '@/lib/auth-guard';
import { canChangeUserRoleBuStatus, canManageUsers, STAFF_ROLES } from '@/lib/permissions';
import { isBuCode } from '@/lib/business-units';
import { isAuditV2Enabled } from '@/lib/feature-flags';

/**
 * 직원 정보 수정 (spec R22·R23).
 *
 * - 재직 가드 뒤 서비스 권한 클라이언트로 읽고 쓴다.
 * - 수정은 재직 관리자만 한다(`canManageUsers`). 재직(active)으로 남거나 바뀌는 사람은 사업부가 있어야 한다. 역할·사업부·재직 상태 변경은 `canChangeUserRoleBuStatus`로
 *   판정해 본인 값은 관리자라도 403이다. 값이 그대로면 변경으로 보지 않는다.
 * - 허용 컬럼만 받는다. 새로 줄 수 있는 역할은 admin·leader·manager·member뿐이다.
 * - `updated_by`는 감사 스위치(`ERP_AUDIT_V2`)가 켜졌을 때만 쓴다.
 * - 사람 행은 지우지 않는다. 퇴사는 `status='retired'`다.
 */

const USER_STATUSES = ['active', 'dormant', 'retired'] as const;

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return fail(400, '요청 형식이 올바르지 않습니다.');
  }

  const { id } = await params;

  try {
    const admin = await createPureClient();
    const { data: target, error: targetError } = await admin
      .from('app_users')
      .select('id, role, bu_code, status')
      .eq('id', id)
      .maybeSingle();
    if (targetError) return fail(500, '사용자 정보를 불러오지 못했습니다.');

    // 관리자 아닌 직원은 어떤 칸도 못 고친다(존재 여부보다 권한을 먼저 알린다).
    if (!canManageUsers(appUser)) return fail(403, '관리자만 수정할 수 있습니다.');
    if (!target) return fail(404, '사용자를 찾을 수 없습니다.');

    const current = target as { id: string; role: string | null; bu_code: string | null; status: string | null };
    const updateData: Record<string, unknown> = {};

    // 역할·사업부·재직 상태 (R22)
    if (body.role !== undefined && body.role !== current.role) {
      if (typeof body.role !== 'string' || !(STAFF_ROLES as readonly string[]).includes(body.role)) {
        return fail(400, '역할이 올바르지 않습니다.');
      }
      updateData.role = body.role;
    }
    if (body.bu_code !== undefined) {
      const nextBu = body.bu_code === '' || body.bu_code === null ? null : body.bu_code;
      if (nextBu !== current.bu_code) {
        if (nextBu !== null && !isBuCode(nextBu)) return fail(400, '사업부가 올바르지 않습니다.');
        updateData.bu_code = nextBu;
      }
    }
    if (body.status !== undefined && body.status !== current.status) {
      if (typeof body.status !== 'string' || !(USER_STATUSES as readonly string[]).includes(body.status)) {
        return fail(400, '재직 상태가 올바르지 않습니다.');
      }
      updateData.status = body.status;
    }

    const changesRoleBuStatus = 'role' in updateData || 'bu_code' in updateData || 'status' in updateData;
    if (changesRoleBuStatus && !canChangeUserRoleBuStatus(appUser, id)) {
      return fail(403, '본인의 역할·사업부·재직 상태는 바꿀 수 없습니다.');
    }

    // 재직(active)인 사람은 사업부가 있어야 한다(사업부 없는 재직자는 가드가 막는다)
    if ('bu_code' in updateData || 'status' in updateData) {
      const nextStatus = 'status' in updateData ? updateData.status : current.status;
      const nextBu = 'bu_code' in updateData ? updateData.bu_code : current.bu_code;
      if (nextStatus === 'active' && !nextBu) return fail(400, '재직 직원은 사업부가 필요합니다.');
    }

    // 그 밖의 허용 컬럼
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.position !== undefined) updateData.position = body.position || null;
    if (body.hire_date !== undefined) updateData.hire_date = body.hire_date || null;

    updateData.updated_at = new Date().toISOString();
    if (isAuditV2Enabled()) updateData.updated_by = appUser.id;

    const { data, error } = await admin.from('app_users').update(updateData).eq('id', id).select().maybeSingle();
    if (error) return fail(500, '사용자 정보를 저장하지 못했습니다.');
    if (!data) return fail(404, '사용자를 찾을 수 없습니다.');

    return NextResponse.json(data);
  } catch {
    return fail(500, '서버 오류가 발생했습니다.');
  }
}
