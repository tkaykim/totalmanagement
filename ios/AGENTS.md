# ios — Capacitor 네이티브 껍데기 (iOS)

## 맡는 것
- iOS 앱(`com.grigo.totalmanagements`)의 Xcode 프로젝트(`App/App.xcodeproj`, Swift Package Manager 기반 `CapApp-SPM`).
- WebView로 `https://totalmanagement.vercel.app`을 불러오고, 푸시·위치·카메라 같은 네이티브 기능만 제공한다.

## 맡지 않는 것
- 화면과 업무 로직. 앱 안의 화면은 운영 웹 배포본이다.
- Android 껍데기(`android/`).

## 지켜야 할 것
- **설정 원본**: 원본 설정은 루트 `capacitor.config.ts`다. `server.url`을 운영 외 주소로 바꾼 채 커밋하지 않는다.
- **Firebase 설정 파일**: `GoogleService-Info.plist`는 로컬에만 둔다(`.gitignore`, 공개 저장소).
- **다시 빌드해야 하는 경우**: 네이티브 설정·권한·플러그인을 바꿨을 때만 `npm run cap:sync` → `npm run cap:ios`(Xcode)로 다시 빌드한다. 빌드는 macOS가 필요하다.
- **웹 푸시 조건**: 네이티브 앱이 아닌 Safari 사용자는 홈 화면에 추가한 PWA 상태여야 웹 푸시를 받는다. 알림 권한 안내는 웹 화면(`IOSPushPrompt`)이 맡는다.

## 테스트할 것
- 설치 후 로그인과 세션 유지.
- 푸시 권한 허용 후 할일 배정 알림 도착.
