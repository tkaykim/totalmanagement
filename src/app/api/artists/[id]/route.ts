import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    // 먼저 기존 데이터를 조회하여 타입 확인
    const { data: existingData, error: fetchError } = await supabase
      .from('artists')
      .select('type, team_id')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return NextResponse.json({ error: `Failed to fetch artist: ${fetchError.message}` }, { status: 404 });
    }
    
    if (!existingData) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const updateData: any = {};
    
    // 최종 타입 결정 (body.type이 있으면 그것을 사용, 없으면 기존 타입 유지)
    const finalType = body.type !== undefined ? body.type : existingData.type;
    
    // 필드 업데이트
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nationality !== undefined) updateData.nationality = body.nationality;
    if (body.visa_type !== undefined) updateData.visa_type = body.visa_type;
    if (body.contract_start !== undefined) updateData.contract_start = body.contract_start;
    if (body.contract_end !== undefined) updateData.contract_end = body.contract_end;
    if (body.visa_start !== undefined) updateData.visa_start = body.visa_start;
    if (body.visa_end !== undefined) updateData.visa_end = body.visa_end;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.status !== undefined) updateData.status = body.status;
    
    // 타입 업데이트 처리
    if (body.type !== undefined) {
      updateData.type = body.type;
      // 타입이 'team'으로 변경되면 team_id를 null로 설정 (제약조건 준수)
      if (body.type === 'team') {
        updateData.team_id = null;
      }
    }
    
    // team_id 업데이트 처리 (타입 변경 후 처리)
    if (body.team_id !== undefined) {
      // 최종 타입이 'individual'인 경우에만 team_id 설정 가능
      if (finalType === 'individual') {
        updateData.team_id = body.team_id || null;
      } else {
        // 타입이 'team'인 경우 team_id를 null로 설정 (제약조건 준수)
        updateData.team_id = null;
      }
    }
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('artists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json({ error: `Failed to update artist: ${error.message}` }, { status: 500 });
    }

    // 아티스트가 'individual' 타입이고, 'GRIGO' 사업부인 경우 dancers 테이블에도 업데이트
    if (data.type === 'individual' && data.bu_code === 'GRIGO') {
      try {
        // 기존 댄서 엔트리 조회 (name으로 찾기)
        const { data: existingDancers, error: fetchDancerError } = await supabase
          .from('dancers')
          .select('*')
          .eq('bu_code', data.bu_code)
          .eq('name', data.name)
          .limit(1);

        if (fetchDancerError) {
          console.warn('Failed to fetch existing dancer entry:', fetchDancerError);
        } else if (existingDancers && existingDancers.length > 0) {
          // 기존 댄서 엔트리가 있으면 업데이트
          const dancerUpdateData: any = {
            name: data.name,
            nickname_ko: data.name,
            company: '그리고 엔터테인먼트',
          };
          if (data.nationality) {
            dancerUpdateData.nationality = data.nationality;
          }

          const { error: dancerUpdateError } = await supabase
            .from('dancers')
            .update(dancerUpdateData)
            .eq('id', existingDancers[0].id);

          if (dancerUpdateError) {
            console.warn('Failed to update corresponding dancer entry for artist:', dancerUpdateError);
          }
        } else {
          // 기존 댄서 엔트리가 없으면 생성
          const dancerInsertData: any = {
            bu_code: data.bu_code,
            name: data.name,
            nickname_ko: data.name,
            company: '그리고 엔터테인먼트',
          };
          if (data.nationality) {
            dancerInsertData.nationality = data.nationality;
          }

          const { error: dancerCreateError } = await supabase
            .from('dancers')
            .insert(dancerInsertData);

          if (dancerCreateError) {
            console.warn('Failed to create corresponding dancer entry for artist:', dancerCreateError);
          }
        }
      } catch (dancerError) {
        console.warn('Failed to update/create corresponding dancer entry for artist:', dancerError);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { error } = await supabase.from('artists').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


