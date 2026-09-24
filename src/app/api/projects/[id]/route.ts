import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import { canEditProject, canDeleteProject, canViewProject } from '@/lib/permissions';
import { isBuCode } from '@/lib/business-units';
import { createActivityLog, createProjectStatusChangeLog } from '@/lib/activity-logger';
import {
  notifyProjectPMAssigned,
  notifyProjectParticipantAdded,
  notifyProjectStatusChange,
} from '@/lib/notification-sender';
import { loadPermProject, pickAllowed, PROJECT_DELETE_BLOCKED_MESSAGE } from '@/app/api/projects/_lib/access';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** PATCH 허용 컬럼 (R4 기준 구현) */
const PROJECT_PATCH_COLUMNS = [
  'bu_code', 'brand_bu_code', 'delivery_bu_code', 'artist_management_bu_code',
  'name', 'category', 'status', 'start_date', 'end_date',
  'description', 'channel_id', 'pm_id', 'partner_id', 'participants',
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const loaded = await loadPermProject(supabase, id, 'name, status');
    // 볼 수 없는 프로젝트는 존재 여부를 알리지 않는다(spec 15절)
    if (!loaded || !canViewProject(appUser, loaded.perm)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const project = loaded.perm;
    const oldProject = loaded.row as { name?: string; status?: string };

    if (!canEditProject(appUser, project)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const picked = pickAllowed(body, PROJECT_PATCH_COLUMNS);

    for (const key of ['bu_code', 'brand_bu_code', 'delivery_bu_code'] as const) {
      if (key in picked && !isBuCode(picked[key])) {
        return NextResponse.json({ error: `${key} 값이 올바르지 않습니다.` }, { status: 400 });
      }
    }
    if ('artist_management_bu_code' in picked) {
      const v = picked.artist_management_bu_code;
      if (v === '') picked.artist_management_bu_code = null;
      else if (v !== null && !isBuCode(v)) {
        return NextResponse.json({ error: 'artist_management_bu_code 값이 올바르지 않습니다.' }, { status: 400 });
      }
    }

    // 사업부 이동: 옮긴 뒤에도 수정 권한이 있어야 한다(R10: 리더는 자기 사업부 안에서만)
    if ('bu_code' in picked && picked.bu_code !== project.bu_code) {
      if (!canEditProject(appUser, { ...project, bu_code: picked.bu_code as typeof project.bu_code })) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {
      ...picked,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Project update error:', error);
      throw error;
    }

    if (!updatedProject.participants) updatedProject.participants = [];

    const newStatus = picked.status as string | undefined;
    if (newStatus && oldProject?.status !== newStatus) {
      await createProjectStatusChangeLog(appUser.id, id, updatedProject.name, oldProject?.status || '', newStatus);

      const recipientIds: string[] = [];
      if (updatedProject.pm_id) recipientIds.push(updatedProject.pm_id);
      if (updatedProject.created_by) recipientIds.push(updatedProject.created_by);
      const { data: commentRows } = await supabase
        .from('comments')
        .select('author_id')
        .eq('entity_type', 'project')
        .eq('entity_id', Number(id));
      const commenterIds = [...new Set((commentRows || []).map((r: { author_id: string }) => r.author_id))];
      commenterIds.forEach((uid) => {
        if (uid && !recipientIds.includes(uid as string)) recipientIds.push(uid as string);
      });
      if (recipientIds.length > 0) {
        notifyProjectStatusChange(
          recipientIds,
          updatedProject.name,
          id,
          oldProject?.status || '',
          newStatus,
          appUser.name,
          appUser.id
        ).catch(console.error);
      }
    } else {
      await createActivityLog({
        userId: appUser.id,
        actionType: 'project_updated',
        entityType: 'project',
        entityId: id,
        entityTitle: updatedProject.name,
        metadata: { updated_fields: Object.keys(picked) },
      });
    }

    const newPm = picked.pm_id as string | undefined;
    if (newPm && newPm !== project.pm_id && newPm !== appUser.id) {
      await notifyProjectPMAssigned(newPm, updatedProject.name, id, appUser.name);
    }

    if (Array.isArray(picked.participants)) {
      const newParticipantIds = (picked.participants as any[])
        .map((p: any) => p?.user_id)
        .filter((pid: string) => pid && !project.participants.includes(pid) && pid !== appUser.id && pid !== newPm);
      for (const participantId of newParticipantIds) {
        await notifyProjectParticipantAdded(participantId, updatedProject.name, id, appUser.name);
      }
    }

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    console.error('Failed to update project:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]
 * - 매출·지출이 한 건이라도 붙어 있으면(상태 무관) 409와 보류 안내(R15). 삭제 호출 전에 확인한다.
 * - 삭제 권한은 기존 규칙 + R10(`canDeleteProject`).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const { id } = await params;

    const loaded = await loadPermProject(supabase, id);
    if (!loaded || !canViewProject(appUser, loaded.perm)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!canDeleteProject(appUser, loaded.perm)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { data: financeRows, error: financeError } = await supabase
      .from('financial_entries')
      .select('id')
      .eq('project_id', id)
      .limit(1);
    if (financeError) throw financeError;
    if (financeRows && financeRows.length > 0) {
      return NextResponse.json({ error: PROJECT_DELETE_BLOCKED_MESSAGE }, { status: 409 });
    }

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      // DB 트리거(R15)가 경합 중 생긴 재무 행을 이유로 거부한 경우도 같은 안내를 준다
      const message = String(error?.message ?? '');
      if (message.includes('financial') || message.includes('재무')) {
        return NextResponse.json({ error: PROJECT_DELETE_BLOCKED_MESSAGE }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
