import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // app_users 테이블에서 추가 정보 가져오기
    const { data: appUser } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    // 퇴사 처리된 사용자는 로그인 불가
    if (appUser?.status === 'retired') {
      return NextResponse.json({ user: null, blocked: 'retired' }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        ...user,
        profile: appUser,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

