// AI 深度解讀端點（Vercel Serverless Function）
//
// 放在專案根目錄的 api/ 下，Vercel 會自動偵測並部署為 serverless function，
// 與 Expo 的靜態網站產出（dist/）並存——不需要把 web.output 改成 "server"，
// 也就不必更換託管平台。
//
// 實際邏輯集中在 ../src/services/aiPrompt.ts，與 Expo Router 版本共用。
// 此處刻意用相對路徑而非 `@/` 別名：Vercel 的 TypeScript 支援不處理
// path mappings。
//
// 部署前需在 Vercel 專案設定中加入環境變數：
//   DEEPSEEK_API_KEY   （必要）
//   DEEPSEEK_BASE_URL  （選填，預設 https://api.deepseek.com/v1）

import { requestInterpretation, type InterpretRequestBody } from '../src/services/aiPrompt';
import { byteLength, createRateLimiter } from '../src/services/rateLimit';

/** 允許的請求來源大小上限，避免被塞入過大的 payload */
const MAX_BODY_BYTES = 16 * 1024;

// 不 export：Vercel 依 route 檔的具名匯出決定 HTTP 方法處理器，
// 多匯出一個非方法名是自找麻煩。測試改以不同的 x-forwarded-for 隔離。
const limited = createRateLimiter({ max: 12, windowMs: 60_000 });

export async function POST(request: Request): Promise<Response> {
  if (limited(request)) {
    return Response.json({ error: 'RATE_LIMITED', message: '請稍後再試。' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
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
    const raw = await request.text();
    if (byteLength(raw) > MAX_BODY_BYTES) {
      return Response.json(
        { error: 'PAYLOAD_TOO_LARGE', message: '請求內容過大。' },
        { status: 413 },
      );
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: 'INVALID_JSON', message: '請求格式不正確。' },
      { status: 400 },
    );
  }

  if (!body?.poem?.title || !body.poem.content || !body.poem.vernacular) {
    return Response.json(
      { error: 'MISSING_POEM', message: '缺少籤詩資料。' },
      { status: 400 },
    );
  }

  // 防止單一欄位將模型 context 與費用放大；整體大小已在上方限制。
  if ([body.question, body.questionCategory, body.poem.title, body.poem.content, body.poem.vernacular].some(v => typeof v === 'string' && v.length > 4_000)) {
    return Response.json({ error: 'FIELD_TOO_LARGE', message: '請求欄位過長。' }, { status: 413 });
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

/** 非 POST 一律拒絕，避免端點被當成一般頁面抓取 */
export function GET(): Response {
  return Response.json(
    { error: 'METHOD_NOT_ALLOWED', message: '請以 POST 呼叫此端點。' },
    { status: 405 },
  );
}
