'use client';

import { useState, useEffect } from 'react';
import {
    isIOSPWA,
    isIOSSafari,
    isWebPushSupported,
    getNotificationPermission,
    requestWebPushPermission,
} from '@/lib/web-push';
import { Button } from '@/components/ui/button';

/**
 * iOS PWA 사용자를 위한 푸시 알림 활성화 프롬프트
 * 
 * iOS Safari에서는 알림 권한 요청이 반드시 사용자 제스처(클릭 등)에서
 * 발생해야 하므로, 명시적인 "알림 켜기" 버튼을 제공합니다.
 * 
 * 표시 조건:
 * - iOS PWA에서 알림 권한이 아직 요청되지 않은 경우 → 알림 켜기 버튼
 * - iOS Safari(비 PWA)에서 접속한 경우 → "홈 화면에 추가" 안내
 * - 이미 허용/거부된 경우 또는 Android/데스크탑 → 표시하지 않음
 */
export function IOSPushPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [promptType, setPromptType] = useState<'enable' | 'install' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // SSR 방지
        if (typeof window === 'undefined') return;

        // 이전에 닫은 적이 있으면 표시하지 않음
        const wasDismissed = localStorage.getItem('ios-push-prompt-dismissed');
        if (wasDismissed) return;

        if (isIOSPWA()) {
            // iOS PWA: 알림 권한 확인
            if (isWebPushSupported() && getNotificationPermission() === 'default') {
                setPromptType('enable');
                setShowPrompt(true);
            }
        } else if (isIOSSafari()) {
            // iOS Safari (비 PWA): 홈 화면 추가 안내
            setPromptType('install');
            setShowPrompt(true);
        }
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
        localStorage.setItem('ios-push-prompt-dismissed', 'true');
    };

    if (!showPrompt || dismissed) return null;

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
