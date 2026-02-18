# Firebase 프로젝트 설정 가이드

## 1. Firebase Console 접속

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

## 2. Android 앱 등록

1. 프로젝트 설정 → 앱 추가 → Android 선택
2. Android 패키지 이름: `com.grigo.totalmanagements`
3. 앱 닉네임: `TotalManagements (Android)`
4. `google-services.json` 다운로드
5. 다운로드한 파일을 `android/app/` 폴더에 복사

## 3. iOS 앱 등록

1. 프로젝트 설정 → 앱 추가 → iOS 선택
2. Apple 번들 ID: `com.grigo.totalmanagements`
3. 앱 닉네임: `TotalManagements (iOS)`
4. `GoogleService-Info.plist` 다운로드
5. 다운로드한 파일을 `ios/App/App/` 폴더에 복사

## 4. Cloud Messaging 설정

### Android (FCM)

- 추가 설정 없이 `google-services.json`만 있으면 작동합니다.

### iOS (APNs)

1. Apple Developer Console에서 APNs 키 생성:
   - [Apple Developer](https://developer.apple.com/account/) → Certificates, Identifiers & Profiles
   - Keys → Create a Key → Apple Push Notifications service (APNs) 체크
   - 키 다운로드 (.p8 파일)

2. Firebase에 APNs 키 등록:
   - Firebase Console → 프로젝트 설정 → Cloud Messaging
   - iOS 앱 → APNs Authentication Key 업로드
   - Key ID와 Team ID 입력

## 5. 설정 파일 위치

```
TotalManagements/
├── android/
│   └── app/
│       └── google-services.json   ← 여기에 배치
└── ios/
    └── App/
        └── App/
            └── GoogleService-Info.plist   ← 여기에 배치
```

## 6. 설정 완료 후

```bash
# 네이티브 프로젝트 동기화
npx cap sync

# Android Studio 열기
npx cap open android

# Xcode 열기 (Mac 전용)
npx cap open ios
```

## 7. 서버/푸시 발송 설정

푸시 알림을 **발송**하려면 다음 중 하나(또는 둘 다)를 설정합니다.

### A) Vercel (Next.js API용)

웹앱이 Vercel에 배포된 경우, Next.js API(`/api/push/test`, `push-sender.ts`)에서 FCM을 쓰려면 환경 변수를 설정합니다.

1. Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**
2. 다음 변수 추가 (Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 키 추가 → JSON 다운로드 후 값 복사):
   - `FIREBASE_PROJECT_ID`: JSON의 `project_id`
   - `FIREBASE_CLIENT_EMAIL`: JSON의 `client_email`
   - `FIREBASE_PRIVATE_KEY`: JSON의 `private_key` (따옴표 제거, `\n`은 그대로 두거나 실제 줄바꿈으로 넣어도 됨)

설정 후 재배포하면 관리자 푸시 테스트 화면에서 전송이 동작합니다.

### B) Supabase Edge Function (send-push)

Supabase에서 푸시를 보내려면 Edge Function 시크릿을 설정합니다.

**방법 A) 개별 시크릿 3개 (권장)**  
Supabase 대시보드 → **Edge Functions** → **Secrets**에서 다음을 각각 추가:

- `FIREBASE_PROJECT_ID`: 프로젝트 ID  
- `FIREBASE_CLIENT_EMAIL`: 서비스 계정 이메일  
- `FIREBASE_PRIVATE_KEY`: private key (로컬과 동일하게 `\n` 으로 줄바꿈. 예: `-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n`)

**방법 B) JSON 한 개**  
- Name: `FIREBASE_SERVICE_ACCOUNT_JSON`  
- Value: Firebase 서비스 계정 JSON **전체** 붙여넣기 (한 줄이어도 됨)

호출 예 (Bearer에는 Supabase anon key 또는 사용자 JWT):

```bash
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/send-push' \
  -H 'Authorization: Bearer <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"<uuid>","title":"테스트","body":"본문 내용"}'
```

- `user_id`: 전송 대상 사용자 UUID (push_tokens에 등록된 토큰으로 전송)
- 또는 `token`: FCM 토큰 직접 지정
- `data`, `image`(URL) 선택 가능

## GitHub "Possible valid secrets detected" 알림이 뜬 경우

- **원인**: 푸시 발송은 Supabase Edge Function(시크릿은 대시보드에만 저장)으로 하더라도, **Android 앱**이 FCM을 쓰려면 `android/app/google-services.json`이 필요합니다. 이 파일 안에 **Google API Key**가 들어 있어서, **이 파일이 과거에 한 번이라도 커밋되면** GitHub 시크릿 스캔이 “노출된 시크릿”으로 알림을 보냅니다.
- **즉**, 알림은 “Edge Function 시크릿”이 아니라 **`google-services.json` 안의 Google API Key** 때문에 뜨는 것입니다.
- **대응**:
  1. `.gitignore`에 `google-services.json`, `android/app/google-services.json` 등이 있는지 확인하고, **앞으로는 절대 커밋하지 않기**.
  2. 이미 커밋된 적이 있다면:  
     `git rm --cached android/app/google-services.json` 후 커밋·푸시해서 **추적만 제거**합니다. (히스토리에는 남으므로)  
     **Google Cloud Console**에서 해당 프로젝트 → API 및 서비스 → 사용자 인증 정보로 가서 **노출된 API 키를 비활성화·삭제**하고, 필요하면 새 키를 만들어 `google-services.json`을 다시 다운로드한 뒤 **로컬에만** 보관하세요.

## 주의사항

- Firebase 인증 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 추가됨)
- iOS 앱 푸시 테스트는 실제 기기에서만 가능합니다
- APNs 설정 없이는 iOS 푸시 알림이 작동하지 않습니다
- 서비스 계정 키(JSON/환경변수)는 서버·Edge Function 전용으로만 사용하고, 클라이언트·Git에 넣지 마세요
