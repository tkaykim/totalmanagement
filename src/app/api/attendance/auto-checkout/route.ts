'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { createActivityLog } from '@/lib/activity-logger';

/**
 * 강제 퇴근 처리 API
 * 매일 23:59에 호출되어 당일 퇴근하지 않은 출근 기록을 오후 6시(18:00)로 강제 퇴근 처리합니다.
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
    
    // 오늘 날짜 계산 (KST 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const today = kstNow.toISOString().split('T')[0];
    
    // 오늘 18:00 KST를 UTC로 변환
    const checkOutTime = new Date(`${today}T18:00:00+09:00`).toISOString();
    
    // 오늘 날짜의 퇴근하지 않은 출근 기록 조회
    const { data: unfinishedLogs, error: fetchError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('work_date', today)
      .is('check_out_at', null)
      .not('check_in_at', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!unfinishedLogs || unfinishedLogs.length === 0) {
      return NextResponse.json({ 
        message: '처리할 미퇴근 기록이 없습니다.',
        processed: 0 
      });
    }

    // 각 미퇴근 기록을 18:00으로 강제 퇴근 처리
    const updatePromises = unfinishedLogs.map(async (log) => {
      const { error: updateError } = await supabase
        .from('attendance_logs')
        .update({
          check_out_at: checkOutTime,
          is_auto_checkout: true,
          is_modified: true,
          modification_reason: '시스템 강제 퇴근 조치 (당일 23:59까지 퇴근 미기록)',
          updated_at: new Date().toISOString(),
        })
        .eq('id', log.id);

      if (updateError) {
        console.error(`Failed to auto-checkout log ${log.id}:`, updateError);
        return null;
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
          auto_check_out_at: checkOutTime,
          reason: '당일 23:59까지 퇴근 미기록'
        },
      });

      return log.id;
    });

    const results = await Promise.all(updatePromises);
    const processedCount = results.filter(Boolean).length;

    return NextResponse.json({
      message: `${processedCount}건의 출근 기록이 강제 퇴근 처리되었습니다.`,
      processed: processedCount,
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
