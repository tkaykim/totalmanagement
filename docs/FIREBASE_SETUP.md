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

## 주의사항

- Firebase 인증 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 추가됨)
- iOS 앱 푸시 테스트는 실제 기기에서만 가능합니다
- APNs 설정 없이는 iOS 푸시 알림이 작동하지 않습니다
