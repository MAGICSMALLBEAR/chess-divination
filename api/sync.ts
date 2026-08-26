// Upstash Redis backed cloud-sync endpoint. Connect Redis in Vercel Marketplace.
import { byteLength, createRateLimiter } from '../src/services/rateLimit';

// 雲端那份存的是兩台裝置的聯集（CLOUD_HISTORY_LIMIT = 1000 筆，
// 單筆實測約 440–610 bytes），512KB 會讓滿載的使用者一同步就撞 413。
// 1MB 容得下聯集，也仍在 Upstash REST 單次請求的限制之內。
const MAX_BODY_BYTES = 1024 * 1024;

// 配對碼本身就是憑證，但**任何**格式正確的 48 位十六進位字串都能寫入一組新的
// key——不需要猜中既有配對碼，隨機產一個就能存 512KB。沒有限流時，單一來源
// 可無上限地灌 Redis。一次 syncWithCloud() 是 GET + PUT 兩次請求，
// 20 次／分鐘等於每分鐘 10 輪同步，遠高於正常使用。
const limited = createRateLimiter({ max: 20, windowMs: 60_000 });
const TOO_MANY = () => Response.json({ error: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '60' } });

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
  if (limited(request)) return TOO_MANY();
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
  if (limited(request)) return TOO_MANY();
  const rawKey = syncKey(request); if (!rawKey) return Response.json({ error: 'INVALID_SYNC_KEY' }, { status: 401 });
  const raw = await request.text();
  if (byteLength(raw) > MAX_BODY_BYTES) {
    return Response.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
  }
  let data: unknown; try { data = JSON.parse(raw); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  if (!data || typeof data !== 'object') return Response.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  const response = await kv(`sync:${await hash(rawKey)}`, data);
  return response.ok ? Response.json({ ok: true }) : Response.json({ error: 'SYNC_UNAVAILABLE' }, { status: response.status });
}
