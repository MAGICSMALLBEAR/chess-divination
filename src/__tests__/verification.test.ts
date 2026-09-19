import fs from 'fs';
import path from 'path';
import {
  isVerified, daysSince, pendingVerification,
  computeAccuracy, breakdownBy, accuracyByLevel, accuracyByCategory, accuracyByMode, accuracyBySpread,
  accuracyByBodyUse, accuracyByMovingLine, accuracyBySeason,
  bestCategory, medianVerifyDelay,
  OUTCOME_LABELS, OUTCOME_STATUSES, VERIFY_REMINDER_DAYS, MIN_INSIGHT_SAMPLES,
  verifyReminderPolicy, VERIFY_REMINDER_CHOICES, VERIFY_REMINDER_OFF,
  accuracyTrend,
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

  // 子領域只是讓使用者把問題說清楚，統計上仍是同一個人生面向：
  // 各自成列會把樣本切薄，還會與子領域上線前記的舊記錄分立兩行。
  test('子領域併回主類別，與上線前的舊記錄同一列', () => {
    const rows = accuracyByCategory([
      verified('accurate', { questionCategory: 'jobSearch' }),
      verified('accurate', { questionCategory: 'promotion' }),
      verified('inaccurate', { questionCategory: 'career' }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('career');
    expect(rows[0].label).toBe('事業');
    expect(rows[0].stats.verified).toBe(3);
  });

  test('自訂類別沒有主類別可映，自成一列', () => {
    const rows = accuracyByCategory([
      verified('accurate', { questionCategory: 'custom-1735689600000' }),
    ]);
    expect(rows.map(r => r.key)).toEqual(['custom-1735689600000']);
  });

  test('最準的類別湊得到樣本數——子領域分散時湊不到', () => {
    const records = [
      verified('accurate', { questionCategory: 'jobSearch' }),
      verified('accurate', { questionCategory: 'promotion' }),
      verified('accurate', { questionCategory: 'workplace' }),
      verified('accurate', { questionCategory: 'business' }),
      verified('accurate', { questionCategory: 'career' }),
    ];
    expect(bestCategory(records)?.key).toBe('career');
  });

  test('依模式分組', () => {
    const rows = accuracyByMode([
      verified('accurate', { mode: 'draw' }),
      verified('inaccurate', { mode: 'board' }),
    ]);
    expect(rows.find(r => r.key === 'draw')?.label).toBe('抽棋');
    expect(rows.find(r => r.key === 'board')?.label).toBe('棋盤');
  });

  /**
   * 預設標籤原本是 `k === 'draw' ? '抽棋' : '棋盤'`，靈棋加進來後會被標成
   * 「棋盤」——分項統計上多出一組冒充別人的資料，而畫面看起來完全正常。
   */
  test('靈棋有自己的預設標籤，不冒充棋盤', () => {
    const rows = accuracyByMode([
      verified('accurate', { mode: 'lingqi' }),
      verified('inaccurate', { mode: 'board' }),
    ]);
    expect(rows.find(r => r.key === 'lingqi')?.label).toBe('靈棋');
    expect(rows.filter(r => r.label === '棋盤').map(r => r.key)).toEqual(['board']);
  });

  /** 認不得的模式回傳原鍵——標成看得出不對的值，好過冒充某個既有模式 */
  test('認不得的模式以原鍵為標籤', () => {
    const rows = accuracyByMode([
      verified('accurate', { mode: 'tarot' as DivinationRecord['mode'] }),
    ]);
    expect(rows[0].label).toBe('tarot');
  });

  test('依固定牌陣分組，排除自由佈局與尚未有欄位的舊記錄', () => {
    const rows = accuracyBySpread([
      verified('accurate', { mode: 'board', spreadId: 'timeline' }),
      verified('partial', { mode: 'board', spreadId: 'choice' }),
      verified('accurate', { mode: 'board', spreadId: 'free' }),
      verified('accurate', { mode: 'board' }),
    ]);
    expect(rows.map(row => row.key)).toEqual(['timeline', 'choice']);
    expect(rows.find(row => row.key === 'timeline')?.label).toBe('三才時間陣');
    expect(rows.find(row => row.key === 'choice')?.stats.rate).toBe(50);
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

describe('六爻條件應驗率', () => {
  const modern = (status: OutcomeStatus, over: Partial<DivinationRecord> = {}) => verified(status, {
    engineVersion: 3,
    // 水雷屯，動在初爻：下卦震為用、上卦坎為體，體生用。
    hexagramIndex: 5 * 8 + 3,
    movingLine: 1,
    timestamp: new Date(2026, 1, 10, 12).getTime(),
    ...over,
  });

  test('依體用、動爻與時令分組', () => {
    const records = [
      modern('accurate'),
      modern('partial', { movingLine: 4 }),
    ];

    expect(accuracyByBodyUse(records).map(row => row.key)).toEqual(['體生用', '用生體']);
    expect(accuracyByMovingLine(records).map(row => row.label)).toEqual(['第1爻', '第4爻']);
    expect(accuracyBySeason(records)[0]).toMatchObject({ key: '春', stats: { verified: 2, rate: 75 } });
  });

  test('舊版或損毀的六爻資料不混入分析', () => {
    const invalid = [
      verified('accurate'),
      modern('accurate', { movingLine: 0 }),
      modern('accurate', { hexagramIndex: 64 }),
    ];
    expect(accuracyByBodyUse(invalid)).toEqual([]);
    expect(accuracyByMovingLine(invalid)).toEqual([]);
    expect(accuracyBySeason(invalid)).toEqual([]);
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

  /**
   * verifiedAt 早於 timestamp 只可能來自時鐘變動、跨時區搬機或手改過的
   * 備份，不是真的「在占卜之前就驗證了」。不夾到 0 的話統計頁會顯示
   * 「-3 天」——一個沒有意義、而且看起來像程式壞掉的數字。
   */
  test('回填時間早於占卜時間者夾到 0，不產生負數', () => {
    const backwards = verified('accurate', { timestamp: NOW }, { verifiedAt: NOW - 3 * DAY });
    expect(medianVerifyDelay([backwards])).toBe(0);
  });

  test('夾到 0 之後仍正確參與中位數計算', () => {
    const records = [
      verified('accurate', { timestamp: NOW }, { verifiedAt: NOW - 5 * DAY }),      // 夾為 0
      verified('accurate', { timestamp: NOW - 4 * DAY }, { verifiedAt: NOW }),      // 4
      verified('accurate', { timestamp: NOW - 20 * DAY }, { verifiedAt: NOW }),     // 20
    ];
    expect(medianVerifyDelay(records)).toBe(4);
  });

  test('中位數永遠不為負', () => {
    const allBackwards = [1, 2, 3].map(d =>
      verified('accurate', { timestamp: NOW }, { verifiedAt: NOW - d * DAY }));
    expect(medianVerifyDelay(allBackwards)).toBeGreaterThanOrEqual(0);
  });
});

/**
 * 守門：算得出「哪些該回填」，就要有地方讓使用者按下去。
 *
 * `pendingVerification()` 從很早就存在，但在 Session 62 之前只有統計頁用它，
 * 而且只印成一個數字（`stats.pending`）——使用者被告知有 N 筆待回填，
 * 然後自己去歷史裡找是哪幾筆。占驗提醒那則通知也只送到統計頁（S62 修掉）。
 *
 * 這與 S53「`setSelectedFolderId` 從來沒有被呼叫過」是同一族：**資料備妥，
 * 只差最後有人用它**。型別攔不住（算出來不用完全合法），單元測試也測不到
 * （上面那些 `pendingVerification` 的測試全都是綠的，斷的是畫面那一側）。
 */
describe('待回填在畫面上要有出口', () => {
  const HOME = path.join(__dirname, '..', 'app', '(tabs)', 'index.tsx');

  /** 去掉註解：這一段的關鍵字在說明文字裡也會出現（本檔開頭就是例子） */
  function stripComments(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(/\r?\n/)
      .map(line => line.replace(/\/\/.*$/, ''))
      .join('\n');
  }

  const homeSrc = stripComments(fs.readFileSync(HOME, 'utf-8'));

  test('首頁真的算了待回填，而不是只算最近三筆', () => {
    expect(homeSrc).toContain('pendingVerification(');
  });

  /**
   * 關鍵的一半：點下去要到**那一筆**。只顯示數字等於把「現在就去回填」
   * 變成「自己去歷史裡找」——那正是統計頁原本的樣子。
   */
  test('提示可按，且開的是最近滿期的那一筆', () => {
    expect(homeSrc).toMatch(/router\.push\(recordLink\(pending\[0\]\)\)/);
  });

  test('沒有待回填時不顯示提示', () => {
    expect(homeSrc).toMatch(/pending\.length > 0 &&/);
  });
});

/**
 * 樣本不足的分組不該坐在第一列。
 *
 * `bestCategory()` 從一開始就規定「少於 5 筆不算數」（樣本不夠就回 null，
 * 個人洞察整段不顯示）。但分項列表只依應驗率排序——於是**同一個 App
 * 一邊說一筆不算數，一邊把一筆 100% 的分組排在二十筆 85% 的上面**。
 *
 * 排序本身就是一種宣稱：畫面上「第一列」的意思就是「你在這方面最準」，
 * 那句話不該由一次巧合說出口。
 */
describe('樣本門檻', () => {
  /** 造 n 筆同組、全部應驗的記錄 */
  function group(level: string, n: number, status: OutcomeStatus = 'accurate') {
    return Array.from({ length: n }, () => verified(status, { poemLevel: level }));
  }

  test('門檻是 bestCategory 用的那一個，不是另外寫死的數字', () => {
    expect(MIN_INSIGHT_SAMPLES).toBe(5);
    // 恰好等於門檻要算足夠，差一筆則不足——邊界寫死在測試裡，
    // 日後改門檻時這兩條會一起提醒你哪些地方跟著動
    expect(accuracyByLevel(group('大吉', MIN_INSIGHT_SAMPLES))[0].enoughSamples).toBe(true);
    expect(accuracyByLevel(group('大吉', MIN_INSIGHT_SAMPLES - 1))[0].enoughSamples).toBe(false);
  });

  test('樣本足夠的排在樣本不足的前面，即使應驗率較低', () => {
    const rows = accuracyByLevel([
      ...group('中吉', 1),                      // 100%，但只有一筆
      ...group('大吉', 5, 'accurate').slice(0, 4),
      ...group('大吉', 1, 'inaccurate'),        // 大吉共 5 筆、80%
    ]);
    // 80%/5 在前，100%/1 在後——樣本夠的才有資格排第一
    expect(rows.map(r => [r.key, r.stats.rate, r.enoughSamples]))
      .toEqual([['大吉', 80, true], ['中吉', 100, false]]);
  });

  test('同樣樣本不足時，彼此仍依應驗率排序', () => {
    const rows = accuracyByLevel([
      ...group('下下', 1, 'inaccurate'),
      ...group('中吉', 1, 'accurate'),
    ]);
    expect(rows.map(r => r.key)).toEqual(['中吉', '下下']);
    expect(rows.every(r => !r.enoughSamples)).toBe(true);
  });
});

describe('verifyReminderPolicy', () => {
  test('沒設定過：啟用，預設天數', () => {
    expect(verifyReminderPolicy(undefined)).toEqual({ enabled: true, days: VERIFY_REMINDER_DAYS });
  });

  test.each([...VERIFY_REMINDER_CHOICES])('可選的 %i 天：啟用並照該天數', days => {
    expect(verifyReminderPolicy(days)).toEqual({ enabled: true, days });
  });

  test('關閉（0）：停用；days 仍是預設天數，供統計頁那一行使用', () => {
    expect(verifyReminderPolicy(VERIFY_REMINDER_OFF)).toEqual({ enabled: false, days: VERIFY_REMINDER_DAYS });
  });

  /**
   * 備份與雲端同步會把別處寫的設定帶進來，手改的檔案也一樣。
   * 不認得的值退回「啟用＋預設天數」，而不是關閉：靜靜把提醒關掉，
   * 比多提醒一次更難被發現。
   */
  test.each([5, -1, 1.5, NaN, '7', null, {}, true])('不認得的值 %p：退回啟用＋預設天數', bad => {
    expect(verifyReminderPolicy(bad)).toEqual({ enabled: true, days: VERIFY_REMINDER_DAYS });
  });

  test('預設天數在可選項裡、關閉值不在（0 不能被當成一個「0 天」的選項）', () => {
    expect(VERIFY_REMINDER_CHOICES as readonly number[]).toContain(VERIFY_REMINDER_DAYS);
    expect(VERIFY_REMINDER_CHOICES as readonly number[]).not.toContain(VERIFY_REMINDER_OFF);
  });

  test('與 pendingVerification 串起來：7 天政策下，8 天前的記錄算待回填、預設政策下不算', () => {
    const r = rec({ timestamp: NOW - 8 * DAY });
    expect(pendingVerification([r], NOW, verifyReminderPolicy(7).days)).toHaveLength(1);
    expect(pendingVerification([r], NOW, verifyReminderPolicy(undefined).days)).toHaveLength(0);
  });
});

/**
 * 應驗率趨勢（路線圖 #10）。
 *
 * 分項應驗率都是固定維度的分組，答不了「我用越久，準確率是變好還是變差」。
 * 這裡的每個斷言都對應 S72 提案的一項設計決定，不是只檢查「有回傳東西」。
 */
describe('accuracyTrend', () => {
  /** 依序造 N 筆已回填記錄，占卜時間逐筆遞增（第 0 筆最早） */
  function series(statuses: OutcomeStatus[]): DivinationRecord[] {
    return statuses.map((status, i) =>
      verified(status, { id: `t${i}`, timestamp: NOW - (statuses.length - i) * DAY }));
  }
  const A: OutcomeStatus = 'accurate';
  const P: OutcomeStatus = 'partial';
  const X: OutcomeStatus = 'inaccurate';

  test('視窗預設沿用 MIN_INSIGHT_SAMPLES；解鎖門檻是兩個視窗量', () => {
    const t = accuracyTrend([]);
    expect(t.window).toBe(MIN_INSIGHT_SAMPLES);
    expect(t.needed).toBe(MIN_INSIGHT_SAMPLES * 2);
  });

  test('不足兩個視窗量：不畫線，回報還差幾筆', () => {
    const t = accuracyTrend(series([A, A, A, X, X, A, A]));
    expect(t.points).toEqual([]);
    expect(t.verified).toBe(7);
    expect(t.remaining).toBe(3);
  });

  test('剛好兩個視窗量：解鎖，每前進一筆一個點（10 筆 → 6 點，n 從 5 到 10）', () => {
    const t = accuracyTrend(series([X, X, X, X, X, A, A, A, A, A]));
    expect(t.remaining).toBe(0);
    expect(t.points.map(p => p.n)).toEqual([5, 6, 7, 8, 9, 10]);
    // 視窗逐步從全錯換成全對：0、20、40、60、80、100
    expect(t.points.map(p => p.rate)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  test('部分應驗計半分，與統計頁其他地方同一套算法', () => {
    const t = accuracyTrend(series([P, P, P, P, P, P, P, P, P, P]));
    expect(t.points.every(p => p.rate === 50)).toBe(true);
  });

  test('未回填的記錄不計入：既不占視窗、也不算進 verified', () => {
    const unverified = rec({ id: 'u', timestamp: NOW - 100 * DAY });
    const t = accuracyTrend([unverified, ...series([A, A, A, A, A, A, A, A, A])]);
    expect(t.verified).toBe(9);
    expect(t.points).toEqual([]);
  });

  test('狀態值不合法的記錄不計入（備份或手改檔案可能帶進來）', () => {
    const bad = verified('accurate', { id: 'bad', timestamp: NOW - 100 * DAY });
    (bad.outcome as unknown as { status: string }).status = 'weird';
    const t = accuracyTrend([bad, ...series([A, A, A, A, A, A, A, A, A])]);
    expect(t.verified).toBe(9);
  });

  /**
   * 依占卜時間排，不是依回填時間，也不是輸入順序。
   * 回填常是隔一陣子一口氣補完：依回填時間排，會把同一天補的十筆排成一團，
   * 與這個人「判得越來越準嗎」無關。
   */
  test('依占卜時間排列：輸入順序與回填時間都不影響結果', () => {
    const ordered = series([X, X, X, X, X, A, A, A, A, A]);
    const expected = accuracyTrend(ordered).points;

    const shuffled = [ordered[7], ordered[2], ordered[9], ordered[0], ordered[5],
      ordered[3], ordered[8], ordered[1], ordered[6], ordered[4]];
    expect(accuracyTrend(shuffled).points).toEqual(expected);

    // 回填時間完全顛倒（最早占的最晚才回填）
    const reversedVerify = ordered.map((r, i) => ({
      ...r, outcome: { ...r.outcome!, verifiedAt: NOW + (10 - i) * DAY },
    }));
    expect(accuracyTrend(reversedVerify).points).toEqual(expected);
  });

  test('同一毫秒的兩筆以 id 定序，結果不隨輸入順序漂移', () => {
    const same = (id: string, status: OutcomeStatus) => verified(status, { id, timestamp: NOW - 50 * DAY });
    const rest = series([A, A, A, A, A, A, A, A]);
    const one = accuracyTrend([same('a', X), same('b', A), ...rest]).points;
    const two = accuracyTrend([same('b', A), same('a', X), ...rest]).points;
    expect(one).toEqual(two);
  });

  test('可自訂視窗：視窗 3 → 6 筆就解鎖', () => {
    const t = accuracyTrend(series([A, A, X, X, A, A]), 3);
    expect(t.needed).toBe(6);
    expect(t.points.map(p => p.n)).toEqual([3, 4, 5, 6]);
  });

  test('不修改傳入的陣列', () => {
    // 故意把輸入排成逆序：若函式就地排序，傳入的陣列順序就會被改掉
    const input = series([X, X, X, X, X, A, A, A, A, A]).reverse();
    const idsBefore = input.map(r => r.id);
    accuracyTrend(input);
    expect(input.map(r => r.id)).toEqual(idsBefore);
  });
});

