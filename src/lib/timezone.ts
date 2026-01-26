'use client';

/**
 * KST 시간대 관련 클라이언트 유틸리티 함수들
 * 대한민국 표준시(KST, UTC+9)를 기준으로 시간을 처리합니다.
 * 
 * ⚠️ 중요: 모든 날짜 생성은 이 유틸리티를 통해 KST 기준으로 처리해야 합니다.
 * new Date().toISOString().split('T')[0] 대신 getTodayKST()를 사용하세요.
 */

import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { formatDistanceToNow as dateFnsFormatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export const KST_TIMEZONE = 'Asia/Seoul';

/**
 * 현재 KST 날짜를 YYYY-MM-DD 형식으로 반환
 * @example
 * getTodayKST() => '2026-01-10'
 */
export function getTodayKST(): string {
  return formatInTimeZone(new Date(), KST_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * 현재 KST 시간을 HH:mm:ss 형식으로 반환
 * @example
 * getCurrentTimeKST() => '14:30:00'
 */
export function getCurrentTimeKST(): string {
  return formatInTimeZone(new Date(), KST_TIMEZONE, 'HH:mm:ss');
}

/**
 * 현재 KST 날짜+시간을 ISO 형식으로 반환 (타임존 오프셋 포함)
 * @example
 * getNowKSTISO() => '2026-01-10T14:30:00+09:00'
 */
export function getNowKSTISO(): string {
  return formatInTimeZone(new Date(), KST_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

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
 * UTC timestamp를 KST 날짜 문자열로 변환
 * @example
 * utcToKSTDate('2026-01-06T05:00:00.000Z') => '2026-01-06'
 */
export function utcToKSTDate(utcTimestamp: string | Date): string {
  const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
  return formatInTimeZone(date, KST_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * UTC timestamp를 KST 시간 문자열로 변환
 * @example
 * utcToKSTTime('2026-01-06T05:00:00.000Z') => '14:00:00'
 */
export function utcToKSTTime(utcTimestamp: string | Date): string {
  const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
  return formatInTimeZone(date, KST_TIMEZONE, 'HH:mm:ss');
}

/**
 * UTC timestamp를 KST 날짜+시간 문자열로 변환
 * @example
 * utcToKSTDateTime('2026-01-06T05:00:00.000Z') => '2026-01-06 14:00:00'
 */
export function utcToKSTDateTime(utcTimestamp: string | Date): string {
  const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
  return formatInTimeZone(date, KST_TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * 주어진 날짜를 KST 기준으로 포맷팅
 * @example
 * formatKST(new Date(), 'yyyy년 MM월 dd일') => '2026년 01월 10일'
 */
export function formatKST(date: Date | string, formatStr: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, KST_TIMEZONE, formatStr);
}

/**
 * KST 기준 Date 객체 생성
 */
export function getKSTDate(date?: Date | string): Date {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  return toZonedTime(d, KST_TIMEZONE);
}

/**
 * 두 시간(HH:mm 또는 HH:mm:ss) 사이의 분 차이 계산
 * @example
 * calculateMinutesDiff('09:00', '18:30') => 570
 */
export function calculateMinutesDiff(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

/**
 * UTC timestamp를 KST HH:mm 형식으로 변환
 * @example
 * formatTimeKST('2026-01-10T05:00:00.000Z') => '14:00'
 */
export function formatTimeKST(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '-';
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatInTimeZone(date, KST_TIMEZONE, 'HH:mm');
  } catch {
    return '-';
  }
}

/**
 * UTC timestamp를 KST HH:mm:ss 형식으로 변환
 * @example
 * formatTimeWithSecondsKST('2026-01-10T05:00:00.000Z') => '14:00:00'
 */
export function formatTimeWithSecondsKST(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '-';
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatInTimeZone(date, KST_TIMEZONE, 'HH:mm:ss');
  } catch {
    return '-';
  }
}

/**
 * UTC timestamp로부터 KST 기준 상대 시간 표시
 * @example
 * formatDistanceToNowKST('2026-01-10T05:00:00.000Z') => '3시간 전'
 */
export function formatDistanceToNowKST(
  timestamp: string | Date | null | undefined,
  options?: { addSuffix?: boolean }
): string {
  if (!timestamp) return '-';
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return dateFnsFormatDistanceToNow(date, { 
      addSuffix: options?.addSuffix ?? true, 
      locale: ko 
    });
  } catch {
    return '-';
  }
}

/**
 * UTC timestamp를 KST 기준 날짜+시간 표시 (yyyy.M.d HH:mm)
 * @example
 * formatDateTimeKST('2026-01-10T05:00:00.000Z') => '2026.1.10 14:00'
 */
export function formatDateTimeKST(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '-';
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatInTimeZone(date, KST_TIMEZONE, 'yyyy.M.d HH:mm');
  } catch {
    return '-';
  }
}

/**
 * UTC timestamp를 KST 기준 한국어 날짜 형식으로 표시
 * @example
 * formatDateKoreanKST('2026-01-10T05:00:00.000Z') => '2026년 1월 10일'
 */
export function formatDateKoreanKST(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '-';
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatInTimeZone(date, KST_TIMEZONE, 'yyyy년 M월 d일');
  } catch {
    return '-';
  }
}
