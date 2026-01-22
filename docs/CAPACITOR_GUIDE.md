# Capacitor 네이티브 앱 가이드

## 개요

TotalManagements 웹앱을 Capacitor를 통해 Android/iOS 네이티브 앱으로 변환했습니다. 하이브리드 방식을 사용하여 WebView가 Vercel에 배포된 웹앱을 로드하고, 네이티브 기능(푸시 알림, GPS, 카메라)은 Capacitor 플러그인을 통해 접근합니다.

## 설치된 구성 요소

### Capacitor 플러그인
- `@capacitor/core`: Capacitor 코어
- `@capacitor/android`: Android 플랫폼
- `@capacitor/ios`: iOS 플랫폼
- `@capacitor/push-notifications`: 푸시 알림
- `@capacitor/geolocation`: GPS/위치
- `@capacitor/camera`: 카메라/갤러리

### 주요 파일 구조

```
├── capacitor.config.ts           # Capacitor 설정
├── android/                      # Android 네이티브 프로젝트
├── ios/                          # iOS 네이티브 프로젝트
├── out/                          # 웹 빌드 출력 (더미)
├── src/
│   ├── lib/
│   │   └── capacitor/            # 네이티브 유틸리티
│   │       ├── index.ts          # 통합 export
│   │       ├── platform.ts       # 플랫폼 감지
│   │       ├── push.ts           # 푸시 알림
│   │       ├── geolocation.ts    # GPS/위치
│   │       └── camera.ts         # 카메라
│   └── app/
│       ├── providers.tsx         # 앱 프로바이더 (푸시 초기화)
│       └── api/
│           └── push-tokens/      # 푸시 토큰 API
│               └── route.ts
└── supabase/
    └── migrations/
        └── 20260121_add_push_tokens.sql  # 푸시 토큰 테이블
```

## 사용 방법

### 1. 개발 워크플로우

```bash
# 웹 개발 서버 실행
npm run dev

# 빌드 및 Capacitor 동기화
npm run cap:build
# 또는
npm run build
npm run cap:sync
```

### 2. Android 개발

```bash
# Android Studio 열기
npm run cap:android

# 또는 직접
npx cap open android
```

Android Studio에서:
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. 생성된 APK: `android/app/build/outputs/apk/debug/app-debug.apk`

### 3. iOS 개발 (Mac 필요)

```bash
# Xcode 열기
npm run cap:ios

# 또는 직접
npx cap open ios
```

Xcode에서:
1. Product → Archive
2. Distribute App → App Store Connect (TestFlight)

## Firebase 설정 (푸시 알림)

### 필수 사전 작업

1. Firebase Console에서 프로젝트 생성
2. Android/iOS 앱 등록
3. 인증 파일 다운로드:
   - Android: `google-services.json` → `android/app/`
   - iOS: `GoogleService-Info.plist` → `ios/App/App/`

자세한 설정은 `docs/FIREBASE_SETUP.md` 참고

## 네이티브 기능 사용

### 플랫폼 감지

```typescript
import { isNativePlatform, getPlatform, isAndroid, isIOS } from '@/lib/capacitor';

// 네이티브 앱에서만 실행
if (isNativePlatform()) {
  // 네이티브 전용 코드
}

// 플랫폼 확인
const platform = getPlatform(); // 'android' | 'ios' | 'web'
```

### 푸시 알림

앱 시작 시 자동으로 초기화됩니다 (`providers.tsx`).

```typescript
import { initPushNotifications, requestPushPermission } from '@/lib/capacitor';

// 수동 초기화 (필요시)
await initPushNotifications({
  onRegistration: (token) => console.log('Token:', token),
  onNotificationReceived: (notification) => console.log('Received:', notification),
});
```

### GPS/위치

```typescript
import { 
  getCurrentPosition, 
  watchPosition, 
  isWithinRadius,
  calculateDistance 
} from '@/lib/capacitor';

// 현재 위치 가져오기
const position = await getCurrentPosition();
if (position) {
  console.log(position.latitude, position.longitude);
}

// 특정 위치 범위 내 확인 (예: 회사 100m 반경)
const isNearby = isWithinRadius(
  currentLat, currentLon,
  37.5665, 126.9780,  // 회사 좌표
  100  // 100미터
);
```

### 카메라

```typescript
import { 
  takePicture, 
  pickFromGallery, 
  pickImage,
  dataUrlToFile 
} from '@/lib/capacitor';

// 사진 촬영
const photo = await takePicture();
if (photo?.dataUrl) {
  const file = dataUrlToFile(photo.dataUrl, 'photo.jpg');
  // 파일 업로드...
}

// 갤러리에서 선택
const image = await pickFromGallery();

// 사용자에게 선택권 부여 (카메라/갤러리)
const picked = await pickImage();
```

## Supabase 푸시 토큰 관리

### 테이블: `push_tokens`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | Primary Key |
| user_id | UUID | 사용자 ID |
| token | TEXT | FCM/APNs 토큰 |
| platform | TEXT | 'android', 'ios', 'web' |
| device_id | TEXT | 디바이스 ID (선택) |
| is_active | BOOLEAN | 활성화 상태 |
| created_at | TIMESTAMPTZ | 생성일 |
| updated_at | TIMESTAMPTZ | 수정일 |

### API 엔드포인트

- `GET /api/push-tokens`: 현재 사용자의 토큰 조회
- `POST /api/push-tokens`: 토큰 등록/업데이트
- `DELETE /api/push-tokens`: 토큰 비활성화 (로그아웃 시)

## 주의사항

1. **iOS 빌드**: Mac이 필수입니다
2. **Firebase 인증 파일**: Git에 커밋하지 마세요 (`.gitignore`에 추가됨)
3. **Vercel URL**: `capacitor.config.ts`에 프로덕션 URL 설정 필요
4. **실기기 테스트**: 푸시/GPS/카메라는 실제 기기에서 테스트 권장

## 문제 해결

### Android 빌드 실패
```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

### iOS 빌드 실패 (Mac)
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### 푸시 알림이 작동하지 않음
1. Firebase 인증 파일 위치 확인
2. Firebase Console에서 앱 패키지명/Bundle ID 일치 확인
3. iOS의 경우 APNs 키 설정 확인
