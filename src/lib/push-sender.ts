import { getMessaging, isFirebaseAdminReady } from '@/lib/firebase-admin';
import { createPureClient } from '@/lib/supabase/server';
import type { MulticastMessage } from 'firebase-admin/messaging';

/**
 * FCM Push 알림 전송 모듈
 * 
 * DB에 저장된 사용자의 FCM 토큰을 조회하고,
 * Firebase Cloud Messaging을 통해 실제 디바이스에 Push 알림을 전송합니다.
 */

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface PushResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors?: string[];
}

/** 배포(Vercel)에 Firebase env가 없을 때 Supabase Edge Function send-push로 발송 */
async function sendPushViaEdgeFunction(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { success: false, successCount: 0, failureCount: 0, errors: ['Supabase URL or service key missing'] };
  }
  try {
    const res = await fetch(`${url}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        image: payload.imageUrl,
      }),
    });
    const data = (await res.json()) as { sent?: number; total?: number; error?: string; message?: string };
    if (!res.ok) {
      return {
        success: false,
        successCount: 0,
        failureCount: 1,
        errors: [data.error ?? res.statusText],
      };
    }
    const sent = data.sent ?? 0;
    const total = data.total ?? 0;
    const noDelivery = sent === 0 && total === 0;
    return {
      success: sent > 0,
      successCount: sent,
      failureCount: total - sent,
      ...(noDelivery ? { errors: [data.message || data.error || '푸시가 전달되지 않았습니다 (등록된 기기 없음 또는 설정 확인)'] } : {}),
    };
  } catch (e) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      errors: [e instanceof Error ? e.message : String(e)],
    };
  }
}

/**
 * 특정 사용자에게 Push 알림 전송
 * Firebase Admin 미설정 시(배포 환경) Supabase Edge Function send-push로 대체 발송
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  if (isFirebaseAdminReady()) {
    try {
      const tokens = await getUserPushTokens(userId);
      if (tokens.length === 0) {
        console.log(`[Push] 사용자 ${userId}에 등록된 토큰이 없습니다.`);
        return { success: true, successCount: 0, failureCount: 0 };
      }
      return await sendPushToTokens(tokens, payload, userId);
    } catch (error) {
      console.error(`[Push] 사용자 ${userId}에게 전송 실패:`, error);
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }
  console.log('[Push] Firebase 미설정 → Supabase Edge Function(send-push)으로 발송');
  return sendPushViaEdgeFunction(userId, payload);
}

/**
 * 여러 사용자에게 Push 알림 전송
 * Firebase Admin 미설정 시 Supabase Edge Function으로 사용자별 발송
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<PushResult> {
  if (userIds.length === 0) {
    return { success: true, successCount: 0, failureCount: 0 };
  }

  if (isFirebaseAdminReady()) {
    try {
      const tokens = await getMultipleUserPushTokens(userIds);
      if (tokens.length === 0) {
        console.log('[Push] 전송 대상에 등록된 토큰이 없습니다.');
        return { success: true, successCount: 0, failureCount: 0 };
      }
      return await sendPushToTokens(tokens, payload);
    } catch (error) {
      console.error('[Push] 다중 사용자 전송 실패:', error);
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  console.log('[Push] Firebase 미설정 → Supabase Edge Function(send-push)으로 사용자별 발송');
  let totalSent = 0;
  let totalFailure = 0;
  const errors: string[] = [];
  for (const uid of userIds) {
    const r = await sendPushViaEdgeFunction(uid, payload);
    totalSent += r.successCount;
    totalFailure += r.failureCount;
    if (r.errors?.length) errors.push(...r.errors);
  }
  return {
    success: totalSent > 0,
    successCount: totalSent,
    failureCount: totalFailure,
    ...(errors.length ? { errors } : {}),
  };
}

/**
 * FCM 토큰 배열로 직접 Push 전송
 * 500개 단위로 배치 처리 (FCM 제한)
 */
async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload,
  userId?: string
): Promise<PushResult> {
  const messaging = getMessaging();
  const batchSize = 500;
  let totalSuccess = 0;
  let totalFailure = 0;
  const allErrors: string[] = [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);

    const message: MulticastMessage = {
      tokens: batch,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
      },
      data: payload.data ?? {},
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'default',
          sound: 'default',
          priority: 'high' as const,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
            contentAvailable: true,
          },
        },
      },
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      // 실패한 토큰 처리
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code;

          // 유효하지 않은 토큰은 비활성화 대상
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(batch[idx]);
          }

          allErrors.push(`Token[${i + idx}]: ${errorCode} - ${resp.error.message}`);
        }
      });
    } catch (error) {
      totalFailure += batch.length;
      allErrors.push(
        `Batch[${i}]: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // 유효하지 않은 토큰 비활성화 (비동기, 실패해도 무시)
  if (invalidTokens.length > 0) {
    deactivateInvalidTokens(invalidTokens).catch((err) =>
      console.error('[Push] 무효 토큰 비활성화 실패:', err)
    );
  }

  const result: PushResult = {
    success: totalSuccess > 0 || totalFailure === 0,
    successCount: totalSuccess,
    failureCount: totalFailure,
    ...(allErrors.length > 0 ? { errors: allErrors } : {}),
  };

  console.log(
    `[Push] 전송 완료 - 성공: ${totalSuccess}, 실패: ${totalFailure}`,
    userId ? `(사용자: ${userId})` : ''
  );

  return result;
}

/**
 * 특정 사용자의 활성 Push 토큰 조회
 */
async function getUserPushTokens(userId: string): Promise<string[]> {
  const supabase = await createPureClient();

  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('[Push] 토큰 조회 실패:', error);
    return [];
  }

  return data?.map((row) => row.token) ?? [];
}

/**
 * 여러 사용자의 활성 Push 토큰 일괄 조회
 */
async function getMultipleUserPushTokens(userIds: string[]): Promise<string[]> {
  const supabase = await createPureClient();

  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (error) {
    console.error('[Push] 다중 토큰 조회 실패:', error);
    return [];
  }

  return data?.map((row) => row.token) ?? [];
}

/**
 * 유효하지 않은 토큰 비활성화
 * FCM에서 invalid/unregistered로 응답한 토큰을 DB에서 비활성화
 */
async function deactivateInvalidTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;

  const supabase = await createPureClient();

  const { error } = await supabase
    .from('push_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in('token', tokens);

  if (error) {
    console.error('[Push] 무효 토큰 비활성화 실패:', error);
  } else {
    console.log(`[Push] ${tokens.length}개 무효 토큰 비활성화 완료`);
  }
}
