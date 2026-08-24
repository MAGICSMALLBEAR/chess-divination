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

// 限流器是模組層狀態，跨測試累積。所有測試共用同一個來源的話，
// 這個檔案只要再多幾個 POST 就會撞到 12 次／分鐘的上限而集體轉紅，
// 且失敗原因看起來與被測行為毫不相干。每次呼叫給不同來源即互相隔離。
let clientSeq = 0;

/** 組出一個 POST Request；同一來源請明確指定 ip */
function post(body: unknown | string, ip?: string): Request {
  return new Request('https://example.test/api/interpret', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip ?? `test-client-${clientSeq++}`,
    },
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

  /**
   * 16KB 上限指的是位元組。用 raw.length（UTF-16 code unit 數）判斷時，
   * 中文一字只算 1 而實際佔 3 個位元組——上限被放寬到約三倍，
   * 而這個 App 送的正是中文籤詩。api/sync.ts 早就改用位元組數，
   * 這一支卻漏掉。
   */
  test('中文內容以位元組計算上限', async () => {
    // 刻意讓每個欄位都在 4,000 字的單欄上限內，只有「整體大小」超標，
    // 才測得到 body 上限這一關——單欄塞爆會先被 FIELD_TOO_LARGE 接走。
    // 兩欄各 3,000 漢字：字數 6,000 < 16,384，位元組 18,000 > 16,384。
    const chinese = {
      poem: { ...validBody.poem, vernacular: '龍'.repeat(3_000), content: '乾'.repeat(3_000) },
    };
    const raw = JSON.stringify(chinese);
    expect(raw.length).toBeLessThan(16 * 1024);
    expect(new TextEncoder().encode(raw).length).toBeGreaterThan(16 * 1024);

    const res = await POST(post(chinese));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toBe('PAYLOAD_TOO_LARGE');
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

describe('限流', () => {
  beforeEach(() => { process.env.DEEPSEEK_API_KEY = 'test-key'; });

  /** 每次呼叫都要付模型費，同一來源狂點必須擋下 */
  test('同一來源超過 12 次／分鐘回 429 並附 Retry-After', async () => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: '龍德在天。' } }] }),
    }));

    const ip = 'rate-limit-probe';
    for (let i = 0; i < 12; i++) {
      expect((await POST(post(validBody, ip))).status).toBe(200);
    }

    const res = await POST(post(validBody, ip));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('RATE_LIMITED');
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  test('被擋下時不會呼叫外部服務', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: '龍德在天。' } }] }),
    }));
    (global as any).fetch = fetchMock;

    const ip = 'rate-limit-no-upstream';
    for (let i = 0; i < 12; i++) await POST(post(validBody, ip));
    fetchMock.mockClear();

    expect((await POST(post(validBody, ip))).status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('方法限制', () => {
  test('GET 回傳 405', async () => {
    const res = GET();
    expect(res.status).toBe(405);
    expect((await res.json()).error).toBe('METHOD_NOT_ALLOWED');
  });
});
