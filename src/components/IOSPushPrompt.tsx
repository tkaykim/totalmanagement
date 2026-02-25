'use client';

import { useState, useEffect } from 'react';
import {
    isWebPushSupported,
    getNotificationPermission,
    requestWebPushPermission,
    isIOSSafari,
} from '@/lib/web-push';
import { Button } from '@/components/ui/button';

/**
 * 웹/PWA 사용자를 위한 푸시 알림 활성화 프롬프트
 * 
 * 모든 웹/PWA 환경(iOS, Android Chrome, 데스크탑)에서 동작합니다.
 * 알림 권한이 아직 요청되지 않은 경우 "알림 켜기" 버튼을 표시합니다.
 * 
 * - iOS Safari(비 PWA)에서는 "홈 화면에 추가" 안내
 * - PWA 또는 브라우저에서는 "알림 켜기" 버튼
 * - Capacitor 네이티브 앱에서는 표시하지 않음
 */
export function IOSPushPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [promptType, setPromptType] = useState<'enable' | 'install' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 이전에 닫은 적이 있으면 표시하지 않음
        const wasDismissed = localStorage.getItem('web-push-prompt-dismissed');
        if (wasDismissed) return;

        // Capacitor 네이티브 앱이면 표시하지 않음
        const checkNative = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    setIsNative(true);
                    return;
                }
            } catch {
                // Capacitor가 없으면 웹 환경
            }

            // 웹 푸시 지원 여부 확인
            if (!isWebPushSupported()) return;

            const permission = getNotificationPermission();

            if (isIOSSafari()) {
                // iOS Safari (비 PWA): 홈 화면 추가 안내
                setPromptType('install');
                setShowPrompt(true);
            } else if (permission === 'default') {
                // 아직 권한을 요청하지 않은 경우: 알림 켜기 버튼
                setPromptType('enable');
                setShowPrompt(true);
            }
        };

        checkNative();
    }, []);

    const handleEnable = async () => {
        setIsLoading(true);
        try {
            const granted = await requestWebPushPermission();
            if (granted) {
                setShowPrompt(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        setShowPrompt(false);
        localStorage.setItem('web-push-prompt-dismissed', 'true');
    };

    if (!showPrompt || dismissed || isNative) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-lg">
                {promptType === 'enable' && (
                    <>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🔔</span>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">알림을 켜시겠습니까?</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    프로젝트, 연차 승인, 회의실 예약 등의 알림을 받을 수 있습니다.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={handleDismiss}
                            >
                                나중에
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1"
                                onClick={handleEnable}
                                disabled={isLoading}
                            >
                                {isLoading ? '설정 중...' : '알림 켜기'}
                            </Button>
                        </div>
                    </>
                )}
                {promptType === 'install' && (
                    <>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">📲</span>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">앱 설치로 알림 받기</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Safari 하단의{' '}
                                    <span className="inline-flex items-center">
                                        공유 버튼 <span className="text-base mx-0.5">⬆️</span>
                                    </span>
                                    을 눌러 <strong>&quot;홈 화면에 추가&quot;</strong>하면 푸시 알림을 받을 수 있습니다.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={handleDismiss}
                            >
                                확인
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
