// 端點限流器測試。
//
// 這層原本內嵌在 api/interpret.ts，計數表只增不減；抽出來共用時一併補上
// 記憶體上界，這些測試就是那個上界的守門。

import { byteLength, clientId, createRateLimiter } from '../services/rateLimit';

/** 組一個帶來源標頭的請求；不給 ip 就完全不帶標頭 */
function req(ip?: string, header = 'x-forwarded-for'): Request {
  return new Request('https://example.test/api/x', {
    headers: ip ? { [header]: ip } : {},
  });
}

describe('clientId', () => {
  test('x-forwarded-for 取第一段（後面是各層 proxy）', () => {
    expect(clientId(req('203.0.113.5, 70.41.3.18, 150.172.238.178'))).toBe('203.0.113.5');
  });

  test('去除空白', () => {
    expect(clientId(req('  203.0.113.5  '))).toBe('203.0.113.5');
  });

  test('沒有 x-forwarded-for 時退回 x-real-ip', () => {
    expect(clientId(req('198.51.100.7', 'x-real-ip'))).toBe('198.51.100.7');
  });

  test('兩者皆無時回 unknown，而不是拋錯', () => {
    expect(clientId(req())).toBe('unknown');
  });

  /** 空字串的 x-forwarded-for 曾讓 || 短路到 undefined 再變成 'undefined' 字串 */
  test('空的 x-forwarded-for 仍退回 unknown', () => {
    expect(clientId(req(''))).toBe('unknown');
  });
});

describe('限流判斷', () => {
  test('未達上限一律放行', () => {
    const limited = createRateLimiter({ max: 3, windowMs: 60_000 });
    expect(limited(req('1.1.1.1'))).toBe(false);
    expect(limited(req('1.1.1.1'))).toBe(false);
    expect(limited(req('1.1.1.1'))).toBe(false);
  });

  test('第 max+1 次才擋下', () => {
    const limited = createRateLimiter({ max: 3, windowMs: 60_000 });
    for (let i = 0; i < 3; i++) expect(limited(req('1.1.1.1'))).toBe(false);
    expect(limited(req('1.1.1.1'))).toBe(true);
  });

  test('不同來源各自計數，互不影響', () => {
    const limited = createRateLimiter({ max: 2, windowMs: 60_000 });
    limited(req('1.1.1.1'));
    limited(req('1.1.1.1'));
    expect(limited(req('1.1.1.1'))).toBe(true);
    expect(limited(req('2.2.2.2'))).toBe(false);
  });

  test('視窗過後重新放行', () => {
    const now = jest.spyOn(Date, 'now');
    try {
      now.mockReturnValue(1_000_000);
      const limited = createRateLimiter({ max: 2, windowMs: 60_000 });
      limited(req('1.1.1.1'));
      limited(req('1.1.1.1'));
      expect(limited(req('1.1.1.1'))).toBe(true);

      now.mockReturnValue(1_000_000 + 60_000);
      expect(limited(req('1.1.1.1'))).toBe(false);
    } finally {
      now.mockRestore();
    }
  });

  /**
   * 超限期間的重試不可以被記進計數。
   * 若照樣累加，視窗就會被每次重試往後推——一個狂點的使用者會把自己
   * 鎖到永遠解不開，而不是等 60 秒後恢復。
   */
  test('超限期間持續重試，仍在視窗結束後恢復', () => {
    const now = jest.spyOn(Date, 'now');
    try {
      now.mockReturnValue(0);
      const limited = createRateLimiter({ max: 2, windowMs: 60_000 });
      limited(req('1.1.1.1'));
      limited(req('1.1.1.1'));

      // 整個視窗期間不斷重試
      for (let ms = 1_000; ms < 60_000; ms += 1_000) {
        now.mockReturnValue(ms);
        expect(limited(req('1.1.1.1'))).toBe(true);
      }

      now.mockReturnValue(60_000);
      expect(limited(req('1.1.1.1'))).toBe(false);
    } finally {
      now.mockRestore();
    }
  });
});

describe('記憶體上界', () => {
  /** 舊實作每遇到一個新來源就新增一筆且永不刪除——暖實例會一路長大 */
  test('過期來源會被清掉，不會無限累積', () => {
    const now = jest.spyOn(Date, 'now');
    try {
      now.mockReturnValue(0);
      const limited = createRateLimiter({ max: 5, windowMs: 60_000, maxClients: 10 });
      for (let i = 0; i < 11; i++) limited(req(`10.0.0.${i}`));
      expect(limited.size()).toBe(11);

      // 視窗過後再來一個新來源，觸發清理
      now.mockReturnValue(60_000);
      limited(req('10.0.1.1'));
      expect(limited.size()).toBe(1);
    } finally {
      now.mockRestore();
    }
  });

  /** 同一視窗內湧入大量來源時，清理沒有東西可清，仍須守住上界 */
  test('來源全在視窗內時，由最舊的開始丟以守住上界', () => {
    const limited = createRateLimiter({ max: 5, windowMs: 60_000, maxClients: 10 });
    for (let i = 0; i < 40; i++) limited(req(`10.0.0.${i}`));
    expect(limited.size()).toBeLessThanOrEqual(11);
  });

  test('reset 清空計數', () => {
    const limited = createRateLimiter({ max: 1, windowMs: 60_000 });
    limited(req('1.1.1.1'));
    expect(limited(req('1.1.1.1'))).toBe(true);
    limited.reset();
    expect(limited.size()).toBe(0);
    expect(limited(req('1.1.1.1'))).toBe(false);
  });
});

describe('byteLength', () => {
  /** 端點上限的意義是位元組；用 raw.length 會讓中文內容實際放寬約三倍 */
  test('中文一字算 3 個位元組，而非 1', () => {
    const poem = '乾元亨利御中軍';
    expect(poem.length).toBe(7);
    expect(byteLength(poem)).toBe(21);
  });

  test('ASCII 與字數一致', () => {
    expect(byteLength('abcd')).toBe(4);
  });

  test('emoji 等星際平面字元不會少算', () => {
    expect(byteLength('𠀀')).toBe(4);
  });
});
