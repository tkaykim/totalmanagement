// Supabase Edge Function: FCM HTTP v1로 푸시 알림 전송
// 시크릿 (둘 중 하나 사용):
//   방법 A) FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY 각각 설정
//   방법 B) FIREBASE_SERVICE_ACCOUNT_JSON (서비스 계정 JSON 전체)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as jose from "npm:jose@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceAccount {
  type?: string;
  project_id: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
}

/** 시크릿에서 Firebase 인증 정보 로드. 개별 3개 시크릿 우선, 없으면 JSON 사용 */
function getFirebaseCreds(): ServiceAccount {
  const projectId = (Deno.env.get("FIREBASE_PROJECT_ID") ?? "").trim();
  const clientEmail = (Deno.env.get("FIREBASE_CLIENT_EMAIL") ?? "").trim();
  let privateKey = (Deno.env.get("FIREBASE_PRIVATE_KEY") ?? "").trim();
  // 앞뒤 따옴표 제거 (실수로 "..." 붙여 넣은 경우)
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  if (projectId && clientEmail && privateKey) {
    return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
  }
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!raw) {
    throw new Error(
      "Set either (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) or FIREBASE_SERVICE_ACCOUNT_JSON in Edge Function Secrets"
    );
  }
  return JSON.parse(raw) as ServiceAccount;
}

interface SendPushBody {
  user_id?: string;
  token?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  image?: string;
}

async function getGoogleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  // PEM: JSON/환경변수에서 \n이 literal(백슬래시+n)으로 들어오는 경우 실제 줄바꿈으로 변환
  const privateKeyPem = sa.private_key
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();
  const key = await jose.importPKCS8(privateKeyPem, "RS256");
  const jwt = await new jose.SignJWT({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function sendFcm(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  payload: { title: string; body: string; data?: Record<string, string>; image?: string }
): Promise<{ success: boolean; error?: string }> {
  const message: Record<string, unknown> = {
    token: fcmToken,
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.image ? { image: payload.image } : {}),
    },
    data: payload.data ?? {},
    android: {
      priority: "high",
      notification: { channel_id: "default", sound: "default" },
    },
    apns: {
      payload: { aps: { sound: "default", badge: 1 } },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `${res.status}: ${text}` };
  }
  return { success: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const sa = getFirebaseCreds();
    const body = (await req.json()) as SendPushBody;

    if (!body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: "title and body are required", sent: 0, total: 0, results: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let tokens: string[] = [];

    if (body.token) {
      tokens = [body.token];
    } else if (body.user_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data, error } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("user_id", body.user_id)
        .eq("is_active", true);
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message, sent: 0, total: 0, results: [] }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      tokens = (data ?? []).map((r) => r.token);
    } else {
      return new Response(
        JSON.stringify({
          error: "Either user_id or token is required",
          sent: 0,
          total: 0,
          results: [],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, total: 0, results: [], message: "No tokens found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getGoogleAccessToken(sa);
    const payload = {
      title: body.title,
      body: body.body,
      data: body.data ?? {},
      image: body.image,
    };

    const results = await Promise.all(
      tokens.map((token) => sendFcm(accessToken, sa.project_id, token, payload))
    );
    const sent = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        sent,
        total: tokens.length,
        results: results.map((r) => (r.success ? { success: true } : { success: false, error: r.error })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: message, sent: 0, total: 0, results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
