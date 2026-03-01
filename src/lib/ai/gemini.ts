import { GoogleGenerativeAI } from '@google/generative-ai';

const AI_ALLOWED_EMAIL = 'tommy0621@naver.com';

export function isAllowedEmail(email: string | undefined): boolean {
  return email === AI_ALLOWED_EMAIL;
}

/**
 * 기본 모델. ListModels 응답에서 generateContent 지원하는 모델 중 선택.
 * 사용 가능 예: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash, gemini-flash-latest
 * .env에서 GEMINI_MODEL 로 덮어쓸 수 있음. (models/ 접두사 없이 이름만)
 */
const DEFAULT_MODEL = 'gemini-2.5-flash';

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return genAI.getGenerativeModel({ model });
}

export async function generateContent(prompt: string): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return text ?? '';
}

export type ChatMessage = { role: 'user' | 'model'; content: string };

/**
 * 대화 기록(맥락)을 포함해 멀티턴 응답 생성.
 * contents 배열로 이전 대화 + 새 사용자 메시지를 전달해 맥락을 유지합니다.
 */
export async function generateContentWithHistory(
  messages: ChatMessage[]
): Promise<string> {
  if (messages.length === 0) return '';
  const model = getGeminiModel();
  const contents = messages.map((m) => ({
    role: m.role as 'user' | 'model',
    parts: [{ text: m.content }],
  }));
  const result = await model.generateContent({ contents });
  const response = result.response;
  const text = response.text();
  return text ?? '';
}
