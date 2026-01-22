'use client';

/**
 * Capacitor 네이티브 기능 유틸리티
 * 
 * 이 모듈은 Capacitor 플러그인들을 래핑하여
 * React/Next.js 앱에서 쉽게 사용할 수 있도록 합니다.
 */

// 플랫폼 유틸리티
export {
  getPlatform,
  isNativePlatform,
  isAndroid,
  isIOS,
  isWeb,
  isPluginAvailable,
  type Platform,
} from './platform';

// 푸시 알림
export {
  initPushNotifications,
  requestPushPermission,
  removePushListeners,
  clearBadge,
} from './push';

// GPS/위치
export {
  getCurrentPosition,
  watchPosition,
  clearWatch,
  checkLocationPermission,
  requestLocationPermission,
  calculateDistance,
  isWithinRadius,
  type LocationCoordinates,
} from './geolocation';

// 카메라
export {
  takePicture,
  pickFromGallery,
  pickImage,
  checkCameraPermission,
  requestCameraPermission,
  dataUrlToBlob,
  dataUrlToFile,
  type CapturedImage,
} from './camera';
