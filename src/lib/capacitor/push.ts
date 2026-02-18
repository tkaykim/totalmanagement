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
 * - 리스너를 먼저 등록한 뒤, 짧은 지연 후 권한 요청 → 등록하여 앱 실행 시 알림 허용 팝업이 노출되도록 함
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
    // 리스너 먼저 등록 (권한 허용 후 토큰이 오면 처리)
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[Push] 토큰 등록 성공:', token.value);
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

    // 앱 UI가 뜬 뒤 알림 권한 요청이 노출되도록 지연 후 실행 (Android 13+ 등)
    const requestAndRegister = async () => {
      const granted = await requestPushPermission();
      if (!granted) {
        console.log('[Push] 권한이 거부되었거나 아직 허용되지 않았습니다. 설정에서 허용 후 앱을 다시 열어주세요.');
      }
      await PushNotifications.register();
    };

    if (typeof window !== 'undefined') {
      window.setTimeout(requestAndRegister, 1200);
      // 앱 포커스 시 토큰 재등록 시도 (로그인 후 저장 실패·토큰 갱신 시 대비), 30초 간격으로만
      let lastFocusRegister = 0;
      const FOCUS_REGISTER_INTERVAL_MS = 30_000;
      const onVisibilityChange = () => {
        if (document.visibilityState !== 'visible' || !isInitialized) return;
        const now = Date.now();
        if (now - lastFocusRegister < FOCUS_REGISTER_INTERVAL_MS) return;
        lastFocusRegister = now;
        window.setTimeout(() => {
          PushNotifications.register().catch(() => {});
        }, 500);
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('focus', onVisibilityChange);
    } else {
      await requestPushPermission();
      await PushNotifications.register();
    }

    isInitialized = true;
    console.log('[Push] 초기화 완료');
  } catch (error) {
    console.error('[Push] 초기화 실패:', error);
  }
}

/**
 * 푸시 토큰 재등록 (로그인 직후 등에서 호출 권장)
 * 처음 토큰 저장이 401로 실패했을 때, 로그인 후 이 함수를 호출하면 토큰이 다시 저장됨
 */
export async function retryPushRegistration(): Promise<void> {
  if (!isNativePlatform()) return;
  if (!isInitialized) {
    await initPushNotifications();
    return;
  }
  try {
    await PushNotifications.register();
    console.log('[Push] 토큰 재등록 요청 완료');
  } catch (e) {
    console.warn('[Push] 토큰 재등록 실패:', e);
  }
}

/**
 * 알림 권한만 요청 (UI 버튼 등에서 호출용). 이미 초기화된 경우 register()는 호출된 상태이므로 권한 허용 시 토큰이 옴.
 */
export async function requestPermissionAndRegister(handlers?: PushNotificationHandlers): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const granted = await requestPushPermission();
  if (granted) {
    await PushNotifications.register();
    console.log('[Push] 권한 허용 후 등록 요청 완료');
  }
  return granted;
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
