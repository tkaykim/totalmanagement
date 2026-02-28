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
 * data-only 메시지를 수신하여 수동으로 알림을 표시합니다.
 * (notification 페이로드는 사용하지 않으므로 중복 표시가 발생하지 않습니다)
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] 백그라운드 메시지 수신:', payload);

    const data = payload.data || {};
    const title = data.title || payload.notification?.title || '알림';
    const body = data.body || payload.notification?.body || '새 알림이 도착했습니다.';

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
 * sessionStorage에 딥링크 플래그를 설정하여 근무상태 화면을 건너뜁니다.
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
                    // 딥링크 플래그 설정 후 네비게이션
                    client.postMessage({ type: 'PUSH_DEEP_LINK', action_url: actionUrl });
                    client.navigate(actionUrl);
                    return;
                }
            }
            // 열린 창이 없으면 딥링크 파라미터를 붙여서 새 창 열기
            const separator = actionUrl.includes('?') ? '&' : '?';
            return clients.openWindow(actionUrl + separator + '_deeplink=1');
        })
    );
});
