import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu');

    let query = supabase
      .from('artists')
      .select('*')
      .order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    // 필수 필드 검증
    if (!body.name || !body.contract_start || !body.contract_end) {
      return NextResponse.json(
        { error: '이름, 계약 시작일, 계약 종료일은 필수 항목입니다.' },
        { status: 400 }
      );
    }

    // insert 객체 생성 (빈 문자열은 null로 변환)
    const insertData: any = {
      bu_code: body.bu_code,
      name: body.name,
      type: body.type || 'individual',
      contract_start: body.contract_start,
      contract_end: body.contract_end,
      status: body.status || 'Active',
    };

    // 선택적 필드 추가 (빈 문자열이 아닌 경우만)
    if (body.team_id !== undefined && body.team_id !== null) {
      // 개인 아티스트만 팀에 소속 가능
      if (insertData.type === 'individual') {
        insertData.team_id = body.team_id;
      }
    }
    if (body.nationality !== undefined && body.nationality !== '') {
      insertData.nationality = body.nationality;
    }
    if (body.visa_type !== undefined && body.visa_type !== '') {
      insertData.visa_type = body.visa_type;
    }
    if (body.visa_start !== undefined && body.visa_start !== '') {
      insertData.visa_start = body.visa_start;
    }
    if (body.visa_end !== undefined && body.visa_end !== '') {
      insertData.visa_end = body.visa_end;
    }
    if (body.role !== undefined && body.role !== '') {
      insertData.role = body.role;
    }

    const { data, error } = await supabase
      .from('artists')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Artist creation error:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to create artist:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}


