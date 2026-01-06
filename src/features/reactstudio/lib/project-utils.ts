import type { ProjectStep } from '@/types/database';

// 유틸리티 함수: D-Day 기준으로 일정 계산
export function calculateDatesFromRelease(releaseDate: string) {
  const date = new Date(releaseDate);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, days: number) => {
    const newDate = new Date(d);
    newDate.setDate(d.getDate() + days);
    return newDate;
  };

  return {
    release_date: releaseDate, // D-Day
    edit_final_date: formatDate(addDays(date, -1)), // D-1
    edit1_date: formatDate(addDays(date, -3)),     // D-3
    shoot_date: formatDate(addDays(date, -7)),     // D-7
    script_date: formatDate(addDays(date, -9)),    // D-9
    plan_date: formatDate(addDays(date, -11)),     // D-11
  };
}

// 할일 제목에 따라 마감일 자동 계산
export function calculateTaskDueDate(
  taskTitle: string,
  step: ProjectStep,
  schedule: {
    plan_date?: string | null;
    script_date?: string | null;
    shoot_date?: string | null;
    edit1_date?: string | null;
    edit_final_date?: string | null;
    release_date?: string | null;
  }
): string {
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return formatDate(date);
  };

  // 기획 단계
  if (step === 'plan' && schedule.plan_date) {
    if (taskTitle.includes('아이템') || taskTitle.includes('주제')) {
      return addDays(schedule.plan_date, -2); // 기획 확정일 2일 전
    }
    if (taskTitle.includes('기획안') || taskTitle.includes('제안서')) {
      return addDays(schedule.plan_date, -1); // 기획 확정일 1일 전
    }
    return schedule.plan_date;
  }

  // 대본 단계
  if (step === 'script' && schedule.script_date) {
    if (taskTitle.includes('대본') || taskTitle.includes('스크립트')) {
      return schedule.script_date;
    }
    return addDays(schedule.script_date, -1);
  }

  // 촬영 단계
  if (step === 'shoot' && schedule.shoot_date) {
    if (taskTitle.includes('촬영') || taskTitle.includes('촬영일정')) {
      return schedule.shoot_date;
    }
    if (taskTitle.includes('장소') || taskTitle.includes('세트')) {
      return addDays(schedule.shoot_date, -2);
    }
    return addDays(schedule.shoot_date, -1);
  }

  // 편집 단계
  if (step === 'edit') {
    if (schedule.edit1_date && taskTitle.includes('1차')) {
      return schedule.edit1_date;
    }
    if (schedule.edit_final_date && (taskTitle.includes('최종') || taskTitle.includes('편집'))) {
      return schedule.edit_final_date;
    }
    if (schedule.edit1_date) {
      return addDays(schedule.edit1_date, -1);
    }
  }

  // 기본값: release_date가 있으면 그 전날
  if (schedule.release_date) {
    return addDays(schedule.release_date, -1);
  }

  // 모두 없으면 오늘
  return formatDate(new Date());
}

// 기본 할일 템플릿
export const DEFAULT_TASKS_BY_STEP: Record<ProjectStep, Array<{ title: string; description: string; priority: 'high' | 'medium' | 'low' }>> = {
  plan: [
    { title: '아이템/주제 선정', description: '프로젝트 아이템 및 주제 확정', priority: 'high' },
    { title: '기획안 작성', description: '프로젝트 기획안 작성 및 검토', priority: 'high' },
  ],
  script: [
    { title: '대본 초안 작성', description: '대본 초안 작성', priority: 'high' },
    { title: '대본 검토 및 수정', description: '대본 검토 및 피드백 반영', priority: 'medium' },
    { title: '대본 확정', description: '최종 대본 확정', priority: 'high' },
  ],
  shoot: [
    { title: '촬영 장소 섭외', description: '촬영 장소 섭외 및 계약', priority: 'high' },
    { title: '촬영 일정 확정', description: '촬영 일정 및 인력 확정', priority: 'high' },
    { title: '촬영 진행', description: '실제 촬영 진행', priority: 'high' },
  ],
  edit: [
    { title: '1차 편집', description: '1차 편집 작업', priority: 'high' },
    { title: '1차 편집 검토', description: '1차 편집본 검토 및 피드백', priority: 'medium' },
    { title: '최종 편집', description: '최종 편집 작업', priority: 'high' },
    { title: '최종 편집 검토', description: '최종 편집본 검토 및 확정', priority: 'high' },
  ],
};

