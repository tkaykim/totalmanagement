'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Users, MapPin, Coffee, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkStatus = 'WORKING' | 'MEETING' | 'OUTSIDE' | 'BREAK';

interface WorkStatusButtonsProps {
  currentStatus?: WorkStatus;
  onStatusChange?: (status: WorkStatus) => void;
  showLogout?: boolean;
  onLogout?: () => void;
}

const STATUS_CONFIG = {
  WORKING: {
    label: '업무중',
    icon: Monitor,
    activeColor: 'bg-green-600 text-white shadow-green-200 shadow-lg ring-2 ring-green-600 ring-offset-2',
    inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200',
  },
  MEETING: {
    label: '미팅',
    icon: Users,
    activeColor: 'bg-red-500 text-white shadow-red-200 shadow-lg ring-2 ring-red-500 ring-offset-2',
    inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200',
  },
  OUTSIDE: {
    label: '외근',
    icon: MapPin,
    activeColor: 'bg-blue-500 text-white shadow-blue-200 shadow-lg ring-2 ring-blue-500 ring-offset-2',
    inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200',
  },
  BREAK: {
    label: '휴식',
    icon: Coffee,
    activeColor: 'bg-orange-400 text-white shadow-orange-200 shadow-lg ring-2 ring-orange-400 ring-offset-2',
    inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200',
  },
};

export function WorkStatusButtons({
  currentStatus = 'WORKING',
  onStatusChange,
  showLogout = true,
  onLogout,
}: WorkStatusButtonsProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleStatusClick = async (status: WorkStatus) => {
    if (status === currentStatus) return;
    
    setIsChanging(true);
    try {
      if (onStatusChange) {
        await onStatusChange(status);
      }
    } catch (error) {
      console.error('Status change error:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Object.entries(STATUS_CONFIG).map(([key, config]) => {
        const status = key as WorkStatus;
        const isActive = currentStatus === status;
        const Icon = config.icon;

        return (
          <button
            key={key}
            onClick={() => handleStatusClick(status)}
            disabled={isChanging}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap',
              isActive ? config.activeColor : config.inactiveColor,
              !isActive && 'border',
              isChanging && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon size={16} className={isActive ? 'animate-pulse' : 'text-slate-400'} />
            {config.label}
          </button>
        );
      })}

      {showLogout && onLogout && (
        <>
          <div className="hidden md:block h-8 w-px bg-slate-100"></div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">퇴근</span>
          </button>
        </>
      )}
    </div>
  );
}

