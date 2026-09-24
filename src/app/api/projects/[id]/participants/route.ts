import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';
import { canEditProject, canViewProject } from '@/lib/permissions';
import { notifyProjectParticipantAdded } from '@/lib/notification-sender';
import { loadPermProject } from '@/app/api/projects/_lib/access';

/* eslint-disable @typescript-eslint/no-explicit-any */

// 프로젝트 참여자 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;

  try {
    const supabase: any = await createPureClient();
    const { id } = await params;

    // 프로젝트 보기 범위(R8). 볼 수 없으면 404.
    const loaded = await loadPermProject(supabase, id);
    if (!loaded || !canViewProject(guard.appUser, loaded.perm)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(loaded.row.participants || []);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 프로젝트 참여자 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;
  const { appUser } = guard;

  try {
    const supabase: any = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    // 참여자 변경은 프로젝트 수정이다: 보기 범위(404) → 수정 권한(403, R10)
    const loaded = await loadPermProject(supabase, id);
    if (!loaded || !canViewProject(appUser, loaded.perm)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (!canEditProject(appUser, loaded.perm)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // user_id 또는 external_worker_id 중 하나는 필수
    if (!body.user_id && !body.external_worker_id) {
      return NextResponse.json(
        { error: 'user_id or external_worker_id is required' },
        { status: 400 }
      );
    }

    const currentParticipants = (loaded.row.participants as any[]) || [];
    
    // 중복 체크
    const isDuplicate = currentParticipants.some((p: any) => 
      (body.user_id && p.user_id === body.user_id) ||
      (body.external_worker_id && p.external_worker_id === body.external_worker_id)
    );

    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Participant already exists' },
        { status: 400 }
      );
    }

    // 새 참여자 추가
    const newParticipant = {
      user_id: body.user_id || null,
      external_worker_id: body.external_worker_id || null,
      role: body.role || 'participant',
      is_pm: body.is_pm || false,
    };

    const updatedParticipants = [...currentParticipants, newParticipant];

    // 프로젝트 업데이트
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ participants: updatedParticipants })
      .eq('id', id)
      .select('participants')
      .single();

    if (updateError) throw updateError;

    // 참여자에게 알림 전송 (내부 사용자인 경우에만)
    if (body.user_id) {
      try {
        // 본인이 아닌 경우에만 알림
        if (body.user_id !== appUser.id) {
          const projectResult = await supabase.from('projects').select('name').eq('id', id).maybeSingle();
          const projectName = projectResult.data?.name || '프로젝트';

          await notifyProjectParticipantAdded(
            body.user_id,
            projectName,
            id,
            appUser.name
          );
        }
      } catch (notifyError) {
        console.error('Failed to send participant notification:', notifyError);
      }
    }

    return NextResponse.json(newParticipant);
  } catch (error: any) {
    console.error('Failed to create participant:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

