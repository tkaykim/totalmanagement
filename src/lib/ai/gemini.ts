'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const AI_ALLOWED_EMAIL = 'tommy0621@naver.com';

export function isAllowedEmail(email: string | undefined): boolean {
  return email === AI_ALLOWED_EMAIL;
}

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

export async function generateContent(prompt: string): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return text ?? '';
}
