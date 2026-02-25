'use client';

/**
 * Firebase Web SDK 초기화 (클라이언트 전용)
 * 
 * iOS PWA 및 데스크탑 브라우저에서 웹 푸시 알림을 사용하기 위해
 * Firebase Messaging을 초기화합니다.
 * 
 * 환경변수:
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * - NEXT_PUBLIC_VAPID_KEY (웹 푸시 인증서)
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'grgerp-f7172',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Firebase 앱 싱글톤 초기화
 */
function getFirebaseApp(): FirebaseApp | null {
    if (!firebaseConfig.apiKey || !firebaseConfig.messagingSenderId) {
        console.warn('[Firebase Web] 환경변수가 설정되지 않았습니다. 웹 푸시가 비활성화됩니다.');
        return null;
    }

    if (getApps().length > 0) {
        return getApp();
    }

    return initializeApp(firebaseConfig);
}

/**
 * Firebase Messaging 인스턴스 반환
 * 브라우저 환경에서만 사용 가능
 */
export function getFirebaseMessaging(): Messaging | null {
    if (typeof window === 'undefined') return null;

    const app = getFirebaseApp();
    if (!app) return null;

    try {
        return getMessaging(app);
    } catch (error) {
        console.error('[Firebase Web] Messaging 초기화 실패:', error);
        return null;
    }
}

/**
 * FCM 웹 푸시 토큰 발급
 * Service Worker가 등록된 상태에서 VAPID 키로 토큰을 요청합니다.
 */
export async function getWebPushToken(
    swRegistration: ServiceWorkerRegistration
): Promise<string | null> {
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidKey) {
        console.warn('[Firebase Web] VAPID_KEY가 설정되지 않았습니다.');
        return null;
    }

    try {
        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swRegistration,
        });

        if (token) {
            console.log('[Firebase Web] 토큰 발급 성공:', token.substring(0, 20) + '...');
            return token;
        } else {
            console.log('[Firebase Web] 토큰을 가져올 수 없습니다. 알림 권한이 필요합니다.');
            return null;
        }
    } catch (error) {
        console.error('[Firebase Web] 토큰 발급 실패:', error);
        return null;
    }
}

/**
 * 포그라운드 메시지 리스너 등록
 */
export function onForegroundMessage(
    callback: (payload: { notification?: { title?: string; body?: string; image?: string }; data?: Record<string, string> }) => void
): (() => void) | null {
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    return onMessage(messaging, (payload) => {
        console.log('[Firebase Web] 포그라운드 메시지:', payload);
        callback(payload as Parameters<typeof callback>[0]);
    });
}

/**
 * Firebase Web SDK가 사용 가능한지 확인
 */
export function isFirebaseWebReady(): boolean {
    return !!(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
        process.env.NEXT_PUBLIC_VAPID_KEY
    );
}
