'use client';

/**
 * 웹/PWA 환경 푸시 알림 초기화 모듈
 * 
 * iOS PWA(홈 화면 추가) 및 데스크탑 브라우저에서
 * Firebase Cloud Messaging 웹 푸시 토큰을 발급·저장합니다.
 * 
 * 기존 capacitor/push.ts (네이티브 전용)와 대칭 구조이며,
 * push_tokens DB에 platform='web'으로 저장합니다.
 */

import { getWebPushToken, onForegroundMessage, isFirebaseWebReady } from '@/lib/firebase-web';

interface WebPushHandlers {
    onNotificationReceived?: (payload: {
        title: string;
        body: string;
        data?: Record<string, string>;
    }) => void;
}

let isWebPushInitialized = false;

/**
 * iOS PWA(standalone 모드)에서 실행 중인지 감지
 */
export function isIOSPWA(): boolean {
    if (typeof window === 'undefined') return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
    return isIOS && isStandalone;
}

/**
 * iOS Safari(PWA 아닌 일반 브라우저)에서 실행 중인지 감지
 */
export function isIOSSafari(): boolean {
    if (typeof window === 'undefined') return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
    return isIOS && !isStandalone;
}

/**
 * 브라우저 고유 Device ID 가져오기 (없으면 생성)
 */
export function getWebDeviceId(): string {
    if (typeof window === 'undefined') return '';
    let deviceId = localStorage.getItem('web_push_device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
        localStorage.setItem('web_push_device_id', deviceId);
    }
    return deviceId;
}

/**
 * 웹 푸시 알림이 지원되는 환경인지 확인
 */
export function isWebPushSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
}

/**
 * 현재 알림 권한 상태 반환
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
}

/**
 * 웹 푸시 알림 초기화
 * 
 * 1. Service Worker 등록
 * 2. 알림 권한이 이미 허용된 경우 자동으로 토큰 발급·저장
 * 3. 포그라운드 메시지 리스너 등록
 * 
 * 권한이 아직 요청되지 않은 경우('default'), 명시적 UI에서
 * requestWebPushPermission()을 호출해야 합니다 (iOS 요구사항).
 */
export async function initWebPush(handlers?: WebPushHandlers): Promise<void> {
    // 네이티브 Capacitor 앱이면 스킵 (기존 push.ts가 처리)
    if (typeof window !== 'undefined') {
        try {
            const { Capacitor } = await import('@capacitor/core');
            if (Capacitor.isNativePlatform()) {
                console.log('[WebPush] 네이티브 앱에서는 건너뜁니다.');
                return;
            }
        } catch {
            // Capacitor가 없으면 웹 환경
        }
    }

    if (!isWebPushSupported()) {
        console.log('[WebPush] 이 브라우저는 웹 푸시를 지원하지 않습니다.');
        return;
    }

    if (!isFirebaseWebReady()) {
        console.log('[WebPush] Firebase 웹 설정이 없습니다. 환경변수를 확인해주세요.');
        return;
    }

    if (isWebPushInitialized) {
        console.log('[WebPush] 이미 초기화되었습니다.');
        return;
    }

    try {
        // 1. Service Worker 등록
        const swRegistration = await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js',
            { scope: '/' }
        );
        console.log('[WebPush] Service Worker 등록 완료:', swRegistration.scope);

        // 2. 알림 권한 처리
        if (Notification.permission === 'granted') {
            // 이미 허용된 경우 바로 토큰 발급
            await registerWebPushToken(swRegistration);
        } else if (Notification.permission === 'default' && !isIOSPWA() && !isIOSSafari()) {
            // iOS가 아닌 환경(Android Chrome, 데스크탑)에서는 자동 권한 요청
            // iOS는 반드시 사용자 제스처에서 요청해야 하므로 IOSPushPrompt UI를 사용
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    await registerWebPushToken(swRegistration);
                }
            } catch {
                console.log('[WebPush] 자동 권한 요청 실패 (수동 허용 필요)');
            }
        }

        // 3. 포그라운드 메시지 리스너
        onForegroundMessage((payload) => {
            const notification = payload.notification || {};
            const data = payload.data || {};

            const title = notification.title || data.title || '알림';
            const body = notification.body || data.body || '새 알림이 도착했습니다.';

            handlers?.onNotificationReceived?.({
                title,
                body,
                data,
            });
        });

        isWebPushInitialized = true;
        console.log('[WebPush] 초기화 완료');
    } catch (error) {
        console.error('[WebPush] 초기화 실패:', error);
    }
}

/**
 * 로그인 후 웹 푸시 토큰 재등록
 * 
 * initWebPush가 로그인 전에 실행되어 토큰 저장이 401로 실패한 경우,
 * 로그인 완료 후 이 함수를 호출하면 토큰이 올바르게 저장됩니다.
 */
export async function retryWebPushRegistration(): Promise<void> {
    if (!isWebPushSupported()) return;
    if (Notification.permission !== 'granted') return;

    try {
        const swRegistration = await navigator.serviceWorker.getRegistration('/');
        if (swRegistration) {
            await registerWebPushToken(swRegistration);
        }
    } catch (error) {
        console.error('[WebPush] 토큰 재등록 실패:', error);
    }
}

/**
 * 웹 푸시 알림 권한 요청 및 토큰 등록
 * 
 * ⚠️ iOS Safari에서는 반드시 사용자 제스처(버튼 클릭 등)
 *    이벤트 핸들러 내에서 호출해야 합니다.
 */
export async function requestWebPushPermission(): Promise<boolean> {
    if (!isWebPushSupported()) return false;

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[WebPush] 알림 권한이 거부되었습니다.');
            return false;
        }

        // 권한 허용 후 토큰 발급
        const swRegistration = await navigator.serviceWorker.getRegistration('/');
        if (swRegistration) {
            await registerWebPushToken(swRegistration);
        } else {
            console.warn('[WebPush] Service Worker가 등록되어 있지 않습니다.');
        }

        return true;
    } catch (error) {
        console.error('[WebPush] 권한 요청 실패:', error);
        return false;
    }
}

/**
 * FCM 웹 토큰 발급 후 서버에 저장
 */
async function registerWebPushToken(
    swRegistration: ServiceWorkerRegistration
): Promise<void> {
    const token = await getWebPushToken(swRegistration);
    if (!token) return;

    try {
        const response = await fetch('/api/push-tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                platform: 'web',
                device_id: getWebDeviceId(),
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        console.log('[WebPush] 토큰 저장 성공');
    } catch (error) {
        console.error('[WebPush] 토큰 저장 실패:', error);
    }
}
