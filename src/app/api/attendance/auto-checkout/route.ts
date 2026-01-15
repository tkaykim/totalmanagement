'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { createActivityLog } from '@/lib/activity-logger';
import { getTodayKST } from '@/lib/timezone.server';

const STANDARD_WORK_HOURS = 9; // 기본 근무시간 (시간)
const MAX_WORK_HOURS = 16; // 최대 근무시간 (시간) - 이 시간 이후 자동 퇴근

/**
 * 강제 퇴근 처리 API
 * 
 * 처리 대상:
 * 1. 어제 이전 날짜의 모든 미퇴근 기록
 * 2. 출근 후 16시간이 경과한 기록
 * 
 * 퇴근 시간 계산:
 * - 출근 시간 + 9시간 (기본 근무시간)
 * - 단, work_date의 23:59를 초과하지 않음
 * 
 * Vercel Cron 또는 외부 스케줄러에서 호출할 수 있습니다.
 * Authorization 헤더에 CRON_SECRET을 포함해야 합니다.
 */
export async function POST(request: NextRequest) {
  try {
    // Cron job 인증 (선택적: 환경변수로 시크릿 확인)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const today = getTodayKST();
    const nowUTC = new Date();
    
    // 모든 미퇴근 출근 기록 조회 (날짜 제한 없음)
    const { data: unfinishedLogs, error: fetchError } = await supabase
      .from('attendance_logs')
      .select('*')
      .is('check_out_at', null)
      .not('check_in_at', 'is', null)
      .order('check_in_at', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    if (!unfinishedLogs || unfinishedLogs.length === 0) {
      return NextResponse.json({ 
        message: '처리할 미퇴근 기록이 없습니다.',
        processed: 0 
      });
    }

    const processedLogs: string[] = [];
    const skippedLogs: string[] = [];

    for (const log of unfinishedLogs) {
      const checkInTime = new Date(log.check_in_at);
      const hoursSinceCheckIn = (nowUTC.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      const isYesterdayOrBefore = log.work_date < today;
      
      // 처리 조건: 어제 이전이거나, 16시간 이상 경과
      if (!isYesterdayOrBefore && hoursSinceCheckIn < MAX_WORK_HOURS) {
        skippedLogs.push(log.id);
        continue;
      }

      // 퇴근 시간 계산: 출근 시간 + 기본 근무시간 (9시간)
      const autoCheckOutTime = new Date(checkInTime.getTime() + STANDARD_WORK_HOURS * 60 * 60 * 1000);
      
      // work_date의 23:59 KST를 계산 (초과하지 않도록)
      const workDateEnd = new Date(`${log.work_date}T23:59:59+09:00`);
      
      // 퇴근 시간이 work_date를 초과하면 work_date의 23:59로 설정
      const finalCheckOutTime = autoCheckOutTime > workDateEnd ? workDateEnd : autoCheckOutTime;
      
      const { error: updateError } = await supabase
        .from('attendance_logs')
        .update({
          check_out_at: finalCheckOutTime.toISOString(),
          is_auto_checkout: true,
          is_modified: true,
          user_confirmed: false, // 사용자가 퇴근 시간을 확인/수정할 때까지 false
          modification_reason: isYesterdayOrBefore 
            ? `시스템 강제 퇴근 조치 (${log.work_date} 퇴근 미기록)`
            : `시스템 강제 퇴근 조치 (${MAX_WORK_HOURS}시간 경과)`,
          updated_at: nowUTC.toISOString(),
        })
        .eq('id', log.id);

      if (updateError) {
        console.error(`Failed to auto-checkout log ${log.id}:`, updateError);
        continue;
      }

      // 활동 로그 기록
      await createActivityLog({
        userId: log.user_id,
        actionType: 'auto_check_out',
        entityType: 'attendance',
        entityId: log.id,
        entityTitle: '시스템 강제 퇴근',
        metadata: { 
          original_check_in_at: log.check_in_at,
          auto_check_out_at: finalCheckOutTime.toISOString(),
          work_date: log.work_date,
          reason: isYesterdayOrBefore ? '이전 날짜 퇴근 미기록' : `${MAX_WORK_HOURS}시간 경과`
        },
      });

      processedLogs.push(log.id);
    }

    return NextResponse.json({
      message: `${processedLogs.length}건의 출근 기록이 강제 퇴근 처리되었습니다.`,
      processed: processedLogs.length,
      skipped: skippedLogs.length,
      date: today,
    });
  } catch (error: any) {
    console.error('Auto checkout error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

// GET 메서드로도 호출 가능 (Vercel Cron 호환)
export async function GET(request: NextRequest) {
  return POST(request);
}
