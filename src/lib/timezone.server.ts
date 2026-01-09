/**
 * KST 시간대 관련 서버 유틸리티 함수들
 * 대한민국 표준시(KST, UTC+9)를 기준으로 시간을 처리합니다.
 */

const KST_OFFSET_HOURS = 9;

/**
 * 날짜(YYYY-MM-DD)와 시간(HH:mm 또는 HH:mm:ss)을 KST 기준 ISO 문자열로 변환
 * @example
 * toKSTISOString('2026-01-06', '14:00') => '2026-01-06T14:00:00+09:00'
 */
export function toKSTISOString(date: string, time: string): string {
  const normalizedTime = time.includes(':') && time.split(':').length === 2
    ? `${time}:00`
    : time;
  
  return `${date}T${normalizedTime}+09:00`;
}

/**
 * 날짜(YYYY-MM-DD)와 시간(HH:mm 또는 HH:mm:ss)을 UTC ISO 문자열로 변환
 * KST로 입력된 시간을 UTC로 변환합니다.
 * @example
 * kstToUTCISOString('2026-01-06', '14:00') => '2026-01-06T05:00:00.000Z'
 */
export function kstToUTCISOString(date: string, time: string): string {
  const normalizedTime = time.includes(':') && time.split(':').length === 2
    ? `${time}:00`
    : time;
  
  const kstDatetime = new Date(`${date}T${normalizedTime}+09:00`);
  return kstDatetime.toISOString();
}

/**
 * UTC timestamp를 KST 날짜 문자열로 변환
 * @example
 * utcToKSTDate('2026-01-06T05:00:00.000Z') => '2026-01-06'
 */
export function utcToKSTDate(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  const kstDate = new Date(date.getTime() + KST_OFFSET_HOURS * 60 * 60 * 1000);
  return kstDate.toISOString().split('T')[0];
}

/**
 * UTC timestamp를 KST 시간 문자열로 변환
 * @example
 * utcToKSTTime('2026-01-06T05:00:00.000Z') => '14:00:00'
 */
export function utcToKSTTime(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  const kstDate = new Date(date.getTime() + KST_OFFSET_HOURS * 60 * 60 * 1000);
  return kstDate.toISOString().split('T')[1].slice(0, 8);
}

/**
 * 현재 KST 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getCurrentKSTDate(): string {
  const now = new Date();
  const kstNow = new Date(now.getTime() + KST_OFFSET_HOURS * 60 * 60 * 1000);
  return kstNow.toISOString().split('T')[0];
}

/**
 * 현재 KST 시간을 HH:mm:ss 형식으로 반환
 */
export function getCurrentKSTTime(): string {
  const now = new Date();
  const kstNow = new Date(now.getTime() + KST_OFFSET_HOURS * 60 * 60 * 1000);
  return kstNow.toISOString().split('T')[1].slice(0, 8);
}
