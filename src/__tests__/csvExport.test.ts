import { buildHistoryCsv, csvCell } from '../services/csvExport';
import { setLang } from '../services/i18n';
import type { DivinationRecord } from '../services/storage';

function rec(over: Partial<DivinationRecord>): DivinationRecord {
  return {
    id: over.id ?? 'r', poemId: 1, poemTitle: '', poemContent: '', poemLevel: '上上',
    drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [], mode: 'draw',
    timestamp: new Date(2026, 8, 28, 9, 5).getTime(), isFavorited: false, engineVersion: 3,
    hexagramName: '乾為天', movingLine: 2, ...over,
  };
}

/** 去掉 BOM 後切成列、每列切成格（測試資料裡沒有需要引號的逗號時才可用） */
function table(csv: string): string[][] {
  return csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n').map(line => line.split(','));
}

beforeEach(() => setLang('zh-TW'));

describe('csvCell：RFC 4180 與公式注入', () => {
  test('含逗號、引號、換行的值加引號，內部引號重複', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('說"好"')).toBe('"說""好"""');
    expect(csvCell('一\n二')).toBe('"一\n二"');
    expect(csvCell('平常')).toBe('平常');
  });

  test('以 = + - @ 開頭的文字補 \'，試算表才不會當公式執行', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('@me')).toBe("'@me");
    // 數字不是使用者打的字，負數照原樣
    expect(csvCell(-3)).toBe('-3');
  });

  test('undefined 是空格，不是字串 "undefined"', () => {
    expect(csvCell(undefined)).toBe('');
  });
});

describe('buildHistoryCsv（路線圖 #30）', () => {
  test('帶 BOM、CRLF，由舊到新排', () => {
    const csv = buildHistoryCsv([rec({ id: 'new', timestamp: 2000 }), rec({ id: 'old', timestamp: 1000 })], { includePersonalText: true });
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const rows = table(csv);
    const idCol = rows[0].indexOf('記錄編號');
    expect(rows.slice(1).map(r => r[idCol])).toEqual(['old', 'new']);
  });

  test('值是顯示名稱而非內部代碼', () => {
    const rows = table(buildHistoryCsv([rec({
      mode: 'board', spreadId: 'timeline', questionCategory: 'career',
      outcome: { status: 'partial', verifiedAt: new Date(2026, 9, 1, 20, 0).getTime(), realized: 'yes' },
    })], { includePersonalText: true }));
    const row = Object.fromEntries(rows[0].map((h, i) => [h, rows[1][i]]));
    expect(row['日期時間']).toBe('2026-09-28 09:05');
    expect(row['方式']).toBe('棋盤佈局');
    expect(row['牌陣']).not.toBe('timeline');
    expect(row['牌陣']).not.toBe('');
    expect(row['問事類別']).not.toBe('career');
    expect(row['占驗']).toBe('部分應驗');
    expect(row['事情結果']).toBe('如願');
    expect(row['回填時間']).toBe('2026-10-01 20:00');
  });

  test('自訂類別印名字：記錄只存 key，名字由呼叫端帶進來', () => {
    const csv = (opts: Parameters<typeof buildHistoryCsv>[1]) => {
      const rows = table(buildHistoryCsv([rec({ questionCategory: 'custom-42' })], opts));
      return rows[1][rows[0].indexOf('問事類別')];
    };
    expect(csv({ includePersonalText: true, customCategories: [{ key: 'custom-42', label: '搬家' }] })).toBe('搬家');
    expect(csv({ includePersonalText: true })).not.toContain('custom-');
  });

  test('隱私開關關掉時，個人欄位留空但欄位還在', () => {
    const r = rec({
      questionText: '要不要換工作', note: '筆記', intuition: 70,
      outcome: { status: 'accurate', verifiedAt: 1, note: '自述' },
      decisionJournal: { expectation: '期待', evidence: '依據', nextStep: '下一步' },
    });
    const on = buildHistoryCsv([r], { includePersonalText: true });
    const off = buildHistoryCsv([r], { includePersonalText: false });
    // 只看資料列：表頭本身就有「筆記」「期待」等字
    const onRow = table(on)[1].join(',');
    const offRow = table(off)[1].join(',');
    for (const text of ['要不要換工作', '筆記', '自述', '期待', '依據', '下一步']) {
      expect(onRow).toContain(text);
      expect(offRow).not.toContain(text);
    }
    const col = table(on)[0].indexOf('占前直覺（%）');
    expect(table(on)[1][col]).toBe('70');
    expect(table(off)[1][col]).toBe('');
    expect(table(on)[0]).toEqual(table(off)[0]);
    expect(table(off)[1]).toHaveLength(table(off)[0].length);
    // 占驗結果本身不是自己寫的字，照樣匯出
    expect(offRow).toContain('應驗');
  });

  test('v1 舊記錄的卦名與動爻留空（卦序錯），籤題照印；靈棋沒有卦名', () => {
    const rows = table(buildHistoryCsv([
      rec({ id: 'v1', engineVersion: undefined }),
      rec({ id: 'lq', mode: 'lingqi', poemId: 0, poemTitle: '某卦', poemLevel: '', lingqiKey: '1-1-1' }),
    ], { includePersonalText: true }));
    const h = rows[0];
    const byId = Object.fromEntries(rows.slice(1).map(r => [r[h.indexOf('記錄編號')], r]));
    expect(byId.v1[h.indexOf('卦名')]).toBe('');
    expect(byId.v1[h.indexOf('動爻')]).toBe('');
    expect(byId.v1[h.indexOf('籤題／卦目')]).not.toBe('');
    expect(byId.lq[h.indexOf('卦名')]).toBe('');
    expect(byId.lq[h.indexOf('籤題／卦目')]).toBe('某卦');
  });

  test('表頭隨介面語言', () => {
    setLang('en');
    expect(table(buildHistoryCsv([], { includePersonalText: true }))[0][0]).toBe('Date & time');
  });
});
