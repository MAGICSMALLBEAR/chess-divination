// aiInterpretation.ts 測試
//
// 這是加值功能：任何失敗都必須優雅降級，讓籤詩頁保留規則式解讀，
// 而不是拋錯或讓畫面卡住。測試重點因此放在「各種失敗路徑」。

import { fetchAiInterpretation, type AiInterpretationInput } from '../services/aiInterpretation';

const input: AiInterpretationInput = {
  poem: {
    title: '龍騰九霄',
    content: '乾元亨利御中軍，\n將帥登臺掌萬鈞。',
    level: '大吉',
    hexagramName: '乾為天',
    vernacular: '此籤大吉，氣勢磅礡。',
  },
  question: '該不該換工作',
  questionCategory: 'career',
  hexagram: {
    primaryName: '乾為天',
    changedName: '天澤履',
    movingLineName: '九三',
    bodyUseRelation: '體用比和',
  },
};

/** 以指定回應替換 global.fetch */
function mockFetch(impl: () => Promise<Partial<Response>> | Partial<Response>) {
  (global as any).fetch = jest.fn(async () => impl());
}

afterEach(() => {
  jest.restoreAllMocks();
  delete (global as any).fetch;
});

describe('成功取得解讀', () => {
  test('回傳解讀文字', async () => {
    mockFetch(() => ({
      ok: true, status: 200,
      json: async () => ({ interpretation: '此卦龍德在天，宜進取。' }),
    }));

    const r = await fetchAiInterpretation(input);
    expect(r.status).toBe('ok');
    expect(r.status === 'ok' && r.interpretation).toBe('此卦龍德在天，宜進取。');
  });

  test('送出的內容包含籤詩與卦象資訊', async () => {
    mockFetch(() => ({
      ok: true, status: 200,
      json: async () => ({ interpretation: 'ok' }),
    }));

    await fetchAiInterpretation(input);

    const [, init] = (global as any).fetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.poem.hexagramName).toBe('乾為天');
    expect(body.question).toBe('該不該換工作');
    expect(body.hexagram.movingLineName).toBe('九三');
  });

  test('以 POST 與 JSON content-type 呼叫端點', async () => {
    mockFetch(() => ({ ok: true, status: 200, json: async () => ({ interpretation: 'ok' }) }));

    await fetchAiInterpretation(input);

    const [url, init] = (global as any).fetch.mock.calls[0];
    // jest-expo 預設模擬 iOS；原生 fetch 不吃相對 URL，端點必須是絕對網址。
    // Web 路徑與環境變數覆寫的完整解析見 aiInterpretationEndpoint.test.ts
    expect(url).toBe('https://chess-divination-app.vercel.app/api/interpret');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
  });
});

describe('後端未配置', () => {
  /** 501：後端明確表示沒有設定金鑰 */
  test('501 視為尚未啟用而非錯誤', async () => {
    mockFetch(() => ({ ok: false, status: 501, json: async () => ({ error: 'AI_NOT_CONFIGURED' }) }));

    const r = await fetchAiInterpretation(input);
    expect(r.status).toBe('unavailable');
  });

  /**
   * 404：API Route 根本沒被部署。
   * app.json 的 web.output 是 "static" 時，API Route 不會匯出，正是這種情況。
   */
  test('404 視為尚未啟用', async () => {
    mockFetch(() => ({ ok: false, status: 404, json: async () => ({}) }));

    const r = await fetchAiInterpretation(input);
    expect(r.status).toBe('unavailable');
  });

  /** 靜態站台可能把未知路徑導回 index.html，此時 ok 為真但內容不對 */
  test('回應成功但缺少 interpretation 欄位時視為尚未啟用', async () => {
    mockFetch(() => ({ ok: true, status: 200, json: async () => ({ foo: 'bar' }) }));

    const r = await fetchAiInterpretation(input);
    expect(r.status).toBe('unavailable');
  });

  test('interpretation 為空字串時視為尚未啟用', async () => {
    mockFetch(() => ({ ok: true, status: 200, json: async () => ({ interpretation: '   ' }) }));

    const r = await fetchAiInterpretation(input);
    expect(r.status).toBe('unavailable');
  });

  test('未啟用時仍附帶說明文字供畫面顯示', async () => {
    mockFetch(() => ({ ok: false, status: 501, json: async () => ({}) }));

    const r = await fetchAiInterpretation(input);
    expect(r.status === 'unavailable' && r.message.length).toBeGreaterThan(0);
  });
});

describe('錯誤處理', () => {
  test('502 等伺服器錯誤回報為 error', async () => {
    mockFetch(() => ({ ok: false, status: 502, json: async () => ({}) }));

    const r = await fetchAiInterpretation(input);
    expect(r.status).toBe('error');
    expect(r.status === 'error' && r.message).toContain('502');
  });

  test('網路失敗不拋錯，回報為 error', async () => {
    (global as any).fetch = jest.fn(async () => { throw new Error('network down'); });

    const r = await fetchAiInterpretation(input);
    expect(r.status).toBe('error');
  });

  test('回應不是合法 JSON 時不拋錯', async () => {
    mockFetch(() => ({
      ok: true, status: 200,
      json: async () => { throw new SyntaxError('unexpected token'); },
    }));

    const r = await fetchAiInterpretation(input);
    expect(r.status).toBe('error');
  });

  test('逾時中止會回報逾時訊息', async () => {
    (global as any).fetch = jest.fn(async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    });

    const r = await fetchAiInterpretation(input);
    expect(r.status).toBe('error');
    expect(r.status === 'error' && r.message).toContain('逾時');
  });

  /** 無論走哪條路徑都不該讓呼叫端收到例外——籤詩頁不能因此壞掉 */
  test('任何情況都不拋錯', async () => {
    const scenarios = [
      () => ({ ok: false, status: 500, json: async () => ({}) }),
      () => ({ ok: true, status: 200, json: async () => null }),
      () => { throw new Error('boom'); },
    ];

    for (const impl of scenarios) {
      mockFetch(impl as any);
      await expect(fetchAiInterpretation(input)).resolves.toBeDefined();
    }
  });
});

describe('缺少卦象資料', () => {
  test('沒有卦例時仍可送出（v1/v2 舊記錄沒有六爻資料）', async () => {
    mockFetch(() => ({ ok: true, status: 200, json: async () => ({ interpretation: 'ok' }) }));

    const r = await fetchAiInterpretation({ poem: input.poem });
    expect(r.status).toBe('ok');

    const [, init] = (global as any).fetch.mock.calls[0];
    expect(JSON.parse(init.body).hexagram).toBeUndefined();
  });
});
