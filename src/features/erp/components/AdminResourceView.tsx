'use client';

import { useMemo, useState } from 'react';
import {
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Clock,
    FolderKanban,
    Users,
    AlertTriangle,
    CheckCircle2,
    Circle,
    Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    BU,
    BU_TITLES,
    BU_CHIP_STYLES,
    Project,
    TaskItem,
} from '../types';

// ─── Helpers ───

function daysBetween(a: string, b: string): number {
    const d1 = new Date(a);
    const d2 = new Date(b);
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: string): string {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getToday(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

const BU_BAR_COLORS: Record<BU, string> = {
    GRIGO: 'bg-blue-500',
    REACT: 'bg-purple-500',
    FLOW: 'bg-indigo-500',
    AST: 'bg-pink-500',
    MODOO: 'bg-amber-500',
    HEAD: 'bg-slate-500',
};

const BU_BAR_BG: Record<BU, string> = {
    GRIGO: 'bg-blue-500/10 border-blue-500/20',
    REACT: 'bg-purple-500/10 border-purple-500/20',
    FLOW: 'bg-indigo-500/10 border-indigo-500/20',
    AST: 'bg-pink-500/10 border-pink-500/20',
    MODOO: 'bg-amber-500/10 border-amber-500/20',
    HEAD: 'bg-slate-500/10 border-slate-500/20',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    '준비중': { label: '준비중', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
    '기획중': { label: '기획중', bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300' },
    '진행중': { label: '진행중', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
    '운영중': { label: '운영중', bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300' },
    '완료': { label: '완료', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
};

// ─── Types ───

interface AdminResourceViewProps {
    projects: Project[];
    tasks: TaskItem[];
    usersData?: { users: any[]; currentUser: any };
    onProjectClick: (project: Project) => void;
    onTaskClick: (task: TaskItem) => void;
}

// ─── Main Component ───

export function AdminResourceView({
    projects,
    tasks,
    usersData,
    onProjectClick,
    onTaskClick,
}: AdminResourceViewProps) {
    const [activeTab, setActiveTab] = useState<'timeline' | 'resources' | 'deadlines'>('timeline');
    const [buFilter, setBuFilter] = useState<BU | 'ALL'>('ALL');
    const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');

    const activeStatuses = ['준비중', '기획중', '진행중', '운영중'];

    const filteredProjects = useMemo(() => {
        let result = projects;
        if (buFilter !== 'ALL') {
            result = result.filter((p) => p.bu === buFilter);
        }
        if (statusFilter === 'active') {
            result = result.filter((p) => activeStatuses.includes(p.status));
        }
        return result;
    }, [projects, buFilter, statusFilter]);

    const tabs = [
        { id: 'timeline' as const, label: '프로젝트 타임라인', icon: <CalendarDays className="h-4 w-4" /> },
        { id: 'resources' as const, label: '팀원별 리소스', icon: <Users className="h-4 w-4" /> },
        { id: 'deadlines' as const, label: '다가오는 마감일', icon: <Clock className="h-4 w-4" /> },
    ];

    return (
        <section className="space-y-4 sm:space-y-6">
            {/* Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold transition whitespace-nowrap rounded-lg',
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* BU + Status Filters */}
            <div className="flex flex-wrap gap-2">
                <div className="flex w-fit overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                    <button
                        onClick={() => setBuFilter('ALL')}
                        className={cn(
                            'px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition whitespace-nowrap',
                            buFilter === 'ALL'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        )}
                    >
                        전체
                    </button>
                    {(Object.keys(BU_TITLES) as BU[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => setBuFilter(key)}
                            className={cn(
                                'px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition whitespace-nowrap',
                                buFilter === key
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            )}
                        >
                            {BU_TITLES[key]}
                        </button>
                    ))}
                </div>
                <div className="flex w-fit rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={cn(
                            'px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition whitespace-nowrap',
                            statusFilter === 'active'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        )}
                    >
                        진행중
                    </button>
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={cn(
                            'px-3 py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg transition whitespace-nowrap',
                            statusFilter === 'all'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        )}
                    >
                        전체
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'timeline' && (
                <ProjectTimeline
                    projects={filteredProjects}
                    tasks={tasks}
                    usersData={usersData}
                    onProjectClick={onProjectClick}
                />
            )}
            {activeTab === 'resources' && (
                <TeamResourceMatrix
                    projects={filteredProjects}
                    tasks={tasks}
                    usersData={usersData}
                    buFilter={buFilter}
                    onProjectClick={onProjectClick}
                    onTaskClick={onTaskClick}
                />
            )}
            {activeTab === 'deadlines' && (
                <UpcomingDeadlines
                    projects={filteredProjects}
                    tasks={tasks}
                    usersData={usersData}
                    onTaskClick={onTaskClick}
                    onProjectClick={onProjectClick}
                />
            )}
        </section>
    );
}

// ─── Panel 1: Project Timeline ───

function ProjectTimeline({
    projects,
    tasks,
    usersData,
    onProjectClick,
}: {
    projects: Project[];
    tasks: TaskItem[];
    usersData?: { users: any[]; currentUser: any };
    onProjectClick: (project: Project) => void;
}) {
    const today = getToday();

    // Calculate timeline range
    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
        const validProjects = projects.filter((p) => p.startDate && p.endDate);
        if (validProjects.length === 0) {
            const now = new Date();
            const start = new Date(now);
            start.setMonth(start.getMonth() - 1);
            const end = new Date(now);
            end.setMonth(end.getMonth() + 3);
            return {
                timelineStart: start.toISOString().slice(0, 10),
                timelineEnd: end.toISOString().slice(0, 10),
                totalDays: daysBetween(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)),
            };
        }

        const starts = validProjects.map((p) => new Date(p.startDate).getTime());
        const ends = validProjects.map((p) => new Date(p.endDate).getTime());
        const minStart = new Date(Math.min(...starts));
        const maxEnd = new Date(Math.max(...ends));

        // Add padding
        minStart.setDate(minStart.getDate() - 7);
        maxEnd.setDate(maxEnd.getDate() + 14);

        const startStr = minStart.toISOString().slice(0, 10);
        const endStr = maxEnd.toISOString().slice(0, 10);
        return {
            timelineStart: startStr,
            timelineEnd: endStr,
            totalDays: daysBetween(startStr, endStr),
        };
    }, [projects]);

    const todayPosition = useMemo(() => {
        const daysFromStart = daysBetween(timelineStart, today);
        return Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
    }, [timelineStart, today, totalDays]);

    // Generate month markers
    const monthMarkers = useMemo(() => {
        const markers: { label: string; position: number }[] = [];
        const start = new Date(timelineStart);
        const end = new Date(timelineEnd);
        const current = new Date(start.getFullYear(), start.getMonth(), 1);

        while (current <= end) {
            const daysFromStart = daysBetween(timelineStart, current.toISOString().slice(0, 10));
            const pos = (daysFromStart / totalDays) * 100;
            if (pos >= 0 && pos <= 100) {
                markers.push({
                    label: `${current.getFullYear()}.${String(current.getMonth() + 1).padStart(2, '0')}`,
                    position: pos,
                });
            }
            current.setMonth(current.getMonth() + 1);
        }
        return markers;
    }, [timelineStart, timelineEnd, totalDays]);

    // Sort projects by start date
    const sortedProjects = useMemo(() => {
        return [...projects]
            .filter((p) => p.startDate && p.endDate)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [projects]);

    if (sortedProjects.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
                <FolderKanban className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">표시할 프로젝트가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-blue-500" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">프로젝트 타임라인</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{sortedProjects.length}개 프로젝트</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                    {/* Month labels */}
                    <div className="relative h-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                        {monthMarkers.map((m, i) => (
                            <div
                                key={i}
                                className="absolute top-0 h-full flex items-center border-l border-slate-200 dark:border-slate-600"
                                style={{ left: `calc(200px + ${m.position}% * (100% - 200px) / 100)` }}
                            >
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 pl-1.5 whitespace-nowrap">
                                    {m.label}
                                </span>
                            </div>
                        ))}
                        {/* Today marker label */}
                        <div
                            className="absolute top-0 h-full z-10"
                            style={{ left: `calc(200px + ${todayPosition}% * (100% - 200px) / 100)` }}
                        >
                            <span className="text-[8px] sm:text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-1 rounded">
                                오늘
                            </span>
                        </div>
                    </div>

                    {/* Project rows */}
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {sortedProjects.map((project) => {
                            const startDays = daysBetween(timelineStart, project.startDate);
                            const duration = daysBetween(project.startDate, project.endDate);
                            const leftPercent = Math.max(0, (startDays / totalDays) * 100);
                            const widthPercent = Math.max(1, (duration / totalDays) * 100);

                            const projectTasks = tasks.filter((t) => t.projectId === project.id);
                            const doneTasks = projectTasks.filter((t) => t.status === 'done').length;
                            const totalTasks = projectTasks.length;
                            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                            const pmName = project.pm_id && usersData?.users
                                ? usersData.users.find((u: any) => u.id === project.pm_id)?.name
                                : null;

                            const isOverdue = project.endDate < today && project.status !== '완료';
                            const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG['준비중'];

                            return (
                                <div
                                    key={project.id}
                                    className="flex items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition cursor-pointer group"
                                    onClick={() => onProjectClick(project)}
                                >
                                    {/* Project info (fixed left) */}
                                    <div className="w-[200px] flex-shrink-0 p-3 border-r border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className={cn('rounded px-1.5 py-0.5 text-[8px] sm:text-[9px] font-semibold border', BU_CHIP_STYLES[project.bu])}>
                                                {BU_TITLES[project.bu]}
                                            </span>
                                            {isOverdue && (
                                                <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                            {project.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={cn('rounded px-1.5 py-0.5 text-[8px] font-semibold', statusCfg.bg, statusCfg.text)}>
                                                {statusCfg.label}
                                            </span>
                                            {pmName && (
                                                <span className="text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-500 truncate">PM: {pmName}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timeline bar */}
                                    <div className="flex-1 relative h-16 p-2">
                                        {/* Today indicator line */}
                                        <div
                                            className="absolute top-0 bottom-0 w-px bg-red-400/50 z-10"
                                            style={{ left: `${todayPosition}%` }}
                                        />

                                        {/* Project bar */}
                                        <div
                                            className={cn(
                                                'absolute top-3 h-10 rounded-lg border flex items-center overflow-hidden transition-all group-hover:shadow-md',
                                                isOverdue ? 'border-red-300 dark:border-red-700' : BU_BAR_BG[project.bu]
                                            )}
                                            style={{
                                                left: `${leftPercent}%`,
                                                width: `${Math.min(widthPercent, 100 - leftPercent)}%`,
                                                minWidth: '40px',
                                            }}
                                        >
                                            {/* Progress fill */}
                                            <div
                                                className={cn('absolute inset-y-0 left-0 rounded-l-lg opacity-30', BU_BAR_COLORS[project.bu])}
                                                style={{ width: `${progress}%` }}
                                            />
                                            <div className="relative z-10 flex items-center justify-between w-full px-2">
                                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate">
                                                    {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
                                                </span>
                                                {totalTasks > 0 && (
                                                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap ml-1">
                                                        {progress}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Panel 2: Team Member Resource Matrix ───

function TeamResourceMatrix({
    projects,
    tasks,
    usersData,
    buFilter,
    onProjectClick,
    onTaskClick,
}: {
    projects: Project[];
    tasks: TaskItem[];
    usersData?: { users: any[]; currentUser: any };
    buFilter: BU | 'ALL';
    onProjectClick: (project: Project) => void;
    onTaskClick: (task: TaskItem) => void;
}) {
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    const users = usersData?.users || [];

    // Build member data: for each user, compute their projects and tasks
    const memberData = useMemo(() => {
        const activeTasks = tasks.filter((t) => t.status !== 'done');
        const activeStatuses = ['준비중', '기획중', '진행중', '운영중'];
        const activeProjects = projects.filter((p) => activeStatuses.includes(p.status));

        return users
            .filter((u: any) => u.role !== 'artist' && u.role !== 'viewer')
            .filter((u: any) => buFilter === 'ALL' || u.bu_code === buFilter)
            .map((u: any) => {
                // Projects where user is PM or participant
                const userProjects = activeProjects.filter((p) => {
                    if (p.pm_id === u.id) return true;
                    if (p.participants?.some((part) => part.user_id === u.id)) return true;
                    return false;
                });

                // Tasks assigned to this user
                const userTasks = activeTasks.filter((t) => t.assignee_id === u.id);

                // Overdue tasks
                const today = getToday();
                const overdueTasks = userTasks.filter((t) => t.dueDate && t.dueDate < today);

                return {
                    id: u.id,
                    name: u.name,
                    bu_code: u.bu_code as BU,
                    position: u.position,
                    projectCount: userProjects.length,
                    taskCount: userTasks.length,
                    overdueCount: overdueTasks.length,
                    projects: userProjects,
                    tasks: userTasks,
                };
            })
            .sort((a, b) => b.taskCount - a.taskCount);
    }, [users, projects, tasks, buFilter]);

    // Group by BU
    const groupedByBu = useMemo(() => {
        const groups: Record<string, typeof memberData> = {};
        memberData.forEach((m) => {
            const key = m.bu_code || 'OTHER';
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        return groups;
    }, [memberData]);

    const getLoadColor = (taskCount: number) => {
        if (taskCount === 0) return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
        if (taskCount <= 3) return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
        if (taskCount <= 6) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    };

    const getLoadBadge = (taskCount: number) => {
        if (taskCount === 0) return { label: '여유', color: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
        if (taskCount <= 3) return { label: '적정', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' };
        if (taskCount <= 6) return { label: '보통', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' };
        return { label: '과부하', color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' };
    };

    if (memberData.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
                <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">표시할 팀원이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">전체 인원</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{memberData.length}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">여유 인원</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                        {memberData.filter((m) => m.taskCount === 0).length}
                    </p>
                </div>
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">활성 할일</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
                        {memberData.reduce((s, m) => s + m.taskCount, 0)}
                    </p>
                </div>
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">지연 할일</p>
                    <p className="text-2xl font-black text-red-700 dark:text-red-300 mt-1">
                        {memberData.reduce((s, m) => s + m.overdueCount, 0)}
                    </p>
                </div>
            </div>

            {/* By BU */}
            {Object.entries(groupedByBu).map(([buKey, members]) => (
                <div key={buKey} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center gap-2">
                        <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-semibold', BU_CHIP_STYLES[buKey as BU] || 'bg-slate-100 text-slate-600')}>
                            {BU_TITLES[buKey as BU] || buKey}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{members.length}명</span>
                    </div>

                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {members.map((member) => {
                            const isExpanded = expandedUser === member.id;
                            const loadBadge = getLoadBadge(member.taskCount);

                            return (
                                <div key={member.id}>
                                    <button
                                        onClick={() => setExpandedUser(isExpanded ? null : member.id)}
                                        className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition text-left"
                                    >
                                        {/* Avatar */}
                                        <div className={cn(
                                            'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full font-bold text-sm flex-shrink-0 border',
                                            getLoadColor(member.taskCount)
                                        )}>
                                            {member.name?.[0] || '?'}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{member.name}</span>
                                                {member.position && (
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{member.position}</span>
                                                )}
                                                <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', loadBadge.color)}>
                                                    {loadBadge.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                    <FolderKanban className="h-3 w-3 inline mr-0.5" />
                                                    프로젝트 {member.projectCount}
                                                </span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                    <CheckCircle2 className="h-3 w-3 inline mr-0.5" />
                                                    할일 {member.taskCount}
                                                </span>
                                                {member.overdueCount > 0 && (
                                                    <span className="text-[10px] text-red-500 font-semibold">
                                                        <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                                                        지연 {member.overdueCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expand icon */}
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        )}
                                    </button>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 bg-slate-50/50 dark:bg-slate-800/50">
                                            {/* Projects */}
                                            {member.projects.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">참여 프로젝트</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {member.projects.map((project) => (
                                                            <button
                                                                key={project.id}
                                                                onClick={() => onProjectClick(project)}
                                                                className={cn(
                                                                    'rounded-lg border px-2.5 py-1.5 text-[10px] sm:text-xs font-semibold transition hover:shadow-sm',
                                                                    BU_BAR_BG[project.bu],
                                                                    'hover:opacity-80'
                                                                )}
                                                            >
                                                                {project.name}
                                                                {project.pm_id === member.id && (
                                                                    <span className="ml-1 text-[8px] opacity-60">(PM)</span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tasks */}
                                            {member.tasks.length > 0 ? (
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">활성 할일</p>
                                                    <div className="space-y-1.5">
                                                        {member.tasks.map((task) => {
                                                            const isOverdue = task.dueDate && task.dueDate < getToday();
                                                            const projectName = projects.find((p) => p.id === task.projectId)?.name || '';
                                                            return (
                                                                <button
                                                                    key={task.id}
                                                                    onClick={() => onTaskClick(task)}
                                                                    className="w-full flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-2.5 text-left hover:border-blue-300 dark:hover:border-blue-600 transition"
                                                                >
                                                                    {task.status === 'todo' ? (
                                                                        <Circle className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                                                    ) : (
                                                                        <Timer className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                                            {task.title}
                                                                        </p>
                                                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                                                                            {projectName}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        {task.priority === 'high' && (
                                                                            <span className="rounded bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 text-[8px] font-bold text-red-600 dark:text-red-300">높음</span>
                                                                        )}
                                                                        <span className={cn(
                                                                            'text-[9px] font-semibold',
                                                                            isOverdue ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'
                                                                        )}>
                                                                            {isOverdue && <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" />}
                                                                            {task.dueDate ? formatDate(task.dueDate) : '마감일 없음'}
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">활성 할일 없음</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Panel 3: Upcoming Deadlines ───

function UpcomingDeadlines({
    projects,
    tasks,
    usersData,
    onTaskClick,
    onProjectClick,
}: {
    projects: Project[];
    tasks: TaskItem[];
    usersData?: { users: any[]; currentUser: any };
    onTaskClick: (task: TaskItem) => void;
    onProjectClick: (project: Project) => void;
}) {
    const [range, setRange] = useState<7 | 14 | 30>(14);

    const today = getToday();

    const deadlineData = useMemo(() => {
        const activeTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate);

        // Overdue tasks
        const overdue = activeTasks
            .filter((t) => t.dueDate < today)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        // Upcoming within range
        const rangeEnd = new Date(today);
        rangeEnd.setDate(rangeEnd.getDate() + range);
        const rangeEndStr = rangeEnd.toISOString().slice(0, 10);

        const upcoming = activeTasks
            .filter((t) => t.dueDate >= today && t.dueDate <= rangeEndStr)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        // Also show project deadlines
        const activeStatuses = ['준비중', '기획중', '진행중', '운영중'];
        const projectDeadlines = projects
            .filter((p) => activeStatuses.includes(p.status) && p.endDate)
            .filter((p) => p.endDate >= today && p.endDate <= rangeEndStr)
            .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

        const overdueProjects = projects
            .filter((p) => activeStatuses.includes(p.status) && p.endDate && p.endDate < today)
            .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

        return { overdue, upcoming, projectDeadlines, overdueProjects };
    }, [tasks, projects, today, range]);

    const daysUntil = (date: string) => {
        const diff = daysBetween(today, date);
        if (diff === 0) return '오늘';
        if (diff === 1) return '내일';
        if (diff < 0) return `${Math.abs(diff)}일 지연`;
        return `${diff}일 후`;
    };

    const getDaysBadgeColor = (date: string) => {
        const diff = daysBetween(today, date);
        if (diff < 0) return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
        if (diff === 0) return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
        if (diff <= 3) return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300';
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    };

    return (
        <div className="space-y-4">
            {/* Range filter */}
            <div className="flex w-fit rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {([7, 14, 30] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={cn(
                            'px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap',
                            range === r
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        )}
                    >
                        {r}일
                    </button>
                ))}
            </div>

            {/* Overdue Projects */}
            {deadlineData.overdueProjects.length > 0 && (
                <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-red-100 dark:border-red-800/50 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <h4 className="text-sm font-bold text-red-700 dark:text-red-300">지연 프로젝트</h4>
                        <span className="ml-auto text-xs font-bold text-red-500">{deadlineData.overdueProjects.length}</span>
                    </div>
                    <div className="divide-y divide-red-100 dark:divide-red-800/30">
                        {deadlineData.overdueProjects.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => onProjectClick(project)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition text-left"
                            >
                                <FolderKanban className="h-4 w-4 text-red-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn('rounded px-1.5 py-0.5 text-[8px] font-semibold border', BU_CHIP_STYLES[project.bu])}>
                                            {BU_TITLES[project.bu]}
                                        </span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{project.name}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">마감: {project.endDate}</p>
                                </div>
                                <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap', getDaysBadgeColor(project.endDate))}>
                                    {daysUntil(project.endDate)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Overdue Tasks */}
            {deadlineData.overdue.length > 0 && (
                <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-red-100 dark:border-red-800/50 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <h4 className="text-sm font-bold text-red-700 dark:text-red-300">지연 할일</h4>
                        <span className="ml-auto text-xs font-bold text-red-500">{deadlineData.overdue.length}</span>
                    </div>
                    <div className="divide-y divide-red-100 dark:divide-red-800/30 max-h-[400px] overflow-y-auto">
                        {deadlineData.overdue.map((task) => {
                            const projectName = projects.find((p) => p.id === task.projectId)?.name || '';
                            return (
                                <button
                                    key={task.id}
                                    onClick={() => onTaskClick(task)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition text-left"
                                >
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                                            {projectName} • {task.assignee || '미지정'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', getDaysBadgeColor(task.dueDate))}>
                                            {daysUntil(task.dueDate)}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Upcoming Project Deadlines */}
            {deadlineData.projectDeadlines.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-blue-500" />
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">프로젝트 마감 예정</h4>
                        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{deadlineData.projectDeadlines.length}개</span>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {deadlineData.projectDeadlines.map((project) => {
                            const pmName = project.pm_id && usersData?.users
                                ? usersData.users.find((u: any) => u.id === project.pm_id)?.name
                                : null;
                            return (
                                <button
                                    key={project.id}
                                    onClick={() => onProjectClick(project)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition text-left"
                                >
                                    <FolderKanban className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn('rounded px-1.5 py-0.5 text-[8px] font-semibold border', BU_CHIP_STYLES[project.bu])}>
                                                {BU_TITLES[project.bu]}
                                            </span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{project.name}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                                            마감: {project.endDate}{pmName ? ` • PM: ${pmName}` : ''}
                                        </p>
                                    </div>
                                    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap', getDaysBadgeColor(project.endDate))}>
                                        {daysUntil(project.endDate)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Upcoming Task Deadlines */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">할일 마감 예정</h4>
                    <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">{deadlineData.upcoming.length}개</span>
                </div>
                {deadlineData.upcoming.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500">{range}일 내 마감 예정 할일이 없습니다.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-[500px] overflow-y-auto">
                        {deadlineData.upcoming.map((task) => {
                            const projectName = projects.find((p) => p.id === task.projectId)?.name || '';
                            return (
                                <button
                                    key={task.id}
                                    onClick={() => onTaskClick(task)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition text-left"
                                >
                                    {task.status === 'todo' ? (
                                        <Circle className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                    ) : (
                                        <Timer className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn('rounded px-1.5 py-0.5 text-[8px] font-semibold border', BU_CHIP_STYLES[task.bu])}>
                                                {BU_TITLES[task.bu]}
                                            </span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{task.title}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                            {projectName} • {task.assignee || '미지정'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {task.priority === 'high' && (
                                            <span className="rounded bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 text-[8px] font-bold text-red-600 dark:text-red-300">높음</span>
                                        )}
                                        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap', getDaysBadgeColor(task.dueDate))}>
                                            {daysUntil(task.dueDate)}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Empty state */}
            {deadlineData.overdue.length === 0 &&
                deadlineData.upcoming.length === 0 &&
                deadlineData.projectDeadlines.length === 0 &&
                deadlineData.overdueProjects.length === 0 && (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">마감 예정 항목 없음</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{range}일 이내에 도래하는 마감일이 없습니다.</p>
                    </div>
                )}
        </div>
    );
}
