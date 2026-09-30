// 相容入口：產品程式請依使用者語言動態載入 poems.en / poems.ja，
// 測試與資料檢查仍可透過此匯出一次取得完整表。
import { poemTranslationsEn } from './poems.en';
import { poemTranslationsJa } from './poems.ja';

export const poemTranslations = Object.fromEntries(
  [...new Set([...Object.keys(poemTranslationsEn), ...Object.keys(poemTranslationsJa)])].map((id) => [
    Number(id),
    {
      ...(poemTranslationsEn[Number(id)] ?? {}),
      ...(poemTranslationsJa[Number(id)] ?? {}),
    },
  ]),
);
