#!/usr/bin/env node
/**
 * ERP 화면 E2E (Playwright, 읽기 위주).
 *
 * `.env.e2e.local`(setup-accounts.mjs가 만든 파일)의 계정으로 로그인 화면에서 직접 로그인하고,
 * 역할별로 메뉴 화면(`/?view=...`)을 차례로 연다.
 * 각 화면에서 모으는 것: 콘솔 오류, 페이지 예외, 5xx 응답, 재직 계정의 401·403 응답, "불러오지 못/없습니다" 문구, 스크린샷.
 * 화면에서 데이터를 만들거나 바꾸는 버튼은 누르지 않는다(쓰기 검증은 `npm run test:api`가 [E2E] 데이터로만 한다).
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
  { key: "PENDING", views: ["dashboard", "projects", "settlement"], expect: "blocked" },
  { key: "RETIRED", views: ["dashboard", "projects", "settlement"], expect: "blocked" },
];
const ERROR_TEXT = /불러오지 못|불러올 수 없|오류가 발생|Something went wrong|Application error|Internal Server Error/;
const BLOCKED_TEXT = /승인 대기|승인을 기다|관리자 승인|거절|퇴사|이용할 수 없|권한이 없/;

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
    if (msg.type() === "error" && !/status of 40[13]/.test(msg.text())) issues.push({ view: current, kind: "console", detail: msg.text().slice(0, 300) });
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
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    const text = await page.locator("body").innerText();
    record.login = { url: page.url().replace(BASE, ""), text: text.slice(0, 200) };
    await page.screenshot({ path: path.join(shotDir, `${step.key}-00-after-login.png`) });
  } catch (e) {
    record.login = { error: String(e).slice(0, 300) };
  }

  for (const view of step.views) {
    current = view;
    const v = { view, ok: true, notes: [] };
    try {
      await page.goto(`${BASE}/?view=${view}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => v.notes.push("networkidle 15초 초과"));
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      v.url = page.url().replace(BASE, "");
      if (step.expect === "staff") {
        if (/\/login/.test(v.url)) { v.ok = false; v.notes.push("로그인 화면으로 튕김"); }
        const m = text.match(ERROR_TEXT);
        if (m) { v.ok = false; v.notes.push(`오류 문구: "${m[0]}"`); }
        if (/로딩 중/.test(text) && text.length < 300) { v.ok = false; v.notes.push("로딩에서 멈춤"); }
      } else {
        const blocked = BLOCKED_TEXT.test(text) || /\/login/.test(v.url);
        if (!blocked) { v.ok = false; v.notes.push("차단 안내가 보이지 않음"); }
        if (/₩|원\s*$|매출|지출/.test(text) && step.expect === "blocked" && !BLOCKED_TEXT.test(text)) v.notes.push("재무 단어가 보임(확인 필요)");
      }
      v.textHead = text.slice(0, 160).replace(/\s+/g, " ");
      await page.screenshot({ path: path.join(shotDir, `${step.key}-${view}.png`) });
    } catch (e) {
      v.ok = false;
      v.notes.push(String(e).slice(0, 200));
    }
    const viewIssues = issues.filter((i) => i.view === view);
    if (viewIssues.some((i) => i.kind === "5xx" || i.kind === "pageerror" || i.kind === "401" || i.kind === "403")) v.ok = false;
    record.views.push(v);
  }
  results.push(record);
  await context.close();
}
await browser.close();

fs.writeFileSync(path.join(outDir, "ui-results.json"), JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
const fails = results.flatMap((r) => (r.views || []).filter((v) => !v.ok).map((v) => `${r.account}/${v.view}: ${v.notes.join("; ")}`));
console.log(`[e2e:ui] 화면 ${results.reduce((n, r) => n + (r.views?.length || 0), 0)}개 확인, 실패 ${fails.length}개`);
for (const f of fails) console.log("  ✗ " + f);
process.exitCode = fails.length ? 1 : 0;
