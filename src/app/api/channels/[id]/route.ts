import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';
import type { ChannelStatus, AdStatus } from '@/types/database';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createPureClient();
    const authSupabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // 상태 검증 (제공된 경우)
    if (body.status) {
      const validStatuses: ChannelStatus[] = ['active', 'growing', 'inactive', 'archived'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // 광고 상태 검증 (제공된 경우)
    if (body.ad_status) {
      const validAdStatuses: AdStatus[] = ['active', 'paused', 'completed', 'none'];
      if (!validAdStatuses.includes(body.ad_status)) {
        return NextResponse.json(
          { error: `Invalid ad_status. Must be one of: ${validAdStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // manager_id가 변경되고 manager_name이 제공되지 않으면 자동 설정
    let managerName = body.manager_name;
    if (body.manager_id !== undefined && !managerName) {
      if (body.manager_id) {
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
      } else {
        managerName = null;
      }
    }

    // 업데이트할 필드만 포함
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.bu_code !== undefined) updateData.bu_code = body.bu_code;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.url !== undefined) updateData.url = body.url || null;
    if (body.subscribers_count !== undefined) updateData.subscribers_count = body.subscribers_count || null;
    if (body.total_views !== undefined) updateData.total_views = body.total_views || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.production_company !== undefined) updateData.production_company = body.production_company || null;
    if (body.ad_status !== undefined) updateData.ad_status = body.ad_status;
    if (body.manager_id !== undefined) {
      updateData.manager_id = body.manager_id || null;
      if (managerName !== undefined) {
        updateData.manager_name = managerName;
      }
    } else if (managerName !== undefined) {
      updateData.manager_name = managerName;
    }
    if (body.next_upload_date !== undefined) updateData.next_upload_date = body.next_upload_date || null;
    if (body.recent_video !== undefined) updateData.recent_video = body.recent_video || null;
    if (body.upload_days !== undefined) updateData.upload_days = body.upload_days || null;

    const { data, error } = await supabase
      .from('channels')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { error } = await supabase.from('channels').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}




