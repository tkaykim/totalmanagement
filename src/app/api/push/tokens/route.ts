import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 관리자용 - 특정 사용자들의 푸시 토큰 조회
 * GET /api/push/tokens?userIds=id1,id2,id3
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // admin 권한 확인
        const { data: appUser } = await supabase
            .from('app_users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!appUser || appUser.role !== 'admin') {
            return NextResponse.json(
                { error: 'Admin 권한이 필요합니다.' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const userIdsParam = searchParams.get('userIds');

        if (!userIdsParam) {
            return NextResponse.json(
                { error: 'userIds 파라미터가 필요합니다.' },
                { status: 400 }
            );
        }

        const userIds = userIdsParam.split(',').filter(Boolean);

        const { data: tokens, error } = await supabase
            .from('push_tokens')
            .select('user_id, platform, is_active, updated_at, token')
            .in('user_id', userIds)
            .order('updated_at', { ascending: false });

        if (error) {
            throw error;
        }

        // user_id별로 그룹화
        const tokensByUser: Record<string, {
            platform: string;
            isActive: boolean;
            updatedAt: string;
            tokenPreview: string;
        }[]> = {};

        for (const t of tokens ?? []) {
            if (!tokensByUser[t.user_id]) {
                tokensByUser[t.user_id] = [];
            }
            tokensByUser[t.user_id].push({
                platform: t.platform,
                isActive: t.is_active,
                updatedAt: t.updated_at,
                tokenPreview: t.token.substring(0, 16) + '...',
            });
        }

        return NextResponse.json({ tokensByUser });
    } catch (error: any) {
        console.error('Fetch user tokens error:', error);
        return NextResponse.json(
            { error: error?.message || String(error) },
            { status: 500 }
        );
    }
}
