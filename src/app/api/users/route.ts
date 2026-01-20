import { NextRequest, NextResponse } from 'next/server';
import { createClient, createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 사용자 프로필 가져오기
    const { data: currentUser, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 모든 사용자 조회 (모든 사용자가 볼 수 있음)
    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    return NextResponse.json({
      users,
      currentUser,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 사용자 프로필 가져오기
    const { data: currentUser, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // admin 권한 체크
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 필수 필드 검증
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json({ error: 'Missing required fields: email, password, name' }, { status: 400 });
    }

    // Admin API를 사용하여 사용자 생성
    const adminClient = await createPureClient();
    const { data: authData, error: signUpError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // 이메일 확인 자동 처리
      user_metadata: {
        name: body.name,
      },
    });

    if (signUpError || !authData.user) {
      return NextResponse.json({ error: signUpError?.message || 'Failed to create user' }, { status: 500 });
    }

    // app_users 테이블에 프로필 추가
    const { data: appUser, error: profileCreateError } = await supabase
      .from('app_users')
      .insert({
        id: authData.user.id,
        name: body.name,
        email: body.email,
        role: body.role || 'member',
        bu_code: body.bu_code || null,
        position: body.position || null,
        hire_date: body.hire_date || null,
      })
      .select()
      .single();

    if (profileCreateError) {
      // 프로필 생성 실패 시 생성된 사용자 삭제
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    return NextResponse.json(appUser);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

