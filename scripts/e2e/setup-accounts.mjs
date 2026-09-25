#!/usr/bin/env node
/**
 * ERP E2E 테스트 계정 준비 (멱등).
 *
 * - `.env.local`의 NEXT_PUBLIC_SUPABASE_URL·NEXT_PUBLIC_SUPABASE_ANON_KEY·SUPABASE_SERVICE_ROLE_KEY를 읽는다.
 * - 계정 5개(`tests/api/README.md` 규칙): 관리자(HEAD)·FLOW 리더·REACT 멤버·승인 대기·퇴사.
 * - 이메일은 `e2e-` 접두. 비밀번호는 실행할 때마다 새로 만들어 `.env.e2e.local`에만 쓴다(.gitignore의 `.env*`).
 * - 이미 있으면 비밀번호·역할·사업부·상태만 맞춘다. 다른 계정은 건드리지 않는다.
 * - `--retire`: 끝난 뒤 테스트 계정 전부를 퇴사(retired)로 돌린다.
 *
 * 저장소가 공개이므로 이 파일에 실제 키·비밀번호를 적지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = { ...loadEnv(path.join(root, ".env.local")), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) {
  console.error("[e2e] .env.local에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  process.exit(1);
}

const DOMAIN = env.ERP_E2E_EMAIL_DOMAIN || "example.com"; // 실제로 메일이 가지 않는 예약 도메인
export const ACCOUNTS = [
  { key: "ADMIN", email: `e2e-admin@${DOMAIN}`, name: "[E2E] 관리자", role: "admin", bu_code: "HEAD", status: "active" },
  { key: "LEADER", email: `e2e-leader@${DOMAIN}`, name: "[E2E] FLOW 리더", role: "leader", bu_code: "FLOW", status: "active" },
  { key: "MEMBER", email: `e2e-member@${DOMAIN}`, name: "[E2E] REACT 멤버", role: "member", bu_code: "REACT", status: "active" },
  { key: "PENDING", email: `e2e-pending@${DOMAIN}`, name: "[E2E] 승인 대기", role: "member", bu_code: null, status: "pending" },
  { key: "RETIRED", email: `e2e-retired@${DOMAIN}`, name: "[E2E] 퇴사", role: "member", bu_code: "REACT", status: "retired" },
];

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

async function findAuthUser(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function retireAll() {
  for (const a of ACCOUNTS) {
    const { error } = await admin.from("app_users").update({ status: "retired" }).eq("email", a.email);
    if (error) throw error;
  }
  console.log("[e2e] 테스트 계정 5개를 퇴사(retired)로 돌렸습니다.");
}

async function setup() {
  const lines = [
    "# ERP E2E 테스트 계정 (scripts/e2e/setup-accounts.mjs가 생성). 커밋 금지.",
    `ERP_TEST_BASE_URL=${env.ERP_TEST_BASE_URL || "https://totalmanagement.vercel.app"}`,
    `ERP_TEST_SUPABASE_URL=${url}`,
    `ERP_TEST_SUPABASE_ANON_KEY=${anon}`,
    `ERP_TEST_AUDIT_V2=${env.ERP_TEST_AUDIT_V2 || "1"}`,
  ];
  for (const a of ACCOUNTS) {
    const password = "E2e!" + crypto.randomBytes(18).toString("base64url");
    let user = await findAuthUser(a.email);
    if (user) {
      const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
      if (error) throw error;
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email: a.email, password, email_confirm: true });
      if (error) throw error;
      user = data.user;
    }
    const row = {
      id: user.id,
      email: a.email,
      name: a.name,
      role: a.role,
      bu_code: a.bu_code,
      status: a.status,
      requested_bu_code: a.status === "pending" ? "REACT" : null,
      signup_requested_at: a.status === "pending" ? new Date().toISOString() : null,
    };
    const { error: upErr } = await admin.from("app_users").upsert(row, { onConflict: "id" });
    if (upErr) throw upErr;
    lines.push(`ERP_TEST_${a.key}_EMAIL=${a.email}`, `ERP_TEST_${a.key}_PASSWORD=${password}`);
    console.log(`[e2e] ${a.key.padEnd(7)} ${a.email} → ${a.role}/${a.bu_code ?? "-"}/${a.status}`);
  }
  fs.writeFileSync(path.join(root, ".env.e2e.local"), lines.join("\n") + "\n");
  console.log("[e2e] 접속 정보를 .env.e2e.local에 저장했습니다(커밋되지 않음).");
}

if (process.argv.includes("--retire")) await retireAll();
else await setup();
