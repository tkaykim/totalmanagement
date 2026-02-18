/**
 * 푸시 알림 시나리오 정의
 * ERP/전사 업무공유 툴에서 사용할 알림 유형별 제목·본문·발송 대상 설명
 */
export interface PushScenario {
  id: string;
  name: string;
  description: string;
  /** 발송 대상 설명 (테스트 시 참고) */
  targetAudience: string;
  title: string;
  body: string;
  /** 딥링크 경로 */
  actionUrl: string;
  /** 시나리오 분류 */
  category: 'project' | 'task' | 'comment' | 'message' | 'attendance' | 'due' | 'assignment' | 'admin';
}

export const PUSH_SCENARIOS: PushScenario[] = [
  // 프로젝트
  {
    id: 'project_created',
    name: '프로젝트 알림 (생성)',
    description: '새 프로젝트가 등록되었을 때',
    targetAudience: '해당 사업부 리더/관리자 또는 PM',
    title: '새 프로젝트가 등록되었습니다',
    body: '[그리고 엔터] 신규 프로젝트가 등록되었습니다. 확인해 주세요.',
    actionUrl: '/',
    category: 'project',
  },
  {
    id: 'project_updated',
    name: '프로젝트 알림 (변경)',
    description: '프로젝트 정보가 수정되었을 때',
    targetAudience: '프로젝트 참여자·PM·관리자',
    title: '프로젝트 정보가 변경되었습니다',
    body: '참여 중인 프로젝트의 일정 또는 내용이 수정되었습니다.',
    actionUrl: '/',
    category: 'project',
  },
  {
    id: 'project_assigned',
    name: '프로젝트 배정',
    description: '프로젝트에 나를 배정했을 때',
    targetAudience: '배정된 담당자',
    title: '프로젝트에 배정되었습니다',
    body: '새 프로젝트에 담당자로 배정되었습니다. 업무를 확인해 주세요.',
    actionUrl: '/',
    category: 'assignment',
  },
  // 할일
  {
    id: 'task_created',
    name: '할일 알림 (생성)',
    description: '새 할일이 등록되었을 때',
    targetAudience: '해당 프로젝트 담당자·리더',
    title: '새 할일이 등록되었습니다',
    body: '프로젝트에 새 할일이 추가되었습니다.',
    actionUrl: '/',
    category: 'task',
  },
  {
    id: 'task_assigned',
    name: '할일 배정 알림',
    description: '할일이 나에게 배정되었을 때',
    targetAudience: '배정된 담당자',
    title: '할일이 배정되었습니다',
    body: '담당 할일이 배정되었습니다. 마감일을 확인해 주세요.',
    actionUrl: '/',
    category: 'assignment',
  },
  {
    id: 'task_due_soon',
    name: '마감일 임박 알림',
    description: '할일/프로젝트 마감일 1~3일 전',
    targetAudience: '해당 할일·프로젝트 담당자',
    title: '마감일이 임박했습니다',
    body: '담당 업무의 마감일이 다가왔습니다. 진행 상황을 확인해 주세요.',
    actionUrl: '/',
    category: 'due',
  },
  {
    id: 'task_overdue',
    name: '마감일 경과 알림',
    description: '할일/프로젝트 마감일이 지났을 때',
    targetAudience: '담당자 + 리더/관리자',
    title: '마감일이 지났습니다',
    body: '담당 업무의 마감일이 경과했습니다. 즉시 처리해 주세요.',
    actionUrl: '/',
    category: 'due',
  },
  // 댓글
  {
    id: 'comment_added',
    name: '댓글 알림',
    description: '내가 참여한 게시/업무에 댓글이 달렸을 때',
    targetAudience: '원글 작성자·멘션된 사용자',
    title: '새 댓글이 달렸습니다',
    body: '참여 중인 게시에 댓글이 등록되었습니다.',
    actionUrl: '/',
    category: 'comment',
  },
  {
    id: 'comment_mention',
    name: '댓글 멘션 알림',
    description: '댓글에서 나를 멘션했을 때',
    targetAudience: '멘션된 사용자',
    title: '댓글에서 멘션되었습니다',
    body: '댓글에서 회원님을 언급했습니다. 확인해 주세요.',
    actionUrl: '/',
    category: 'comment',
  },
  // 메시지
  {
    id: 'message_received',
    name: '메시지 알림',
    description: '채널/DM 등 메시지 수신',
    targetAudience: '수신자',
    title: '새 메시지가 도착했습니다',
    body: '확인하지 않은 메시지가 있습니다.',
    actionUrl: '/',
    category: 'message',
  },
  // 출퇴근
  {
    id: 'attendance_missing_morning',
    name: '출퇴근 기록 누락 (오전)',
    description: '오전 10시 전후 출근이 기록되지 않은 경우',
    targetAudience: '해당 일자 출근 미기록 직원 + 관리자',
    title: '출근 기록을 확인해 주세요',
    body: '오늘 출근 기록이 없습니다. 앱에서 출근 처리해 주세요. (오전 10시 기준)',
    actionUrl: '/attendance',
    category: 'attendance',
  },
  {
    id: 'attendance_missing_evening',
    name: '출퇴근 기록 누락 (저녁)',
    description: '저녁 7시 전후 퇴근이 기록되지 않은 경우',
    targetAudience: '해당 일자 퇴근 미기록 직원 + 관리자',
    title: '퇴근 기록을 확인해 주세요',
    body: '오늘 퇴근 기록이 없습니다. 퇴근 처리 후 퇴근 버튼을 눌러 주세요. (저녁 7시 기준)',
    actionUrl: '/attendance',
    category: 'attendance',
  },
  // 관리자/기타
  {
    id: 'admin_announcement',
    name: '관리자 공지',
    description: '전사/사업부 공지 발송',
    targetAudience: '전체 또는 조건(역할·사업부) 대상',
    title: '공지사항',
    body: '관리자가 공지사항을 등록했습니다. 앱에서 확인해 주세요.',
    actionUrl: '/',
    category: 'admin',
  },
];

export function getPushScenarioById(id: string): PushScenario | undefined {
  return PUSH_SCENARIOS.find((s) => s.id === id);
}
