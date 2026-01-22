'use client';

import { Capacitor } from '@capacitor/core';

/**
 * 현재 플랫폼 정보 유틸리티
 */

export type Platform = 'android' | 'ios' | 'web';

/**
 * 현재 실행 중인 플랫폼 반환
 */
export function getPlatform(): Platform {
  return Capacitor.getPlatform() as Platform;
}

/**
 * 네이티브 플랫폼(Android/iOS)에서 실행 중인지 확인
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Android에서 실행 중인지 확인
 */
export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

/**
 * iOS에서 실행 중인지 확인
 */
export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

/**
 * 웹에서 실행 중인지 확인
 */
export function isWeb(): boolean {
  return getPlatform() === 'web';
}

/**
 * 특정 플러그인이 사용 가능한지 확인
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}
