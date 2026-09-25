#!/usr/bin/env node
/**
 * ERP E2E 한 번에 실행: `npm run e2e:all`
 *
 * 1. 테스트 계정 준비(setup-accounts.mjs) → .env.e2e.local
 * 2. API 권한 회귀(`npm run test:api`, 운영 주소, [E2E] 데이터 규칙은 tests/api/README.md)
 * 3. 화면 E2E(ui-e2e.mjs)
 * 4. 테스트 계정 퇴사 처리(--keep-accounts면 건너뜀)
 * 5. 보고서 e2e-report/report.md (+ vitest.json, ui-results.json, shots/)
 *
 * e2e-report/와 .env.e2e.local은 커밋하지 않는다(.gitignore).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const outDir = path.join(root, "e2e-report");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const keep = process.argv.includes("--keep-accounts");

function run(label, cmd, args, extraEnv = {}) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, ...extraEnv } });
  return r.status ?? 1;
}
function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const steps = [];
const setup = run("1. 테스트 계정 준비", "node", ["scripts/e2e/setup-accounts.mjs"]);
steps.push(["테스트 계정 준비", setup]);
if (setup !== 0) {
  console.error("계정 준비 실패. 중단합니다.");
  process.exit(1);
}
const e2eEnv = loadEnv(path.join(root, ".env.e2e.local"));

const api = run("2. API 권한 회귀 (npm run test:api)", "npx",
  ["vitest", "run", "--config", "vitest.api.config.ts", "--reporter=default", "--reporter=json", `--outputFile.json=${path.join("e2e-report", "vitest.json")}`], e2eEnv);
steps.push(["API 권한 회귀", api]);

const ui = run("3. 화면 E2E", "node", ["scripts/e2e/ui-e2e.mjs"], e2eEnv);
steps.push(["화면 E2E", ui]);

if (!keep) {
  const retire = run("4. 테스트 계정 퇴사 처리", "node", ["scripts/e2e/setup-accounts.mjs", "--retire"]);
  steps.push(["테스트 계정 퇴사 처리", retire]);
}

// ---- 보고서
const lines = [`# ERP E2E 결과 (${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })})`, "", `대상: ${e2eEnv.ERP_TEST_BASE_URL}`, ""];
lines.push("| 단계 | 결과 |", "|---|---|");
for (const [name, code] of steps) lines.push(`| ${name} | ${code === 0 ? "통과" : "실패"} |`);
lines.push("");
try {
  const v = JSON.parse(fs.readFileSync(path.join(outDir, "vitest.json"), "utf8"));
  lines.push(`## API 테스트: 통과 ${v.numPassedTests} · 실패 ${v.numFailedTests} · 건너뜀 ${v.numPendingTests}`, "");
  for (const file of v.testResults || []) {
    for (const t of file.assertionResults || []) {
      if (t.status === "failed") lines.push(`- ✗ ${path.basename(file.name)} › ${t.title}`, "  ```", "  " + (t.failureMessages || []).join("\n").split("\n").slice(0, 6).join("\n  "), "  ```");
    }
  }
  lines.push("");
} catch {
  lines.push("## API 테스트: 결과 파일 없음", "");
}
try {
  const u = JSON.parse(fs.readFileSync(path.join(outDir, "ui-results.json"), "utf8"));
  lines.push("## 화면 E2E", "");
  for (const r of u.results) {
    if (r.skipped) { lines.push(`### ${r.account}: 건너뜀(${r.skipped})`, ""); continue; }
    const bad = r.views.filter((x) => !x.ok);
    lines.push(`### ${r.account} — 로그인 ${r.login?.ok ? "정상" : "실패"}(${r.login?.outcome ?? r.login?.error ?? ""}, 시도 ${r.login?.attempt ?? "-"}) · 화면 ${r.views.length}개 중 실패 ${bad.length}`, `로그인 직후 화면: ${r.login?.url ?? ""} — ${r.login?.text ?? ""}`);
    for (const x of bad) lines.push(`- ✗ ${x.view}: ${x.notes.join("; ")}`);
    const iss = r.issues.filter((i) => i.kind !== "console");
    for (const i of iss.slice(0, 30)) lines.push(`  - [${i.view}] ${i.kind} ${i.detail}`);
    const con = r.issues.filter((i) => i.kind === "console");
    if (con.length) lines.push(`  - 콘솔 오류 ${con.length}건(예: ${con[0].detail.slice(0, 120)})`);
    lines.push("");
  }
} catch {
  lines.push("## 화면 E2E: 결과 파일 없음", "");
}
fs.writeFileSync(path.join(outDir, "report.md"), lines.join("\n"));
console.log(`\n보고서: ${path.join(outDir, "report.md")}`);
process.exit(steps.every(([, c]) => c === 0) ? 0 : 1);
