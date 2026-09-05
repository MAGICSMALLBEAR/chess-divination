// 守門：被搜尋篩過的清單，空狀態要說對「為什麼是空的」
//
// 收藏頁三個分頁（歷史、收藏、資料夾詳細）共用同一個搜尋框，但空狀態原本
// 一律說「你還沒有任何記錄／這個資料夾還沒有記錄」，還附上「開始占卜後
// 記錄將顯示於此」這種對一個存了兩百筆的人毫無用處的指示。
//
// 資料夾詳細頁最露餡：標題那行印著「5 筆」，下面同時寫「這個資料夾還沒有
// 記錄」——兩句話在同一個畫面上互相打臉。這正是 S54 修資料夾死 id 時的
// 同一個判準（筆數與內容必須對得起來），只是那次修的是資料，這次是說詞。
//
// 圖鑑早就分得清楚（`library.notFound`／`library.notFoundLingqi`），
// 收藏頁沒有跟上。型別與單元測試都看不到這種缺陷：兩個字串各自都存在、
// 都翻譯完整，錯的是「什麼時候拿哪一個出來說」。

import fs from 'fs';
import path from 'path';
import { translations } from '../services/i18n';

const SRC = path.join(__dirname, '..');

/** 去掉註解——本檔守的關鍵字在畫面檔的說明文字裡也會出現 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

const collectionSrc = stripComments(
  fs.readFileSync(path.join(SRC, 'app', '(tabs)', 'collection.tsx'), 'utf-8'),
);

describe('收藏頁的空狀態', () => {
  /**
   * 三份資料都經過 `sortAndFilter`（含搜尋），所以三個空狀態都必須走
   * `renderEmpty` —— 那裡才會分辨「這次搜尋沒有命中」與「真的沒有記錄」。
   * 直接寫死一個 <View style={styles.empty}> 的分支就會漏掉這個分辨。
   */
  const branches = [...collectionSrc.matchAll(/(\w+Data)\.length === 0 &&([^\n]*)/g)]
    .map(m => ({ data: m[1], tail: m[2] }));

  /** 反空轉：正則失效時要紅，而不是零個分支全過 */
  test('掃得到三個被搜尋篩過的清單', () => {
    expect(branches.map(b => b.data).sort()).toEqual(
      ['favoritesData', 'folderRecordsData', 'historyData'],
    );
  });

  test.each(branches.map(b => [b.data, b.tail] as const))(
    '%s 的空狀態走 renderEmpty，才分得出「沒命中」與「沒有」',
    (_data, tail) => {
      expect(tail).toContain('renderEmpty(');
    },
  );

  test('renderEmpty 會在搜尋中改說 noMatch', () => {
    const helper = collectionSrc.slice(collectionSrc.indexOf('function renderEmpty'));
    expect(helper).toContain('collection.noMatch');
    expect(helper).toContain('collection.noMatchDesc');
    // 判準是搜尋字串本身，不是「有沒有資料」——後者恆為空，分辨不了原因
    expect(helper).toMatch(/search\.trim\(\)/);
  });

  /**
   * 資料夾清單（第三頁未選資料夾時）刻意不在上面那組裡：它印的是資料夾，
   * 而資料夾不受搜尋影響，「尚無資料夾」在搜尋中依然是實話。
   */
  test('資料夾清單本身不受搜尋影響，維持原本的空狀態', () => {
    expect(collectionSrc).toContain("t('collection.noFolders')");
    const folderList = collectionSrc.slice(collectionSrc.indexOf("t('collection.noFolders')"));
    expect(folderList).not.toContain('renderEmpty(');
  });
});

describe('空狀態文案本身', () => {
  test('noMatch 三語齊全，且不宣稱使用者沒有記錄', () => {
    for (const key of ['collection.noMatch', 'collection.noMatchDesc'] as const) {
      const entry = translations[key];
      expect(entry).toBeDefined();
      for (const lang of ['zh-TW', 'en', 'ja'] as const) {
        expect(entry[lang]?.trim()).toBeTruthy();
      }
    }
    // 「沒有記錄」是另一件事的說詞，混進來就等於沒修
    expect(translations['collection.noMatch']['zh-TW']).not.toContain('尚無');
  });
});
