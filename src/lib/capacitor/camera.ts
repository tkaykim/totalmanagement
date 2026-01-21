'use client';

import { Camera, CameraResultType, CameraSource, Photo, ImageOptions } from '@capacitor/camera';
import { isNativePlatform, isPluginAvailable } from './platform';

/**
 * 카메라/갤러리 유틸리티
 */

export interface CapturedImage {
  base64String?: string;
  dataUrl?: string;
  webPath?: string;
  path?: string;
  format: string;
  exif?: any;
}

/**
 * 카메라 권한 상태 확인
 */
type PermissionStatus = 'granted' | 'denied' | 'prompt';

function normalizePermissionState(state: string): PermissionStatus {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'prompt';
}

export async function checkCameraPermission(): Promise<{
  camera: PermissionStatus;
  photos: PermissionStatus;
}> {
  try {
    const status = await Camera.checkPermissions();
    return {
      camera: normalizePermissionState(status.camera),
      photos: normalizePermissionState(status.photos),
    };
  } catch (error) {
    console.error('[Camera] 권한 확인 실패:', error);
    return { camera: 'denied', photos: 'denied' };
  }
}

/**
 * 카메라 권한 요청
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const status = await Camera.checkPermissions();
    
    if (status.camera === 'granted') {
      return true;
    }
    
    if (status.camera === 'prompt' || status.camera === 'denied') {
      const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      return result.camera === 'granted';
    }
    
    return false;
  } catch (error) {
    console.error('[Camera] 권한 요청 실패:', error);
    return false;
  }
}

/**
 * 카메라로 사진 촬영
 */
export async function takePicture(options?: Partial<ImageOptions>): Promise<CapturedImage | null> {
  try {
    const defaultOptions: ImageOptions = {
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
      correctOrientation: true,
      ...options,
    };

    const photo: Photo = await Camera.getPhoto(defaultOptions);
    
    return {
      base64String: photo.base64String,
      dataUrl: photo.dataUrl,
      webPath: photo.webPath,
      path: photo.path,
      format: photo.format,
      exif: photo.exif,
    };
  } catch (error: any) {
    // 사용자가 취소한 경우
    if (error?.message?.includes('User cancelled')) {
      console.log('[Camera] 사용자가 취소했습니다.');
      return null;
    }
    console.error('[Camera] 사진 촬영 실패:', error);
    return null;
  }
}

/**
 * 갤러리에서 사진 선택
 */
export async function pickFromGallery(options?: Partial<ImageOptions>): Promise<CapturedImage | null> {
  try {
    const defaultOptions: ImageOptions = {
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: true,
      ...options,
    };

    const photo: Photo = await Camera.getPhoto(defaultOptions);
    
    return {
      base64String: photo.base64String,
      dataUrl: photo.dataUrl,
      webPath: photo.webPath,
      path: photo.path,
      format: photo.format,
      exif: photo.exif,
    };
  } catch (error: any) {
    if (error?.message?.includes('User cancelled')) {
      console.log('[Camera] 사용자가 취소했습니다.');
      return null;
    }
    console.error('[Camera] 사진 선택 실패:', error);
    return null;
  }
}

/**
 * 카메라 또는 갤러리 선택 (사용자 선택)
 */
export async function pickImage(options?: Partial<ImageOptions>): Promise<CapturedImage | null> {
  try {
    const defaultOptions: ImageOptions = {
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // 사용자에게 선택권 부여
      promptLabelHeader: '사진 선택',
      promptLabelCancel: '취소',
      promptLabelPhoto: '갤러리에서 선택',
      promptLabelPicture: '카메라로 촬영',
      correctOrientation: true,
      ...options,
    };

    const photo: Photo = await Camera.getPhoto(defaultOptions);
    
    return {
      base64String: photo.base64String,
      dataUrl: photo.dataUrl,
      webPath: photo.webPath,
      path: photo.path,
      format: photo.format,
      exif: photo.exif,
    };
  } catch (error: any) {
    if (error?.message?.includes('User cancelled')) {
      console.log('[Camera] 사용자가 취소했습니다.');
      return null;
    }
    console.error('[Camera] 이미지 선택 실패:', error);
    return null;
  }
}

/**
 * DataUrl을 Blob으로 변환
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * DataUrl을 File 객체로 변환
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type });
}
