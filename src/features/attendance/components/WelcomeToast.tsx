'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WelcomeToastProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

const WELCOME_MESSAGES = [
  "오늘도 힘차게 시작해봐요! 화이팅! 🚀",
  "좋은 아침입니다! 멋진 하루가 될 거예요 ✨",
  "GRIGO의 에너지를 보여주세요! 💪",
  "오늘 하루도 산뜻하게 출발! 🌞",
  "준비되셨나요? 오늘도 대박 납시다! 💎"
];

export function WelcomeToast({
  isOpen,
  title,
  message,
  onClose,
  duration = 3500,
}: WelcomeToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen && !isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div
        className={`
          bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-2xl rounded-2xl p-8 max-w-md text-center 
          border-2 border-blue-100 dark:border-blue-900
          transition-all duration-500
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
        `}
      >
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Sparkles size={32} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function getRandomWelcomeMessage(): string {
  return WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
}

