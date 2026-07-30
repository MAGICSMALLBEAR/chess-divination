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

  // 棋盤
  'board.title': { 'zh-TW': '棋盤佈局', en: 'Board Layout', ja: '棋盤配置' },
  'board.place': { 'zh-TW': '選擇棋子放置', en: 'Select piece to place', ja: '駒を選んで配置' },
  'board.interpret': { 'zh-TW': '解讀佈局', en: 'Interpret Layout', ja: '配置を解読' },
  'board.reset': { 'zh-TW': '重新佈局', en: 'Reset Board', ja: '配置をリセット' },
  'board.red': { 'zh-TW': '紅方', en: 'Red', ja: '紅' },
  'board.black': { 'zh-TW': '黑方', en: 'Black', ja: '黒' },

  // 結果頁
  'reveal.title': { 'zh-TW': '占卜結果', en: 'Divination Result', ja: '占い結果' },
  'reveal.question': { 'zh-TW': '您的問題', en: 'Your Question', ja: 'ご質問' },
  'reveal.retry': { 'zh-TW': '再次抽棋', en: 'Draw Again', ja: 'もう一度引く' },
  'reveal.retryBoard': { 'zh-TW': '重新佈局', en: 'New Layout', ja: '再配置' },
  'reveal.home': { 'zh-TW': '回首頁', en: 'Home', ja: 'ホーム' },
  'reveal.aiLoading': { 'zh-TW': 'AI 解讀中...', en: 'AI analyzing...', ja: 'AI解読中...' },
  'reveal.aiTitle': { 'zh-TW': 'AI 智慧解讀', en: 'AI Interpretation', ja: 'AI智慧解読' },
  'reveal.aiActions': { 'zh-TW': '建議行動', en: 'Suggested Actions', ja: '推奨アクション' },
  'reveal.position': { 'zh-TW': '棋盤佈局解讀', en: 'Board Position Reading', ja: '盤面配置の解読' },

  // 收藏
  'collection.title': { 'zh-TW': '收藏記錄', en: 'Collection', ja: 'コレクション' },
  'collection.noHistory': { 'zh-TW': '尚無占卜記錄', en: 'No records yet', ja: 'まだ記録がありません' },
  'collection.noFav': { 'zh-TW': '尚無收藏記錄', en: 'No favorites yet', ja: 'お気に入りはまだありません' },

  // 設定(擴展)
  'settings.personal': { 'zh-TW': '個人資訊', en: 'Personal Info', ja: '個人情報' },
  'settings.appearance': { 'zh-TW': '外觀設定', en: 'Appearance', ja: '外観' },
  'settings.lang': { 'zh-TW': '語言', en: 'Language', ja: '言語' },
  'settings.preset': { 'zh-TW': '預設抽棋數量', en: 'Default Piece Count', ja: 'デフォルト駒数' },
  'settings.experience': { 'zh-TW': '體驗設定', en: 'Experience', ja: '体験' },
  'settings.tools': { 'zh-TW': '工具', en: 'Tools', ja: 'ツール' },
  'settings.library': { 'zh-TW': '籤詩圖鑑', en: 'Poem Library', ja: '詩鑑' },
  'settings.stats': { 'zh-TW': '占卜統計', en: 'Statistics', ja: '統計' },
  'settings.data': { 'zh-TW': '資料管理', en: 'Data Management', ja: 'データ管理' },
  'settings.about': { 'zh-TW': '關於', en: 'About', ja: 'について' },
  'settings.userName': { 'zh-TW': '用戶名稱', en: 'User Name', ja: 'ユーザー名' },

  // 引導
  'onboarding.welcome': { 'zh-TW': '歡迎來到象棋占卜', en: 'Welcome to Chess Divination', ja: '象棋占いへようこそ' },
  'onboarding.step1desc': { 'zh-TW': '以棋問道，觀象知機。\n從古老的象棋智慧中，\n尋找人生的方向與啟發。', en: 'Seek wisdom through chess.\nDiscover life guidance\nfrom ancient chess insights.', ja: '棋に問い、兆しを見る。\n古来の象棋の知恵から\n人生の指針を見つける。' },
  'onboarding.step2': { 'zh-TW': '雙重占卜模式', en: 'Two Divination Modes', ja: '二つの占いモード' },

  // 統計
  'stats.overview': { 'zh-TW': '總次數', en: 'Total', ja: '総回数' },
  'stats.draw': { 'zh-TW': '抽棋', en: 'Draw', ja: '抽棋' },
  'stats.board': { 'zh-TW': '佈局', en: 'Board', ja: '配置' },
  'stats.fav': { 'zh-TW': '收藏', en: 'Fav', ja: 'お気に入り' },
  'stats.levelDist': { 'zh-TW': '吉凶分佈', en: 'Fortune Distribution', ja: '吉凶分布' },
  'stats.topPieces': { 'zh-TW': '最常抽到棋子類型', en: 'Most Drawn Pieces', ja: '最も引かれた駒' },
  'stats.noData': { 'zh-TW': '尚無資料', en: 'No data yet', ja: 'まだデータなし' },
  'stats.filterAll': { 'zh-TW': '全部', en: 'All', ja: '全て' },
  'stats.filterWeek': { 'zh-TW': '本週', en: 'Week', ja: '今週' },
  'stats.filterMonth': { 'zh-TW': '本月', en: 'Month', ja: '今月' },

  // 圖鑑
  'library.title': { 'zh-TW': '籤詩圖鑑', en: 'Poem Library', ja: '詩鑑' },
  'library.search': { 'zh-TW': '搜尋籤詩...', en: 'Search poems...', ja: '詩を検索...' },
  'library.all': { 'zh-TW': '全部', en: 'All', ja: '全て' },
  'library.expand': { 'zh-TW': '展開詳情', en: 'Expand', ja: '詳細' },
  'library.collapse': { 'zh-TW': '收起', en: 'Collapse', ja: '閉じる' },

  // 通用
  'common.back': { 'zh-TW': '返回', en: 'Back', ja: '戻る' },
  'common.save': { 'zh-TW': '儲存', en: 'Save', ja: '保存' },
  'common.delete': { 'zh-TW': '刪除', en: 'Delete', ja: '削除' },
  'common.cancel': { 'zh-TW': '取消', en: 'Cancel', ja: 'キャンセル' },
  'common.confirm': { 'zh-TW': '確認', en: 'Confirm', ja: '確認' },
  'common.share': { 'zh-TW': '分享', en: 'Share', ja: '共有' },
  'common.favorite': { 'zh-TW': '收藏', en: 'Favorite', ja: 'お気に入り' },
  'common.loading': { 'zh-TW': '載入中...', en: 'Loading...', ja: '読み込み中...' },
};

// Singleton + Listener pattern
type Listener = () => void;
const listeners = new Set<Listener>();

let currentLang: Lang = 'zh-TW';

export function setLang(lang: Lang) {
  currentLang = lang;
  listeners.forEach(fn => fn());
}

export function getLang(): Lang {
  return currentLang;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
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
