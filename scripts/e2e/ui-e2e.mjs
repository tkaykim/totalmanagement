#!/usr/bin/env node
/**
 * ERP 화면 E2E (Playwright, 읽기 위주).
 *
 * `.env.e2e.local`(setup-accounts.mjs가 만든 파일)의 계정으로 로그인 화면에서 직접 로그인하고,
 * 역할별로 메뉴 화면(`/?view=...`)을 차례로 연다.
 * 각 화면에서 모으는 것: 콘솔 오류, 페이지 예외, 5xx 응답, 재직 계정의 401·403 응답, 오류 문구, 스크린샷.
 * 화면에서 데이터를 만들거나 바꾸는 버튼은 누르지 않는다(쓰기 검증은 `npm run test:api`가 [E2E] 데이터로만 한다).
 * 출근 버튼도 누르지 않는다(본사 관리자에게 알림이 간다). 근무 상태는 setup-accounts.mjs가 WORKING으로 맞춘다.
 *
 * 판정:
 * - 재직 계정: 로그인 뒤 `/`로 들어가야 하고, 각 화면에서 사이드바가 보이며 출근 화면·로그인 화면·오류 문구·로딩 멈춤이 없어야 한다.
 * - 승인 대기: 로그인하면 "승인 대기 중" 안내가 보이고 메뉴 화면은 열리지 않아야 한다.
 * - 퇴사: 로그인하면 "퇴사 처리된 계정은 로그인할 수 없습니다" 문구가 보이고 로그인 화면에 머물러야 한다.
 *
 * 결과: e2e-report/ui-results.json, e2e-report/shots/*.png
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const outDir = path.join(root, "e2e-report");
const shotDir = path.join(outDir, "shots");
fs.mkdirSync(shotDir, { recursive: true });

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const env = { ...loadEnv(path.join(root, ".env.e2e.local")), ...process.env };
const BASE = (env.ERP_TEST_BASE_URL || "https://totalmanagement.vercel.app").replace(/\/+$/, "");

const STAFF_VIEWS = ["dashboard", "tasks", "workLog", "attendance", "leave", "projects", "settlement", "manuals", "documentRoom", "taskTemplates", "organization", "partners", "corporateCard", "meetingRooms", "equipment", "vehicles", "bugReports"];
const ADMIN_VIEWS = [...STAFF_VIEWS, "attendanceAdmin", "leaveAdmin", "workLogAdmin", "resourceOverview"];
const PLAN = [
  { key: "ADMIN", views: ADMIN_VIEWS, expect: "staff" },
  { key: "LEADER", views: STAFF_VIEWS, expect: "staff" },
  { key: "MEMBER", views: STAFF_VIEWS, expect: "staff" },
  { key: "PENDING", views: ["dashboard", "projects", "settlement"], expect: "pending" },
  { key: "RETIRED", views: ["dashboard", "projects", "settlement"], expect: "retired" },
];
const ERROR_TEXT = /불러오지 못|불러올 수 없|오류가 발생|Something went wrong|Application error|Internal Server Error/;
const GATE_TEXT = /출근하기|근무 상태 확인 중/;
const PENDING_TEXT = /승인 대기 중/;
const RETIRED_TEXT = /퇴사 처리된 계정은 로그인할 수 없습니다/;
// 화면을 옮길 때 끊긴 요청이 남기는 콘솔 오류는 무시한다
const IGNORED_CONSOLE = /status of 40[13]|Failed to fetch|NetworkError|aborted/i;

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const emailBox = page.locator('input[type="email"]');
  const pwBox = page.locator('input[type="password"]');
  // 화면 준비(하이드레이션) 전에 누르면 폼이 기본 제출로 비워진다 → 값이 남아 있는지 확인하고 최대 3번 시도한다
  for (let attempt = 1; attempt <= 3; attempt++) {
    await emailBox.fill(email);
    await pwBox.fill(password);
    await page.waitForTimeout(500);
    if ((await emailBox.inputValue()) !== email) continue;
    await page.click('button[type="submit"]');
    const outcome = await Promise.race([
      page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }).then(() => "left-login"),
      page.getByText(PENDING_TEXT).first().waitFor({ timeout: 20000 }).then(() => "pending-notice"),
      page.getByText(RETIRED_TEXT).first().waitFor({ timeout: 20000 }).then(() => "retired-error"),
      page.waitForTimeout(20000).then(() => "timeout"),
    ]).catch(() => "error");
    if (outcome !== "timeout" && outcome !== "error") return { outcome, attempt };
    if ((await emailBox.count()) && (await emailBox.inputValue()) === "") continue; // 폼이 비워졌으면 재시도
    return { outcome, attempt };
  }
  return { outcome: "form-reset", attempt: 3 };
}

const results = [];
const browser = await chromium.launch({ headless: true });

for (const step of PLAN) {
  const email = env[`ERP_TEST_${step.key}_EMAIL`];
  const password = env[`ERP_TEST_${step.key}_PASSWORD`];
  if (!email || !password) {
    results.push({ account: step.key, skipped: "계정 정보 없음" });
    continue;
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ko-KR" });
  const page = await context.newPage();
  let current = "login";
  const issues = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !IGNORED_CONSOLE.test(msg.text())) issues.push({ view: current, kind: "console", detail: msg.text().slice(0, 300) });
  });
  page.on("pageerror", (err) => issues.push({ view: current, kind: "pageerror", detail: String(err).slice(0, 300) }));
  page.on("response", (res) => {
    const u = res.url();
    if (!u.startsWith(BASE) || !u.includes("/api/")) return;
    const s = res.status();
    if (s >= 500) issues.push({ view: current, kind: "5xx", detail: `${s} ${res.request().method()} ${u.replace(BASE, "")}` });
    else if (step.expect === "staff" && (s === 401 || s === 403)) issues.push({ view: current, kind: `${s}`, detail: `${res.request().method()} ${u.replace(BASE, "")}` });
  });

  const record = { account: step.key, email, login: null, views: [], issues };
  try {
    const res = await login(page, email, password);
    await page.waitForTimeout(2500);
    const text = await page.locator("body").innerText();
    record.login = { ...res, url: page.url().replace(BASE, ""), text: text.slice(0, 200).replace(/\s+/g, " ") };
    const expected = { staff: "left-login", pending: "pending-notice", retired: "retired-error" }[step.expect];
    record.login.ok = res.outcome === expected;
    await page.screenshot({ path: path.join(shotDir, `${step.key}-00-after-login.png`) });
  } catch (e) {
    record.login = { ok: false, error: String(e).slice(0, 300) };
  }

  for (const view of step.views) {
    current = view;
    const v = { view, ok: true, notes: [] };
    if (!record.login?.ok) {
      v.ok = false;
      v.notes.push("로그인 결과가 기대와 달라 건너뜀");
      record.views.push(v);
      continue;
    }
    try {
      await page.goto(`${BASE}/?view=${view}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => v.notes.push("networkidle 20초 초과"));
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      v.url = page.url().replace(BASE, "");
      if (step.expect === "staff") {
        if (/\/login/.test(v.url)) { v.ok = false; v.notes.push("로그인 화면으로 튕김"); }
        if (GATE_TEXT.test(text)) { v.ok = false; v.notes.push("출근 화면에 막힘(근무 상태 확인)"); }
        if (!/대시보드/.test(text)) { v.ok = false; v.notes.push("사이드바가 보이지 않음"); }
        const m = text.match(ERROR_TEXT);
        if (m) { v.ok = false; v.notes.push(`오류 문구: "${m[0]}"`); }
        if (/로딩 중/.test(text) && text.length < 300) { v.ok = false; v.notes.push("로딩에서 멈춤"); }
      } else {
        const blocked = PENDING_TEXT.test(text) || RETIRED_TEXT.test(text) || /\/login/.test(v.url);
        if (!blocked) { v.ok = false; v.notes.push("차단 안내·로그인 화면이 아님"); }
        if (/대시보드/.test(text) && /프로젝트 관리|정산 관리/.test(text)) { v.ok = false; v.notes.push("메뉴가 보임"); }
      }
      v.textHead = text.slice(0, 200).replace(/\s+/g, " ");
      await page.screenshot({ path: path.join(shotDir, `${step.key}-${view}.png`) });
    } catch (e) {
      v.ok = false;
      v.notes.push(String(e).slice(0, 200));
    }
    const viewIssues = issues.filter((i) => i.view === view);
    if (viewIssues.some((i) => ["5xx", "pageerror", "401", "403"].includes(i.kind))) {
      v.ok = false;
      v.notes.push("요청 오류(아래 목록)");
    }
    record.views.push(v);
  }
  results.push(record);
  await context.close();
}
await browser.close();

fs.writeFileSync(path.join(outDir, "ui-results.json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
const fails = results.flatMap((r) => [
  ...(r.login && !r.login.ok ? [`${r.account}/로그인: ${r.login.outcome ?? r.login.error}`] : []),
  ...(r.views || []).filter((v) => !v.ok && r.login?.ok).map((v) => `${r.account}/${v.view}: ${v.notes.join("; ")}`),
]);
console.log(`[e2e:ui] 화면 ${results.reduce((n, r) => n + (r.views?.length || 0), 0)}개 확인, 실패 ${fails.length}개`);
for (const f of fails) console.log("  ✗ " + f);
process.exitCode = fails.length ? 1 : 0;
