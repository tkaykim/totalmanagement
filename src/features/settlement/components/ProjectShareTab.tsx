'use client';

import { useState, useMemo } from 'react';
import { Settings, Eye, EyeOff, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectShareSettings } from '../hooks';
import type { ProjectShareSetting } from '../types';
import { ProjectShareModal } from './ProjectShareModal';

interface ProjectShareTabProps {
  bu: string;
}

export function ProjectShareTab({ bu }: ProjectShareTabProps) {
  // 프로젝트별 분배에서는 기간 필터 없이 전체 기간 조회
  const { data: projects = [], isLoading } = useProjectShareSettings(bu);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectShareSetting | null>(null);

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        p.projectName.toLowerCase().includes(term) ||
        p.sharePartnerName?.toLowerCase().includes(term)
    );
  }, [projects, searchTerm]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="프로젝트명, 파트너명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* 모바일: 카드 레이아웃 */}
      <div className="block sm:hidden space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            프로젝트가 없습니다.
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.projectId}
              className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {project.projectName}
                  </h4>
                  {project.sharePartnerName ? (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-600 dark:text-slate-400">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{project.sharePartnerName}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1">파트너 미설정</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {project.sharePartnerId && (
                    project.visibleToPartner ? (
                      <Eye className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    )
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProject(project)}
                    className="h-8 w-8 p-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">비율</p>
                  {project.shareRate ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {project.shareRate}%
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
                <div>
                  <p className="text-slate-500 text-xs">순수익</p>
                  <span
                    className={cn(
                      'font-semibold text-sm',
                      project.netProfit >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatCurrency(project.netProfit)}
                  </span>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">파트너 몫</p>
                  {project.partnerAmount > 0 ? (
                    <span className="font-semibold text-sm text-violet-600 dark:text-violet-400">
                      {formatCurrency(project.partnerAmount)}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 데스크탑: 테이블 레이아웃 */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">프로젝트</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">분배 파트너</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">비율</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">순수익</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">파트너 몫</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">공개</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">설정</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  프로젝트가 없습니다.
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => (
                <tr
                  key={project.projectId}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {project.projectName}
                  </td>
                  <td className="px-4 py-3">
                    {project.sharePartnerName ? (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300">
                          {project.sharePartnerName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">미설정</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {project.shareRate ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                        {project.shareRate}%
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'font-semibold',
                        project.netProfit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {formatCurrency(project.netProfit)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {project.partnerAmount > 0 ? (
                      <span className="font-semibold text-violet-600 dark:text-violet-400">
                        {formatCurrency(project.partnerAmount)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {project.sharePartnerId ? (
                      project.visibleToPartner ? (
                        <Eye className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-slate-400 mx-auto" />
                      )
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProject(project)}
                      className="h-8 w-8 p-0"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedProject && (
        <ProjectShareModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
