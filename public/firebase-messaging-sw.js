/* eslint-disable no-undef */
/**
 * Firebase Messaging Service Worker v2
 * 
 * PWA(iOS, 데스크탑 브라우저)에서 백그라운드 푸시 알림을 수신·표시합니다.
 */

// 새 SW가 설치되면 즉시 활성화 (오래된 SW 교체)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Firebase SDK (compat 버전 — Service Worker에서 사용)
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase 설정 — 빌드 타임에 환경변수를 주입할 수 없으므로 직접 기입하거나,
// fetch로 /api/firebase-config 등에서 가져오는 방식도 가능하지만
// Service Worker 특성상 정적 값을 직접 넣는 것이 가장 안정적입니다.
// 아래 값은 Firebase 콘솔에서 웹 앱 등록 후 받은 값으로 교체해야 합니다.
firebase.initializeApp({
    apiKey: 'AIzaSyCd94BouUah2ibc7TViMUR5LMnyb1YL-6c',
    authDomain: 'grgerp-f7172.firebaseapp.com',
    projectId: 'grgerp-f7172',
    messagingSenderId: '582827232227',
    appId: '1:582827232227:web:49d1f10ba316a83ee4eed6',
});

const messaging = firebase.messaging();

/**
 * 백그라운드 메시지 핸들러
 * 
 * FCM이 notification 페이로드가 있는 메시지는 자동으로 표시합니다.
 * 여기서는 data-only 메시지(notification 없는 경우)만 수동 표시합니다.
 * 양쪽 모두 표시하면 알림이 2번 뜨는 중복 현상이 발생합니다.
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] 백그라운드 메시지 수신:', payload);

    // notification 페이로드가 있으면 FCM이 자동 표시하므로 건너뜀
    if (payload.notification) {
        console.log('[SW] notification 페이로드 → FCM 자동 표시 (수동 표시 안 함)');
        return;
    }

    // data-only 메시지만 수동 표시
    const data = payload.data || {};
    const title = data.title || '알림';
    const body = data.body || '새 알림이 도착했습니다.';

    const options = {
        body,
        icon: '/easynext.png',
        badge: '/easynext.png',
        tag: data.entity_id || 'default',
        data: {
            action_url: data.action_url || '/',
            entity_type: data.entity_type || '',
            entity_id: data.entity_id || '',
        },
        vibrate: [200, 100, 200],
        requireInteraction: false,
    };

    if (data.image) {
        options.image = data.image;
    }

    return self.registration.showNotification(title, options);
});

/**
 * 알림 클릭 핸들러
 * 사용자가 알림을 클릭하면 해당 URL로 이동합니다.
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] 알림 클릭:', event.notification);
    event.notification.close();

    const actionUrl = event.notification.data?.action_url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 이미 열린 창이 있으면 포커스 후 이동
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    client.navigate(actionUrl);
                    return;
                }
            }
            // 열린 창이 없으면 새 창 열기
            return clients.openWindow(actionUrl);
        })
    );
});
