// 多語言服務 — UI 介面字串
//
// 分工：本檔負責介面 chrome（按鈕、標題、提示、空狀態）。
// 籤詩／棋子／成就等資料內容的翻譯在 src/data/translations/，
// 經 services/localize.ts 取用——兩者資料形狀不同，混在一起會讓
// 一份 76 key 的字典硬吞 1,440 條長文，查找與維護都變糟。
//
// 佔位符以 `{name}` 標記，見 t() 的說明。

export type Lang = 'zh-TW' | 'en' | 'ja';

/**
 * 翻譯表。
 *
 * 對外匯出是為了讓測試能直接檢查「每個鍵是否三語齊全」——
 * 以正規式掃原始碼會被含撇號而改用雙引號的英文值誤判（如 "Today's ..."）。
 * 應用程式碼請一律走 t()，不要直接讀這張表。
 */
export const translations: Record<string, Record<Lang, string>> = {
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
  'board.spread': { 'zh-TW': '選擇牌陣', en: 'Choose a spread', ja: '配置を選ぶ' },
  'board.spreadFree': { 'zh-TW': '自由佈局', en: 'Free layout', ja: '自由配置' },
  'board.spreadTimeline': { 'zh-TW': '三才時間陣', en: 'Timeline spread', ja: '時系列配置' },
  'board.spreadChoice': { 'zh-TW': '兩難抉擇陣', en: 'Choice spread', ja: '選択配置' },
  'board.spreadRelationship': { 'zh-TW': '關係互動陣', en: 'Relationship spread', ja: '関係配置' },
  'board.spreadStrategy': { 'zh-TW': '行動策略陣', en: 'Strategy spread', ja: '戦略配置' },
  'board.spreadFreeDesc': { 'zh-TW': '依直覺在棋盤任意落子，保留完整方位解讀。', en: 'Place freely and keep the full positional reading.', ja: '直感で自由に配置し、方位の読みを保ちます。' },
  'board.spreadTimelineDesc': { 'zh-TW': '以過去、當下、下一步串連事情演變。', en: 'Connect the past, present, and next step.', ja: '過去・現在・次の一手で流れを読みます。' },
  'board.spreadChoiceDesc': { 'zh-TW': '比較兩個選項與自己的條件。', en: 'Compare two options with your own position.', ja: '二つの選択肢と自分の状況を比べます。' },
  'board.spreadRelationshipDesc': { 'zh-TW': '從雙方與關係核心觀察互動。', en: 'Read both sides and the heart of the relationship.', ja: '双方と関係の核から相互作用を読みます。' },
  'board.spreadStrategyDesc': { 'zh-TW': '辨識資源、阻礙與可執行的一著。', en: 'Identify resources, obstacles, and an actionable move.', ja: '資源・障害・実行できる一手を見極めます。' },
  'board.spreadNext': { 'zh-TW': '下一子：{label}', en: 'Next: {label}', ja: '次：{label}' },
  'board.slotTimelinePast': { 'zh-TW': '過去', en: 'Past', ja: '過去' },
  'board.slotTimelinePresent': { 'zh-TW': '當下', en: 'Present', ja: '現在' },
  'board.slotTimelineNext': { 'zh-TW': '下一步', en: 'Next step', ja: '次の一手' },
  'board.slotChoiceOptionA': { 'zh-TW': '選項 A', en: 'Option A', ja: '選択肢 A' },
  'board.slotChoiceSelf': { 'zh-TW': '我方', en: 'You', ja: '自分' },
  'board.slotChoiceOptionB': { 'zh-TW': '選項 B', en: 'Option B', ja: '選択肢 B' },
  'board.slotRelationshipSelf': { 'zh-TW': '我方', en: 'You', ja: '自分' },
  'board.slotRelationshipBond': { 'zh-TW': '關係核心', en: 'The bond', ja: '関係の核心' },
  'board.slotRelationshipOther': { 'zh-TW': '對方', en: 'The other', ja: '相手' },
  'board.slotStrategyResource': { 'zh-TW': '可用資源', en: 'Resources', ja: '使える資源' },
  'board.slotStrategyObstacle': { 'zh-TW': '主要阻礙', en: 'Obstacle', ja: '主な障害' },
  'board.slotStrategyAction': { 'zh-TW': '建議行動', en: 'Suggested move', ja: '取るべき一手' },
  'board.spreadDone': { 'zh-TW': '牌陣已完成', en: 'Spread complete', ja: '配置が完成しました' },
  'board.spreadFreeHint': { 'zh-TW': '適合開放式問題與整體趨勢；依直覺自行決定落子位置。', en: 'For open questions and overall trends; place each piece where intuition leads.', ja: '自由な問いと全体の流れに。直感に従って配置します。' },
  'board.spreadTimelineHint': { 'zh-TW': '適合詢問事件的背景與近期走向。', en: 'For the background and near-term direction of an event.', ja: '出来事の背景と近い将来の流れに。' },
  'board.spreadChoiceHint': { 'zh-TW': '適合比較兩個選項；請在問題中清楚寫出 A 與 B。', en: 'For comparing two options; state A and B clearly in your question.', ja: '二つの選択肢の比較に。質問に A と B を明記してください。' },
  'board.spreadRelationshipHint': { 'zh-TW': '適合感情、合作或人際溝通問題。', en: 'For relationships, collaboration, and communication.', ja: '恋愛・協力・対人コミュニケーションに。' },
  'board.spreadStrategyHint': { 'zh-TW': '適合工作、計畫與需要推進的決策。', en: 'For work, plans, and decisions that need momentum.', ja: '仕事・計画・前進させたい意思決定に。' },
  'board.optionAPlaceholder': { 'zh-TW': '選項 A，例如：留在現職', en: 'Option A, e.g. stay in current role', ja: '選択肢 A、例：現職に残る' },
  'board.optionBPlaceholder': { 'zh-TW': '選項 B，例如：轉換跑道', en: 'Option B, e.g. change career', ja: '選択肢 B、例：転職する' },

  // 結果頁
  'reveal.title': { 'zh-TW': '占卜結果', en: 'Divination Result', ja: '占い結果' },
  'reveal.question': { 'zh-TW': '您的問題', en: 'Your Question', ja: 'ご質問' },
  'reveal.retry': { 'zh-TW': '再次抽棋', en: 'Draw Again', ja: 'もう一度引く' },
  'reveal.retryBoard': { 'zh-TW': '重新佈局', en: 'New Layout', ja: '再配置' },
  'reveal.home': { 'zh-TW': '回首頁', en: 'Home', ja: 'ホーム' },
  'reveal.missing': { 'zh-TW': '找不到這筆占卜記錄', en: 'This divination record was not found', ja: 'この占い記録が見つかりません' },
  'reveal.missingDesc': { 'zh-TW': '記錄可能已被刪除，或來自其他裝置。', en: 'It may have been deleted or belongs to another device.', ja: '削除されたか、別の端末の記録の可能性があります。' },
  // 解讀為規則式推導，非語言模型，故不使用「AI」字樣
  'reveal.deepTitle': { 'zh-TW': '深度解讀', en: 'In-depth Reading', ja: '詳細解読' },
  'reveal.deepActions': { 'zh-TW': '建議行動', en: 'Suggested Actions', ja: '推奨アクション' },
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
  'settings.presetHint': {
    'zh-TW': '抽棋頁會把這個數量標為建議選項，仍可當場改選。',
    en: 'The draw screen highlights this count as suggested; you can still pick another.',
    ja: '抽棋画面でこの枚数を推奨として表示します。その場で変更もできます。',
  },
  'settings.animSpeed': { 'zh-TW': '抽棋動畫速度', en: 'Draw Animation Speed', ja: '抽棋アニメーション速度' },
  'settings.animSpeedHint': {
    'zh-TW': '影響抽棋與開牌動畫的長短，不影響占卜結果。',
    en: 'Changes how long the draw and reveal animations run. It does not affect the reading.',
    ja: '抽棋と開示アニメーションの長さのみ変わります。占い結果には影響しません。',
  },
  'settings.speedSlow': { 'zh-TW': '慢', en: 'Slow', ja: 'ゆっくり' },
  'settings.speedNormal': { 'zh-TW': '正常', en: 'Normal', ja: '標準' },
  'settings.speedFast': { 'zh-TW': '快', en: 'Fast', ja: '速い' },
  'draw.suggested': { 'zh-TW': '建議', en: 'Suggested', ja: 'おすすめ' },
  'settings.experience': { 'zh-TW': '體驗設定', en: 'Experience', ja: '体験' },
  'settings.tools': { 'zh-TW': '工具', en: 'Tools', ja: 'ツール' },
  'settings.library': { 'zh-TW': '籤詩圖鑑', en: 'Poem Library', ja: '詩鑑' },
  'settings.stats': { 'zh-TW': '占卜統計', en: 'Statistics', ja: '統計' },
  'settings.data': { 'zh-TW': '資料管理', en: 'Data Management', ja: 'データ管理' },
  'settings.about': { 'zh-TW': '關於', en: 'About', ja: 'について' },
  'settings.gender': { 'zh-TW': '占者性別', en: 'Diviner', ja: '占者の性別' },
  'settings.genderMale': { 'zh-TW': '男', en: 'Male', ja: '男' },
  'settings.genderFemale': { 'zh-TW': '女', en: 'Female', ja: '女' },
  'settings.genderUnset': { 'zh-TW': '不指定', en: 'Unset', ja: '未指定' },
  'settings.genderNote': { 'zh-TW': '僅用於感情問事的用神取法（男占妻財、女占官鬼）。不指定則感情不出用神斷語。', en: 'Used only to pick the use-god for relationship questions (wealth for men, officer for women). Left unset, no judgment is shown for those.', ja: '恋愛問占の用神取りにのみ使用します（男は妻財、女は官鬼）。未指定の場合、恋愛では断を表示しません。' },
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
  'common.ok': { 'zh-TW': '確定', en: 'OK', ja: 'OK' },
  'common.add': { 'zh-TW': '新增', en: 'Add', ja: '追加' },
  'common.edit': { 'zh-TW': '編輯', en: 'Edit', ja: '編集' },
  'common.clear': { 'zh-TW': '清除', en: 'Clear', ja: 'クリア' },
  'common.name': { 'zh-TW': '名稱', en: 'Name', ja: '名前' },
  'common.icon': { 'zh-TW': '圖示', en: 'Icon', ja: 'アイコン' },
  'common.saving': { 'zh-TW': '儲存中…', en: 'Saving…', ja: '保存中…' },
  'common.retry': { 'zh-TW': '重試', en: 'Retry', ja: '再試行' },
  'common.unfavorite': { 'zh-TW': '已收藏', en: 'Favorited', ja: 'お気に入り済み' },

  // 無障礙標籤
  //
  // 純圖示按鈕在讀屏下只會被念成「按鈕」——沒有標籤，使用者無從得知
  // 按下去會發生什麼。這些字串不會顯示在畫面上，只走 accessibilityLabel。
  'a11y.shareDailyFortune': { 'zh-TW': '分享每日運勢', en: 'Share daily fortune', ja: '今日の運勢を共有' },
  'a11y.addToFolder': { 'zh-TW': '加入資料夾', en: 'Add to folder', ja: 'フォルダに追加' },
  'a11y.favoriteRecord': { 'zh-TW': '收藏這筆記錄', en: 'Favorite this record', ja: 'この記録をお気に入りに追加' },
  'a11y.unfavoriteRecord': { 'zh-TW': '取消收藏這筆記錄', en: 'Unfavorite this record', ja: 'この記録のお気に入りを解除' },
  'a11y.deleteRecord': { 'zh-TW': '刪除這筆記錄', en: 'Delete this record', ja: 'この記録を削除' },
  'a11y.deleteFolder': { 'zh-TW': '刪除資料夾', en: 'Delete folder', ja: 'フォルダを削除' },
  'a11y.randomPoem': { 'zh-TW': '隨機翻閱一首籤詩', en: 'Open a random poem', ja: 'ランダムに籤詩を開く' },
  'a11y.enterFullscreen': { 'zh-TW': '進入全螢幕棋盤', en: 'Enter fullscreen board', ja: '全画面の盤に切り替え' },
  'a11y.exitFullscreen': { 'zh-TW': '離開全螢幕棋盤', en: 'Exit fullscreen board', ja: '全画面の盤を終了' },

  // 分頁列
  'tab.home': { 'zh-TW': '首頁', en: 'Home', ja: 'ホーム' },
  'tab.collection': { 'zh-TW': '收藏', en: 'Collection', ja: 'コレクション' },
  'tab.settings': { 'zh-TW': '設定', en: 'Settings', ja: '設定' },

  // 首頁（擴充）
  'home.todayFortune': { 'zh-TW': '今日運勢', en: "Today's Fortune", ja: '今日の運勢' },
  'home.luckyNum': { 'zh-TW': '幸運數字', en: 'Lucky Number', ja: 'ラッキーナンバー' },
  'home.luckyColor': { 'zh-TW': '幸運色', en: 'Lucky Color', ja: 'ラッキーカラー' },
  'home.recent': { 'zh-TW': '最近占卜', en: 'Recent Divinations', ja: '最近の占い' },
  'home.quickDraw': { 'zh-TW': '快速抽一籤', en: 'Quick Draw', ja: 'クイック占い' },
  'home.quickDrawDesc': { 'zh-TW': '直接抽取 2 顆棋子獲得指引', en: 'Draw 2 pieces for instant guidance', ja: '2つの駒を引いて導きを得る' },
  'home.streak': { 'zh-TW': '連續 {n} 天', en: '{n}-day streak', ja: '{n}日連続' },
  'home.motto1': { 'zh-TW': '棋局如人生，落子無悔。', en: 'The board is life; every move is final.', ja: '棋局は人生の如し、着手に悔いなし。' },
  'home.motto2': { 'zh-TW': '觀棋不語真君子，起手無回大丈夫。', en: 'Watch in silence; commit without retreat.', ja: '観棋不語こそ君子、起手無回こそ大丈夫。' },
  'home.shareFailed': { 'zh-TW': '分享失敗', en: 'Share failed', ja: '共有に失敗しました' },
  'home.copyFailed': { 'zh-TW': '複製到剪貼簿失敗', en: 'Failed to copy to clipboard', ja: 'クリップボードへのコピーに失敗しました' },

  // 模式選擇
  'mode.pick': { 'zh-TW': '選擇占卜方式', en: 'Choose a Divination Mode', ja: '占い方法を選ぶ' },
  'mode.drawDesc': { 'zh-TW': '從 32 顆棋子中隨機抽取', en: 'Draw at random from 32 pieces', ja: '32の駒からランダムに引く' },
  'mode.drawHint': { 'zh-TW': '觀棋象而知天機', en: 'Read the pieces, read the signs', ja: '棋象を観て天機を知る' },
  'mode.drawTag': { 'zh-TW': '快速便捷', en: 'Quick', ja: '手軽' },
  'mode.boardDesc': { 'zh-TW': '在棋盤上親手擺放棋子位置', en: 'Place pieces on the board yourself', ja: '盤上に自ら駒を配置する' },
  'mode.boardHint': { 'zh-TW': '佈局問道更深層', en: 'A deeper inquiry through placement', ja: '配置による深い問い' },
  'mode.boardTag': { 'zh-TW': '深度體驗', en: 'In-depth', ja: '本格' },
  'mode.footer': { 'zh-TW': '棋中有道，心誠則靈', en: 'The Way lies in the game; sincerity brings clarity', ja: '棋中に道あり、心誠なれば霊験あり' },

  // 抽棋
  'draw.single': { 'zh-TW': '單棋', en: 'One Piece', ja: '一駒' },
  'draw.double': { 'zh-TW': '雙棋', en: 'Two Pieces', ja: '二駒' },
  'draw.triple': { 'zh-TW': '三棋', en: 'Three Pieces', ja: '三駒' },
  'draw.singleDesc': { 'zh-TW': '一針見血', en: 'Straight to the point', ja: '一針見血' },
  'draw.doubleDesc': { 'zh-TW': '陰陽互濟', en: 'Yin and yang in balance', ja: '陰陽相済' },
  'draw.tripleDesc': { 'zh-TW': '天地人合', en: 'Heaven, earth, and man', ja: '天地人合' },
  'draw.interpreting': { 'zh-TW': '正在為您解讀…', en: 'Interpreting…', ja: '解読中…' },
  'draw.focus': { 'zh-TW': '誠心問道', en: 'Ask with sincerity', ja: '誠心をもって問う' },
  'draw.reveal': { 'zh-TW': '揭露籤詩', en: 'Reveal the Poem', ja: '詩を開く' },
  'draw.redraw': { 'zh-TW': '重新抽取', en: 'Draw Again', ja: '引き直す' },

  // 棋盤（擴充）
  'board.confirmExit': { 'zh-TW': '確定要返回嗎？', en: 'Leave this page?', ja: '戻ってよろしいですか？' },
  'board.confirmExitDesc': { 'zh-TW': '已放置的棋子將會被清除。', en: 'Pieces you have placed will be cleared.', ja: '配置した駒はクリアされます。' },
  'board.confirmExitOk': { 'zh-TW': '確定返回', en: 'Leave', ja: '戻る' },
  'board.exitFullscreen': { 'zh-TW': '退出全螢幕', en: 'Exit Fullscreen', ja: '全画面を終了' },
  'board.undo': { 'zh-TW': '撤銷', en: 'Undo', ja: '元に戻す' },
  'board.undoLast': { 'zh-TW': '撤銷上一步', en: 'Undo Last Move', ja: '一手戻す' },
  'board.reset2': { 'zh-TW': '重置', en: 'Reset', ja: 'リセット' },
  'board.read': { 'zh-TW': '解讀', en: 'Read', ja: '解読' },
  // 抽棋與棋盤兩頁共用同一個輸入框提示，故放在 common 而非任一模式底下
  'common.questionPlaceholder': { 'zh-TW': '寫下您想問的問題', en: 'Write down your question', ja: '聞きたいことを書く' },
  // 符號須與 ChessBoard 實際畫在可放置格上的字元一致（見 dropIcon）
  'board.hint': { 'zh-TW': '先從下方棋子庫選擇一顆棋子，再點擊棋盤上的 + 號放置', en: 'Pick a piece below, then tap a + on the board to place it', ja: '下の駒を選び、盤上の + をタップして配置' },
  'board.allowDuplicates': { 'zh-TW': '允許重複棋子', en: 'Allow repeated pieces', ja: '同じ駒を許可' },
  'board.placed': { 'zh-TW': '已放置 {n} 顆', en: '{n} placed', ja: '{n} 配置済み' },
  'board.placedTag': { 'zh-TW': '已放置', en: 'Placed', ja: '配置済み' },
  'board.selected': { 'zh-TW': '已選中', en: 'Selected', ja: '選択中' },

  // 結果頁（擴充）
  'reveal.hexPrimary': { 'zh-TW': '本卦', en: 'Primary Hexagram', ja: '本卦' },
  'reveal.aiTitle': { 'zh-TW': 'AI 深度解讀', en: 'AI In-depth Reading', ja: 'AI 詳細解読' },
  'reveal.aiPrompt': { 'zh-TW': '請 AI 為這支籤詩提供深度解讀', en: 'Ask AI for an in-depth reading of this poem', ja: 'AI にこの詩の詳細解読を依頼' },
  'reveal.aiAsk': { 'zh-TW': '請 AI 解讀此卦', en: 'Ask AI to interpret', ja: 'AI に解読を依頼' },
  'reveal.aiLoading': { 'zh-TW': '解讀中…', en: 'Interpreting…', ja: '解読中…' },
  'reveal.aiRetryLabel': { 'zh-TW': '重新嘗試 AI 解讀', en: 'Retry AI reading', ja: 'AI 解読を再試行' },
  'reveal.legacyNotice': {
    'zh-TW': 'ⓘ 此記錄以舊版卦法產生。舊版的卦序對應有誤（先天序誤作文王序），籤詩與卦象可能不符。為保留原始占卜結果，此記錄維持原樣不予改寫；重新占卜即採用修正後的卦法。',
    en: 'ⓘ This record used an older hexagram engine whose ordering was wrong (the Fu Xi sequence was mistaken for the King Wen sequence), so the poem may not match the hexagram. It is kept unchanged to preserve your original reading; new divinations use the corrected engine.',
    ja: 'ⓘ この記録は旧版の卦法によるものです。旧版は卦序の対応に誤りがあり（先天序を文王序と誤用）、詩と卦が一致しない場合があります。元の占い結果を保つため記録はそのまま残しています。新しい占いは修正後の卦法を使用します。',
  },
  'reveal.legacyMovingLineNotice': {
    'zh-TW': 'ⓘ 此記錄的動爻以舊版算法取得（卦數誤用 0 基索引，比梅花易數少 2）。卦序與籤詩皆正確，僅動爻及其推出的變卦、體用與古法不同。為保留原始占卜結果，此記錄維持原樣；重新占卜即採用古法。',
    en: 'ⓘ The moving line in this record came from an older rule (trigram numbers were counted from 0, two less than the classical Plum Blossom method). The hexagram and poem are correct; only the moving line — and the changed hexagram and body/use relation derived from it — differ from the classical result. It is kept unchanged to preserve your original reading; new divinations use the classical rule.',
    ja: 'ⓘ この記録の動爻は旧版の算法によるものです（卦数に 0 起点の索引を用いたため、梅花易数より 2 少ない）。卦序と詩は正しく、動爻とそこから導かれる変卦・体用のみが古法と異なります。元の占い結果を保つため記録はそのまま残しています。新しい占いは古法を使用します。',
  },
  'reveal.shareTitle': { 'zh-TW': '象棋占卜結果', en: 'Chess Divination Result', ja: '象棋占いの結果' },
  'reveal.shareLine': { 'zh-TW': '分享到 LINE？', en: 'Share to LINE?', ja: 'LINE に共有しますか？' },
  'reveal.shareLineDesc': { 'zh-TW': '取消則複製到剪貼簿', en: 'Cancel to copy to clipboard instead', ja: 'キャンセルするとクリップボードにコピーします' },
  'reveal.copied': { 'zh-TW': '已複製到剪貼簿', en: 'Copied to clipboard', ja: 'クリップボードにコピーしました' },
  'reveal.copyManual': { 'zh-TW': '複製失敗，請手動選取文字複製', en: 'Copy failed — please select and copy the text manually', ja: 'コピーに失敗しました。テキストを手動で選択してコピーしてください' },

  // 卦例推演
  'liuyao.title': { 'zh-TW': '卦例推演', en: 'Hexagram Analysis', ja: '卦例推演' },
  'liuyao.primary': { 'zh-TW': '本卦', en: 'Primary', ja: '本卦' },
  'liuyao.primaryHint': { 'zh-TW': '目前處境', en: 'Present situation', ja: '現状' },
  'liuyao.nuclear': { 'zh-TW': '互卦', en: 'Nuclear', ja: '互卦' },
  'liuyao.nuclearHint': { 'zh-TW': '隱藏因素', en: 'Hidden factors', ja: '隠れた要因' },
  'liuyao.changed': { 'zh-TW': '變卦', en: 'Resulting', ja: '変卦' },
  'liuyao.changedHint': { 'zh-TW': '發展結果', en: 'How it turns out', ja: '結果' },
  'liuyao.castAt': { 'zh-TW': '{hour}起卦', en: 'Cast at {hour}', ja: '{hour}に起卦' },
  'liuyao.moving': { 'zh-TW': '動爻在 {name}（第 {n} 爻）——變化的關鍵所在。', en: 'The moving line is {name} (line {n}) — where the change turns.', ja: '動爻は {name}（第 {n} 爻）——変化の要。' },
  'liuyao.bodyUse': { 'zh-TW': '體{body}（我） · 用{use}（事）', en: 'Body {body} (self) · Use {use} (matter)', ja: '体{body}（我） · 用{use}（事）' },
  'liuyao.season': { 'zh-TW': '{month}（{term}後，{season}）令{element}當權 · 體屬{bodyElement}', en: '{month} (after {term}, {season}): {element} rules · body is {bodyElement}', ja: '{month}（{term}後、{season}）令{element}当権 · 体は{bodyElement}' },
  'liuyao.adjusted': { 'zh-TW': '綜合時令，斷語由「{from}」調整為「{to}」。', en: 'Adjusted for the season, the verdict shifts from "{from}" to "{to}".', ja: '時令を踏まえ、断語は「{from}」から「{to}」へ。' },
  'liuyao.yaoReading': { 'zh-TW': '動爻專讀', en: 'Moving-line reading', ja: '動爻の読み' },
  'liuyao.yaoSource': { 'zh-TW': '《周易》原文（已依維基文庫校對）', en: 'Zhouyi original (verified against Wikisource)', ja: '『周易』原文（ウィキソース照合済み）' },
  'liuyao.yaoPending': { 'zh-TW': '此記錄的卦象資料不完整；下列為依爻位與本次體用條件生成的指引。', en: 'This record has incomplete hexagram data; guidance below uses this line position and the current reading.', ja: 'この記録の卦象データが不完全です。以下は爻位と今回の条件による指針です。' },
  'liuyao.najjaTitle': { 'zh-TW': '納甲六親（進階）', en: 'Na Jia & Six Relatives', ja: '納甲・六親（詳細）' },
  'liuyao.najjaMeta': { 'zh-TW': '{palace}宮屬{element} · {generation} · {month}月 · {day}日 · {xun}{void}空', en: '{palace} palace ({element}) · {generation} · {month} month · {day} · {xun}, void {void}', ja: '{palace}宮・{element} · {generation} · {month}月 · {day}日 · {xun}{void}空' },
  'liuyao.world': { 'zh-TW': '世', en: 'W', ja: '世' },
  'liuyao.responding': { 'zh-TW': '應', en: 'R', ja: '応' },
  'liuyao.void': { 'zh-TW': '空', en: 'V', ja: '空' },
  'liuyao.monthBroken': { 'zh-TW': '破', en: 'M', ja: '破' },
  'liuyao.dayClash': { 'zh-TW': '沖', en: 'D', ja: '冲' },
  'liuyao.useGod': { 'zh-TW': '用', en: 'U', ja: '用' },
  'liuyao.transformTitle': { 'zh-TW': '動爻化變', en: 'Moving-line transformation', ja: '動爻の変化' },
  'liuyao.transformText': { 'zh-TW': '本爻 {from} → 變爻 {to} · {relation}', en: 'Primary {from} → Changed {to} · {relation}', ja: '本爻 {from} → 変爻 {to} · {relation}' },
  'liuyao.najjaNote': { 'zh-TW': '標記：空＝旬空、破＝月建相沖、沖＝日支相沖。日沖不必然為日破，仍須合看旺衰與動靜。', en: 'Marks: V = void, M = month clash, D = day clash. A day clash alone is not necessarily a day break.', ja: '印：空＝旬空、破＝月建との冲、冲＝日支との冲。日支の冲だけでは日破とは限りません。' },

  // 伏神
  'liuyao.hiddenTitle': { 'zh-TW': '伏神', en: 'Hidden Spirits', ja: '伏神' },
  'liuyao.hiddenRow': { 'zh-TW': '{relative} {stemBranch}{element}　伏於{position}爻 {flying} 之下', en: '{relative} {stemBranch}{element} hidden beneath line {position} ({flying})', ja: '{relative} {stemBranch}{element}　{position}爻 {flying} の下に伏す' },
  'liuyao.hiddenBlocked': { 'zh-TW': '（{relation}，難出）', en: '({relation}, cannot emerge)', ja: '（{relation}、出にくい）' },
  'liuyao.hiddenOpen': { 'zh-TW': '（{relation}，可出）', en: '({relation}, can emerge)', ja: '（{relation}、出られる）' },
  'liuyao.hiddenNote': { 'zh-TW': '卦中不現的六親，取自本宮首卦。用神不上卦時即看此處。', en: 'Relatives absent from the hexagram, taken from the palace’s pure hexagram. Consulted when the use-god is off-chart.', ja: '卦に現れない六親を本宮首卦から取ったもの。用神が卦にない場合はここを見ます。' },

  // 用神斷語
  'liuyao.verdictTitle': { 'zh-TW': '用神斷語', en: 'Use-God Judgment', ja: '用神の断' },
  'liuyao.verdictWorld': { 'zh-TW': '世爻（{relative}持世）', en: 'the world line ({relative})', ja: '世爻（{relative}持世）' },
  'liuyao.useGodGenderHint': { 'zh-TW': '感情問事的用神取法男女相反（男占妻財、女占官鬼）。請先於「設定 → 個人資訊 → 占者性別」指定，才會出用神斷語。', en: 'For relationship questions the use-god depends on the diviner: wealth for men, officer for women. Set it under Settings → Personal Info → Diviner to see a judgment.', ja: '恋愛の用神は占者の性別で逆になります（男は妻財、女は官鬼）。「設定 → 個人情報 → 占者の性別」を指定すると断が表示されます。' },
  'liuyao.verdictLine': { 'zh-TW': '用神{relative}　{verdict}', en: 'Use-god {relative} — {verdict}', ja: '用神{relative}　{verdict}' },
  'liuyao.verdictNote': { 'zh-TW': '以上為規則式加權，逐條列出所採計的條件；非傳統斷語之定論，仍須合看問法與時機。', en: 'A rule-based weighting with every factor listed above. Not an authoritative traditional judgment — the phrasing of the question and its timing still matter.', ja: '上記はルールに基づく加重で、採用した条件をすべて列挙しています。伝統的な断定ではなく、問い方と時機も併せて見る必要があります。' },

  // 占驗簿
  'outcome.title': { 'zh-TW': '占驗', en: 'Verification', ja: '占験' },
  'outcome.accurate': { 'zh-TW': '應驗', en: 'Accurate', ja: '的中' },
  'outcome.partial': { 'zh-TW': '部分應驗', en: 'Partly Accurate', ja: '一部的中' },
  'outcome.inaccurate': { 'zh-TW': '未應驗', en: 'Not Accurate', ja: '不的中' },
  'outcome.prompt': { 'zh-TW': '後來實際如何？記下結果，日後才看得出自己在哪類事上判得準。', en: 'What actually happened? Recording outcomes is how you learn which questions you read well.', ja: '実際はどうなりましたか？結果を記録すると、どの種類の問いに強いかが見えてきます。' },
  'outcome.notePlaceholder': { 'zh-TW': '實際發生了什麼？（可留白）', en: 'What actually happened? (optional)', ja: '実際に何が起きましたか？（任意）' },
  'outcome.saveBtn': { 'zh-TW': '記下結果', en: 'Record Outcome', ja: '結果を記録' },
  'outcome.editLabel': { 'zh-TW': '修改占驗', en: 'Edit verification', ja: '占験を編集' },
  'outcome.edit': { 'zh-TW': '修改', en: 'Edit', ja: '編集' },
  'outcome.delay': { 'zh-TW': '占卜後 {n} 天回填', en: 'Recorded {n} days after the reading', ja: '占いの {n} 日後に記録' },
  'notify.verifyTitle': { 'zh-TW': '該回填占驗了', en: 'Time to verify your reading', ja: '占験を記録しましょう' },
  'notify.verifyBody': { 'zh-TW': '「{title}」已過 14 天，記下實際結果吧。', en: 'It has been 14 days since “{title}”. Record what happened.', ja: '「{title}」から14日経ちました。結果を記録しましょう。' },

  // 統計（擴充）
  'stats.trend': { 'zh-TW': '近 7 天占卜趨勢', en: 'Last 7 Days', ja: '直近7日の推移' },
  'stats.journal': { 'zh-TW': '占驗簿', en: 'Verification Journal', ja: '占験簿' },
  'stats.journalEmpty': { 'zh-TW': '尚無占驗記錄。回到任一次占卜的籤詩頁，在最下方記下實際結果，累積數則之後這裡就會顯示你的應驗率。', en: 'No verifications yet. Open any past reading and record what actually happened at the bottom of the page; your accuracy will appear here once a few are logged.', ja: 'まだ占験の記録がありません。過去の占いを開き、ページ下部に実際の結果を記録してください。数件たまると的中率が表示されます。' },
  'stats.rate': { 'zh-TW': '加權應驗率', en: 'Weighted Accuracy', ja: '加重的中率' },
  'stats.tallyAccurate': { 'zh-TW': '應驗', en: 'Accurate', ja: '的中' },
  'stats.tallyPartial': { 'zh-TW': '部分', en: 'Partial', ja: '一部' },
  'stats.tallyInaccurate': { 'zh-TW': '未應驗', en: 'Missed', ja: '不的中' },
  'stats.verifiedMeta': { 'zh-TW': '已驗 {v} 則 · 未驗 {u} 則', en: '{v} verified · {u} pending', ja: '検証済 {v} 件 · 未検証 {u} 件' },
  'stats.medianDelay': { 'zh-TW': ' · 平均占後 {n} 天回填', en: ' · typically logged {n} days later', ja: ' · 平均 {n} 日後に記録' },
  'stats.rateNote': { 'zh-TW': '應驗計 1 分、部分應驗計 0.5 分、未應驗計 0 分，除以已驗則數。', en: 'Accurate scores 1, partly accurate 0.5, missed 0 — divided by the number verified.', ja: '的中は1点、一部的中は0.5点、不的中は0点として、検証済件数で割った値です。' },
  'stats.insight': { 'zh-TW': '你問「{label}」最準——{n} 則已驗，應驗率 {rate}%。', en: 'You read "{label}" best — {n} verified, {rate}% accurate.', ja: '「{label}」が最も的中——検証済 {n} 件、的中率 {rate}%。' },
  'stats.pending': { 'zh-TW': '有 {n} 則兩週前的占卜還沒回填結果。', en: '{n} readings from over two weeks ago are still unverified.', ja: '2週間以上前の占いが {n} 件、未記録です。' },
  'stats.byCategory': { 'zh-TW': '各類問事的應驗率', en: 'Accuracy by Question Type', ja: '問い別の的中率' },
  'stats.bySpread': { 'zh-TW': '各牌陣的應驗率', en: 'Accuracy by Spread', ja: '配置別の的中率' },
  'stats.byLevel': { 'zh-TW': '各吉凶等級的應驗率', en: 'Accuracy by Fortune Level', ja: '吉凶レベル別の的中率' },
  'stats.byBodyUse': { 'zh-TW': '體用生剋的應驗率', en: 'Accuracy by Body–Use Relation', ja: '体用関係別の的中率' },
  'stats.byMovingLine': { 'zh-TW': '動爻位置的應驗率', en: 'Accuracy by Moving Line', ja: '動爻位置別の的中率' },
  'stats.bySeason': { 'zh-TW': '起卦時令的應驗率', en: 'Accuracy by Seasonal Strength', ja: '起卦時令別の的中率' },
  'stats.movingLine': { 'zh-TW': '第 {n} 爻', en: 'Line {n}', ja: '第 {n} 爻' },
  'stats.season春': { 'zh-TW': '春（木令）', en: 'Spring (Wood)', ja: '春（木令）' },
  'stats.season夏': { 'zh-TW': '夏（火令）', en: 'Summer (Fire)', ja: '夏（火令）' },
  'stats.season秋': { 'zh-TW': '秋（金令）', en: 'Autumn (Metal)', ja: '秋（金令）' },
  'stats.season冬': { 'zh-TW': '冬（水令）', en: 'Winter (Water)', ja: '冬（水令）' },
  'stats.season土旺': { 'zh-TW': '土旺', en: 'Earth phase', ja: '土旺' },
  'stats.times': { 'zh-TW': '{n} 次', en: '{n}×', ja: '{n} 回' },

  // 收藏（擴充）
  'collection.folders': { 'zh-TW': '資料夾', en: 'Folders', ja: 'フォルダ' },
  'collection.sortNewest': { 'zh-TW': '最新', en: 'Newest', ja: '新しい順' },
  'collection.sortOldest': { 'zh-TW': '最早', en: 'Oldest', ja: '古い順' },
  'collection.sortBest': { 'zh-TW': '最佳', en: 'Best', ja: '吉順' },
  'collection.search': { 'zh-TW': '搜尋籤詩內容', en: 'Search records', ja: '記録を検索' },
  'collection.batchDelete': { 'zh-TW': '批量刪除', en: 'Delete Selected', ja: '一括削除' },
  'collection.deselect': { 'zh-TW': '取消選擇', en: 'Deselect', ja: '選択解除' },
  'collection.confirmBatch': { 'zh-TW': '確定要刪除 {n} 筆記錄嗎？', en: 'Delete {n} records?', ja: '{n} 件の記録を削除しますか？' },
  'collection.confirmOne': { 'zh-TW': '確認刪除', en: 'Confirm Delete', ja: '削除の確認' },
  'collection.confirmOneDesc': { 'zh-TW': '確定要刪除此記錄嗎？', en: 'Delete this record?', ja: 'この記録を削除しますか？' },
  'collection.deleteFolder': { 'zh-TW': '刪除資料夾', en: 'Delete Folder', ja: 'フォルダを削除' },
  'collection.deleteFolderDesc': { 'zh-TW': '確定要刪除嗎？記錄不會被刪除。', en: 'Delete this folder? The records themselves are kept.', ja: 'フォルダを削除しますか？記録自体は残ります。' },
  'collection.addToFolder': { 'zh-TW': '加到資料夾：', en: 'Add to folder:', ja: 'フォルダに追加：' },
  'collection.noFolderYet': { 'zh-TW': '尚無資料夾，請先建立', en: 'No folders yet — create one first', ja: 'フォルダがありません。まず作成してください' },
  'collection.newFolder': { 'zh-TW': '新增資料夾', en: 'New Folder', ja: 'フォルダを追加' },
  'collection.folderName': { 'zh-TW': '資料夾名稱', en: 'Folder name', ja: 'フォルダ名' },
  'collection.noFolders': { 'zh-TW': '尚無資料夾', en: 'No folders yet', ja: 'フォルダがありません' },
  'collection.noFoldersDesc': { 'zh-TW': '建立資料夾來分類整理收藏', en: 'Create folders to organise your favorites', ja: 'フォルダを作ってお気に入りを整理しましょう' },
  'collection.noHistoryDesc': { 'zh-TW': '開始占卜後記錄將顯示於此', en: 'Your readings will appear here', ja: '占いを始めると記録がここに表示されます' },
  'collection.noFavDesc': { 'zh-TW': '在占卜結果中點擊收藏即可加入', en: 'Tap the heart on any reading to save it here', ja: '占い結果でハートをタップすると保存されます' },
  'collection.records': { 'zh-TW': '{n} 筆', en: '{n}', ja: '{n} 件' },
  'collection.modeDraw': { 'zh-TW': '抽棋', en: 'Draw', ja: '抽棋' },
  'collection.modeBoard': { 'zh-TW': '佈局', en: 'Board', ja: '配置' },

  // 成就
  'achievement.title': { 'zh-TW': '成就徽章', en: 'Achievements', ja: '実績バッジ' },
  'achievement.progress': { 'zh-TW': '成就進度', en: 'Progress', ja: '進捗' },
  'achievement.unlocked': { 'zh-TW': '已解鎖', en: 'Unlocked', ja: '解除済み' },
  'achievement.streakDays': { 'zh-TW': '連續 {n} 天', en: '{n}-day streak', ja: '{n}日連続' },
  'achievement.totalDraws': { 'zh-TW': '{n} 次占卜', en: '{n} readings', ja: '{n} 回の占い' },
  'achievement.checkFailed': { 'zh-TW': '成就檢查失敗', en: 'Achievement check failed', ja: '実績のチェックに失敗しました' },

  // 圖鑑（擴充）
  'library.count': { 'zh-TW': '共 {n} 首', en: '{n} poems', ja: '{n} 首' },
  'library.divineWith': { 'zh-TW': '以此卦占卜', en: 'Divine with this hexagram', ja: 'この卦で占う' },
  'library.notFound': { 'zh-TW': '找不到符合的籤詩', en: 'No matching poems', ja: '該当する詩がありません' },
  'library.element': { 'zh-TW': '五行', en: 'Element', ja: '五行' },
  'library.keyword': { 'zh-TW': '問事方向', en: 'Topic', ja: '相談内容' },

  // 籤詩卡
  'poem.pieces': { 'zh-TW': '棋象：', en: 'Pieces:', ja: '棋象：' },
  'poem.number': { 'zh-TW': '第 {n} 籤 · {hexagram}', en: 'Poem {n} · {hexagram}', ja: '第 {n} 籤 · {hexagram}' },
  'poem.catGeneral': { 'zh-TW': '綜合', en: 'Overall', ja: '総合' },
  'poem.catMarriage': { 'zh-TW': '感情', en: 'Love', ja: '恋愛' },
  'poem.catCareer': { 'zh-TW': '事業', en: 'Career', ja: '仕事' },
  'poem.catWealth': { 'zh-TW': '財運', en: 'Wealth', ja: '金運' },
  'poem.catHealth': { 'zh-TW': '健康', en: 'Health', ja: '健康' },
  'poem.catStudy': { 'zh-TW': '學業', en: 'Study', ja: '学業' },
  'poem.catTravel': { 'zh-TW': '出行', en: 'Travel', ja: '旅行' },

  // 設定（擴充）
  'settings.namePlaceholder': { 'zh-TW': '輸入您的名字', en: 'Enter your name', ja: 'お名前を入力' },
  'settings.pieces': { 'zh-TW': '{n} 顆', en: '{n}', ja: '{n} 枚' },
  'settings.nameUnset': { 'zh-TW': '點擊設定', en: 'Tap to set', ja: 'タップして設定' },
  'settings.themeDark': { 'zh-TW': '墨色', en: 'Ink', ja: '墨色' },
  'settings.themeLight': { 'zh-TW': '宣紙', en: 'Paper', ja: '宣紙' },
  'settings.themeSystem': { 'zh-TW': '跟隨系統', en: 'System', ja: 'システムに従う' },
  'settings.dailyReminder': { 'zh-TW': '每日提醒', en: 'Daily Reminder', ja: '毎日のリマインダー' },
  'settings.libraryDesc': { 'zh-TW': '瀏覽 64 首籤詩', en: 'Browse all 64 poems', ja: '64首の詩を見る' },
  'settings.statsDesc': { 'zh-TW': '查看統計數據', en: 'View your statistics', ja: '統計を見る' },
  'settings.achievements': { 'zh-TW': '成就徽章', en: 'Achievements', ja: '実績バッジ' },
  'settings.achievementsDesc': { 'zh-TW': '查看解鎖進度', en: 'View unlock progress', ja: '解除状況を見る' },
  'settings.cloudSync': { 'zh-TW': '雲端同步', en: 'Cloud Sync', ja: 'クラウド同期' },
  'settings.syncKey': { 'zh-TW': '裝置配對碼', en: 'Device pairing code', ja: '端末ペアリングコード' },
  'settings.syncKeyHint': { 'zh-TW': '在另一台裝置輸入此碼即可同步；請妥善保管。', en: 'Enter this code on another device to sync. Keep it private.', ja: '別の端末でこのコードを入力して同期します。安全に保管してください。' },
  'settings.syncKeyInvalid': { 'zh-TW': '配對碼必須是 48 位十六進位字元。', en: 'The pairing code must be 48 hexadecimal characters.', ja: 'ペアリングコードは48文字の16進数である必要があります。' },
  'settings.syncing': { 'zh-TW': '同步中…', en: 'Syncing…', ja: '同期中…' },
  'settings.replayOnboarding': { 'zh-TW': '重新觀看引導', en: 'Replay Intro', ja: 'チュートリアルを再表示' },
  'settings.clearHistory': { 'zh-TW': '清除所有歷史', en: 'Clear All History', ja: '履歴をすべて消去' },
  'settings.version': { 'zh-TW': '版本', en: 'Version', ja: 'バージョン' },
  'settings.tech': { 'zh-TW': '技術', en: 'Built with', ja: '技術' },
  'settings.backupOk': { 'zh-TW': '備份成功', en: 'Backup complete', ja: 'バックアップ完了' },
  'settings.backupOkClipboard': { 'zh-TW': '備份 JSON 已複製到剪貼簿，請貼到記事本存成 .json 檔保存。', en: 'Backup JSON copied to clipboard. Paste it into a text file and save as .json.', ja: 'バックアップ JSON をクリップボードにコピーしました。テキストファイルに貼り付けて .json で保存してください。' },
  'settings.backupOkDesc': { 'zh-TW': '資料已匯出', en: 'Your data has been exported', ja: 'データを書き出しました' },
  'settings.backupOkShared': { 'zh-TW': '備份檔已送出，請存到「檔案」App 或雲端硬碟保管。', en: 'Backup file sent. Save it to Files or a cloud drive.', ja: 'バックアップファイルを送信しました。「ファイル」App やクラウドに保存してください。' },
  'settings.backupFail': { 'zh-TW': '備份失敗', en: 'Backup failed', ja: 'バックアップに失敗しました' },
  'settings.backupFailDesc': { 'zh-TW': '無法產生備份檔，請稍後再試。', en: 'Could not create the backup file. Please try again.', ja: 'バックアップファイルを作成できませんでした。後でもう一度お試しください。' },
  'settings.restoreConfirm': { 'zh-TW': '將覆蓋現有資料，確定要還原嗎？', en: 'This will overwrite your current data. Restore anyway?', ja: '現在のデータを上書きします。復元しますか？' },
  'settings.restoreOk': { 'zh-TW': '還原成功', en: 'Restore complete', ja: '復元完了' },
  'settings.restoreFail': { 'zh-TW': '還原失敗', en: 'Restore failed', ja: '復元に失敗しました' },
  'settings.restoreFailDesc': { 'zh-TW': '請選擇正確的備份檔案', en: 'Please choose a valid backup file', ja: '正しいバックアップファイルを選んでください' },
  'settings.restoreFailRead': { 'zh-TW': '無法讀取備份檔，請確認檔案完整後再試。', en: 'Could not read the backup file. Check that it is intact and try again.', ja: 'バックアップファイルを読み取れませんでした。ファイルが壊れていないか確認してください。' },
  // 變數名須與 services/cloudSync.ts 讀取的相同，否則使用者照著設了也不會生效
  'settings.syncUnset': { 'zh-TW': '尚未設定雲端同步伺服器。請設定 EXPO_PUBLIC_CLOUD_SYNC_URL 環境變數。', en: 'No sync server configured. Set the EXPO_PUBLIC_CLOUD_SYNC_URL environment variable.', ja: '同期サーバーが未設定です。EXPO_PUBLIC_CLOUD_SYNC_URL 環境変数を設定してください。' },
  'settings.syncOffline': { 'zh-TW': '連不上同步伺服器，請確認網路後再試。', en: 'Could not reach the sync server. Check your connection and try again.', ja: '同期サーバーに接続できません。通信状況を確認してください。' },
  'settings.syncTooLarge': { 'zh-TW': '資料量超過伺服器上限，未能上傳。可先刪除部分舊記錄再同步。', en: 'The data exceeds the server limit and was not uploaded. Delete some old records and sync again.', ja: 'データがサーバーの上限を超えたためアップロードできません。古い記録を削除してから再試行してください。' },
  'settings.syncRateLimited': { 'zh-TW': '同步太過頻繁，請稍候一分鐘再試。', en: 'Too many sync requests. Please wait a minute and try again.', ja: '同期の回数が多すぎます。1分ほど待って再試行してください。' },
  'settings.syncInvalidKey': { 'zh-TW': '配對碼無效，請重新輸入 48 位十六進位字元。', en: 'Invalid pairing code. Re-enter the 48 hexadecimal characters.', ja: 'ペアリングコードが無効です。48文字の16進数を入力し直してください。' },
  'settings.syncServerError': { 'zh-TW': '同步伺服器暫時無法回應，稍後再試。', en: 'The sync server is temporarily unavailable. Try again later.', ja: '同期サーバーが一時的に応答しません。しばらくして再試行してください。' },
  'settings.syncOk': { 'zh-TW': '同步完成！', en: 'Sync complete', ja: '同期が完了しました' },
  'settings.syncPartial': { 'zh-TW': '上傳成功，但無法下載遠端資料。', en: 'Upload succeeded, but remote data could not be downloaded.', ja: 'アップロードは成功しましたが、リモートデータを取得できませんでした。' },
  'settings.notifyDenied': { 'zh-TW': '無法設定', en: 'Cannot enable', ja: '設定できません' },
  'settings.notifyDeniedDesc': { 'zh-TW': '請先授予通知權限後再試。', en: 'Grant notification permission first, then try again.', ja: '通知の許可を与えてから再試行してください。' },
  'settings.onboardingReset': { 'zh-TW': '已重置', en: 'Reset', ja: 'リセットしました' },
  'settings.onboardingResetDesc': { 'zh-TW': '下次開啟 App 時將重新顯示引導', en: 'The intro will show again next time you open the app', ja: '次回起動時にチュートリアルを表示します' },
  'settings.clearConfirm': { 'zh-TW': '確定要清除所有占卜記錄嗎？此操作無法復原。', en: 'Clear all divination records? This cannot be undone.', ja: 'すべての占い記録を消去しますか？この操作は取り消せません。' },
  'settings.cleared': { 'zh-TW': '已清除', en: 'Cleared', ja: '消去しました' },

  // 自訂類別
  'category.title': { 'zh-TW': '自訂問事類別', en: 'Custom Question Types', ja: 'カスタム問い分類' },
  'category.desc': { 'zh-TW': '新增您常用的問事類別，它們會出現在抽棋與棋盤頁面的類別選單中', en: 'Add the question types you use often; they appear in the category menu on the draw and board pages', ja: 'よく使う問いの分類を追加すると、抽棋・棋盤ページの分類メニューに表示されます' },
  'category.empty': { 'zh-TW': '尚無自訂類別。點擊下方按鈕新增。', en: 'No custom types yet. Tap below to add one.', ja: 'カスタム分類はまだありません。下のボタンから追加してください。' },
  'category.add': { 'zh-TW': '新增類別', en: 'Add Type', ja: '分類を追加' },
  'category.edit': { 'zh-TW': '編輯類別', en: 'Edit Type', ja: '分類を編集' },
  'category.namePlaceholder': { 'zh-TW': '類別名稱', en: 'Type name', ja: '分類名' },
  'category.deleteTitle': { 'zh-TW': '刪除類別', en: 'Delete Type', ja: '分類を削除' },
  'category.deleteDesc': { 'zh-TW': '確定要刪除「{name}」嗎？', en: 'Delete "{name}"?', ja: '「{name}」を削除しますか？' },

  // 引導（擴充）
  'onboarding.step2desc': { 'zh-TW': '抽棋占卜：從 32 顆棋子中\n隨機抽取，快速獲得指引。\n\n棋盤佈局：親手擺放棋子，\n深入探索心中的疑問。', en: 'Draw: pick from 32 pieces at random\nfor quick guidance.\n\nBoard: place the pieces yourself\nto explore a question in depth.', ja: '抽棋：32の駒からランダムに引き、\n手早く導きを得る。\n\n棋盤：自ら駒を配置し、\n問いを深く探る。' },
  'onboarding.step3': { 'zh-TW': '64 首原創籤詩', en: '64 Original Poems', ja: '64首のオリジナル詩' },
  'onboarding.step3desc': { 'zh-TW': '每首籤詩對應易經 64 卦，\n融入象棋意象，\n七言絕句搭配全方位解讀。', en: 'Each poem maps to one of the I Ching\'s 64 hexagrams,\nwoven with chess imagery,\nin verse with a full reading.', ja: '各詩は易経64卦に対応し、\n象棋の意象を織り込んだ\n七言絶句と全方位の解読。' },
  'onboarding.step4': { 'zh-TW': '記錄與收藏', en: 'Record and Save', ja: '記録とお気に入り' },
  'onboarding.step4desc': { 'zh-TW': '每次占卜結果都會自動儲存，\n方便回顧與反思。\n喜歡的結果可以加入收藏。', en: 'Every reading is saved automatically\nso you can look back on it.\nSave the ones that matter to your favorites.', ja: '占い結果は自動保存され、\nいつでも振り返れます。\n気に入ったものはお気に入りへ。' },
  'onboarding.skip': { 'zh-TW': '跳過', en: 'Skip', ja: 'スキップ' },
  'onboarding.next': { 'zh-TW': '下一步', en: 'Next', ja: '次へ' },
  'onboarding.start': { 'zh-TW': '開始占卜', en: 'Start', ja: '占いを始める' },

  // 錯誤與找不到頁面
  'error.title': { 'zh-TW': '發生了一些問題', en: 'Something went wrong', ja: '問題が発生しました' },
  'error.unknown': { 'zh-TW': '未知錯誤', en: 'Unknown error', ja: '不明なエラー' },
  'error.reload': { 'zh-TW': '重新載入', en: 'Reload', ja: '再読み込み' },
  'notFound.title': { 'zh-TW': '找不到頁面', en: 'Page not found', ja: 'ページが見つかりません' },
  'notFound.desc': { 'zh-TW': '此頁面不存在', en: 'This page does not exist', ja: 'このページは存在しません' },
  'notFound.home': { 'zh-TW': '回到首頁', en: 'Back to Home', ja: 'ホームへ戻る' },

  // 分享卡
  'share.title': { 'zh-TW': '分享籤詩', en: 'Share Poem', ja: '詩を共有' },
  'share.captureFailed': { 'zh-TW': '分享圖片擷取失敗', en: 'Failed to capture share image', ja: '共有画像の生成に失敗しました' },
  // 分享出去的文字。收到的人看得到，故與介面同樣需要翻譯
  'share.hexagram': { 'zh-TW': '卦：{name}', en: 'Hexagram: {name}', ja: '卦：{name}' },
  'share.drawn': { 'zh-TW': '抽得：{pieces}', en: 'Drawn: {pieces}', ja: '引いた駒：{pieces}' },
  'share.changed': { 'zh-TW': '{from} → {to}（動爻 {line}）', en: '{from} → {to} (moving line {line})', ja: '{from} → {to}（動爻 {line}）' },
  'share.bodyUse': { 'zh-TW': '體用：{relation} · {level}', en: 'Body/Use: {relation} · {level}', ja: '体用：{relation} · {level}' },

  // AI 解讀的狀態訊息（由 aiInterpretation.ts 產生，顯示於籤詩頁）
  'ai.unavailable': { 'zh-TW': 'AI 解讀尚未啟用，以下為規則式深度解讀。', en: 'AI reading is not enabled; the rule-based in-depth reading is shown below.', ja: 'AI 解読は未設定です。以下はルールベースの詳細解読です。' },
  'ai.badResponse': { 'zh-TW': '解讀服務回應異常（{status}）。', en: 'The reading service returned an error ({status}).', ja: '解読サービスの応答が異常です（{status}）。' },
  'ai.timeout': { 'zh-TW': '解讀逾時，請稍後再試。', en: 'The reading timed out. Please try again later.', ja: '解読がタイムアウトしました。後ほどお試しください。' },
  'ai.offline': { 'zh-TW': '無法連線至解讀服務。', en: 'Could not reach the reading service.', ja: '解読サービスに接続できません。' },

  // 每日提醒推播
  'notify.title': { 'zh-TW': '🏮 今日占卜', en: '🏮 Today\'s Divination', ja: '🏮 今日の占い' },
  'notify.body': { 'zh-TW': '靜心片刻，讓象棋的智慧引領您今天的方向。', en: 'Take a quiet moment and let the wisdom of the board guide your day.', ja: '静かなひとときを。棋の知恵が今日の道を照らします。' },
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

/** 插值參數。數字與字串以外的型別在 UI 上沒有合理的呈現方式，故不接受 */
export type TParams = Record<string, string | number>;

/**
 * 取譯文。第二參數可帶插值，字典中以 `{name}` 標記填空處。
 *
 *   t('library.count', { n: 12 })   // 「共 12 首」
 *
 * 為什麼要插值而不是字串相接：中文寫「共 12 首」，英文是「12 poems」，
 * 日文是「12 首」——數字的位置與前後綴各語言都不同，
 * 相接的寫法會把語序焊死在中文上，其餘語言只能拼出破碎的句子。
 */
export function t(key: string, params?: TParams): string {
  // 必須查自有屬性：'toString'、'constructor' 這類名稱會命中 Object.prototype，
  // 直接取值會拿到函式（truthy），讓 !entry 失效，最終回傳 undefined，
  // 與宣告的 string 回傳型別不符。
  const entry = Object.prototype.hasOwnProperty.call(translations, key)
    ? translations[key]
    : undefined;
  if (!entry) return key;

  const text = entry[currentLang] || entry['zh-TW'] || key;
  return params ? interpolate(text, params) : text;
}

/** 內建問事類別的 key → 譯文 key */
const CATEGORY_KEYS: Record<string, string> = {
  general: 'poem.catGeneral',
  marriage: 'poem.catMarriage',
  career: 'poem.catCareer',
  wealth: 'poem.catWealth',
  health: 'poem.catHealth',
  study: 'poem.catStudy',
  travel: 'poem.catTravel',
};

/**
 * 問事類別的顯示名稱。
 * 自訂類別的 key（`custom-<timestamp>`）不在表內，原樣回傳——
 * 使用者自己取的名字沒有譯文可言，硬套 t() 只會顯示出那串 key。
 */
export function categoryLabel(key: string): string {
  const translationKey = CATEGORY_KEYS[key];
  return translationKey ? t(translationKey) : key;
}

/**
 * 以 params 填入 `{name}` 佔位符。
 * 找不到對應的 key 時原樣保留佔位符——留著 `{n}` 在畫面上很顯眼，
 * 換成空字串則會靜靜少一段文字，比顯示佔位符更難發現漏傳參數。
 */
function interpolate(text: string, params: TParams): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : whole,
  );
}

// 取得所有語言的選項列表
export const LANG_OPTIONS: { key: Lang; label: string }[] = [
  { key: 'zh-TW', label: '繁體中文' },
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' },
];
