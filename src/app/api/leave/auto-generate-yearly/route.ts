import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { calculateAnnualLeaveForYear } from '@/features/leave/lib/leave-calculator';
import { differenceInYears } from 'date-fns';

/**
 * 연간 자동 생성 API
 * 매년 1월 1일 실행되어 1년차 이상 사용자에게 15일 연차를 자동 부여합니다.
 */
export async function POST(request: NextRequest) {
  return handleAutoGenerateYearly(request);
}

// GET 메서드로도 호출 가능 (Vercel Cron 호환)
export async function GET(request: NextRequest) {
  return handleAutoGenerateYearly(request);
}

async function handleAutoGenerateYearly(request: NextRequest) {
  try {
    // Vercel Cron에서 호출하는 경우 Authorization 헤더 확인 (선택적)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1); // 1월 1일

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
      
      // 1년차 이상인지 확인 (1월 1일 기준)
      const yearsWorked = differenceInYears(yearStart, hireDate);
      
      if (yearsWorked < 1) {
        skipped++;
        continue;
      }

      // 해당 연도에 이미 auto_yearly로 부여된 연차가 있는지 확인
      const { data: existingGrant } = await supabase
        .from('leave_grants')
        .select('id')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .eq('grant_type', 'auto_yearly')
        .eq('leave_type', 'annual')
        .limit(1)
        .single();

      if (existingGrant) {
        skipped++;
        continue;
      }

      // 연차 일수 계산 (요구사항: 1년차 이상은 15일)
      const daysToGrant = 15;

      try {
        // 휴가 부여 이력 기록
        const { error: grantError } = await supabase
          .from('leave_grants')
          .insert({
            user_id: user.id,
            leave_type: 'annual',
            days: daysToGrant,
            grant_type: 'auto_yearly',
            reason: `${currentYear}년 연간 자동 부여`,
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
      message: '연간 자동 생성 완료',
      year: currentYear,
      processed,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Auto generate yearly error:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
