import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb, IDS, jsonRequest, params, staff } from './t5-fake-supabase';
import { t5State, signInAs, signOut, blocked } from './t5-mocks';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => t5State.db.client()),
  createPureClient: vi.fn(async () => t5State.db.client()),
}));
vi.mock('@/lib/auth-guard', async () => {
  const { NextResponse } = await import('next/server');
  return {
    requireActiveStaff: vi.fn(async () => t5State.guard),
    isGuardFailure: (r: unknown) => r instanceof NextResponse,
  };
});
vi.mock('@/lib/activity-logger', () => ({
  createActivityLog: vi.fn(async () => {}),
  createTaskAssignedLog: vi.fn(async () => {}),
  createTaskStatusChangeLog: vi.fn(async () => {}),
}));
vi.mock('@/lib/notification-sender', () => ({
  notifyTaskAssigned: vi.fn(async () => {}),
  notifyTaskStatusChange: vi.fn(async () => {}),
}));

import * as TasksRoute from '@/app/api/tasks/route';
import * as TaskRoute from '@/app/api/tasks/[id]/route';
import * as GenerateRoute from '@/app/api/task-templates/generate/route';
import * as RoomRoute from '@/app/api/meeting-rooms/[id]/route';
import * as VehicleRoute from '@/app/api/vehicles/[id]/route';

const BASE = 'http://localhost/api';

function project(id: number, bu: string, extra: Record<string, unknown> = {}) {
  return { id, bu_code: bu, name: `P${id}`, pm_id: null, participants: [], created_by: IDS.other, ...extra };
}

function task(id: number, projectId: number, bu: string, extra: Record<string, unknown> = {}) {
  return {
    id, project_id: projectId, bu_code: bu, title: `T${id}`, status: 'todo', due_date: '2026-10-01',
    assignee_id: null, created_by: IDS.other, ...extra,
  };
}

function seed() {
  return new FakeDb({
    projects: [
      project(1, 'FLOW', { participants: [{ user_id: IDS.member }] }),
      project(2, 'REACT'),
      project(3, 'FLOW'),
    ],
    project_tasks: [
      task(10, 1, 'FLOW'),
      task(20, 2, 'REACT'),
      task(21, 2, 'REACT', { assignee_id: IDS.member }),
      task(30, 3, 'FLOW'),
    ],
    meeting_rooms: [{ id: 1, name: 'A', is_active: true }],
    vehicles: [{ id: 1, name: 'V', license_plate: '1가1234', is_active: true }],
  });
}

beforeEach(() => {
  t5State.db = seed();
  signInAs(staff('admin'));
});

describe('GET /api/tasks — 보기 범위(R7·R8)', () => {
  it('비로그인 401, 비재직 403', async () => {
    signOut();
    expect((await TasksRoute.GET(jsonRequest(`${BASE}/tasks`, 'GET'))).status).toBe(401);
    blocked();
    expect((await TasksRoute.GET(jsonRequest(`${BASE}/tasks`, 'GET'))).status).toBe(403);
    expect(t5State.db.selects).toHaveLength(0);
  });

  it('멤버: 볼 수 있는 프로젝트 할일 + 본인 배정 할일', async () => {
    signInAs(staff('member'));
    const res = await TasksRoute.GET(jsonRequest(`${BASE}/tasks`, 'GET'));
    const ids = (await res.json()).map((t: { id: number }) => t.id).sort();
    expect(ids).toEqual([10, 21]);
  });

  it('멤버 + bu 필터: 그 사업부의 보이는 할일 + 다른 사업부 본인 배정 할일', async () => {
    signInAs(staff('member'));
    const res = await TasksRoute.GET(jsonRequest(`${BASE}/tasks?bu=FLOW`, 'GET'));
    const ids = (await res.json()).map((t: { id: number }) => t.id).sort();
    expect(ids).toEqual([10, 21]);
  });

  it('다른 사업부 리더는 전사 할일을 본다', async () => {
    signInAs(staff('reactLeader'));
    const res = await TasksRoute.GET(jsonRequest(`${BASE}/tasks`, 'GET'));
    expect((await res.json()).length).toBe(4);
  });

  it('1,000행을 넘어도 잘리지 않는다', async () => {
    t5State.db = new FakeDb({
      projects: [project(1, 'FLOW')],
      project_tasks: Array.from({ length: 1301 }, (_, i) => task(i + 1, 1, 'FLOW')),
    });
    const res = await TasksRoute.GET(jsonRequest(`${BASE}/tasks`, 'GET'));
    expect((await res.json()).length).toBe(1301);
  });
});

describe('POST /api/tasks', () => {
  it('bu_code는 본문을 무시하고 프로젝트 사업부로 넣는다', async () => {
    const res = await TasksRoute.POST(
      jsonRequest(`${BASE}/tasks`, 'POST', { project_id: 1, bu_code: 'REACT', title: 'x', due_date: '2026-10-01', created_by: IDS.other })
    );
    expect(res.status).toBe(200);
    const [w] = t5State.db.writesTo('project_tasks', 'insert');
    expect(w.values.bu_code).toBe('FLOW');
    expect(w.values.created_by).toBe(IDS.admin);
  });

  it('다른 사업부 리더 → 403, DB 변화 없음', async () => {
    signInAs(staff('flowLeader'));
    const res = await TasksRoute.POST(jsonRequest(`${BASE}/tasks`, 'POST', { project_id: 2, title: 'x', due_date: '2026-10-01' }));
    expect(res.status).toBe(403);
    expect(t5State.db.writes).toHaveLength(0);
  });
});

describe('PATCH /api/tasks/[id] — 허용 컬럼·이동 사업부(R4·R5·R10)', () => {
  it('허용 외 컬럼 무시', async () => {
    const res = await TaskRoute.PATCH(
      jsonRequest(`${BASE}/tasks/10`, 'PATCH', { title: '새', created_by: IDS.member, id: 99, created_at: 'x', bu_code: 'REACT' }),
      params({ id: '10' })
    );
    expect(res.status).toBe(200);
    const [w] = t5State.db.writesTo('project_tasks', 'update');
    expect(w.values.title).toBe('새');
    for (const k of ['created_by', 'id', 'created_at']) expect(w.values).not.toHaveProperty(k);
    expect(w.values.bu_code ?? 'FLOW').toBe('FLOW');
  });

  it('다른 프로젝트로 옮기면 새 프로젝트 사업부, 본문 bu_code 무시', async () => {
    const res = await TaskRoute.PATCH(
      jsonRequest(`${BASE}/tasks/10`, 'PATCH', { project_id: 2, bu_code: 'HEAD' }),
      params({ id: '10' })
    );
    expect(res.status).toBe(200);
    const [w] = t5State.db.writesTo('project_tasks', 'update');
    expect(w.values.project_id).toBe(2);
    expect(w.values.bu_code).toBe('REACT');
  });

  it('없는 프로젝트로 옮기기 → 400, DB 변화 없음', async () => {
    const res = await TaskRoute.PATCH(jsonRequest(`${BASE}/tasks/10`, 'PATCH', { project_id: 999 }), params({ id: '10' }));
    expect(res.status).toBe(400);
    expect(t5State.db.writes).toHaveLength(0);
  });

  it('리더가 자기 사업부 할일을 다른 사업부 프로젝트로 옮기면 403', async () => {
    signInAs(staff('flowLeader'));
    const res = await TaskRoute.PATCH(jsonRequest(`${BASE}/tasks/10`, 'PATCH', { project_id: 2 }), params({ id: '10' }));
    expect(res.status).toBe(403);
    expect(t5State.db.writes).toHaveLength(0);
  });

  it('다른 사업부 리더 → 403', async () => {
    signInAs(staff('reactLeader'));
    const res = await TaskRoute.PATCH(jsonRequest(`${BASE}/tasks/10`, 'PATCH', { title: 'x' }), params({ id: '10' }));
    expect(res.status).toBe(403);
    expect(t5State.db.writes).toHaveLength(0);
  });

  it('볼 수 없는 할일 → 404', async () => {
    signInAs(staff('member'));
    const res = await TaskRoute.PATCH(jsonRequest(`${BASE}/tasks/30`, 'PATCH', { title: 'x' }), params({ id: '30' }));
    expect(res.status).toBe(404);
  });

  it('다른 사업부 리더 DELETE → 403', async () => {
    signInAs(staff('reactLeader'));
    const res = await TaskRoute.DELETE(jsonRequest(`${BASE}/tasks/10`, 'DELETE'), params({ id: '10' }));
    expect(res.status).toBe(403);
    expect(t5State.db.writes).toHaveLength(0);
  });
});

describe('POST /api/task-templates/generate — R10', () => {
  const payload = (projectId: number) => ({
    template_id: 1,
    project_id: projectId,
    tasks: [{ title: 'a', due_date: '2026-10-01', priority: 'high', bu_code: 'HEAD' }],
  });

  it('리더는 다른 사업부 프로젝트에 생성 불가 → 403', async () => {
    signInAs(staff('flowLeader'));
    const res = await GenerateRoute.POST(jsonRequest(`${BASE}/task-templates/generate`, 'POST', payload(2)));
    expect(res.status).toBe(403);
    expect(t5State.db.writesTo('project_tasks')).toHaveLength(0);
  });

  it('자기 사업부 프로젝트엔 생성, 사업부는 프로젝트 기준', async () => {
    signInAs(staff('flowLeader'));
    const res = await GenerateRoute.POST(jsonRequest(`${BASE}/task-templates/generate`, 'POST', payload(1)));
    expect(res.status).toBe(200);
    const [w] = t5State.db.writesTo('project_tasks', 'insert');
    expect(w.values[0].bu_code).toBe('FLOW');
    expect(w.values[0].created_by).toBe(IDS.flowLeader);
  });

  it('비로그인 401', async () => {
    signOut();
    const res = await GenerateRoute.POST(jsonRequest(`${BASE}/task-templates/generate`, 'POST', payload(1)));
    expect(res.status).toBe(401);
  });
});

describe('회의실·차량 자원 (R4, 관리자만)', () => {
  it('회의실 PATCH: 관리자 아님 403, DB 변화 없음', async () => {
    signInAs(staff('flowLeader'));
    const res = await RoomRoute.PATCH(jsonRequest(`${BASE}/meeting-rooms/1`, 'PATCH', { name: 'x' }), params({ id: '1' }));
    expect(res.status).toBe(403);
    expect(t5State.db.writes).toHaveLength(0);
  });

  it('회의실 PATCH: 허용 컬럼만', async () => {
    const res = await RoomRoute.PATCH(
      jsonRequest(`${BASE}/meeting-rooms/1`, 'PATCH', { name: 'B', capacity: 6, id: 5, created_at: 'x', bogus: 1 }),
      params({ id: '1' })
    );
    expect(res.status).toBe(200);
    const [w] = t5State.db.writesTo('meeting_rooms', 'update');
    expect(w.values).toMatchObject({ name: 'B', capacity: 6 });
    for (const k of ['id', 'created_at', 'bogus']) expect(w.values).not.toHaveProperty(k);
  });

  it('회의실 GET 비로그인 401', async () => {
    signOut();
    expect((await RoomRoute.GET(jsonRequest(`${BASE}/meeting-rooms/1`, 'GET'), params({ id: '1' }))).status).toBe(401);
  });

  it('차량 PATCH: 허용 컬럼만, 관리자 아님 403', async () => {
    const ok = await VehicleRoute.PATCH(
      jsonRequest(`${BASE}/vehicles/1`, 'PATCH', { license_plate: '2나', id: 5, created_at: 'x' }),
      params({ id: '1' })
    );
    expect(ok.status).toBe(200);
    const [w] = t5State.db.writesTo('vehicles', 'update');
    expect(w.values.license_plate).toBe('2나');
    expect(w.values).not.toHaveProperty('id');
    expect(w.values).not.toHaveProperty('created_at');

    signInAs(staff('member'));
    const denied = await VehicleRoute.DELETE(jsonRequest(`${BASE}/vehicles/1`, 'DELETE'), params({ id: '1' }));
    expect(denied.status).toBe(403);
    expect(t5State.db.writesTo('vehicles', 'delete')).toHaveLength(0);
  });
});
