import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createPureClient();

    const { data: units, error: unitsError } = await supabase
      .from('org_units')
      .select('*')
      .order('sort_order', { ascending: true });

    if (unitsError) throw unitsError;

    // org_members 테이블이 존재하지 않을 수 있으므로 에러 처리
    const { data: members, error: membersError } = await supabase
      .from('org_members')
      .select('*')
      .order('is_leader', { ascending: false });

    // org_members 테이블이 없을 경우 빈 배열로 처리
    if (membersError) {
      // 테이블이 존재하지 않는 경우 빈 결과 반환
      const result = units?.map((unit) => ({
        ...unit,
        members: [],
      })) || [];
      return NextResponse.json(result);
    }

    const result = units?.map((unit) => ({
      ...unit,
      members: members?.filter((m) => m.org_unit_id === unit.id) || [],
    })) || [];

    // org_unit_id가 null인 멤버들을 별도로 추가
    const membersWithoutOrg = members?.filter((m) => !m.org_unit_id) || [];
    if (membersWithoutOrg.length > 0) {
      result.push({
        id: null,
        name: '소속 없음',
        sort_order: 9999,
        created_at: new Date().toISOString(),
        members: membersWithoutOrg,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('org_members')
      .insert({
        org_unit_id: body.org_unit_id || null,
        name: body.name,
        title: body.title || null,
        bu_code: body.bu_code || null,
        phone: body.phone || null,
        email: body.email || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
        is_leader: body.is_leader || false,
        user_id: body.user_id || null,
      })
      .select()
      .single();

    if (error) {
      // org_members 테이블이 존재하지 않는 경우
      return NextResponse.json(
        { error: 'org_members 테이블이 존재하지 않습니다. 이 기능을 사용하려면 테이블을 생성해야 합니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


