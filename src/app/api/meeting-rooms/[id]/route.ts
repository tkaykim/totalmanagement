import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import { pickAllowed } from '@/app/api/projects/_lib/access';

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH 허용 컬럼 (R4). `id`, `created_at` 등은 무시한다. */
const MEETING_ROOM_PATCH_COLUMNS = ['name', 'description', 'capacity', 'location', 'is_active'] as const;

/** 회의실 수정·삭제는 지금처럼 관리자만 한다(R4). */
async function requireAdmin(message: string) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  if (guard.appUser.role !== 'admin') {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;

  try {
    const { id } = await context.params;
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('meeting_rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const denied = await requireAdmin('관리자만 회의실을 수정할 수 있습니다.');
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);

    const pureClient = await createPureClient();
    const { data, error } = await pureClient
      .from('meeting_rooms')
      .update({
        ...pickAllowed(body, MEETING_ROOM_PATCH_COLUMNS),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const denied = await requireAdmin('관리자만 회의실을 삭제할 수 있습니다.');
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const pureClient = await createPureClient();
    const { error } = await pureClient.from('meeting_rooms').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
