'use client';

/**
 * Android 하드웨어 뒤로가기 버튼 핸들러
 * 
 * 우선순위:
 * 1. 열린 모달이 있으면 모달 닫기
 * 2. 대시보드(메인)가 아닌 뷰에 있으면 대시보드로 이동
 * 3. 이미 대시보드에 있으면 앱 최소화 (종료 방지)
 */

import { App } from '@capacitor/app';
import { isNativePlatform } from './platform';

type BackButtonCallback = () => boolean; // returns true if handled

const callbacks: BackButtonCallback[] = [];
let isListening = false;

/**
 * 뒤로가기 콜백 등록 (우선순위 = 나중에 등록한 것이 먼저 실행)
 * @returns cleanup 함수
 */
export function registerBackButtonCallback(cb: BackButtonCallback): () => void {
    callbacks.push(cb);
    return () => {
        const idx = callbacks.indexOf(cb);
        if (idx >= 0) callbacks.splice(idx, 1);
    };
}

/**
 * 뒤로가기 리스너 시작 (앱 시작 시 1번만 호출)
 */
export function initBackButtonHandler() {
    if (!isNativePlatform() || isListening) return;
    isListening = true;

    App.addListener('backButton', ({ canGoBack }) => {
        // 등록된 콜백을 역순으로 순회 (가장 최근 등록 = 최우선)
        for (let i = callbacks.length - 1; i >= 0; i--) {
            const handled = callbacks[i]();
            if (handled) return; // 처리됨 → 이벤트 소비
        }

        // 아무도 처리 안 했으면 → 브라우저 히스토리 back 또는 앱 최소화
        if (canGoBack) {
            window.history.back();
        } else {
            // 앱 최소화 (종료 방지)
            App.minimizeApp();
        }
    });
}
