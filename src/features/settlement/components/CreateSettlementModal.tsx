'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Search, Users, Building2, User, MapPin, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePartnerOptions, useProjectShareSettings, useCreateSettlement } from '../hooks';
import type { PartnerOption, ProjectShareSetting } from '../types';

interface CreateSettlementModalProps {
  onClose: () => void;
}

const ENTITY_ICONS: Record<string, typeof Users> = {
  person: User,
  organization: Building2,
  team: Users,
  venue: MapPin,
};

export function CreateSettlementModal({ onClose }: CreateSettlementModalProps) {
  const { data: partners = [] } = usePartnerOptions();
  const createMutation = useCreateSettlement();

  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allProjects = [] } = useProjectShareSettings('ALL');

  const eligibleProjects = useMemo(() => {
    if (!partnerId) return [];
    return allProjects.filter((p) => p.sharePartnerId === partnerId && p.netProfit > 0);
  }, [allProjects, partnerId]);

  const selectedPartner = useMemo(() => {
    return partners.find((p) => p.id === partnerId);
  }, [partners, partnerId]);

  const filteredPartners = useMemo(() => {
    if (!searchTerm) return partners;
    const term = searchTerm.toLowerCase();
    return partners.filter((p) => p.displayName.toLowerCase().includes(term));
  }, [partners, searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPartnerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedProjects([]);
  }, [partnerId]);

  const handlePartnerSelect = (partner: PartnerOption | null) => {
    setPartnerId(partner?.id || null);
    setSearchTerm('');
    setIsPartnerDropdownOpen(false);
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProjects.length === eligibleProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(eligibleProjects.map((p) => p.projectId));
    }
  };

  const totalNetProfit = useMemo(() => {
    return eligibleProjects
      .filter((p) => selectedProjects.includes(p.projectId))
      .reduce((sum, p) => sum + p.netProfit, 0);
  }, [eligibleProjects, selectedProjects]);

  const totalPartnerAmount = useMemo(() => {
    return eligibleProjects
      .filter((p) => selectedProjects.includes(p.projectId))
      .reduce((sum, p) => sum + p.partnerAmount, 0);
  }, [eligibleProjects, selectedProjects]);

  const handleSubmit = async () => {
    if (!partnerId) {
      alert('파트너를 선택해주세요.');
      return;
    }
    if (selectedProjects.length === 0) {
      alert('프로젝트를 선택해주세요.');
      return;
    }

    await createMutation.mutateAsync({
      partnerId,
      periodStart,
      periodEnd,
      projectIds: selectedProjects,
      memo: memo || undefined,
    });

    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>정산서 생성</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2" ref={dropdownRef}>
            <Label>파트너 선택 *</Label>
            <div className="relative">
              <div
                className="flex items-center justify-between px-3 py-2 border rounded-md cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                onClick={() => setIsPartnerDropdownOpen(!isPartnerDropdownOpen)}
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

              {isPartnerDropdownOpen && (
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>정산 시작일</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>정산 종료일</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {partnerId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>정산 대상 프로젝트</Label>
                {eligibleProjects.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedProjects.length === eligibleProjects.length ? '전체 해제' : '전체 선택'}
                  </Button>
                )}
              </div>

              {eligibleProjects.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm border rounded-md">
                  해당 파트너에게 분배 설정된 프로젝트가 없습니다.
                </div>
              ) : (
                <div className="border rounded-md divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                  {eligibleProjects.map((project) => (
                    <div
                      key={project.projectId}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800',
                        selectedProjects.includes(project.projectId) && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                      onClick={() => handleProjectToggle(project.projectId)}
                    >
                      <Checkbox
                        checked={selectedProjects.includes(project.projectId)}
                        onCheckedChange={() => handleProjectToggle(project.projectId)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{project.projectName}</p>
                        <p className="text-xs text-slate-500">
                          순수익: {formatCurrency(project.netProfit)} / 분배율: {project.shareRate}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-violet-600">
                          {formatCurrency(project.partnerAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedProjects.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span>선택된 프로젝트: {selectedProjects.length}개</span>
                    <span className="font-semibold">
                      총 순수익: {formatCurrency(totalNetProfit)}
                    </span>
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="font-bold text-violet-600">
                      파트너 정산액: {formatCurrency(totalPartnerAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>메모 (선택)</Label>
            <Textarea
              placeholder="정산 관련 메모..."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !partnerId || selectedProjects.length === 0}
            >
              {createMutation.isPending ? '생성 중...' : '정산서 생성'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
