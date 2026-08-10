// api/interpret.ts 測試（Vercel Serverless Function）
//
// 這個端點實際部署在 Vercel 上，本機跑不起來，因此在此直接呼叫
// 匯出的 handler 驗證各種請求的處理。模型呼叫本身由 aiPrompt.test.ts 覆蓋。

import { POST, GET } from '../../api/interpret';

const validBody = {
  poem: {
    title: '龍騰九霄',
    content: '乾元亨利御中軍，',
    level: '大吉',
    hexagramName: '乾為天',
    vernacular: '此籤大吉。',
  },
};

/** 組出一個 POST Request */
function post(body: unknown | string): Request {
  return new Request('https://example.test/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const ORIGINAL_KEY = process.env.DEEPSEEK_API_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.DEEPSEEK_API_KEY;
  else process.env.DEEPSEEK_API_KEY = ORIGINAL_KEY;
  jest.restoreAllMocks();
  delete (global as any).fetch;
});

describe('未設定金鑰', () => {
  beforeEach(() => { delete process.env.DEEPSEEK_API_KEY; });

  /** 前端靠這個 501 判斷「尚未啟用」，並保留規則式解讀 */
  test('回傳 501 並標記 fallback', async () => {
    const res = await POST(post(validBody));
    expect(res.status).toBe(501);

    const data = await res.json();
    expect(data.error).toBe('AI_NOT_CONFIGURED');
    expect(data.fallback).toBe(true);
  });

  test('未設金鑰時不會呼叫外部服務', async () => {
    (global as any).fetch = jest.fn();
    await POST(post(validBody));
    expect((global as any).fetch).not.toHaveBeenCalled();
  });
});

describe('請求驗證', () => {
  beforeEach(() => { process.env.DEEPSEEK_API_KEY = 'test-key'; });

  test('非 JSON 內容回傳 400', async () => {
    const res = await POST(post('這不是 JSON'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_JSON');
  });

  test('缺少籤詩資料回傳 400', async () => {
    const res = await POST(post({ question: '只有問題沒有籤詩' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('MISSING_POEM');
  });

  test('過大的請求回傳 413', async () => {
    const huge = { poem: { ...validBody.poem, vernacular: 'x'.repeat(20_000) } };
    const res = await POST(post(huge));
    expect(res.status).toBe(413);
  });

  test('驗證失敗時不會呼叫外部服務', async () => {
    (global as any).fetch = jest.fn();
    await POST(post({ nope: true }));
    expect((global as any).fetch).not.toHaveBeenCalled();
  });
});

describe('正常流程', () => {
  beforeEach(() => { process.env.DEEPSEEK_API_KEY = 'test-key'; });

  test('成功時回傳 interpretation', async () => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: '龍德在天。' } }] }),
    }));

    const res = await POST(post(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).interpretation).toBe('龍德在天。');
  });

  test('上游失敗時轉為 502', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (global as any).fetch = jest.fn(async () => ({
      ok: false, status: 429, text: async () => 'rate limited',
    }));

    const res = await POST(post(validBody));
    expect(res.status).toBe(502);
  });

  /** 金鑰只存在伺服器端，任何情況都不該出現在回應中 */
  test('回應不含金鑰', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (global as any).fetch = jest.fn(async () => ({
      ok: false, status: 500, text: async () => 'error with key test-key inside',
    }));

    const res = await POST(post(validBody));
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('test-key');
  });
});

describe('方法限制', () => {
  test('GET 回傳 405', async () => {
    const res = GET();
    expect(res.status).toBe(405);
    expect((await res.json()).error).toBe('METHOD_NOT_ALLOWED');
  });
});
