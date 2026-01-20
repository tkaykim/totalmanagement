import { differenceInMonths, differenceInYears, startOfMonth, isBefore, addMonths } from 'date-fns';

export interface AnnualLeaveCalculation {
  totalDays: number;
  grantType: 'monthly' | 'yearly';
  monthsWorked: number;
  yearsWorked: number;
}

/**
 * 입사일 기준으로 연차 일수를 계산합니다.
 * - 1년 미만 근속: 매월 1일씩 부여 (최대 11일)
 * - 1년 이상 근속: 연 15일 일괄 부여
 */
export function calculateAnnualLeave(hireDate: Date, targetDate: Date = new Date()): AnnualLeaveCalculation {
  const yearsWorked = differenceInYears(targetDate, hireDate);
  const monthsWorked = differenceInMonths(targetDate, hireDate);

  if (yearsWorked >= 1) {
    // 1년 이상 근속: 연 15일 일괄 부여
    // 추가 근속 연수에 따른 가산일 (2년마다 1일, 최대 25일)
    const additionalDays = Math.min(Math.floor((yearsWorked - 1) / 2), 10);
    return {
      totalDays: 15 + additionalDays,
      grantType: 'yearly',
      monthsWorked,
      yearsWorked,
    };
  }

  // 1년 미만 근속: 월 1일씩 부여 (최대 11일)
  const monthlyDays = Math.min(monthsWorked, 11);
  return {
    totalDays: monthlyDays,
    grantType: 'monthly',
    monthsWorked,
    yearsWorked,
  };
}

/**
 * 특정 연도에 부여되어야 할 연차 일수를 계산합니다.
 */
export function calculateAnnualLeaveForYear(
  hireDate: Date,
  year: number
): { totalDays: number; grantType: 'monthly' | 'yearly' } {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  
  // 입사일이 해당 연도 이후라면 0
  if (isBefore(yearEnd, hireDate)) {
    return { totalDays: 0, grantType: 'monthly' };
  }

  const anniversaryDate = new Date(
    year,
    hireDate.getMonth(),
    hireDate.getDate()
  );

  // 해당 연도에 1주년이 되는 경우
  const yearsAtYearStart = differenceInYears(yearStart, hireDate);
  const yearsAtYearEnd = differenceInYears(yearEnd, hireDate);

  if (yearsAtYearEnd >= 1) {
    if (yearsAtYearStart < 1) {
      // 해당 연도 중에 1주년을 맞이하는 경우
      // 1주년 이전 월별 부여분 + 1주년 이후 연간 부여분 계산이 복잡
      // 단순화: 연간 부여로 처리
      return { totalDays: 15, grantType: 'yearly' };
    }
    // 이미 1년 이상 근속
    const additionalDays = Math.min(Math.floor((yearsAtYearStart) / 2), 10);
    return { totalDays: 15 + additionalDays, grantType: 'yearly' };
  }

  // 1년 미만 근속 - 해당 연도에 근무한 개월수만큼 부여
  const monthsInYear = getMonthsWorkedInYear(hireDate, year);
  return { totalDays: Math.min(monthsInYear, 11), grantType: 'monthly' };
}

/**
 * 특정 연도에 근무한 개월 수를 계산합니다.
 */
function getMonthsWorkedInYear(hireDate: Date, year: number): number {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  
  const effectiveStart = isBefore(hireDate, yearStart) ? yearStart : hireDate;
  
  let months = 0;
  let current = startOfMonth(effectiveStart);
  
  while (isBefore(current, yearEnd) || current.getTime() === yearEnd.getTime()) {
    if (!isBefore(current, startOfMonth(hireDate))) {
      months++;
    }
    current = addMonths(current, 1);
    if (months >= 12) break;
  }
  
  return months;
}

/**
 * 주말을 제외한 근무일수를 계산합니다.
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let days = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

/**
 * 휴가 유형에 따른 사용 일수를 계산합니다.
 */
export function calculateDaysUsed(
  leaveType: 'annual' | 'half_am' | 'half_pm' | 'compensatory' | 'special',
  startDate: Date,
  endDate: Date
): number {
  if (leaveType === 'half_am' || leaveType === 'half_pm') {
    return 0.5;
  }
  
  return calculateWorkingDays(startDate, endDate);
}
