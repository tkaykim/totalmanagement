import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

// 프로젝트 참여자 삭제 (user_id 또는 external_worker_id로 식별)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id, participantId } = await params;
    const body = await request.json();

    // 현재 프로젝트의 participants 가져오기
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('participants')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const currentParticipants = (project?.participants as any[]) || [];
    
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
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    // 현재 프로젝트의 participants 가져오기
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('participants')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const currentParticipants = (project?.participants as any[]) || [];
    
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

