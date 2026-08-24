// aiInterpretation.ts 的端點解析測試
//
// 相對 URL 在原生端沒有 origin 可解析，fetch 會立刻拋錯，
// 使用者只會看到「無法連線」與一個永遠重試不了的重試鈕。
// 這支守住：原生走絕對網址、Web 走相對路徑、環境變數可覆寫。
//
// 端點常數在模組載入時定值，測試因此以 resetModules 重新載入模組，
// 並在載入前改寫 Platform.OS 來模擬不同執行環境。

type AiModule = typeof import('../services/aiInterpretation');

/** 模擬指定平台後重新載入模組。jest-expo 的 Platform.OS 是普通可寫屬性 */
function loadWithPlatform(os: 'ios' | 'android' | 'web'): AiModule {
  jest.resetModules();
  const { Platform } = require('react-native') as typeof import('react-native');
  (Platform as { OS: string }).OS = os;
  return require('../services/aiInterpretation');
}

const input = {
  poem: {
    title: '龍騰九霄',
    content: '乾元亨利御中軍',
    level: '大吉',
    hexagramName: '乾為天',
    vernacular: '此籤大吉。',
  },
};

/** 用會成功的假 fetch 取代 global.fetch，並回傳 mock 供斷言呼叫網址 */
function mockFetchOk() {
  const fetchMock = jest.fn(async () => ({
    ok: true, status: 200, json: async () => ({ interpretation: 'ok' }),
  }));
  (global as any).fetch = fetchMock;
  return fetchMock;
}

afterEach(() => {
  jest.restoreAllMocks();
  delete (global as any).fetch;
  delete process.env.EXPO_PUBLIC_AI_INTERPRET_URL;
});

describe('端點網址解析', () => {
  test('原生（ios）以絕對網址呼叫', async () => {
    const mod = loadWithPlatform('ios');
    const fetchMock = mockFetchOk();

    await mod.fetchAiInterpretation(input);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chess-divination-app.vercel.app/api/interpret');
  });

  test('原生（android）同樣以絕對網址呼叫', async () => {
    const mod = loadWithPlatform('android');
    const fetchMock = mockFetchOk();

    await mod.fetchAiInterpretation(input);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://chess-divination-app.vercel.app/api/interpret');
  });

  test('Web 與部署同源，以相對路徑呼叫', async () => {
    const mod = loadWithPlatform('web');
    const fetchMock = mockFetchOk();

    await mod.fetchAiInterpretation(input);

    expect(fetchMock.mock.calls[0][0]).toBe('/api/interpret');
  });

  test('EXPO_PUBLIC_AI_INTERPRET_URL 環境變數優先於平台預設值', async () => {
    process.env.EXPO_PUBLIC_AI_INTERPRET_URL = 'https://example.com/custom-interpret';
    const mod = loadWithPlatform('ios');
    const fetchMock = mockFetchOk();

    await mod.fetchAiInterpretation(input);

    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/custom-interpret');
  });

  test('Web 端也尊重環境變數覆寫', async () => {
    process.env.EXPO_PUBLIC_AI_INTERPRET_URL = 'https://example.com/custom-interpret';
    const mod = loadWithPlatform('web');
    const fetchMock = mockFetchOk();

    await mod.fetchAiInterpretation(input);

    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/custom-interpret');
  });
});
