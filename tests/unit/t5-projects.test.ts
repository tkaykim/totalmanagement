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
  createProjectStatusChangeLog: vi.fn(async () => {}),
}));
vi.mock('@/lib/notification-sender', () => ({
  notifyProjectPMAssigned: vi.fn(async () => {}),
  notifyProjectParticipantAdded: vi.fn(async () => {}),
  notifyProjectStatusChange: vi.fn(async () => {}),
}));

import * as ProjectsRoute from '@/app/api/projects/route';
import * as ProjectRoute from '@/app/api/projects/[id]/route';
import * as ShareRoute from '@/app/api/projects/[id]/share-settings/route';
import * as DocumentsRoute from '@/app/api/projects/[id]/documents/route';
import * as DocumentRoute from '@/app/api/projects/[id]/documents/[documentId]/route';
import * as ParticipantsRoute from '@/app/api/projects/[id]/participants/route';
import * as ParticipantRoute from '@/app/api/projects/[id]/participants/[participantId]/route';

const BASE = 'http://localhost/api/projects';

function project(id: number, bu: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    bu_code: bu,
    brand_bu_code: bu,
    delivery_bu_code: bu,
    name: `P${id}`,
    category: 'c',
    status: '진행중',
    pm_id: null,
    participants: [],
    created_by: IDS.other,
    created_at: `2026-01-01T00:00:${String(id % 60).padStart(2, '0')}Z`,
    ...extra,
  };
}

function seed() {
  return new FakeDb({
    projects: [
      project(1, 'FLOW', { created_by: IDS.member }), // 멤버 생성
      project(2, 'FLOW', { participants: [{ user_id: IDS.member }] }), // 멤버 참여
      project(3, 'REACT'), // 멤버 무관
      project(4, 'FLOW', { pm_id: IDS.other }), // PM 있는 FLOW → 매니저 보임
    ],
    financial_entries: [
      { id: 11, project_id: 1, kind: 'revenue', amount: 100, entry_scope: 'external', status: 'paid', bu_code: 'FLOW', occurred_at: '2026-01-05' },
      { id: 12, project_id: 1, kind: 'expense', amount: 30, entry_scope: 'external', status: 'planned', bu_code: 'FLOW', occurred_at: '2026-01-06' },
      { id: 13, project_id: 1, kind: 'revenue', amount: 50, entry_scope: 'internal_allocation', counterparty_bu_code: 'REACT', status: 'paid', bu_code: 'FLOW', occurred_at: '2026-01-07' },
      { id: 14, project_id: 1, kind: 'revenue', amount: 999, entry_scope: 'external', status: 'canceled', bu_code: 'FLOW', occurred_at: '2026-01-07' },
      { id: 15, project_id: 3, kind: 'revenue', amount: 700, entry_scope: 'external', status: 'paid', bu_code: 'REACT', occurred_at: '2026-01-07' },
    ],
  });
}

async function body(res: Response) {
  return res.json();
}

beforeEach(() => {
  t5State.db = seed();
  signInAs(staff('admin'));
});

describe('GET /api/projects — 가드와 보기 범위(R7·R8)', () => {
  it('비로그인 → 401, DB 조회 없음', async () => {
    signOut();
    const res = await ProjectsRoute.GET(jsonRequest(BASE, 'GET'));
    expect(res.status).toBe(401);
    expect(t5State.db.selects).toHaveLength(0);
  });

  it('비재직 → 403', async () => {
    blocked();
    const res = await ProjectsRoute.GET(jsonRequest(BASE, 'GET'));
    expect(res.status).toBe(403);
  });

  it('일반 멤버: 생성·참여 프로젝트만', async () => {
    signInAs(staff('member'));
    const res = await ProjectsRoute.GET(jsonRequest(BASE, 'GET'));
    const ids = (await body(res)).map((p: { id: number }) => p.id).sort();
    expect(ids).toEqual([1, 2]);
  });

  it('매니저: PM 지정된 같은 사업부 프로젝트 포함', async () => {
    signInAs(staff('manager'));
    const res = await ProjectsRoute.GET(jsonRequest(BASE, 'GET'));
    const ids = (await body(res)).map((p: { id: number }) => p.id).sort();
    expect(ids).toEqual([4]);
  });

  it('다른 사업부 리더도 전사 프로젝트를 본다', async () => {
    signInAs(staff('reactLeader'));
    const res = await ProjectsRoute.GET(jsonRequest(BASE, 'GET'));
    expect((await body(res)).length).toBe(4);
  });

  it('1,000행을 넘어도 잘리지 않는다', async () => {
    t5State.db = new FakeDb({ projects: Array.from({ length: 1205 }, (_, i) => project(i + 1, 'FLOW')) });
    const res = await ProjectsRoute.GET(jsonRequest(BASE, 'GET'));
    expect((await body(res)).length).toBe(1205);
  });
});

describe('GET /api/projects?includeShare — 합계(R9·R26)', () => {
  it("'전체'는 내부배부·취소 제외", async () => {
    const res = await ProjectsRoute.GET(jsonRequest(`${BASE}?includeShare=true`, 'GET'));
    const { data } = await body(res);
    const p1 = data.find((p: { id: number }) => p.id === 1);
    expect(p1.total_revenue).toBe(100);
    expect(p1.total_expense).toBe(30);
  });

  it('사업부 탭은 내부배부 포함(관리손익)', async () => {
    const res = await ProjectsRoute.GET(jsonRequest(`${BASE}?includeShare=true&bu=FLOW`, 'GET'));
    const { data } = await body(res);
    const p1 = data.find((p: { id: number }) => p.id === 1);
    expect(p1.total_revenue).toBe(150);
    expect(p1.internal_revenue).toBe(50);
    expect(data.every((p: { bu_code: string }) => p.bu_code === 'FLOW')).toBe(true);
  });

  it('일반 멤버는 볼 수 있는 프로젝트 합계만 받는다', async () => {
    signInAs(staff('member'));
    const res = await ProjectsRoute.GET(jsonRequest(`${BASE}?includeShare=true`, 'GET'));
    const { data } = await body(res);
    expect(data.map((p: { id: number }) => p.id).sort()).toEqual([1, 2]);
    expect(JSON.stringify(data)).not.toContain('700');
  });

  it('재무 행 1,000건 넘어도 합계가 잘리지 않는다', async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({
      id: 1000 + i, project_id: 1, kind: 'revenue', amount: 1, entry_scope: 'external', status: 'paid', bu_code: 'FLOW', occurred_at: '2026-02-01',
    }));
    t5State.db = new FakeDb({ projects: [project(1, 'FLOW')], financial_entries: rows });
    const res = await ProjectsRoute.GET(jsonRequest(`${BASE}?includeShare=true`, 'GET'));
    const { data } = await body(res);
    expect(data[0].total_revenue).toBe(1500);
  });
});

describe('POST /api/projects — 생성(R10)', () => {
  it('리더는 다른 사업부 프로젝트를 만들 수 없다', async () => {
    signInAs(staff('flowLeader'));
    const res = await ProjectsRoute.POST(jsonRequest(BASE, 'POST', { bu_code: 'REACT', name: 'x', category: 'c' }));
    expect(res.status).toBe(403);
    expect(t5State.db.writesTo('projects')).toHaveLength(0);
  });

  it('잘못된 사업부 → 400', async () => {
    const res = await ProjectsRoute.POST(jsonRequest(BASE, 'POST', { bu_code: 'NOPE', name: 'x', category: 'c' }));
    expect(res.status).toBe(400);
  });

  it('created_by는 본문 값을 무시하고 로그인 사용자로 넣는다', async () => {
    signInAs(staff('flowLeader'));
    const res = await ProjectsRoute.POST(
      jsonRequest(BASE, 'POST', { bu_code: 'FLOW', name: 'x', category: 'c', created_by: IDS.other, id: 777 })
    );
    expect(res.status).toBe(200);
    const [w] = t5State.db.writesTo('projects', 'insert');
    expect(w.values.created_by).toBe(IDS.flowLeader);
    expect(w.values.id).toBeUndefined();
  });
});

describe('PATCH /api/projects/[id] — 허용 컬럼·R10', () => {
  it('허용 외 컬럼은 무시하고 나머지만 저장', async () => {
    const res = await ProjectRoute.PATCH(
      jsonRequest(`${BASE}/1`, 'PATCH', { name: '새 이름', created_by: IDS.admin, id: 9, created_at: 'x', share_rate: 50 }),
      params({ id: '1' })
    );
    expect(res.status).toBe(200);
    const [w] = t5State.db.writesTo('projects', 'update');
    expect(w.values.name).toBe('새 이름');
    for (const k of ['created_by', 'id', 'created_at', 'share_rate']) expect(w.values).not.toHaveProperty(k);
  });

  it('다른 사업부 리더 → 403, DB 변화 없음', async () => {
    signInAs(staff('reactLeader'));
    const res = await ProjectRoute.PATCH(jsonRequest(`${BASE}/1`, 'PATCH', { name: 'x' }), params({ id: '1' }));
    expect(res.status).toBe(403);
    expect(t5State.db.writesTo('projects')).toHaveLength(0);
  });

  it('리더가 자기 프로젝트를 다른 사업부로 옮기려 하면 403', async () => {
    signInAs(staff('flowLeader'));
    const res = await ProjectRoute.PATCH(jsonRequest(`${BASE}/1`, 'PATCH', { bu_code: 'REACT' }), params({ id: '1' }));
    expect(res.status).toBe(403);
    expect(t5State.db.writesTo('projects')).toHaveLength(0);
  });

  it('볼 수 없는 프로젝트 → 404', async () => {
    signInAs(staff('member'));
    const res = await ProjectRoute.PATCH(jsonRequest(`${BASE}/3`, 'PATCH', { name: 'x' }), params({ id: '3' }));
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/projects/[id] — R15', () => {
  it('재무 행이 있으면 409 + 보류 안내, 삭제 호출 없음', async () => {
    const res = await ProjectRoute.DELETE(jsonRequest(`${BASE}/1`, 'DELETE'), params({ id: '1' }));
    expect(res.status).toBe(409);
    expect((await body(res)).error).toBe('재무 기록이 있는 프로젝트는 삭제할 수 없습니다. 보류로 바꾸세요');
    expect(t5State.db.writes.filter((w) => w.op === 'delete')).toHaveLength(0);
  });

  it('취소 행만 있어도 재무 행이므로 409', async () => {
    t5State.db = new FakeDb({
      projects: [project(5, 'FLOW')],
      financial_entries: [{ id: 1, project_id: 5, status: 'canceled', kind: 'expense', amount: 1 }],
    });
    const res = await ProjectRoute.DELETE(jsonRequest(`${BASE}/5`, 'DELETE'), params({ id: '5' }));
    expect(res.status).toBe(409);
  });

  it('재무 행이 없으면 삭제', async () => {
    const res = await ProjectRoute.DELETE(jsonRequest(`${BASE}/2`, 'DELETE'), params({ id: '2' }));
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ success: true });
    expect(t5State.db.writesTo('projects', 'delete')).toHaveLength(1);
  });

  it('다른 사업부 리더 → 403', async () => {
    signInAs(staff('reactLeader'));
    const res = await ProjectRoute.DELETE(jsonRequest(`${BASE}/2`, 'DELETE'), params({ id: '2' }));
    expect(res.status).toBe(403);
    expect(t5State.db.writes).toHaveLength(0);
  });
});

describe('외부인·파트너 하위 경로 (R27·R2)', () => {
  it('share-settings GET/PATCH는 관리자에게도 403', async () => {
    const g = await ShareRoute.GET();
    expect(g.status).toBe(403);
    const p = await ShareRoute.PATCH();
    expect(p.status).toBe(403);
    expect(t5State.db.writes).toHaveLength(0);
  });

  it('share-settings 비로그인 → 401', async () => {
    signOut();
    const g = await ShareRoute.GET();
    expect(g.status).toBe(401);
  });

  it('documents: 비로그인 401, 볼 수 없는 프로젝트 404', async () => {
    signOut();
    expect((await DocumentsRoute.GET(jsonRequest(`${BASE}/1/documents`, 'GET'), params({ id: '1' }))).status).toBe(401);
    signInAs(staff('member'));
    expect((await DocumentsRoute.GET(jsonRequest(`${BASE}/3/documents`, 'GET'), params({ id: '3' }))).status).toBe(404);
    expect((await DocumentsRoute.GET(jsonRequest(`${BASE}/1/documents`, 'GET'), params({ id: '1' }))).status).toBe(200);
  });

  it('documents 삭제: 볼 수 없는 프로젝트 404, 삭제 없음', async () => {
    t5State.db.table('project_documents').push({ id: 1, project_id: 3, file_path: 'x' });
    signInAs(staff('member'));
    const res = await DocumentRoute.DELETE(jsonRequest(`${BASE}/3/documents/1`, 'DELETE'), params({ id: '3', documentId: '1' }));
    expect(res.status).toBe(404);
    expect(t5State.db.writes).toHaveLength(0);
  });

  it('participants: 조회는 보기 범위, 변경은 수정 권한(다른 사업부 리더 403)', async () => {
    signInAs(staff('member'));
    expect((await ParticipantsRoute.GET(jsonRequest(`${BASE}/3/participants`, 'GET'), params({ id: '3' }))).status).toBe(404);
    signInAs(staff('reactLeader'));
    expect((await ParticipantsRoute.GET(jsonRequest(`${BASE}/1/participants`, 'GET'), params({ id: '1' }))).status).toBe(200);
    const post = await ParticipantsRoute.POST(jsonRequest(`${BASE}/1/participants`, 'POST', { user_id: IDS.other }), params({ id: '1' }));
    expect(post.status).toBe(403);
    const del = await ParticipantRoute.DELETE(
      jsonRequest(`${BASE}/1/participants/x`, 'DELETE', { user_id: IDS.member }),
      params({ id: '1', participantId: 'x' })
    );
    expect(del.status).toBe(403);
    expect(t5State.db.writes).toHaveLength(0);
  });
});
