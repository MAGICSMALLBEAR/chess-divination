import {
  isVerified, daysSince, pendingVerification,
  computeAccuracy, breakdownBy, accuracyByLevel, accuracyByCategory, accuracyByMode,
  bestCategory, medianVerifyDelay,
  OUTCOME_LABELS, OUTCOME_STATUSES, VERIFY_REMINDER_DAYS,
} from '../services/verification';
import type {
  DivinationRecord, OutcomeStatus, DivinationOutcome,
} from '../services/storage';

const DAY = 86_400_000;
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();

let seq = 0;

/** 建一筆測試記錄。只填統計會用到的欄位，其餘給合理預設 */
function rec(over: Partial<DivinationRecord> = {}): DivinationRecord {
  return {
    id: `r${seq++}`,
    poemId: 1,
    poemTitle: '龍騰九霄',
    poemContent: '一二三四',
    poemLevel: '大吉',
    drawnPieceTypes: ['king'],
    drawnPieceColors: ['red'],
    drawnPieceChars: ['帥'],
    mode: 'draw',
    timestamp: NOW - 30 * DAY,
    isFavorited: false,
    ...over,
  };
}

/** 建一筆已回填的記錄 */
function verified(
  status: OutcomeStatus,
  over: Partial<DivinationRecord> = {},
  outcomeOver: Partial<DivinationOutcome> = {},
): DivinationRecord {
  return rec({
    ...over,
    outcome: { status, verifiedAt: NOW, ...outcomeOver },
  });
}

describe('占驗常數', () => {
  test('三態齊備且無重複', () => {
    expect(OUTCOME_STATUSES).toEqual(['accurate', 'partial', 'inaccurate']);
    expect(new Set(OUTCOME_STATUSES).size).toBe(3);
  });

  test('每個狀態都有非空的中文標籤', () => {
    for (const s of OUTCOME_STATUSES) {
      expect(OUTCOME_LABELS[s]?.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('isVerified / daysSince', () => {
  test('沒有 outcome 者為未驗', () => {
    expect(isVerified(rec())).toBe(false);
    expect(isVerified(verified('accurate'))).toBe(true);
  });

  test('daysSince 無條件捨去到整天', () => {
    expect(daysSince(NOW - 3 * DAY, NOW)).toBe(3);
    // 差 2.9 天算 2 天，不四捨五入成 3
    expect(daysSince(NOW - Math.floor(2.9 * DAY), NOW)).toBe(2);
    expect(daysSince(NOW, NOW)).toBe(0);
  });

  test('未來的時間戳不產生負天數以外的怪值', () => {
    expect(daysSince(NOW + DAY, NOW)).toBeLessThanOrEqual(0);
  });
});

describe('待回填清單', () => {
  test('只列出未回填且已過建議天數者', () => {
    const old = rec({ timestamp: NOW - 20 * DAY });
    const fresh = rec({ timestamp: NOW - 2 * DAY });
    const done = verified('accurate', { timestamp: NOW - 20 * DAY });

    const pending = pendingVerification([old, fresh, done], NOW);
    expect(pending.map(r => r.id)).toEqual([old.id]);
  });

  test('剛好滿建議天數者要列入（邊界為包含）', () => {
    const exact = rec({ timestamp: NOW - VERIFY_REMINDER_DAYS * DAY });
    expect(pendingVerification([exact], NOW)).toHaveLength(1);

    const oneShort = rec({ timestamp: NOW - (VERIFY_REMINDER_DAYS - 1) * DAY });
    expect(pendingVerification([oneShort], NOW)).toHaveLength(0);
  });

  test('由近而遠排序——剛滿期的事記得最清楚，回填品質最高', () => {
    const older = rec({ timestamp: NOW - 60 * DAY });
    const newer = rec({ timestamp: NOW - 15 * DAY });
    const mid = rec({ timestamp: NOW - 30 * DAY });

    const pending = pendingVerification([older, newer, mid], NOW);
    expect(pending.map(r => r.id)).toEqual([newer.id, mid.id, older.id]);
  });

  test('可自訂門檻天數', () => {
    const r = rec({ timestamp: NOW - 5 * DAY });
    expect(pendingVerification([r], NOW, 3)).toHaveLength(1);
    expect(pendingVerification([r], NOW, 7)).toHaveLength(0);
  });

  test('空清單不拋錯', () => {
    expect(pendingVerification([], NOW)).toEqual([]);
  });
});

describe('應驗率計算', () => {
  test('全部應驗為 100%', () => {
    const stats = computeAccuracy([verified('accurate'), verified('accurate')]);
    expect(stats.rate).toBe(100);
    expect(stats.verified).toBe(2);
    expect(stats.accurate).toBe(2);
  });

  test('全部未應驗為 0%', () => {
    expect(computeAccuracy([verified('inaccurate')]).rate).toBe(0);
  });

  /** 部分應驗給半分——占卜斷語多為方向性，全有全無會把真實結果硬塞進兩極 */
  test('部分應驗計半分', () => {
    expect(computeAccuracy([verified('partial')]).rate).toBe(50);
    expect(computeAccuracy([verified('accurate'), verified('inaccurate')]).rate).toBe(50);
    // 應驗 1 + 部分 0.5 + 未應驗 0 = 1.5 / 3 = 50%
    expect(computeAccuracy([
      verified('accurate'), verified('partial'), verified('inaccurate'),
    ]).rate).toBe(50);
  });

  /**
   * 這是整個統計的關鍵取捨：未回填的不計入分母。
   * 若把未驗的當成不準，應驗率會隨占卜次數單調下降，
   * 那個數字反映的是回填勤勞度，不是準確度。
   */
  test('未回填的記錄不計入分母', () => {
    const stats = computeAccuracy([
      verified('accurate'),
      rec(), rec(), rec(), rec(), rec(),
    ]);
    expect(stats.rate).toBe(100);
    expect(stats.verified).toBe(1);
    expect(stats.unverified).toBe(5);
  });

  /** 「還沒有資料」和「驗過但全不準」都顯示 0% 會誤導 */
  test('沒有任何已回填記錄時 rate 為 null 而非 0', () => {
    expect(computeAccuracy([]).rate).toBeNull();
    expect(computeAccuracy([rec(), rec()]).rate).toBeNull();
    // 對照：驗過但全錯才是 0
    expect(computeAccuracy([verified('inaccurate')]).rate).toBe(0);
  });

  test('三態各自計數正確', () => {
    const stats = computeAccuracy([
      verified('accurate'), verified('accurate'),
      verified('partial'),
      verified('inaccurate'), verified('inaccurate'), verified('inaccurate'),
      rec(),
    ]);
    expect(stats.accurate).toBe(2);
    expect(stats.partial).toBe(1);
    expect(stats.inaccurate).toBe(3);
    expect(stats.verified).toBe(6);
    expect(stats.unverified).toBe(1);
    // (2 + 0.5 + 0) / 6 = 41.67 → 42
    expect(stats.rate).toBe(42);
  });

  test('rate 一律為 0–100 的整數', () => {
    for (let n = 1; n <= 7; n++) {
      const records = Array.from({ length: n }, (_, i) =>
        verified(OUTCOME_STATUSES[i % 3]));
      const { rate } = computeAccuracy(records);
      expect(Number.isInteger(rate)).toBe(true);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    }
  });

  /**
   * 儲存的記錄可能來自舊版或使用者手動匯入的備份檔，
   * 帶了不認得的狀態值時必須歸為未驗，不可讓 NaN 汙染整個應驗率。
   */
  test('無法辨識的狀態值歸為未驗，不產生 NaN', () => {
    const corrupt = rec({
      outcome: { status: 'maybe' as OutcomeStatus, verifiedAt: NOW },
    });
    const stats = computeAccuracy([corrupt, verified('accurate')]);
    expect(stats.rate).toBe(100);
    expect(stats.verified).toBe(1);
    expect(stats.unverified).toBe(1);
    expect(Number.isNaN(stats.rate)).toBe(false);
  });
});

describe('分項統計', () => {
  test('依籤詩等級分組', () => {
    const rows = accuracyByLevel([
      verified('accurate', { poemLevel: '大吉' }),
      verified('accurate', { poemLevel: '大吉' }),
      verified('inaccurate', { poemLevel: '下下' }),
    ]);
    const daji = rows.find(r => r.key === '大吉');
    const xiaxia = rows.find(r => r.key === '下下');
    expect(daji?.stats.rate).toBe(100);
    expect(daji?.stats.verified).toBe(2);
    expect(xiaxia?.stats.rate).toBe(0);
  });

  test('依問事類別分組並翻成中文標籤', () => {
    const rows = accuracyByCategory([
      verified('accurate', { questionCategory: 'career' }),
      verified('partial', { questionCategory: 'marriage' }),
    ]);
    expect(rows.find(r => r.key === 'career')?.label).toBe('事業');
    expect(rows.find(r => r.key === 'marriage')?.label).toBe('感情');
  });

  test('依模式分組', () => {
    const rows = accuracyByMode([
      verified('accurate', { mode: 'draw' }),
      verified('inaccurate', { mode: 'board' }),
    ]);
    expect(rows.find(r => r.key === 'draw')?.label).toBe('抽棋');
    expect(rows.find(r => r.key === 'board')?.label).toBe('棋盤');
  });

  /** 全未回填的分組沒有可讀的數字，列出來只是一排空白 */
  test('只列出有已回填資料的分組', () => {
    const rows = accuracyByLevel([
      verified('accurate', { poemLevel: '大吉' }),
      rec({ poemLevel: '中平' }),   // 未驗，該組整組被略過
    ]);
    expect(rows.map(r => r.key)).toEqual(['大吉']);
  });

  test('以應驗率高者在前，同率則樣本多者在前', () => {
    const rows = accuracyByLevel([
      verified('inaccurate', { poemLevel: '下下' }),
      verified('accurate', { poemLevel: '中吉' }),
      verified('accurate', { poemLevel: '大吉' }),
      verified('accurate', { poemLevel: '大吉' }),
    ]);
    // 大吉 100%/2 → 中吉 100%/1 → 下下 0%/1
    expect(rows.map(r => r.key)).toEqual(['大吉', '中吉', '下下']);
  });

  /** groupBy 回 null 代表該筆不屬於任何組，湊出來的「其他」組沒有解讀價值 */
  test('groupBy 回 null 者被排除', () => {
    const rows = breakdownBy(
      [verified('accurate', { questionCategory: 'career' }), verified('accurate')],
      r => r.questionCategory || null,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].stats.verified).toBe(1);
  });

  test('空輸入回空陣列', () => {
    expect(accuracyByLevel([])).toEqual([]);
    expect(accuracyByCategory([])).toEqual([]);
  });
});

describe('個人洞察', () => {
  /** 三筆全中就宣告「你問感情特別準」是拿雜訊當訊號 */
  test('樣本不足時不給出洞察', () => {
    const few = Array.from({ length: 3 }, () =>
      verified('accurate', { questionCategory: 'marriage' }));
    expect(bestCategory(few)).toBeNull();
  });

  test('樣本足夠時回傳應驗率最高的類別', () => {
    const records = [
      ...Array.from({ length: 6 }, () => verified('accurate', { questionCategory: 'career' })),
      ...Array.from({ length: 6 }, () => verified('inaccurate', { questionCategory: 'wealth' })),
    ];
    const best = bestCategory(records);
    expect(best?.key).toBe('career');
    expect(best?.label).toBe('事業');
    expect(best?.stats.rate).toBe(100);
  });

  test('可自訂樣本門檻', () => {
    const three = Array.from({ length: 3 }, () =>
      verified('accurate', { questionCategory: 'study' }));
    expect(bestCategory(three, 3)?.key).toBe('study');
    expect(bestCategory(three, 4)).toBeNull();
  });

  test('完全沒有已回填記錄時回 null', () => {
    expect(bestCategory([rec(), rec()])).toBeNull();
    expect(bestCategory([])).toBeNull();
  });
});

describe('回填延遲中位數', () => {
  test('奇數筆取正中間', () => {
    const records = [1, 5, 30].map(d =>
      verified('accurate', { timestamp: NOW - d * DAY }, { verifiedAt: NOW }));
    expect(medianVerifyDelay(records)).toBe(5);
  });

  test('偶數筆取中間兩筆的平均', () => {
    const records = [2, 4, 6, 8].map(d =>
      verified('accurate', { timestamp: NOW - d * DAY }, { verifiedAt: NOW }));
    expect(medianVerifyDelay(records)).toBe(5);   // (4 + 6) / 2
  });

  test('未回填者不列入計算', () => {
    const records = [
      verified('accurate', { timestamp: NOW - 10 * DAY }, { verifiedAt: NOW }),
      rec({ timestamp: NOW - 999 * DAY }),
    ];
    expect(medianVerifyDelay(records)).toBe(10);
  });

  test('沒有已回填記錄時回 null', () => {
    expect(medianVerifyDelay([])).toBeNull();
    expect(medianVerifyDelay([rec()])).toBeNull();
  });
});
