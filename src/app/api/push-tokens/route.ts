import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 푸시 토큰 관리 API
 */

// 푸시 토큰 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ tokens: tokens || [] });
  } catch (error: any) {
    console.error('Get push tokens error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// 푸시 토큰 등록/업데이트
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token, platform, device_id } = body;

    if (!token || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: token, platform' },
        { status: 400 }
      );
    }

    if (!['android', 'ios', 'web'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be android, ios, or web' },
        { status: 400 }
      );
    }

    // 1. 기존 중복 토큰 정리 (같은 사용자, 같은 플랫폼)
    // 웹의 경우 device_id가 있으면 (같은 기기 내에서만 정리) + 레거시(null) 정리
    let cleanupQuery = supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('platform', platform)
      .neq('token', token);

    if (platform === 'web' && device_id) {
      // 웹이면서 device_id가 있으면: 같은 device_id 인 것들 + device_id가 없는 것(레거시) 모두 정리
      cleanupQuery = cleanupQuery.or(`device_id.eq.${device_id},device_id.is.null`);
    } else if (device_id) {
      // 네이티브 등 다른 플랫폼인 경우
      cleanupQuery = cleanupQuery.eq('device_id', device_id);
    }

    const { error: cleanupError } = await cleanupQuery;
    if (cleanupError) {
      console.warn('Stale token cleanup failed:', cleanupError);
    }

    // 2. 새 토큰 등록/업데이트
    const { data, error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          platform,
          device_id: device_id || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Save push token error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// 푸시 토큰 비활성화 (로그아웃 시)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (token) {
      // 특정 토큰만 비활성화
      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('token', token);

      if (error) {
        throw error;
      }
    } else {
      // 모든 토큰 비활성화
      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete push token error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
