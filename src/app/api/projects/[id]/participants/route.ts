import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

// 프로젝트 참여자 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { data: project, error } = await supabase
      .from('projects')
      .select('participants')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(project?.participants || []);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 프로젝트 참여자 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    // user_id 또는 external_worker_id 중 하나는 필수
    if (!body.user_id && !body.external_worker_id) {
      return NextResponse.json(
        { error: 'user_id or external_worker_id is required' },
        { status: 400 }
      );
    }

    // 현재 프로젝트의 participants 가져오기
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('participants')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const currentParticipants = (project?.participants as any[]) || [];
    
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

    return NextResponse.json(newParticipant);
  } catch (error: any) {
    console.error('Failed to create participant:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

