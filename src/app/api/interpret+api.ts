// AI 深度解讀 API Route（Expo Router）
//
// 這個檔案只有在 app.json 的 web.output 設為 "server" 時才會被匯出。
// 目前是 "static"，實際運作的是根目錄的 api/interpret.ts（Vercel function）。
// 兩者共用 aiPrompt.ts 的邏輯，保留此檔是為了原生端或日後改用
// EAS Hosting 時不必重寫。
//
// 環境變數：
//   DEEPSEEK_API_KEY   DeepSeek API 金鑰（必要）
//   DEEPSEEK_BASE_URL  預設 https://api.deepseek.com/v1

import { requestInterpretation, type InterpretRequestBody } from '@/services/aiPrompt';

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: 'AI_NOT_CONFIGURED',
        message: '後端尚未設定 AI API 金鑰。請設定 DEEPSEEK_API_KEY 環境變數。',
        fallback: true,
      },
      { status: 501 },
    );
  }

  let body: InterpretRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'INVALID_JSON', message: '請求格式不正確。' },
      { status: 400 },
    );
  }

  if (!body?.poem?.title) {
    return Response.json(
      { error: 'MISSING_POEM', message: '缺少籤詩資料。' },
      { status: 400 },
    );
  }

  const outcome = await requestInterpretation(body, {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL,
  });

  if (!outcome.ok) {
    return Response.json(
      { error: outcome.error, message: outcome.message },
      { status: outcome.status },
    );
  }

  return Response.json({ interpretation: outcome.interpretation });
}
