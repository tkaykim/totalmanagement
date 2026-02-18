import admin from 'firebase-admin';

/**
 * Firebase Admin SDK 싱글톤 초기화
 * 서버 사이드에서만 사용 (API routes, server actions)
 * 
 * 환경변수:
 * - FIREBASE_PROJECT_ID: Firebase 프로젝트 ID
 * - FIREBASE_CLIENT_EMAIL: 서비스 계정 이메일
 * - FIREBASE_PRIVATE_KEY: 서비스 계정 비공개 키 (base64 또는 raw)
 */

function getFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.warn(
      '[Firebase] 환경변수가 설정되지 않았습니다. Push 알림이 비활성화됩니다.',
      {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKeyRaw,
      }
    );
    throw new Error('Firebase Admin SDK 환경변수가 설정되지 않았습니다.');
  }

  // private key: 환경변수에서 \n이 literal(백슬래시+n)으로 들어오는 경우 실제 줄바꿈으로 변환
  // PEM 형식 오류 방지: 이중 이스케이프(\\\\n) 및 일반 \\n 모두 처리 후 trim
  let privateKey = privateKeyRaw
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();
  if (!privateKey.includes('-----BEGIN')) {
    throw new Error('FIREBASE_PRIVATE_KEY: PEM 형식이 아닙니다. 서비스 계정 JSON의 private_key 값을 그대로 넣고, 줄바꿈은 \\n 으로 넣어주세요.');
  }

  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  console.log('[Firebase] Admin SDK 초기화 완료');
  return app;
}

/**
 * Firebase Messaging 인스턴스 반환
 */
export function getMessaging(): admin.messaging.Messaging {
  const app = getFirebaseAdmin();
  return admin.messaging(app);
}

/**
 * Firebase Admin SDK가 사용 가능한 상태인지 확인
 */
export function isFirebaseAdminReady(): boolean {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    return !!(projectId && clientEmail && privateKey);
  } catch {
    return false;
  }
}
