import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import type { BU, ChannelStatus, AdStatus } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase.from('channels').select('*').order('created_at', { ascending: false });

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
    if (!body.bu_code || !body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: bu_code, name' },
        { status: 400 }
      );
    }

    // 상태 검증 (기본값 'active')
    const validStatuses: ChannelStatus[] = ['active', 'growing', 'inactive', 'archived'];
    const status = body.status || 'active';
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // 광고 상태 검증 (기본값 'none')
    const validAdStatuses: AdStatus[] = ['active', 'paused', 'completed', 'none'];
    const adStatus = body.ad_status || 'none';
    if (!validAdStatuses.includes(adStatus)) {
      return NextResponse.json(
        { error: `Invalid ad_status. Must be one of: ${validAdStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // manager_id가 제공되면 manager_name 자동 설정
    let managerName = body.manager_name || null;
    if (body.manager_id && !managerName) {
      try {
        const { data: appUser } = await authSupabase
          .from('app_users')
          .select('name')
          .eq('id', body.manager_id)
          .single();
        
        if (appUser?.name) {
          managerName = appUser.name;
        }
      } catch (userError) {
        // 사용자 정보를 가져올 수 없어도 계속 진행
        console.warn('Could not get manager name:', userError);
      }
    }

    const { data, error } = await supabase
      .from('channels')
      .insert({
        bu_code: body.bu_code,
        name: body.name,
        url: body.url || null,
        subscribers_count: body.subscribers_count || null,
        total_views: body.total_views || null,
        status: status,
        production_company: body.production_company || null,
        ad_status: adStatus,
        manager_id: body.manager_id || null,
        manager_name: managerName,
        next_upload_date: body.next_upload_date || null,
        recent_video: body.recent_video || null,
        upload_days: body.upload_days || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}




