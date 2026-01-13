'use client';

import { useMemo } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { X, Plus, Building, Package, Car, Clock, User, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Reservation, ReservationResourceType } from '../types';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  reservations: Reservation[];
  onAddClick?: () => void;
  onReservationClick?: (reservation: Reservation) => void;
  getResourceName: (resourceType: string, resourceId: number) => string;
}

interface GroupedReservation {
  key: string;
  title: string;
  reserver: Reservation['reserver'];
  project: Reservation['project'];
  startTime: string;
  endTime: string;
  resourceType: ReservationResourceType;
  items: Array<{
    reservation: Reservation;
    resourceName: string;
    quantity: number;
  }>;
}

export function DayDetailModal({
  isOpen,
  onClose,
  date,
  reservations,
  onAddClick,
  onReservationClick,
  getResourceName,
}: DayDetailModalProps) {
  const dayReservations = useMemo(() => {
    return reservations.filter((r) => {
      const startDate = parseISO(r.start_time);
      const endDate = parseISO(r.end_time);
      return isSameDay(startDate, date) || isSameDay(endDate, date) || (startDate < date && endDate > date);
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [reservations, date]);

  // 같은 사람, 같은 프로젝트, 같은 시간대, 같은 타이틀의 예약을 그룹핑
  const groupedReservations = useMemo((): GroupedReservation[] => {
    const groups: Record<string, GroupedReservation> = {};
    
    dayReservations.forEach((r) => {
      // 그룹 키: 예약자 + 프로젝트 + 시작시간 + 종료시간 + 타이틀 + 리소스타입
      const groupKey = `${r.reserver_id}-${r.project_id || 'none'}-${r.start_time}-${r.end_time}-${r.title}-${r.resource_type}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          title: r.title,
          reserver: r.reserver,
          project: r.project,
          startTime: r.start_time,
          endTime: r.end_time,
          resourceType: r.resource_type,
          items: [],
        };
      }
      
      groups[groupKey].items.push({
        reservation: r,
        resourceName: getResourceName(r.resource_type, r.resource_id),
        quantity: r.quantity || 1,
      });
    });
    
    return Object.values(groups).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [dayReservations, getResourceName]);

  const getResourceIcon = (type: ReservationResourceType) => {
    switch (type) {
      case 'meeting_room': return Building;
      case 'equipment': return Package;
      case 'vehicle': return Car;
    }
  };

  const getResourceColor = (type: ReservationResourceType) => {
    switch (type) {
      case 'meeting_room': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'equipment': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'vehicle': return 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    }
  };

  const lunarDate = ''; // 음력 날짜 표시 생략

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              {format(date, 'M월 d일 EEEE', { locale: ko })}
            </h2>
            {lunarDate && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{lunarDate}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onAddClick && (
              <button
                onClick={onAddClick}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reservations List */}
        <div className="flex-1 overflow-y-auto p-4">
          {dayReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-4">예약이 없습니다</p>
              {onAddClick && (
                <button
                  onClick={onAddClick}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  새 예약 추가
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {groupedReservations.map((group) => {
                const Icon = getResourceIcon(group.resourceType);
                const colorClass = getResourceColor(group.resourceType);
                const startTime = format(parseISO(group.startTime), 'a h:mm', { locale: ko });
                const endTime = format(parseISO(group.endTime), 'a h:mm', { locale: ko });
                const totalQuantity = group.items.reduce((sum, item) => sum + item.quantity, 0);
                const firstReservation = group.items[0]?.reservation;

                return (
                  <button
                    type="button"
                    key={group.key}
                    onClick={() => {
                      if (firstReservation && onReservationClick) {
                        onReservationClick(firstReservation);
                      }
                    }}
                    className={cn(
                      'w-full text-left rounded-xl border overflow-hidden transition-all',
                      onReservationClick && 'cursor-pointer hover:opacity-90 hover:shadow-md',
                      colorClass
                    )}
                  >
                    {/* 헤더 */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/50 dark:bg-slate-800/50 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {group.title}
                              </p>
                              {group.project && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-slate-600 dark:text-slate-400">
                                  <FolderOpen className="w-3 h-3" />
                                  <span>{group.project.name}</span>
                                </div>
                              )}
                            </div>
                            {group.reserver && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/50 dark:bg-slate-800/50 text-xs flex-shrink-0">
                                <User className="w-3 h-3" />
                                <span className="truncate max-w-[60px]">{group.reserver.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{startTime} - {endTime}</span>
                            {group.items.length > 1 && (
                              <span className="px-1.5 py-0.5 rounded bg-white/50 dark:bg-slate-800/50 font-medium">
                                {group.items.length}종 {totalQuantity}개
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 장비 칩들 */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {group.items.map((item) => (
                          <div
                            key={item.reservation.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/60 dark:bg-slate-800/60 text-xs font-medium text-slate-700 dark:text-slate-300 border border-white/50 dark:border-slate-600/50"
                          >
                            <Package className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{item.resourceName}</span>
                            {item.quantity > 1 && (
                              <span className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-[10px] font-bold">
                                x{item.quantity}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {dayReservations.length > 0 && onAddClick && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onAddClick}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              예약 추가
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
