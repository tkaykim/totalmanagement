'use client';

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isNativePlatform, getPlatform } from './platform';

/**
 * 푸시 알림 초기화 및 관리 유틸리티
 */

interface PushNotificationHandlers {
  onRegistration?: (token: string) => void;
  onRegistrationError?: (error: any) => void;
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationActionPerformed?: (action: ActionPerformed) => void;
}

let isInitialized = false;

/**
 * 푸시 알림 권한 요청 및 등록
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!isNativePlatform()) {
    console.log('[Push] 네이티브 플랫폼이 아닙니다. 푸시 알림을 건너뜁니다.');
    return false;
  }

  try {
    const permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted';
    }
    
    return permStatus.receive === 'granted';
  } catch (error) {
    console.error('[Push] 권한 요청 실패:', error);
    return false;
  }
}

/**
 * 푸시 알림 초기화
 */
export async function initPushNotifications(handlers?: PushNotificationHandlers): Promise<void> {
  if (!isNativePlatform()) {
    console.log('[Push] 네이티브 플랫폼이 아닙니다.');
    return;
  }

  if (isInitialized) {
    console.log('[Push] 이미 초기화되었습니다.');
    return;
  }

  try {
    // 권한 요청
    const granted = await requestPushPermission();
    if (!granted) {
      console.log('[Push] 권한이 거부되었습니다.');
      return;
    }

    // 리스너 등록
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[Push] 토큰 등록 성공:', token.value);
      
      // 서버에 토큰 저장
      await savePushToken(token.value);
      
      handlers?.onRegistration?.(token.value);
    });

    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[Push] 등록 실패:', error);
      handlers?.onRegistrationError?.(error);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[Push] 알림 수신:', notification);
      handlers?.onNotificationReceived?.(notification);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[Push] 알림 액션:', action);
      handlers?.onNotificationActionPerformed?.(action);
    });

    // 푸시 알림 등록
    await PushNotifications.register();
    isInitialized = true;
    console.log('[Push] 초기화 완료');
  } catch (error) {
    console.error('[Push] 초기화 실패:', error);
  }
}

/**
 * 푸시 토큰을 서버에 저장
 */
async function savePushToken(token: string): Promise<void> {
  try {
    const response = await fetch('/api/push-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: getPlatform(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('[Push] 토큰 저장 성공');
  } catch (error) {
    console.error('[Push] 토큰 저장 실패:', error);
  }
}

/**
 * 푸시 알림 리스너 제거
 */
export async function removePushListeners(): Promise<void> {
  if (!isNativePlatform()) return;
  
  await PushNotifications.removeAllListeners();
  isInitialized = false;
  console.log('[Push] 리스너 제거 완료');
}

/**
 * 배지 카운트 제거 (iOS)
 */
export async function clearBadge(): Promise<void> {
  if (!isNativePlatform()) return;
  
  try {
    // iOS에서만 배지 카운트 제거
    // Android는 자동으로 처리됨
  } catch (error) {
    console.error('[Push] 배지 제거 실패:', error);
  }
}
