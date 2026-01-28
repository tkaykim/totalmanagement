/**
 * 휴가 일수를 "N일" 또는 "N일 M시간" 형식으로 표시
 * 0.5일 = 4시간
 */
export function formatLeaveDays(days: number): string {
  if (days === 0) return '0일';
  const whole = Math.floor(days);
  const frac = days - whole;
  if (frac === 0) return `${whole}일`;
  if (frac === 0.5) return whole > 0 ? `${whole}일 4시간` : '4시간';
  return `${days}일`;
}
