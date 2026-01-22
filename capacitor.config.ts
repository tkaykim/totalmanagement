import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grigo.totalmanagements',
  appName: 'TotalManagements',
  webDir: 'out',
  server: {
    // 하이브리드 방식: Vercel에 배포된 웹앱을 로드
    // 개발 시에는 로컬 서버, 프로덕션 시에는 Vercel URL 사용
    url: 'https://total-managements.vercel.app',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
