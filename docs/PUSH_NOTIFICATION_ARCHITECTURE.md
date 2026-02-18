# 푸시 알림 아키텍처 및 구현 가이드

웹앱(Next.js 등)을 Capacitor로 Android 앱으로 패키징하고, FCM + Supabase Edge Function으로 푸시 알림을 구현·테스트하기 위한 **전체 아키텍처, 설정, 구현, 빌드/설치, 테스트** 방법을 정리한 문서입니다.  
다른 웹앱 프로젝트에 그대로 적용할 수 있도록 단계별로 서술합니다.

---

## 목차

1. [아키텍처 개요](#1-아키텍처-개요)
2. [FCM(Firebase Cloud Messaging) 설정](#2-fcm-firebase-cloud-messaging-설정)
3. [Supabase 설정](#3-supabase-설정)
4. [Capacitor로 웹앱을 앱으로 패키징](#4-capacitor로-웹앱을-앱으로-패키징)
5. [푸시 알림 종류 및 구현](#5-푸시-알림-종류-및-구현)
6. [앱 내 푸시 허용·토큰·수신 표시](#6-앱-내-푸시-허용토큰수신-표시)
7. [Android APK 빌드 및 설치 (CLI / adb)](#7-android-apk-빌드-및-설치-cli--adb)
8. [푸시 테스트 방법](#8-푸시-테스트-방법)
9. [다른 웹앱 적용 체크리스트](#9-다른-웹앱-적용-체크리스트)

---

## 1. 아키텍처 개요

### 1.1 전체 흐름

```
[Firebase Console]                    [Supabase]
     │                                     │
     │  google-services.json               │  push_tokens 테이블
     │  (Android 앱 등록)                  │  (user_id, token, platform)
     ▼                                     │
[Android 앱 (Capacitor)]                   │
     │                                     │
     │  1) 앱 설치·실행 → 알림 권한 요청   │
     │  2) FCM 토큰 발급 → Supabase에 저장 ─┘
     │  3) 푸시 수신 → 토스트/확장 알림 표시
     │
     │  푸시 발송 요청 (user_id / token + title, body, image, data)
     ▼
[Supabase Edge Function: send-push]
     │
     │  FCM HTTP v1 API (서비스 계정 JWT)
     ▼
[FCM] ──► [기기] 푸시 배달
```

### 1.2 다이어그램 (Mermaid)

```mermaid
flowchart LR
  subgraph Client
    A[웹앱 Next.js]
    B[Capacitor]
    C[Android APK]
  end
  subgraph Firebase
    D[FCM]
    E[서비스 계정]
  end
  subgraph Supabase
    F[push_tokens]
    G[Edge: send-push]
    H[Edge: trigger-push]
  end
  A --> B --> C
  C -->|1. 토큰 발급| D
  C -->|2. 토큰 저장| F
  G -->|3. FCM API 호출| E
  E --> D
  D -->|4. 푸시 전달| C
  A -->|5. 이벤트 시| H
  H --> G
```

### 1.3 구성 요소

| 구성 요소 | 역할 |
|----------|------|
| **Firebase 프로젝트** | FCM 토큰 발급, 메시지 전달. Android 앱 패키지명 등록. |
| **google-services.json** | Android 앱이 어떤 Firebase 프로젝트에 연결되는지 정의. |
| **Firebase 서비스 계정 키 (JSON)** | Edge Function에서 FCM API 호출 시 인증. Supabase 시크릿으로만 보관. |
| **Supabase push_tokens** | 사용자별 FCM 토큰 저장 (user_id, token, platform). |
| **Edge Function: send-push** | FCM으로 푸시 전송. user_id 또는 token + title/body/image/data. |
| **Edge Function: trigger-push-event** | 이벤트(제안 도착, 수락 등) 시 수신자 결정 후 send-push 호출. (선택) |
| **Edge Function: test-push-scenario** | 시나리오별 테스트 푸시. (선택) |
| **Capacitor + @capacitor-firebase/messaging** | 웹앱을 Android 앱으로 패키징, FCM 토큰/수신 이벤트 연동. |
| **Android 커스텀 MessagingService** | 긴 글(BigTextStyle), 이미지(BigPictureStyle) 확장 알림 표시. (선택) |

---

## 2. FCM 토큰과 Supabase에서의 설정

### 2.0 요약

- **FCM 토큰**: 앱(기기)마다 FCM이 발급하는 고유 문자열. 이 토큰으로만 해당 기기에 푸시를 보낼 수 있음.
- **Supabase 역할**: 토큰을 `push_tokens` 테이블에 `user_id`와 함께 저장해 두고, Edge Function에서 "이 사용자에게 보내라"면 해당 user의 모든 토큰으로 FCM API를 호출함.

### 2.1 토큰 발급 시점

- 앱 최초 실행 후 알림 권한 허용 → FCM 플러그인이 토큰 발급.
- `tokenReceived` 리스너 또는 `getFCMToken()`으로 토큰 문자열 수신.
- 로그인된 `user_id`가 있으면 그 시점에 Supabase에 저장(upsert).

### 2.2 push_tokens 저장 규칙

- **키**: `(user_id, platform)` unique. 같은 사용자가 Android/iOS/Web 각 1개씩 가질 수 있음.
- **갱신**: 앱 실행·로그인 시마다 현재 토큰으로 upsert하면, 기기 재설치·토큰 갱신 시에도 DB가 최신 상태로 유지됨.
- **로그아웃 시**: 선택적으로 해당 기기 토큰을 DB에서 삭제하고 로컬 토큰 무효화(`deleteToken()`).

### 2.3 Edge Function에서의 사용

- `send-push`는 body에 `user_id`가 오면 `push_tokens`에서 `user_id = ?` 로 `token` 목록을 조회.
- 각 토큰에 대해 FCM HTTP v1 API로 메시지 전송.
- **시크릿** `FIREBASE_SERVICE_ACCOUNT_JSON`으로 FCM 인증. 이 시크릿이 없으면 푸시 전송 불가.

---

## 3. FCM(Firebase Cloud Messaging) 설정

### 3.1 Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속.
2. **프로젝트 추가** (또는 기존 프로젝트 선택).
3. (선택) Google Analytics 사용 여부 설정.

### 3.2 Android 앱 등록

1. Firebase 프로젝트 **설정(톱니바퀴)** → **프로젝트 설정** → **일반** 탭.
2. **앱** 섹션에서 **Android 앱 추가**.
3. **Android 패키지 이름** 입력 (예: `com.dancersbio.app`).  
   - Capacitor 프로젝트의 `android/app/build.gradle` 내 `applicationId`와 **동일**해야 함.
4. (선택) 앱 닉네임, 디버그 서명 SHA-1.
5. **앱 등록** 후 **google-services.json** 다운로드.

### 3.3 google-services.json 배치

- 다운로드한 파일을 **Android 앱 루트**에 둠:
  - 경로: `android/app/google-services.json`
- 이 파일은 **민감 정보**이므로 `.gitignore`에 포함해 Git에 올리지 않음. 팀 공유는 별도 채널로.

### 3.4 서비스 계정 키 (Edge Function용)

1. Firebase Console → **프로젝트 설정** → **서비스 계정** 탭.
2. **새 비공개 키 추가** → JSON 키 파일 다운로드.
3. 이 JSON **전체 내용**을 Supabase 시크릿 `FIREBASE_SERVICE_ACCOUNT_JSON`에 등록 (아래 [3. Supabase 설정](#3-supabase-설정) 참고).  
4. **주의**: 이 키는 서버/Edge Function 전용. 앱 번들·클라이언트 코드·Git에 넣지 않음.

---

## 4. Supabase 설정

### 4.1 push_tokens 테이블

FCM 토큰을 사용자별로 저장하는 테이블.

```sql
-- 예: user_id + platform 당 하나의 토큰 (upsert)
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  token text not null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);

-- RLS: 본인만 자신의 토큰 조회/삽입/갱신
alter table push_tokens enable row level security;
create policy "push_tokens_own" on push_tokens
  for all using (auth.uid() = user_id);
```

- 앱은 로그인 후 FCM 토큰을 받으면 `user_id`, `token`, `platform`으로 upsert.
- Edge Function에서는 **서비스 역할**로 `push_tokens`를 조회해 `user_id`에 해당하는 `token`으로 FCM 전송.

### 4.2 Edge Function 시크릿

**방법 A) 개별 시크릿 3개 (권장, PEM 오류 방지)**

- **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
- 다음 세 개를 각각 추가:
  - `FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID (예: `myproject-12345`)
  - `FIREBASE_CLIENT_EMAIL`: 서비스 계정 이메일 (예: `firebase-adminsdk-xxx@myproject.iam.gserviceaccount.com`)
  - `FIREBASE_PRIVATE_KEY`: private key **한 줄**로, 줄바꿈 자리는 `\n` (백슬래시+n) 그대로 넣기.  
    예: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANB...\n-----END PRIVATE KEY-----\n`

로컬 `.env.local`과 동일한 형식으로 넣으면 됨.

**방법 B) JSON 한 개**

- Name: `FIREBASE_SERVICE_ACCOUNT_JSON`
- Value: Firebase 서비스 계정 JSON **전체** 붙여넣기 (한 줄이어도 됨)

CLI 예시 (PowerShell, 방법 B):

```powershell
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="$(Get-Content -Path 'C:\path\to\service-account.json' -Raw)"
```

### 4.3 Edge Function: send-push

- **역할**: FCM HTTP v1 API로 푸시 1회 전송.
- **입력**: `user_id` 또는 `token` + `title` / `body` (필수) + `data`(딥링크 등) + `image`(URL, 선택).
- **동작**:
  - `user_id`가 있으면 `push_tokens`에서 해당 사용자의 모든 토큰 조회.
  - `token`이 있으면 해당 토큰 1개만 사용.
  - 본문 길이(예: 80자 초과) 또는 `image` 존재 시 **data-only** 메시지로 전송(Android에서 확장 알림용).
  - 그 외에는 **notification + data**로 전송(일반 알림).

배포:

```bash
supabase functions deploy send-push
```

자세한 요청/응답 형식은 기존 `docs/FCM_SETUP.md` 7절 참고.

### 4.4 (선택) Edge Function: trigger-push-event

- 이벤트 타입(예: `proposal_created`, `proposal_accepted`, `project_status_changed`)과 payload(예: `proposal_id`, `project_id`)를 받아, DB에서 수신자 `user_id` 목록을 계산한 뒤 각각에 대해 send-push를 호출.
- 앱에서 제안 생성/수락·거절·협상, 프로젝트 상태 변경 등 이후 `trigger-push-event`를 호출하도록 구현.

### 4.5 (선택) Edge Function: test-push-scenario

- 시나리오 키(예: `proposal_created`)와 대상 `user_id`(생략 시 JWT sub)를 받아, 해당 시나리오와 동일한 제목/본문/링크로 테스트 푸시 1건 전송.
- 관리자 UI에서 시나리오별 테스트용으로 사용.

### 4.6 (선택) Storage: 푸시 이미지용 버킷

- 이미지 첨부 푸시용 공개 버킷(예: `push-assets`).
- 관리자가 업로드한 이미지 URL을 `send-push`의 `image` 인자로 전달.
- 버킷 정책: 업로드/삭제는 관리자(예: `role=admin`)만, 읽기는 공개.

---

## 5. Capacitor로 웹앱을 앱으로 패키징

### 5.1 Capacitor 추가 (이미 있으면 생략)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
```

- 앱 이름, 패키지 ID(Android `applicationId`와 맞출 것), 웹 asset 경로(Next.js면 `out` 또는 빌드 결과물 경로) 지정.

### 5.2 Android 플랫폼 추가

```bash
npm install @capacitor/android
npx cap add android
```

- `android/` 폴더가 생성되고, `applicationId`가 `capacitor.config.ts`(또는 `capacitor.config.json`)의 `appId`와 연동됨.

### 5.3 Firebase Messaging 플러그인

```bash
npm install @capacitor-firebase/messaging
npx cap sync android
```

- `android/` 쪽에 Firebase Messaging 연동이 포함됨.
- `google-services.json`을 `android/app/`에 두고, 루트 `android/build.gradle`에 `google-services` classpath, `android/app/build.gradle`에 `apply plugin: 'com.google.gms.google-services'` 적용 (이미 되어 있는지 확인).

### 5.4 Next.js 빌드 결과물 연결

- Next.js는 보통 `next build` 후 `out`(정적 export) 또는 프록시로 앱에서 로드.
- 정적 export인 경우: `capacitor.config.ts`에서 `webDir`을 `out`으로 두고, 빌드 후 `npx cap sync android`로 `android/app/src/main/assets/public/` 등에 복사되게 함.
- 동적 라우팅이 필요하면 `server` 옵션으로 로컬 URL을 가리키게 할 수 있음(개발용). 프로덕션에서는 보통 정적 export 또는 호스팅 URL을 `server.url`로 두는 방식을 사용.

---

## 6. 푸시 알림 종류 및 구현

### 6.1 세 가지 유형

| 유형 | 설명 | FCM 전송 방식 | 앱 표시 |
|------|------|----------------|---------|
| **짧은 메시지** | 한 줄 정도 제목+본문 | `notification` + `data` | 일반 알림 (한 줄) |
| **긴 메시지** | 여러 줄 본문 (예: 80자 초과) | **data-only** (title, body, link를 data에) | Android: BigTextStyle(접었다 펼치기) |
| **사진 첨부** | 이미지 URL 포함 | **data-only** (title, body, image, link를 data에) | Android: BigPictureStyle(접었다 펼치기) |

### 6.2 send-push 동작 요약

- **짧은 메시지**: FCM에 `notification` + `data` 전송. OS가 기본 알림으로 표시.
- **긴 메시지 / 이미지**: 본문 길이 임계(예: 80자) 초과 또는 `image` 존재 시 **data만** 전송.  
  → Android에서는 `FirebaseMessagingService.onMessageReceived()`가 항상 호출되므로, **커스텀 MessagingService**에서 `NotificationCompat.BigTextStyle` / `BigPictureStyle`로 알림을 직접 만들어 표시.

### 6.3 Android 확장 알림 (BigText / BigPicture)

- FCM **data-only** 메시지일 때만 커스텀 스타일 적용 가능.
- 본 프로젝트: **CustomMessagingService** (`android/app/src/main/java/.../CustomMessagingService.java`)가 플러그인 기본 서비스를 대체함.
  - `notification` payload: 플러그인과 동일하게 처리 후 JS로 전달.
  - **data-only** (`data.title`, `data.body`, `data.image`): `BigTextStyle` 또는 `BigPictureStyle`로 알림 표시 후 `PushNotificationsPlugin.sendRemoteMessage` 호출해 JS에도 전달.
- 매니페스트에서 플러그인 기본 서비스는 `tools:node="remove"`로 제거하고, 커스텀 서비스만 등록해 중복 알림 방지.

---

## 7. 앱 내 푸시 허용·토큰·수신 표시

### 7.1 알림 권한 (Android 13+)

- `POST_NOTIFICATIONS` 권한 필요.
- `MainActivity` 또는 앱 초기화 시 권한 요청.  
  사용자가 허용해야 FCM 토큰이 발급되고, 푸시가 표시됨.

### 7.2 FCM 토큰 발급 및 Supabase 저장

- `@capacitor-firebase/messaging`: `getFCMToken()`, `addListener('tokenReceived', ...)`.
- 로그인한 사용자 `user_id`와 함께 `push_tokens`에 upsert (`user_id`, `token`, `platform`).
- 앱 실행 시·로그인 직후 한 번씩 토큰 재확인 후 저장하면, 기기 변경·재설치 후에도 토큰이 갱신됨.

### 7.3 수신 시 표시 (포그라운드)

- **notificationReceived** 이벤트에서 제목/본문/링크를 읽어 **앱 내 토스트**로 표시.
- data-only 메시지는 `notification` 객체에 title/body가 없을 수 있으므로, `data.title`, `data.body`를 fallback으로 사용.

### 7.4 알림 탭(딥링크)

- **notificationActionPerformed** 또는 알림의 PendingIntent에서 `data.link`(예: `/my/proposals`)를 읽어, WebView/앱에서 해당 경로로 이동.

---

## 8. Android APK 빌드 및 설치 (CLI / adb)

### 8.1 사전 요구사항

- **Node.js**: Next.js 빌드용.
- **JDK 17** (권장): Android 빌드용.  
  Android Studio를 쓰면 **Android Studio 내장 JBR**을 쓸 수 있음 (예: `C:\Program Files\Android\Android Studio\jbr`).
- **JAVA_HOME**: Gradle이 사용할 JDK 경로.  
  미설정 시 빌드 실패하므로, 스크립트나 셸에서 설정 후 사용.

### 8.2 빌드·동기화·설치 (한 번에)

프로젝트 루트에서:

```powershell
# JAVA_HOME (Windows 예시)
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"

# 1) 웹 빌드
npm run build

# 2) Capacitor가 웹 빌드 결과를 android 쪽으로 복사
npx cap sync android

# 3) 디버그 APK 빌드 + 연결 기기에 설치
.\android\gradlew.bat -p .\android installDebug
```

- `installDebug`는 **USB로 연결된 기기** 또는 **무선 디버깅으로 연결된 기기**에 자동 설치.
- 성공 시 로그에 `Installing APK 'app-debug.apk' on '기기이름'` 이 보임.

### 8.3 무선 디버깅으로 기기 연결 (adb)

1. **기기**: 개발자 옵션 → **무선 디버깅** 켜기.
2. **무선 디버깅** 화면에서 **IP:포트** 확인 (예: `192.168.0.10:5555`).
3. PC와 기기가 **같은 Wi‑Fi**에 연결된 상태에서:

```bash
adb connect 192.168.0.10:5555
adb devices
```

- `devices`에 `192.168.0.10:5555 device`로 나오면 연결된 것.
4. 이후 `.\android\gradlew.bat -p .\android installDebug` 하면 해당 기기에 설치됨.

### 8.4 adb로만 APK 설치하기

- 이미 빌드된 APK가 있을 때:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

- `-r`: 기존 앱이 있으면 교체(재설치).

### 8.5 스크립트로 한 번에 (Windows PowerShell)

- 프로젝트에 `scripts/android-build-install.ps1` 같은 스크립트를 두고:
  - JAVA_HOME 자동 탐색(Android Studio JBR 등),
  - `npm run build` → `npx cap sync android` → `gradlew installDebug` 순서로 실행하도록 하면, 다른 웹앱에서도 경로만 바꿔 재사용 가능.

---

## 9. 푸시 테스트 방법

### 9.1 관리자 푸시 화면에서

- **메시지 유형**: 짧은 메시지 / 긴 메시지 / 사진 첨부 선택.
- **대상**: 전체 / 특정 회원(user_id) / FCM 토큰 직접 입력.
- **사진 첨부** 시: 이미지를 Supabase Storage(예: `push-assets`)에 업로드한 뒤, 받은 공개 URL을 `send-push`의 `image`로 전달하도록 구현.
- **테스트 발송** 버튼으로 `send-push` 호출 → 기기에서 수신·확장 여부 확인.

### 9.2 시나리오별 테스트 (test-push-scenario)

- 시나리오 키(예: `proposal_created`, `proposal_accepted`)와 대상 user_id(또는 JWT sub)로 호출.
- 실제 이벤트와 동일한 제목/본문/링크로 테스트 푸시 1건 전송.

### 9.3 curl로 send-push 직접 호출

```bash
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/send-push' \
  -H 'Authorization: Bearer <SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"<uuid>","title":"테스트","body":"본문 내용"}'
```

- 응답에 `sent`, `total`, `results`가 오면, 실패 시 `results[].error`로 원인 확인 가능.

### 9.4 확인 포인트

- **짧은 메시지**: 알림이 한 줄로 오는지.
- **긴 메시지**: 알림을 아래로 당겼을 때 전체 본문이 펼쳐지는지(BigTextStyle).
- **사진 첨부**: 펼쳤을 때 이미지가 나오는지(BigPictureStyle).
- **포그라운드**: 앱 사용 중일 때 토스트/인앱 메시지가 뜨는지.
- **딥링크**: 알림 탭 시 `data.link` 경로로 이동하는지.

---

## 10. 다른 웹앱 적용 체크리스트

아래 순서로 진행하면 동일 구성을 다른 웹앱에 적용할 수 있음.

### Firebase

- [ ] Firebase 프로젝트 생성
- [ ] Android 앱 등록 (패키지명 = Capacitor `appId`와 동일)
- [ ] `google-services.json` 다운로드 → `android/app/google-services.json` 배치
- [ ] 서비스 계정 키 JSON 다운로드 (Supabase 시크릿용)

### Supabase

- [ ] `push_tokens` 테이블 생성 및 RLS
- [ ] 시크릿 `FIREBASE_SERVICE_ACCOUNT_JSON` 등록
- [ ] Edge Function `send-push` 배포
- [ ] (선택) `trigger-push-event`, `test-push-scenario` 배포
- [ ] (선택) 푸시 이미지용 Storage 버킷 + 정책

### Capacitor + 앱

- [ ] Capacitor 초기화, Android 플랫폼 추가
- [ ] `@capacitor-firebase/messaging` 설치 및 `cap sync`
- [ ] 앱에서 FCM 토큰 수신 → Supabase `push_tokens` upsert
- [ ] 알림 권한 요청 (Android 13+)
- [ ] 수신 시 토스트/인앱 표시 및 data fallback (title/body)
- [ ] 알림 탭 시 `data.link` 딥링크 처리

### 확장 알림 (긴 글 / 이미지)

- [ ] `send-push`에서 긴 본문·이미지 시 data-only 전송 로직
- [ ] Android 커스텀 `FirebaseMessagingService` (BigTextStyle/BigPictureStyle)
- [ ] 매니페스트에서 기본 서비스 제거, 커스텀 서비스 등록
- [ ] default 채널을 IMPORTANCE_HIGH로 생성

### 빌드·설치

- [ ] `JAVA_HOME` 설정 (또는 스크립트에서 자동 탐색)
- [ ] `npm run build` → `npx cap sync android` → `gradlew installDebug`
- [ ] (선택) 무선 디버깅 시 `adb connect` 후 설치

### 테스트

- [ ] 관리자(또는 테스트) 화면에서 짧은/긴/이미지 푸시 발송
- [ ] 포그라운드·백그라운드에서 수신 및 확장 표시 확인
- [ ] 알림 탭 시 딥링크 동작 확인

---

이 문서는 `FCM_SETUP.md`와 함께 참고하면, FCM·Supabase·Capacitor·푸시 종류·빌드/설치/테스트까지 한 흐름으로 재현할 수 있습니다.
