// api/sync.ts 測試（Vercel Serverless Function，Upstash Redis REST 代理）
//
// 這支端點過去沒有自己的測試——client 端的 cloudSync.test.ts 只測狀態碼
// 進來之後怎麼被分類，沒測伺服器這一側「什麼情況會吐出哪個狀態碼」。
// 這次補上，順帶把「未設定」（501）與「已設定但呼叫 Upstash 本身失敗」
// （502）分清楚：兩者若都直接轉發 Upstash 的原始狀態碼，剛好撞成同一個
// 501 時，客戶端完全無法分辨「你根本沒接」和「你接了但接錯」。

import { GET, PUT } from '../../api/sync';

const ORIGINAL_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIGINAL_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const VALID_KEY = 'a'.repeat(48);

let clientSeq = 0;
function req(method: 'GET' | 'PUT', opts: { key?: string; body?: unknown; ip?: string } = {}): Request {
  const headers: Record<string, string> = { 'x-forwarded-for': opts.ip ?? `test-client-${clientSeq++}` };
  if (opts.key !== undefined) headers['x-sync-key'] = opts.key;
  return new Request('https://example.test/api/sync', {
    method,
    headers,
    body: method === 'PUT' ? JSON.stringify(opts.body ?? { history: [] }) : undefined,
  });
}

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_URL;
  if (ORIGINAL_TOKEN === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_TOKEN;
  jest.restoreAllMocks();
  delete (global as any).fetch;
});

describe('缺少配對碼標頭', () => {
  test('GET 回 401 INVALID_SYNC_KEY，且不呼叫 Upstash', async () => {
    (global as any).fetch = jest.fn();
    const res = await GET(req('GET'));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('INVALID_SYNC_KEY');
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  test('格式不對的配對碼（非 48 位十六進位）同樣回 401', async () => {
    const res = await GET(req('GET', { key: 'not-hex' }));
    expect(res.status).toBe(401);
  });
});

describe('環境變數未設定：not-configured', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  test('GET 回 501 SYNC_NOT_CONFIGURED', async () => {
    (global as any).fetch = jest.fn();
    const res = await GET(req('GET', { key: VALID_KEY }));
    expect(res.status).toBe(501);
    expect((await res.json()).error).toBe('SYNC_NOT_CONFIGURED');
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  test('PUT 回 501 SYNC_NOT_CONFIGURED', async () => {
    const res = await PUT(req('PUT', { key: VALID_KEY }));
    expect(res.status).toBe(501);
    expect((await res.json()).error).toBe('SYNC_NOT_CONFIGURED');
  });
});

describe('已設定但呼叫 Upstash 失敗：upstream-error', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example-upstash.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  test('Upstash 回非 2xx（如 URL/Token 打錯）時，GET 回固定的 502，不透傳原始狀態碼', async () => {
    (global as any).fetch = jest.fn(async () => new Response(null, { status: 501 }));
    const res = await GET(req('GET', { key: VALID_KEY }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('SYNC_UPSTREAM_ERROR');
  });

  test('與「未設定」的 501 不同：這裡就算 Upstash 也回 501，客戶端看到的仍是 502', async () => {
    (global as any).fetch = jest.fn(async () => new Response(null, { status: 501 }));
    const res = await PUT(req('PUT', { key: VALID_KEY }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).not.toBe('SYNC_NOT_CONFIGURED');
    expect(body.error).toBe('SYNC_UPSTREAM_ERROR');
  });

  test('fetch 本身丟出例外（DNS/斷線）也歸類為 upstream-error 而非未預期的例外', async () => {
    (global as any).fetch = jest.fn(async () => { throw new TypeError('fetch failed'); });
    const res = await GET(req('GET', { key: VALID_KEY }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('SYNC_UPSTREAM_ERROR');
  });
});

describe('成功路徑', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example-upstash.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  test('GET 查無資料時回 404 NOT_FOUND', async () => {
    (global as any).fetch = jest.fn(async () => Response.json({ result: null }));
    const res = await GET(req('GET', { key: VALID_KEY }));
    expect(res.status).toBe(404);
  });

  test('GET 命中資料時解開 Upstash 的字串包裝並回傳原始物件', async () => {
    const payload = { version: 3, history: [{ id: 'x' }] };
    (global as any).fetch = jest.fn(async () => Response.json({ result: JSON.stringify(payload) }));
    const res = await GET(req('GET', { key: VALID_KEY }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(payload);
  });

  test('PUT 成功回 { ok: true }', async () => {
    (global as any).fetch = jest.fn(async () => Response.json({ result: 'OK' }));
    const res = await PUT(req('PUT', { key: VALID_KEY, body: { history: [] } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('PUT 的請求驗證', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example-upstash.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  test('過大的請求回 413，不呼叫 Upstash', async () => {
    (global as any).fetch = jest.fn();
    const big = { history: Array.from({ length: 200_000 }, () => '資料').join('') };
    const res = await PUT(req('PUT', { key: VALID_KEY, body: big }));
    expect(res.status).toBe(413);
    expect((global as any).fetch).not.toHaveBeenCalled();
  });
});
