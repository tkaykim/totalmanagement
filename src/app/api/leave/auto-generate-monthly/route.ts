import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { differenceInMonths, differenceInYears, addMonths, isSameDay, format } from 'date-fns';

/**
 * 월별 자동 생성 API
 * 매일 실행되어 입사일 기준으로 1개월이 지난 1년차 미만 사용자에게 1일씩 연차를 자동 부여합니다.
 * 예: 2월 5일 입사 → 3월 5일에 1일 부여
 */
export async function POST(request: NextRequest) {
  return handleAutoGenerateMonthly(request);
}

// GET 메서드로도 호출 가능 (Vercel Cron 호환)
export async function GET(request: NextRequest) {
  return handleAutoGenerateMonthly(request);
}

async function handleAutoGenerateMonthly(request: NextRequest) {
  try {
    // Vercel Cron에서 호출하는 경우 Authorization 헤더 확인 (선택적)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정하여 날짜만 비교
    const currentYear = today.getFullYear();

    // 입사일이 있는 모든 사용자 조회
    const { data: users, error: usersError } = await supabase
      .from('app_users')
      .select('id, hire_date')
      .not('hire_date', 'is', null);

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      return NextResponse.json({ error: '사용자 조회에 실패했습니다.' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        message: '입사일이 등록된 사용자가 없습니다.',
        processed: 0 
      });
    }

    let processed = 0;
    let skipped = 0;
    const errors: Array<{ user_id: string; error: string }> = [];

    for (const user of users) {
      if (!user.hire_date) continue;

      const hireDate = new Date(user.hire_date);
      hireDate.setHours(0, 0, 0, 0);
      
      // 1년차 이상인 경우 스킵 (연간 자동 생성 대상)
      const yearsWorked = differenceInYears(today, hireDate);
      if (yearsWorked >= 1) {
        skipped++;
        continue;
      }

      // 입사일부터 오늘까지의 개월 수 계산
      const monthsWorked = differenceInMonths(today, hireDate);
      
      // 최대 11일까지만 부여 (1년 미만이므로)
      if (monthsWorked >= 11) {
        skipped++;
        continue;
      }

      // 입사일로부터 정확히 N개월 후인 날짜 계산
      // 예: 2월 5일 입사 → 3월 5일, 4월 5일, 5월 5일... 에 부여
      const targetDate = addMonths(hireDate, monthsWorked);
      targetDate.setHours(0, 0, 0, 0);

      // 오늘이 입사일 기준 정확히 N개월 후인 날짜가 아니면 스킵
      if (!isSameDay(today, targetDate)) {
        skipped++;
        continue;
      }

      // 이미 오늘 부여된 경우 스킵 (중복 방지)
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: todayGrant } = await supabase
        .from('leave_grants')
        .select('id')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .eq('grant_type', 'auto_monthly')
        .eq('leave_type', 'annual')
        .gte('granted_at', todayStart.toISOString())
        .lte('granted_at', todayEnd.toISOString())
        .limit(1)
        .single();

      if (todayGrant) {
        skipped++;
        continue;
      }

      // 1일씩 부여
      const daysToGrant = 1;

      try {
        // 휴가 부여 이력 기록
        const { error: grantError } = await supabase
          .from('leave_grants')
          .insert({
            user_id: user.id,
            leave_type: 'annual',
            days: daysToGrant,
            grant_type: 'auto_monthly',
            reason: `입사일 기준 ${monthsWorked + 1}개월차 자동 부여 (입사일: ${format(hireDate, 'yyyy-MM-dd')})`,
            granted_by: null,
            year: currentYear,
          });

        if (grantError) {
          console.error(`Failed to create grant for user ${user.id}:`, grantError);
          errors.push({ user_id: user.id, error: grantError.message });
          continue;
        }

        // 휴가 잔여일수 업데이트
        const { data: balance } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('user_id', user.id)
          .eq('leave_type', 'annual')
          .eq('year', currentYear)
          .single();

        if (balance) {
          // 기존 잔여일수에 추가
          const { error: updateError } = await supabase
            .from('leave_balances')
            .update({
              total_days: Number(balance.total_days) + daysToGrant,
            })
            .eq('id', balance.id);

          if (updateError) {
            console.error(`Failed to update balance for user ${user.id}:`, updateError);
            errors.push({ user_id: user.id, error: updateError.message });
            continue;
          }
        } else {
          // 새로운 잔여일수 생성
          const { error: insertError } = await supabase
            .from('leave_balances')
            .insert({
              user_id: user.id,
              leave_type: 'annual',
              total_days: daysToGrant,
              used_days: 0,
              year: currentYear,
            });

          if (insertError) {
            console.error(`Failed to create balance for user ${user.id}:`, insertError);
            errors.push({ user_id: user.id, error: insertError.message });
            continue;
          }
        }

        processed++;
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        errors.push({ 
          user_id: user.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      message: '월별 자동 생성 완료',
      date: format(today, 'yyyy-MM-dd'),
      year: currentYear,
      processed,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Auto generate monthly error:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
