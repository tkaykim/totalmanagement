'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FolderKanban, Plus, Edit3, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Artist, Dancer, ProjectParticipant } from '@/types/database';
import { dbProjectToFrontend, frontendProjectToDb } from '@/features/erp/utils';
import { ProjectModal } from '@/features/erp/components/ProjectModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useArtists, useClients, useDancers, useCreateProject, useUpdateProject, useDeleteProject, useOrgMembers } from '@/features/erp/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useMyArtistProfile } from '@/features/erp/hooks';

interface ArtistProjectsViewProps {
  projects: Project[];
  artist: Artist;
  onProjectClick: (project: Project) => void;
  activePeriod: { start?: string; end?: string };
}

const isDateInRange = (date: string, start?: string, end?: string) => {
  if (!start || !end) return true;
  const target = parseISO(date);
  return isWithinInterval(target, { start: parseISO(start), end: parseISO(end) });
};

export function ArtistProjectsView({ projects, artist, onProjectClick, activePeriod }: ArtistProjectsViewProps) {
  const [projectFilter, setProjectFilter] = useState<'all' | '진행중' | '완료'>('all');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: myProfileData } = useMyArtistProfile();
  const { data: artists = [] } = useArtists('GRIGO');
  const { data: clients = [] } = useClients('GRIGO');
  const { data: dancersData } = useDancers('GRIGO');
  const dancers: Dancer[] = Array.isArray(dancersData) ? dancersData : (dancersData?.data || []);
  const { data: orgData = [] } = useOrgMembers();
  
  const usersData = useMemo(() => ({
    users: orgData || [],
    currentUser: null,
  }), [orgData]);
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const filteredProjects = useMemo(() => {
    const frontendProjects = projects.map((p: Project) => dbProjectToFrontend(p));
    let filtered = frontendProjects;
    
    // 상태 필터
    if (projectFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === projectFilter);
    }
    
    // 날짜 필터 (프로젝트 시작일 또는 종료일이 기간 내에 있는 경우)
    if (activePeriod.start && activePeriod.end) {
      filtered = filtered.filter((p) => {
        if (p.startDate && isDateInRange(p.startDate, activePeriod.start, activePeriod.end)) return true;
        if (p.endDate && isDateInRange(p.endDate, activePeriod.start, activePeriod.end)) return true;
        // 시작일과 종료일이 모두 있고, 기간이 프로젝트 기간과 겹치는 경우
        if (p.startDate && p.endDate) {
          const projectStart = parseISO(p.startDate);
          const projectEnd = parseISO(p.endDate);
          const periodStart = parseISO(activePeriod.start!);
          const periodEnd = parseISO(activePeriod.end!);
          // 프로젝트 기간이 필터 기간과 겹치는지 확인
          return projectStart <= periodEnd && projectEnd >= periodStart;
        }
        return false;
      });
    }
    
    return filtered;
  }, [projects, projectFilter, activePeriod]);

  const handleCreateProject = async (data: {
    bu: string;
    name: string;
    cat: string;
    startDate?: string;
    endDate?: string;
    status: string;
    client_id?: number;
    artist_id?: number;
    pm_name?: string | null;
    participants?: any[];
  }) => {
    try {
      // 프로젝트 생성 시 현재 아티스트가 PM으로 기본 설정
      const dbData = frontendProjectToDb({
        bu: 'GRIGO',
        name: data.name,
        cat: data.cat,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        status: data.status,
        artist_id: artist.id,
        pm_name: artist.name,
        participants: data.participants,
      });

      await createProjectMutation.mutateAsync(dbData);
      setProjectModalOpen(false);
      // my-profile 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('프로젝트 생성 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateProject = async (data: {
    bu: string;
    name: string;
    cat: string;
    startDate?: string;
    endDate?: string;
    status: string;
    client_id?: number;
    artist_id?: number;
    pm_name?: string | null;
    participants?: any[];
  }) => {
    if (!editingProject) return;

    try {
      const dbData = frontendProjectToDb({
        bu: 'GRIGO',
        name: data.name,
        cat: data.cat,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        status: data.status,
        artist_id: data.artist_id,
        pm_name: data.pm_name,
        participants: data.participants,
      });

      await updateProjectMutation.mutateAsync({ id: Number(editingProject.id), data: dbData });
      setEditingProject(null);
      // my-profile 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('프로젝트 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;

    try {
      await deleteProjectMutation.mutateAsync(Number(deleteProjectId));
      setDeleteProjectId(null);
      // my-profile 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['my-artist-profile'] });
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  };

  // 프로젝트 데이터를 모달 형식으로 변환
  const projectForModal = editingProject ? dbProjectToFrontend(editingProject) : null;

  // 참여자 이름 가져오기 헬퍼 함수
  const getParticipantName = (participant: ProjectParticipant): string => {
    if (participant.dancer_id) {
      const dancer = dancers.find((d: Dancer) => d.id === participant.dancer_id);
      if (dancer) {
        return dancer.nickname_ko || dancer.nickname_en || dancer.real_name || dancer.name || '';
      }
    }
    if (participant.user_id) {
      // user_id로 사용자 이름을 찾을 수 있다면 추가
      return '사용자';
    }
    return participant.role || '참여자';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-blue-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">내 프로젝트</h2>
            <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">({filteredProjects.length}개)</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => setProjectModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              새 프로젝트
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-1">
              <button
                onClick={() => setProjectFilter('all')}
                className={cn(
                  'px-3 py-2 rounded-md text-xs font-semibold transition',
                  projectFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
                )}
              >
                전체
              </button>
              <button
                onClick={() => setProjectFilter('진행중')}
                className={cn(
                  'px-3 py-2 rounded-md text-xs font-semibold transition',
                  projectFilter === '진행중'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
                )}
              >
                진행중
              </button>
              <button
                onClick={() => setProjectFilter('완료')}
                className={cn(
                  'px-3 py-2 rounded-md text-xs font-semibold transition',
                  projectFilter === '완료'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
                )}
              >
                완료
              </button>
            </div>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">참여 중인 프로젝트가 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const originalProject = projects.find((p: Project) => String(p.id) === project.id);
              const isPM = originalProject?.pm_name === artist.name;
              const participants = (originalProject?.participants as ProjectParticipant[]) || [];

              return (
                <div
                  key={project.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                  onClick={() => originalProject && onProjectClick(originalProject)}
                >
                  <div className="mb-3 sm:mb-4 flex items-start justify-between gap-2">
                    <h3 className="flex-1 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {project.name}
                    </h3>
                    <div
                      className="flex items-center gap-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(originalProject || null);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="수정"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteProjectId(project.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-[10px] font-semibold flex-shrink-0',
                          project.status === '진행중' || project.status === '운영중'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : project.status === '완료'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                        )}
                      >
                        {project.status}
                      </span>
                      {isPM && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-[10px] font-semibold">
                          PM
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">카테고리:</span>
                        <span className="truncate">{project.cat}</span>
                      </div>
                      {project.startDate && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">시작일:</span>
                          <span>{format(parseISO(project.startDate), 'yyyy-MM-dd', { locale: ko })}</span>
                        </div>
                      )}
                      {project.endDate && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">종료일:</span>
                          <span>{format(parseISO(project.endDate), 'yyyy-MM-dd', { locale: ko })}</span>
                        </div>
                      )}
                    </div>

                    {/* 참여자 정보 */}
                    {participants.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            참여자
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {participants.slice(0, 3).map((participant, idx) => {
                            const name = getParticipantName(participant);
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium"
                              >
                                {name}
                                {participant.role && participant.role !== '댄서참여' && (
                                  <span className="ml-1 opacity-75">({participant.role})</span>
                                )}
                              </span>
                            );
                          })}
                          {participants.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-medium">
                              +{participants.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 프로젝트 생성/수정 모달 */}
      {(projectModalOpen || editingProject) && (
        <ProjectModal
          project={projectForModal ? {
            id: projectForModal.id,
            bu: projectForModal.bu || 'GRIGO',
            name: projectForModal.name,
            cat: projectForModal.cat,
            startDate: projectForModal.startDate,
            endDate: projectForModal.endDate,
            status: projectForModal.status,
            pm_id: projectForModal.pm_id,
            participants: projectForModal.participants,
          } : undefined}
          defaultBu="GRIGO"
          usersData={{ users: (usersData as any)?.users || [], currentUser: (usersData as any)?.currentUser || null }}
          partnerCompaniesData={clients}
          partnerWorkersData={[]}
          placeholders={{
            projectName: '예: 2025 아티스트 콘서트',
            category: '예: 콘서트, 뮤직비디오, 안무',
            description: '아티스트 프로젝트 설명을 입력하세요',
          }}
          onClose={() => {
            setProjectModalOpen(false);
            setEditingProject(null);
          }}
          onSubmit={async (data) => {
            if (editingProject) {
              await handleUpdateProject({
                bu: data.bu,
                name: data.name,
                cat: data.cat,
                startDate: data.startDate,
                endDate: data.endDate,
                status: data.status || '준비중',
                artist_id: artist.id,
                pm_name: artist.name,
                participants: data.participants?.map((p) => ({
                  user_id: p.user_id,
                  external_worker_id: p.partner_worker_id,
                  role: p.role || 'participant',
                  is_pm: false,
                })),
              });
            } else {
              await handleCreateProject({
                bu: data.bu,
                name: data.name,
                cat: data.cat,
                startDate: data.startDate,
                endDate: data.endDate,
                status: data.status || '준비중',
                artist_id: artist.id,
                pm_name: artist.name,
                participants: data.participants?.map((p) => ({
                  user_id: p.user_id,
                  external_worker_id: p.partner_worker_id,
                  role: p.role || 'participant',
                  is_pm: false,
                })),
              });
            }
          }}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteProjectId && (
        <DeleteConfirmModal
          title="프로젝트 삭제"
          message="정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteProjectId(null)}
        />
      )}
    </div>
  );
}
