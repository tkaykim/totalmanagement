'use client';

import { Play, Zap, Coffee } from 'lucide-react';
import type { WorkStatus } from './WorkStatusHeader';

interface WorkStatusFullScreenProps {
  workStatus: WorkStatus;
  currentTime: Date;
  userName: string;
  userInitials: string;
  isChanging: boolean;
  onStatusChange: (status: WorkStatus) => void;
  formatTimeDetail: (date: Date) => string;
  formatDateDetail: (date: Date) => string;
}

export function WorkStatusFullScreen({
  workStatus,
  currentTime,
  userName,
  userInitials,
  isChanging,
  onStatusChange,
  formatTimeDetail,
  formatDateDetail,
}: WorkStatusFullScreenProps) {
  if (workStatus === 'OFF_WORK') {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 text-center max-w-lg w-full">
          <div className="mb-2 text-slate-400 font-medium text-lg tracking-wide">
            {formatDateDetail(currentTime)}
          </div>
          <div className="text-7xl md:text-9xl font-bold font-mono tracking-tight text-white mb-12 tabular-nums">
            {formatTimeDetail(currentTime)}
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xl border-2 border-slate-600">
                {userInitials}
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-bold">안녕하세요, {userName}님</h2>
                <p className="text-slate-400">오늘 업무를 시작하시겠습니까?</p>
              </div>
            </div>

            <button
              onClick={() => onStatusChange('WORKING')}
              disabled={isChanging}
              className="w-full group relative flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-8 py-5 rounded-xl text-xl font-bold transition-all shadow-lg hover:shadow-blue-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={24} className="fill-current" />
              출근하기
              <span className="absolute right-5 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          </div>

          <p className="mt-8 text-slate-500 text-sm">GRIGO ENTERTAINMENT Workspace</p>
        </div>
      </div>
    );
  }

  if (workStatus === 'BREAK') {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-br from-orange-900 via-slate-900 to-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 text-center max-w-lg w-full">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-200 rounded-full mb-8 backdrop-blur-sm border border-orange-500/30">
            <Coffee size={18} />
            <span className="text-sm font-bold">현재 휴식 중입니다</span>
          </div>

          <div className="mb-2 text-slate-400 font-medium text-lg tracking-wide">
            {formatDateDetail(currentTime)}
          </div>
          <div className="text-7xl md:text-9xl font-bold font-mono tracking-tight text-white mb-8 tabular-nums">
            {formatTimeDetail(currentTime)}
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">에너지 충전 중... ⚡️</h2>
            <p className="text-slate-300 mb-8 leading-relaxed">
              잠시 머리를 식히고 오세요.<br />
              충분한 휴식은 더 좋은 성과를 만듭니다.
            </p>

            <button
              onClick={() => onStatusChange('WORKING')}
              disabled={isChanging}
              className="w-full group relative flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-5 rounded-xl text-xl font-bold transition-all shadow-lg hover:shadow-green-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={24} className="fill-current" />
              근무 재개하기
              <span className="absolute right-5 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

