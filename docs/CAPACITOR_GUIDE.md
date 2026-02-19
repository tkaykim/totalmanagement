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
- **Supabase Edge Function** `send-push`: FCM 푸시 발송 (시크릿 `FIREBASE_SERVICE_ACCOUNT_JSON` 설정 후 사용). body: `user_id` 또는 `token`, `title`, `body`, `data`(선택), `image`(선택)

## 웹앱 배포 및 푸시 세팅 체크리스트

### 웹 배포 (Vercel)

1. **빌드**: `npm run build` 성공 확인
2. **배포**: Vercel에 연결 후 자동 배포 또는 `vercel --prod`
3. **Capacitor URL**: `capacitor.config.ts`의 `server.url`이 실제 프로덕션 URL과 일치하는지 확인 (예: `https://totalmanagement.vercel.app`)

### 푸시 알림 세팅

| 단계 | 내용 | 확인 |
|------|------|------|
| Firebase | Android 앱 등록, `google-services.json` → `android/app/` | [ ] |
| Firebase | (iOS) `GoogleService-Info.plist` → `ios/App/App/` | [ ] |
| Firebase | 서비스 계정 키 JSON 다운로드 | [ ] |
| Vercel | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` 환경 변수 설정 | [ ] |
| Supabase | 시크릿 `FIREBASE_SERVICE_ACCOUNT_JSON` 등록 (Edge Function send-push 사용 시) | [ ] |
| DB | `push_tokens` 테이블 및 RLS 적용됨 (마이그레이션 20260121) | [ ] |
| 앱 | 네이티브에서 알림 권한 허용 후 토큰이 `/api/push-tokens`로 저장됨 | [ ] |

앱 실행 → 로그인 → 푸시 권한 허용 시 토큰이 자동 등록됩니다. 관리자 푸시 테스트 화면에서 수신 여부를 확인할 수 있습니다.

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

### 푸시가 잘 되다가 갑자기 안 될 때 (Android)
1. **알림 권한**: 기기 설정 → 앱 → TotalManagements → 알림이 켜져 있는지 확인.
2. **로그인 후 재등록**: 앱을 완전히 종료한 뒤 다시 실행 → 로그인하면 푸시 토큰이 자동으로 다시 저장됨. (로그인 직후 `retryPushRegistration` 호출됨)
3. **앱 포커스**: 앱을 백그라운드에서 다시 열면 30초 간격으로 토큰 재등록을 시도함.
4. **관리자 화면**: 푸시 알림 테스트 → 시스템 상태에서 "등록된 디바이스"가 0이면 토큰이 서버에 없는 것. "알림 허용 요청" 버튼으로 권한 요청 후, 로그인 상태에서 앱을 한 번 백그라운드로 보냈다가 다시 열기.
5. **서버 발송 설정**: Vercel 환경 변수 `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`가 설정돼 있는지 확인. (또는 Supabase `send-push` 사용 시 시크릿 `FIREBASE_SERVICE_ACCOUNT_JSON` 확인)

### 진동/아이콘만 있고 알림 제목·메시지가 안 보일 때 (Android)
- **원인**: 알림 채널이 예전에 "낮은 중요도"로 저장되어 있으면, 코드를 바꿔도 기존 채널 설정이 유지됨.
- **조치 1**: 앱을 **한 번 실행**한 뒤 다시 푸시를 보내 보세요. (앱이 채널을 "default_high"로 다시 만들도록 되어 있음.)
- **조치 2**: 기기 **설정 → 앱 → TotalManagements → 알림** 에서 **「알림」** 채널을 눌러 **동작: 팝업 표시(또는 긴급)** / **잠금 화면: 내용 표시** 로 되어 있는지 확인. 삼성·Xiaomi 등은 **알림 스타일**에서 "간단히"가 아닌 **"상세"** 로 설정.
- **조치 3**: 그래도 안 되면 **앱 데이터 삭제** 또는 **앱 재설치** 후 알림 권한 허용 → 앱 한 번 실행 → 푸시 테스트.

### 앱 실행 시 알림 허용 팝업이 안 뜨는 경우
- 앱이 뜬 뒤 약 1.2초 후에 권한 요청을 하도록 되어 있습니다. 그래도 안 뜨면 **관리자 → 푸시 알림 테스트** 화면의 **「알림 허용 요청」** 버튼을 눌러 보세요.
- 기기 **설정 → 앱 → TotalManagements → 알림** 에서 알림을 켜도 됩니다.

### 포그라운드에서 알림 표시 (토스트)
- 앱을 사용 중일 때 푸시가 오면 **인앱 토스트**로 제목/본문이 표시됩니다. (제목·본문은 FCM의 `notification` 또는 `data`에서 가져옵니다.)

### 긴 글·사진 첨부 알림 (확장 알림)
- **긴 본문**이나 **이미지 URL**이 포함된 푸시를 알림 트레이에서 확장 표시(BigTextStyle/BigPictureStyle)하려면 Android **커스텀 FirebaseMessagingService** 구현이 필요합니다.
- 자세한 흐름과 예시는 `docs/PUSH_NOTIFICATION_ARCHITECTURE.md`의 「6. 푸시 알림 종류 및 구현」「6.3 Android 확장 알림」을 참고하세요.
- 현재는 FCM `data`에 `title`, `body`, `action_url`(및 선택 시 `image`)을 넣어 전송하고 있으며, 포그라운드에서는 토스트로 전체 내용을 볼 수 있습니다.
