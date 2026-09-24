import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import { canEditProject, canViewProject } from '@/lib/permissions';
import { loadPermProject } from '@/app/api/projects/_lib/access';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 참여자 변경은 프로젝트 수정이다: 재직 → 보기 범위(404) → 수정 권한(403, R10) */
async function guardProjectEdit(id: string): Promise<{ error: NextResponse } | { supabase: any; participants: any[] }> {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return { error: guard };
  const supabase: any = await createPureClient();
  const loaded = await loadPermProject(supabase, id);
  if (!loaded || !canViewProject(guard.appUser, loaded.perm)) {
    return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) };
  }
  if (!canEditProject(guard.appUser, loaded.perm)) {
    return { error: NextResponse.json({ error: 'Permission denied' }, { status: 403 }) };
  }
  return { supabase, participants: (loaded.row.participants as any[]) || [] };
}

// 프로젝트 참여자 삭제 (user_id 또는 external_worker_id로 식별)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await guardProjectEdit(id);
    if ('error' in ctx) return ctx.error;
    const { supabase } = ctx;
    const body = await request.json();

    const currentParticipants = ctx.participants;
    
    // user_id 또는 external_worker_id로 참여자 찾아서 삭제
    const updatedParticipants = currentParticipants.filter((p: any) => {
      if (body.user_id) {
        return p.user_id !== body.user_id;
      }
      if (body.external_worker_id) {
        return p.external_worker_id !== body.external_worker_id;
      }
      return true;
    });

    // 프로젝트 업데이트
    const { error: updateError } = await supabase
      .from('projects')
      .update({ participants: updatedParticipants })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// 프로젝트 참여자 수정 (user_id 또는 external_worker_id로 식별)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await guardProjectEdit(id);
    if ('error' in ctx) return ctx.error;
    const { supabase } = ctx;
    const body = await request.json();

    const currentParticipants = ctx.participants;
    
    // user_id 또는 external_worker_id로 참여자 찾아서 수정
    const updatedParticipants = currentParticipants.map((p: any) => {
      const matches = (body.user_id && p.user_id === body.user_id) ||
                     (body.external_worker_id && p.external_worker_id === body.external_worker_id);
      
      if (matches) {
        return {
          ...p,
          role: body.role !== undefined ? body.role : p.role,
          is_pm: body.is_pm !== undefined ? body.is_pm : p.is_pm,
        };
      }
      return p;
    });

    // 프로젝트 업데이트
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ participants: updatedParticipants })
      .eq('id', id)
      .select('participants')
      .single();

    if (updateError) throw updateError;

    // 수정된 참여자 찾아서 반환
    const updatedParticipant = updatedParticipants.find((p: any) =>
      (body.user_id && p.user_id === body.user_id) ||
      (body.external_worker_id && p.external_worker_id === body.external_worker_id)
    );

    return NextResponse.json(updatedParticipant);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
