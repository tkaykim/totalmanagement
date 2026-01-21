'use client';

import { Geolocation, Position, PositionOptions } from '@capacitor/geolocation';
import { isNativePlatform, isPluginAvailable } from './platform';

/**
 * GPS/위치 유틸리티
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

type PermissionStatus = 'granted' | 'denied' | 'prompt';

function normalizePermissionState(state: string): PermissionStatus {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'prompt';
}

/**
 * 위치 권한 상태 확인
 */
export async function checkLocationPermission(): Promise<PermissionStatus> {
  try {
    const status = await Geolocation.checkPermissions();
    return normalizePermissionState(status.location);
  } catch (error) {
    console.error('[Geolocation] 권한 확인 실패:', error);
    return 'denied';
  }
}

/**
 * 위치 권한 요청
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const status = await Geolocation.checkPermissions();
    
    if (status.location === 'granted') {
      return true;
    }
    
    if (status.location === 'prompt') {
      const result = await Geolocation.requestPermissions();
      return result.location === 'granted';
    }
    
    return false;
  } catch (error) {
    console.error('[Geolocation] 권한 요청 실패:', error);
    return false;
  }
}

/**
 * 현재 위치 가져오기
 */
export async function getCurrentPosition(options?: PositionOptions): Promise<LocationCoordinates | null> {
  try {
    // 권한 확인
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn('[Geolocation] 위치 권한이 없습니다.');
      return null;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    const position: Position = await Geolocation.getCurrentPosition(defaultOptions);
    
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    };
  } catch (error) {
    console.error('[Geolocation] 위치 가져오기 실패:', error);
    return null;
  }
}

/**
 * 위치 추적 시작 (watchPosition)
 */
export async function watchPosition(
  callback: (position: LocationCoordinates | null, error?: any) => void,
  options?: PositionOptions
): Promise<string | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      callback(null, new Error('위치 권한이 없습니다.'));
      return null;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    const watchId = await Geolocation.watchPosition(defaultOptions, (position, error) => {
      if (error) {
        callback(null, error);
        return;
      }

      if (position) {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });
      }
    });

    return watchId;
  } catch (error) {
    console.error('[Geolocation] 위치 추적 시작 실패:', error);
    callback(null, error);
    return null;
  }
}

/**
 * 위치 추적 중지
 */
export async function clearWatch(watchId: string): Promise<void> {
  try {
    await Geolocation.clearWatch({ id: watchId });
    console.log('[Geolocation] 위치 추적 중지');
  } catch (error) {
    console.error('[Geolocation] 위치 추적 중지 실패:', error);
  }
}

/**
 * 두 좌표 사이의 거리 계산 (미터 단위, Haversine 공식)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 지구 반경 (미터)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 특정 위치 범위 내에 있는지 확인
 */
export function isWithinRadius(
  currentLat: number,
  currentLon: number,
  targetLat: number,
  targetLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
  return distance <= radiusMeters;
}
