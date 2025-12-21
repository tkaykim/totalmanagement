import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import type { BU, CreatorType, CreatorStatus } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase.from('creators').select('*').order('created_at', { ascending: false });

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
    const authSupabase = await createClient();
    const body = await request.json();

    // 필수 필드 검증
    if (!body.bu_code || !body.name || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: bu_code, name, type' },
        { status: 400 }
      );
    }

    // 타입 검증
    const validTypes: CreatorType[] = ['creator', 'celebrity', 'influencer'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // 상태 검증 (기본값 'active')
    const validStatuses: CreatorStatus[] = ['active', 'inactive', 'archived'];
    const status = body.status || 'active';
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // 현재 사용자 가져오기
    let createdBy: string | null = null;
    try {
      const { data: { user } } = await authSupabase.auth.getUser();
      if (user) {
        createdBy = user.id;
      }
    } catch (userError) {
      // 사용자 정보를 가져올 수 없어도 계속 진행 (created_by는 nullable)
      console.warn('Could not get current user:', userError);
    }

    const { data, error } = await supabase
      .from('creators')
      .insert({
        bu_code: body.bu_code,
        name: body.name,
        type: body.type,
        platform: body.platform || null,
        channel_id: body.channel_id || null,
        subscribers_count: body.subscribers_count || null,
        engagement_rate: body.engagement_rate || null,
        contact_person: body.contact_person || null,
        phone: body.phone || null,
        email: body.email || null,
        agency: body.agency || null,
        fee_range: body.fee_range || null,
        specialties: body.specialties || null,
        status: status,
        notes: body.notes || null,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

