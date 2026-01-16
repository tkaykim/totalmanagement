'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Users, Building2, User, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePartnerOptions, useUpdateProjectShare } from '../hooks';
import type { ProjectShareSetting, PartnerOption } from '../types';

interface ProjectShareModalProps {
  project: ProjectShareSetting;
  onClose: () => void;
}

const ENTITY_ICONS: Record<string, typeof Users> = {
  person: User,
  organization: Building2,
  team: Users,
  venue: MapPin,
};

export function ProjectShareModal({ project, onClose }: ProjectShareModalProps) {
  const { data: partners = [] } = usePartnerOptions();
  const updateMutation = useUpdateProjectShare();

  const [partnerId, setPartnerId] = useState<number | null>(project.sharePartnerId);
  const [shareRate, setShareRate] = useState<string>(
    project.shareRate?.toString() || ''
  );
  const [visibleToPartner, setVisibleToPartner] = useState(project.visibleToPartner);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPartner = useMemo(() => {
    return partners.find((p) => p.id === partnerId);
  }, [partners, partnerId]);

  const filteredPartners = useMemo(() => {
    if (!searchTerm) return partners;
    const term = searchTerm.toLowerCase();
    return partners.filter((p) =>
      p.displayName.toLowerCase().includes(term)
    );
  }, [partners, searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async () => {
    const rate = shareRate ? parseFloat(shareRate) : null;
    if (rate !== null && (rate < 0 || rate > 100)) {
      alert('분배비율은 0~100 사이여야 합니다.');
      return;
    }

    await updateMutation.mutateAsync({
      projectId: project.projectId,
      sharePartnerId: partnerId,
      shareRate: rate,
      visibleToPartner,
    });

    onClose();
  };

  const handlePartnerSelect = (partner: PartnerOption | null) => {
    setPartnerId(partner?.id || null);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const netProfit = project.totalRevenue - project.totalExpense;
  const rate = shareRate ? parseFloat(shareRate) : 0;
  const partnerAmount = Math.round(netProfit * (rate / 100));
  const companyAmount = netProfit - partnerAmount;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">프로젝트 분배 설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-5 py-2">
          <div className="p-3 sm:p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm sm:text-base truncate">
              {project.projectName}
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500 text-[10px] sm:text-xs">매출</span>
                <p className="font-semibold text-blue-600 text-xs sm:text-sm">
                  {formatCurrency(project.totalRevenue)}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] sm:text-xs">지출</span>
                <p className="font-semibold text-red-500 text-xs sm:text-sm">
                  {formatCurrency(project.totalExpense)}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] sm:text-xs">순수익</span>
                <p
                  className={cn(
                    'font-semibold text-xs sm:text-sm',
                    netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {formatCurrency(netProfit)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2" ref={dropdownRef}>
            <Label>분배 파트너</Label>
            <div className="relative">
              <div
                className="flex items-center justify-between px-3 py-2 border rounded-md cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedPartner ? (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = ENTITY_ICONS[selectedPartner.entityType] || Users;
                      return <Icon className="h-4 w-4 text-slate-400" />;
                    })()}
                    <span>{selectedPartner.displayName}</span>
                  </div>
                ) : (
                  <span className="text-slate-400">파트너 선택...</span>
                )}
                <X
                  className={cn(
                    'h-4 w-4 text-slate-400 hover:text-slate-600',
                    !selectedPartner && 'invisible'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePartnerSelect(null);
                  }}
                />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-hidden">
                  <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredPartners.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      filteredPartners.map((partner) => {
                        const Icon = ENTITY_ICONS[partner.entityType] || Users;
                        return (
                          <div
                            key={partner.id}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800',
                              partnerId === partner.id && 'bg-blue-50 dark:bg-blue-900/30'
                            )}
                            onClick={() => handlePartnerSelect(partner)}
                          >
                            <Icon className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">{partner.displayName}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">파트너 분배비율 (%)</Label>
            <Input
              type="number"
              placeholder="예: 50"
              value={shareRate}
              onChange={(e) => setShareRate(e.target.value)}
              min={0}
              max={100}
              disabled={!partnerId}
              className="text-sm"
            />
            {partnerId && shareRate && (
              <div className="text-xs sm:text-sm text-slate-500 mt-1">
                <span className="block sm:inline">파트너: {formatCurrency(partnerAmount)}</span>
                <span className="hidden sm:inline"> / </span>
                <span className="block sm:inline">회사: {formatCurrency(companyAmount)}</span>
              </div>
            )}
          </div>

          <div className="flex items-start sm:items-center justify-between py-2 gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-sm">파트너에게 프로젝트 공개</Label>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                공개 시 파트너가 /artist 페이지에서 확인 가능
              </p>
            </div>
            <Switch
              checked={visibleToPartner}
              onCheckedChange={setVisibleToPartner}
              disabled={!partnerId}
              className="flex-shrink-0"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
