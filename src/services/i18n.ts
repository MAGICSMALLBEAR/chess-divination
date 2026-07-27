// 多語言服務 (簡化版)
// zh-TW / en / ja

export type Lang = 'zh-TW' | 'en' | 'ja';

const translations: Record<string, Record<Lang, string>> = {
  // 首頁
  'home.title': { 'zh-TW': '象棋占卜', en: 'Chess Divination', ja: '象棋占い' },
  'home.tagline': { 'zh-TW': '以棋問道 · 觀象知機', en: 'Ask Through Chess · See the Signs', ja: '棋に問う · 兆しを見る' },
  'home.daily': { 'zh-TW': '今日棋運', en: "Today's Chess Fortune", ja: '今日の棋運' },
  'home.luckyPiece': { 'zh-TW': '幸運棋子', en: 'Lucky Piece', ja: 'ラッキー駒' },
  'home.luckyDir': { 'zh-TW': '幸運方位', en: 'Lucky Direction', ja: 'ラッキー方位' },

  // 模式選擇
  'mode.draw': { 'zh-TW': '抽棋占卜', en: 'Draw Divination', ja: '抽棋占い' },
  'mode.board': { 'zh-TW': '棋盤佈局', en: 'Board Layout', ja: '棋盤配置' },

  // 占卜流程
  'draw.question': { 'zh-TW': '請問您想問什麼？', en: 'What would you like to ask?', ja: '何をお聞きになりますか？' },
  'draw.count': { 'zh-TW': '選擇抽取棋子數量', en: 'Select number of pieces', ja: '引く駒の数を選ぶ' },

  // 籤詩
  'poem.level': { 'zh-TW': '吉凶', en: 'Fortune Level', ja: '吉凶' },
  'poem.vernacular': { 'zh-TW': '白話解釋', en: 'Explanation', ja: '解説' },
  'poem.story': { 'zh-TW': '典故參考', en: 'Reference Story', ja: '典故' },
  'poem.categories': { 'zh-TW': '各面向詳解', en: 'Category Details', ja: '項目別詳細' },

  // 收藏
  'collection.history': { 'zh-TW': '歷史記錄', en: 'History', ja: '履歴' },
  'collection.favorites': { 'zh-TW': '我的收藏', en: 'My Favorites', ja: 'お気に入り' },
  'collection.empty': { 'zh-TW': '尚無占卜記錄', en: 'No records yet', ja: 'まだ記録がありません' },

  // 設定
  'settings.title': { 'zh-TW': '設定', en: 'Settings', ja: '設定' },
  'settings.theme': { 'zh-TW': '主題模式', en: 'Theme Mode', ja: 'テーマ' },
  'settings.sound': { 'zh-TW': '音效', en: 'Sound', ja: 'サウンド' },
  'settings.haptic': { 'zh-TW': '觸覺回饋', en: 'Haptic Feedback', ja: '触覚フィードバック' },
  'settings.backup': { 'zh-TW': '備份資料', en: 'Backup Data', ja: 'データバックアップ' },
  'settings.restore': { 'zh-TW': '還原資料', en: 'Restore Data', ja: 'データ復元' },

  // 通用
  'common.back': { 'zh-TW': '返回', en: 'Back', ja: '戻る' },
  'common.save': { 'zh-TW': '儲存', en: 'Save', ja: '保存' },
  'common.delete': { 'zh-TW': '刪除', en: 'Delete', ja: '削除' },
  'common.cancel': { 'zh-TW': '取消', en: 'Cancel', ja: 'キャンセル' },
  'common.confirm': { 'zh-TW': '確認', en: 'Confirm', ja: '確認' },
  'common.share': { 'zh-TW': '分享', en: 'Share', ja: '共有' },
  'common.favorite': { 'zh-TW': '收藏', en: 'Favorite', ja: 'お気に入り' },
};

let currentLang: Lang = 'zh-TW';

export function setLang(lang: Lang) {
  currentLang = lang;
}

export function getLang(): Lang {
  return currentLang;
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLang] || entry['zh-TW'];
}

// 取得所有語言的選項列表
export const LANG_OPTIONS: { key: Lang; label: string }[] = [
  { key: 'zh-TW', label: '繁體中文' },
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' },
];
