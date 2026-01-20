1. Capacitor 설치 및 초기화터미널(VS Code 등)에서 프로젝트 루트 경로에 다음 명령어를 순서대로 입력합니다.Bash#
1. Capacitor 코어 및 CLI 설치
npm install @capacitor/core
npm install -D @capacitor/cli

# 2. Capacitor 초기화 (앱 이름과 ID 설정)
# 예: npx cap init [앱이름] [com.회사명.앱이름]
npx cap init GrigoApp com.grigo.app
2. 빌드 경로 설정 (중요)프로젝트 루트에 생성된 capacitor.config.ts (또는 .json) 파일을 엽니다.React 빌드 결과물이 저장되는 폴더명으로 webDir을 맞춰주어야 합니다.Vite 사용 시: distCRA (Create React App) 사용 시: buildTypeScriptimport { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grigo.app',
  appName: 'GrigoApp',
  webDir: 'dist', // 또는 'build'. 본인 프로젝트 설정에 맞게 수정
  server: {
    androidScheme: 'https'
  }
};

export default config;
3. 네이티브 플랫폼 추가Android와 iOS 플랫폼 폴더를 생성합니다.Bashnpm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
4. React 빌드 및 네이티브 동기화 (핵심 루틴)이 부분이 대표님께서 반복하게 될 **'배포 루틴'**입니다. 웹 소스를 빌드하고, 그 결과물을 네이티브 폴더로 복사해 넣습니다.Bash# 1. React 웹 빌드 (기존 웹 배포하듯이)
npm run build

# 2. 빌드된 자산을 네이티브 폴더로 동기화
npx cap sync
5. 네이티브 기능 추가 (GPS 예시)요청하신 GPS 기능을 사용하려면 플러그인을 설치하고 호출하면 됩니다.설치:Bashnpm install @capacitor/geolocation
npx cap sync
React 코드 적용:JavaScriptimport { Geolocation } from '@capacitor/geolocation';

const printCurrentPosition = async () => {
  // 권한 요청 및 좌표 획득
  const coordinates = await Geolocation.getCurrentPosition();
  console.log('현재 위치:', coordinates);
};
6. 최종 패키징 (APK / TestFlight)이제 각 네이티브 IDE를 열어서 파일만 추출하면 됩니다.Android (APK 추출):npx cap open android 입력 $\rightarrow$ Android Studio 자동 실행됨.상단 메뉴 Build $\rightarrow$ Build Bundle(s) / APK(s) $\rightarrow$ Build APK(s) 클릭.생성된 APK 파일을 팀원분들 폰에 넣어 설치하면 끝입니다.iOS (TestFlight 업로드): (Mac 필수)npx cap open ios 입력 $\rightarrow$ Xcode 자동 실행됨.상단 메뉴 Product $\rightarrow$ Archive 클릭.아카이브 완료 후 Distribute App 버튼을 눌러 App Store Connect(TestFlight)로 업로드합니다.대표님을 위한 다음 단계 제안