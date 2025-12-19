# DB-서버-프론트 연동 가이드

## 완료된 작업

### 1. DB 스키마 (Supabase)
- `supabase/migrations/0001_init_erp_schema.sql` 생성 완료
- Supabase 콘솔에서 이 마이그레이션을 실행하세요

### 2. API 라우트 (Next.js)
다음 API 엔드포인트가 생성되었습니다:
- `GET/POST /api/projects`
- `PATCH/DELETE /api/projects/[id]`
- `GET/POST /api/tasks`
- `PATCH/DELETE /api/tasks/[id]`
- `GET/POST /api/financial-entries`
- `PATCH/DELETE /api/financial-entries/[id]`
- `GET /api/org-members`
- `GET /api/business-units`

### 3. API 호출 함수
- `src/features/erp/api.ts` - 모든 API 호출 함수
- `src/features/erp/hooks.ts` - react-query hooks
- `src/features/erp/utils.ts` - 타입 변환 유틸리티

## 프론트엔드 연동 방법

현재 `src/app/page.tsx`는 로컬 상태를 사용하고 있습니다. 
API와 연동하려면 다음을 수정하세요:

### 1. Import 추가
```typescript
import { useProjects, useTasks, useFinancialEntries, useCreateProject, useCreateTask, useCreateFinancialEntry, useUpdateTask } from '@/features/erp/hooks';
import { dbProjectToFrontend, dbTaskToFrontend, dbFinancialToFrontend, frontendProjectToDb, frontendTaskToDb, frontendFinancialToDb } from '@/features/erp/utils';
```

### 2. 데이터 로딩 (useQuery)
```typescript
// 기존: const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
// 변경:
const { data: projectsData = [], isLoading: projectsLoading } = useProjects(bu);
const projects = useMemo(() => projectsData.map(dbProjectToFrontend), [projectsData]);

const { data: tasksData = [], isLoading: tasksLoading } = useTasks(bu);
const tasks = useMemo(() => tasksData.map(dbTaskToFrontend), [tasksData]);

const { data: financialData = [] } = useFinancialEntries({ bu, startDate: activePeriod.start, endDate: activePeriod.end });
const allFinancial = useMemo(() => financialData.map(dbFinancialToFrontend), [financialData]);
const revenues = useMemo(() => allFinancial.filter(f => f.type === 'revenue'), [allFinancial]);
const expenses = useMemo(() => allFinancial.filter(f => f.type === 'expense'), [allFinancial]);
```

### 3. 데이터 생성 (useMutation)
```typescript
const createProjectMutation = useCreateProject();
const createTaskMutation = useCreateTask();
const createFinancialMutation = useCreateFinancialEntry();

const handleCreateProject = async (payload: {...}) => {
  const dbData = frontendProjectToDb(payload);
  await createProjectMutation.mutateAsync(dbData);
  setProjectModalOpen(false);
};

const handleCreateTask = async (payload: {...}) => {
  const dbData = frontendTaskToDb(payload);
  await createTaskMutation.mutateAsync(dbData);
  setTaskModalOpen(false);
};

const handleCreateFinance = async (payload: {...}) => {
  const dbData = frontendFinancialToDb(payload);
  await createFinancialMutation.mutateAsync(dbData);
  setFinanceModalOpen(null);
};
```

### 4. Task 상태 업데이트
```typescript
const updateTaskMutation = useUpdateTask();

const handleTaskStatusChange = async (taskId: string, status: 'todo' | 'in-progress' | 'done') => {
  const dbStatus = status === 'in-progress' ? 'in_progress' : status;
  await updateTaskMutation.mutateAsync({ id: Number(taskId), data: { status: dbStatus } });
};
```

## 환경 변수 설정

`.env.local` 파일에 다음을 추가하세요:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 다음 단계

1. Supabase 마이그레이션 실행
2. 환경 변수 설정
3. 프론트엔드 코드 수정 (위 가이드 참고)
4. 테스트


