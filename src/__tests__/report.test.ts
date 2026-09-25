import { buildReportSection, buildReportSections, REPORT_BATCH_LIMIT } from '../services/report';
import { LINGQI_ORACLES } from '@/data/lingqiOracles';
import { getPoemById } from '@/data/poems';
import type { DivinationRecord } from '../services/storage';

function makeRecord(over: Partial<DivinationRecord> = {}): DivinationRecord {
  return {
    id: 'rec-1',
    poemId: 1,
    poemTitle: '乾為天',
    poemContent: '天行健',
    poemLevel: '大吉',
    drawnPieceTypes: ['king'],
    drawnPieceColors: ['red'],
    drawnPieceChars: ['帥'],
    mode: 'draw',
    timestamp: Date.now(),
    isFavorited: false,
    engineVersion: 3,
    hexagramIndex: 0,
    movingLine: 1,
    ...over,
  };
}

describe('buildReportSection — 籤詩模式（抽棋／棋盤）', () => {
  test('完整資料時填出標題、六爻推演與深度解讀', () => {
    const section = buildReportSection(makeRecord());
    expect(section.title).toBe(getPoemById(1).title);
    expect(section.poem).not.toBeNull();
    expect(section.reading).not.toBeNull();
    expect(section.oracle).toBeNull();
    expect(section.interpretation).toBeTruthy();
    expect(section.actionPlan.length).toBeGreaterThan(0);
  });

  test('v1/v2 缺卦象資料的舊記錄——reading 為 null，但不影響其餘欄位', () => {
    const section = buildReportSection(makeRecord({ hexagramIndex: undefined, movingLine: undefined }));
    expect(section.reading).toBeNull();
    expect(section.interpretation).toBeTruthy();
  });

  test('越界的卦象資料（備份損毀）——reading 為 null 而非拋錯或顯示亂文', () => {
    const section = buildReportSection(makeRecord({ hexagramIndex: 99 }));
    expect(section.reading).toBeNull();
  });

  test('牌陣名依 spreadId 帶出，自由佈局與抽棋模式不帶', () => {
    const boardRecord = makeRecord({ mode: 'board', spreadId: 'timeline' });
    expect(buildReportSection(boardRecord).spreadName).toBe('三才時間陣');

    const freeRecord = makeRecord({ mode: 'board', spreadId: 'free' });
    expect(buildReportSection(freeRecord).spreadName).toBeUndefined();

    const drawRecord = makeRecord({ mode: 'draw' });
    expect(buildReportSection(drawRecord).spreadName).toBeUndefined();
  });
});

describe('buildReportSection — 隱私選項', () => {
  test('預設納入問題與筆記', () => {
    const record = makeRecord({ questionText: '這段感情該不該繼續？', note: '心裡其實有答案了' });
    const section = buildReportSection(record);
    expect(section.questionText).toBe('這段感情該不該繼續？');
    expect(section.note).toBe('心裡其實有答案了');
  });

  test('關閉後兩欄都不收，且問題內容不會被深度解讀悄悄帶出去', () => {
    const record = makeRecord({ questionText: '這段感情該不該繼續？', note: '心裡其實有答案了' });
    const section = buildReportSection(record, { includePersonalText: false });
    expect(section.questionText).toBeUndefined();
    expect(section.note).toBeUndefined();
    // buildInterpretation 在收到 questionText 時會把它原樣嵌進解讀文字，
    // 隱私選項要真的擋在呼叫它之前，不能只是不顯示 section.questionText
    expect(section.interpretation).not.toContain('這段感情該不該繼續？');
  });
});

describe('buildReportSection — 占卜前的直覺', () => {
  test('預設帶出；關閉「問題與筆記」時一併不帶（那是使用者對自己這件事的私下估計）', () => {
    const record = makeRecord({ intuition: 70 });
    expect(buildReportSection(record).intuition).toBe(70);
    expect(buildReportSection(record, { includePersonalText: false }).intuition).toBeUndefined();
  });

  test('沒記直覺的記錄：沒有這個值', () => {
    expect(buildReportSection(makeRecord()).intuition).toBeUndefined();
  });
});

describe('buildReportSection — 靈棋模式', () => {
  test('有效鍵值時填出卦名／象／原典與結構解讀，reading 與 poem 為 null', () => {
    const oracle = LINGQI_ORACLES[0];
    const record = makeRecord({
      mode: 'lingqi', poemId: 0, poemTitle: '', poemLevel: '',
      drawnPieceChars: [], lingqiKey: oracle.key,
    });
    const section = buildReportSection(record);
    expect(section.title).toBe(`${oracle.name}・${oracle.image}`);
    expect(section.oracle).toBe(oracle);
    expect(section.poem).toBeNull();
    expect(section.reading).toBeNull();
    expect(section.interpretation).toBeTruthy();
  });

  test('鍵值缺漏或對不上任何卦目——不拋錯，內容欄位保持空而非顯示亂文', () => {
    const record = makeRecord({ mode: 'lingqi', poemId: 0, poemTitle: '', poemLevel: '', lingqiKey: undefined });
    expect(() => buildReportSection(record)).not.toThrow();
    const section = buildReportSection(record);
    expect(section.oracle).toBeNull();
    expect(section.interpretation).toBeNull();
  });
});

describe('buildReportSection — 占驗回填', () => {
  test('有回填結果時原樣帶出，不受隱私選項影響', () => {
    const record = makeRecord({
      outcome: { status: 'accurate', note: '真的發生了', verifiedAt: Date.now() },
    });
    const section = buildReportSection(record, { includePersonalText: false });
    expect(section.outcome?.status).toBe('accurate');
    expect(section.outcome?.note).toBe('真的發生了');
  });
});

describe('buildReportSections — 批次', () => {
  test('依原順序逐筆組出，各自套用同一組選項', () => {
    const records = [
      makeRecord({ id: 'a', questionText: '問題甲' }),
      makeRecord({ id: 'b', questionText: '問題乙' }),
    ];
    const sections = buildReportSections(records, { includePersonalText: false });
    expect(sections.map(s => s.record.id)).toEqual(['a', 'b']);
    expect(sections.every(s => s.questionText === undefined)).toBe(true);
  });

  test('空陣列回傳空陣列', () => {
    expect(buildReportSections([])).toEqual([]);
  });
});

/** S76 補完：報告是這筆記錄的完整版，「這是同一件事的再一次」不能只在揭曉頁看得到 */
describe('buildReportSection — 同一件事的連結', () => {
  const DAY = 86_400_000;
  const older = makeRecord({ id: 'older', timestamp: Date.now() - 3 * DAY, questionText: '前一次的私事' });
  const cur = makeRecord({ id: 'cur', relatedTo: 'older' });
  const later = makeRecord({ id: 'later', timestamp: Date.now() + DAY, relatedTo: 'cur' });

  test('帶出前一次的日期與題名、之後又占過的次數', () => {
    const section = buildReportSection(cur, undefined, [older, cur, later]);
    expect(section.relatedPrevious).toEqual({ timestamp: older.timestamp, title: expect.any(String) });
    expect(section.relatedPrevious!.title).not.toBe('');
    expect(section.relatedLaterCount).toBe(1);
  });

  test('只給日期與題名，前一次的問題本文不會跟著印出來', () => {
    const section = buildReportSection(cur, undefined, [older, cur]);
    expect(JSON.stringify(section.relatedPrevious)).not.toContain('前一次的私事');
  });

  test('沒給完整清單、或連結指不到：當作沒有連結', () => {
    expect(buildReportSection(cur).relatedPrevious).toBeUndefined();
    expect(buildReportSection(cur, undefined, [cur]).relatedPrevious).toBeUndefined();
    expect(buildReportSection(cur).relatedLaterCount).toBe(0);
  });

  test('靈棋記錄同樣帶得出來', () => {
    const lq = makeRecord({ id: 'lq', mode: 'lingqi', lingqiKey: LINGQI_ORACLES[0].key, relatedTo: 'older' });
    expect(buildReportSection(lq, undefined, [older, lq]).relatedPrevious?.timestamp).toBe(older.timestamp);
  });

  test('批次：前一次沒被勾選進報告也查得到（對完整歷史查，不是只對這批）', () => {
    const sections = buildReportSections([cur], undefined, [older, cur]);
    expect(sections[0].relatedPrevious?.timestamp).toBe(older.timestamp);
  });
});

describe('REPORT_BATCH_LIMIT', () => {
  test('是一個正整數上限，供呼叫端在匯出前擋下過大的選取', () => {
    expect(Number.isInteger(REPORT_BATCH_LIMIT)).toBe(true);
    expect(REPORT_BATCH_LIMIT).toBeGreaterThan(0);
  });
});
