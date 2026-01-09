import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canModifyAttendance, canAccessAttendanceLog } from '@/features/attendance/lib/permissions';
import { toKSTISOString } from '@/lib/timezone.server';
import type { AppUser } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { data: log, error: logError } = await supabase
      .from('attendance_logs')
      .select('*, app_users!attendance_logs_user_id_fkey(id, name, email, role, bu_code, position)')
      .eq('id', id)
      .single();

    if (logError || !log) {
      return NextResponse.json({ error: 'Attendance log not found' }, { status: 404 });
    }

    const targetUser = log.app_users;
    if (!canAccessAttendanceLog(currentUser as AppUser, log.user_id, targetUser?.bu_code)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(log);
  } catch (error: any) {
    console.error('Get attendance log error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { data: existingLog, error: logError } = await supabase
      .from('attendance_logs')
      .select('*, app_users!attendance_logs_user_id_fkey(id, name, bu_code)')
      .eq('id', id)
      .single();

    if (logError || !existingLog) {
      return NextResponse.json({ error: 'Attendance log not found' }, { status: 404 });
    }

    const targetUser = existingLog.app_users;
    if (!canModifyAttendance(currentUser as AppUser, existingLog.user_id, targetUser?.bu_code)) {
      return NextResponse.json({ error: 'Forbidden: 수정 권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { check_in_time, check_out_time, modification_reason } = body;

    const updateData: Record<string, any> = {
      is_modified: true,
      modification_reason: modification_reason || `관리자 수정 (${currentUser.name || currentUser.email})`,
      updated_at: new Date().toISOString(),
    };

    if (check_in_time !== undefined) {
      if (check_in_time === null || check_in_time === '') {
        updateData.check_in_at = null;
      } else {
        updateData.check_in_at = toKSTISOString(existingLog.work_date, check_in_time);
      }
    }

    if (check_out_time !== undefined) {
      if (check_out_time === null || check_out_time === '') {
        updateData.check_out_at = null;
      } else {
        updateData.check_out_at = toKSTISOString(existingLog.work_date, check_out_time);
      }
    }

    const { data: updatedLog, error: updateError } = await supabase
      .from('attendance_logs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedLog);
  } catch (error: any) {
    console.error('Update attendance log error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin만 삭제할 수 있습니다.' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete attendance log error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
