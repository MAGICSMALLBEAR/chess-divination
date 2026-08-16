// Upstash Redis backed cloud-sync endpoint. Connect Redis in Vercel Marketplace.
const MAX_BODY_BYTES = 512 * 1024;

async function hash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function syncKey(request: Request): string | null {
  const key = request.headers.get('x-sync-key')?.trim().toLowerCase() || '';
  return /^[a-f0-9]{48}$/.test(key) ? key : null;
}
// 讀或寫由 value 是否給定決定；不另外傳 command，避免出現與實際行為不符的參數。
async function kv(key: string, value?: unknown): Promise<Response> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return Response.json({ error: 'SYNC_NOT_CONFIGURED' }, { status: 501 });
  const endpoint = value === undefined ? `${url}/get/${key}` : `${url}/set/${key}`;
  return fetch(endpoint, { method: value === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value) });
}
export async function GET(request: Request): Promise<Response> {
  const rawKey = syncKey(request); if (!rawKey) return Response.json({ error: 'INVALID_SYNC_KEY' }, { status: 401 });
  const response = await kv(`sync:${await hash(rawKey)}`);
  if (!response.ok) return Response.json({ error: 'SYNC_UNAVAILABLE' }, { status: response.status });
  const body = await response.json();
  if (!body?.result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  // Upstash 的 /get 回傳 {result: "<原樣存入的字串>"}，result 是字串而非物件。
  // 直接 Response.json(body.result) 會把 JSON 再包一層字串，客戶端 r.json()
  // 拿到的是 string，isCloudPayload() 必然為 false——上傳看似成功，下載永遠回 null。
  let parsed: unknown;
  try {
    parsed = typeof body.result === 'string' ? JSON.parse(body.result) : body.result;
  } catch {
    return Response.json({ error: 'CORRUPT_PAYLOAD' }, { status: 502 });
  }
  return Response.json(parsed);
}
export async function PUT(request: Request): Promise<Response> {
  const rawKey = syncKey(request); if (!rawKey) return Response.json({ error: 'INVALID_SYNC_KEY' }, { status: 401 });
  const raw = await request.text();
  // 以實際位元組數而非 raw.length 判斷：後者是 UTF-16 code unit 數，
  // 而這個 App 存的是中文籤詩，一個字佔 3 個 UTF-8 位元組——
  // 用字數判斷會讓上限實際放寬到約三倍。
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return Response.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }
  let data: unknown; try { data = JSON.parse(raw); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  if (!data || typeof data !== 'object') return Response.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  const response = await kv(`sync:${await hash(rawKey)}`, data);
  return response.ok ? Response.json({ ok: true }) : Response.json({ error: 'SYNC_UNAVAILABLE' }, { status: response.status });
}
