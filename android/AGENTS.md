# android — Capacitor 네이티브 껍데기 (Android)

## 맡는 것
- Android 앱 `com.grigo.totalmanagements`(앱 이름 TotalManagements)의 네이티브 프로젝트.
- WebView로 `https://totalmanagement.vercel.app`을 불러오고, 네이티브 기능만 제공한다.
  - 푸시(FCM)
  - 위치
  - 카메라
  - 토스트
  - 앱 수명주기

## 맡지 않는 것
- 화면과 업무 로직. 앱 안의 모든 화면은 운영 웹 배포본이다. 웹을 배포하면 앱 화면도 바로 바뀐다.
- iOS 껍데기(`ios/`).

## 지켜야 할 것
- **설정 원본**: 원본 설정은 루트 `capacitor.config.ts`다. `server.url`을 로컬·미리보기 주소로 바꾼 채 커밋하지 않는다. 그러면 설치된 앱이 운영 대신 그 주소를 연다.
- **Firebase 설정 파일**: `android/app/google-services.json`은 Firebase 콘솔에서 받아 로컬에만 둔다. `.gitignore`로 막혀 있고 저장소는 공개다.
- **다시 빌드해야 하는 경우**: 네이티브 권한·플러그인·아이콘·앱 ID를 바꿨을 때만 `npm run cap:sync` 후 다시 빌드한다. 웹만 바꿨으면 다시 빌드할 필요가 없다.
- **빌드 환경**
  - Android Studio 내장 JBR을 `JAVA_HOME`으로 쓴다.
  - 사용자 폴더 경로에 한글이 있으면 `$env:USERPROFILE`로 경로를 조립해 `gradlew.bat assembleDebug`를 실행한다.
- **푸시 수신 흐름**: 앱은 FCM 토큰을 서버의 `push_tokens`에 등록한다. 앱을 다시 설치하면 토큰이 바뀐다. 새 토큰이 등록되기 전까지 그 사용자에게는 푸시가 가지 않는다.

## 테스트할 것
- 설치 후 로그인 → 운영 URL 로드, 세션 유지.
- 할일 배정 알림이 기기 푸시로 도착하는지.
- 출근 버튼에서 위치 권한 요청이 뜨는지(위치 값은 현재 출근 판정에 쓰이지 않는다).
