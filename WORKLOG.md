# 象棋占卜 — 工作日誌

## 專案總覽

| 項目 | 數值 |
|------|------|
| 原始碼檔案 | 53 個 |
| Git Commits | 26 次 |
| Jest 測試 | 75 個 · 8 套件 · 全部通過 |
| TypeScript | 零錯誤 |
| 頁面 | 11 個 |
| 元件 | 11 個 |
| Hooks | 6 個 |
| 服務 | 12 個 |
| 籤詩 | 64 首七言絕句 |
| 起卦引擎 | v3（六爻：本卦／變卦／互卦／體用） |

### 技術棧
Expo SDK 57 · React 19.2 · RN 0.86 · TypeScript 6.0 · Expo Router · AsyncStorage · Reanimated · Gesture Handler · Web Audio API · expo-haptics · expo-sharing · view-shot · Jest

### 部署
- **GitHub**: [MAGICSMALLBEAR/chess-divination](https://github.com/MAGICSMALLBEAR/chess-divination)
- **Vercel**: https://chess-divination-app.vercel.app
- **本地**: `npx expo start --web`

---

## Session 1-3 — MVP 建立 (7/26-7/27)
- 專案初始化、架構設計
- 32 棋子 + 64 籤詩 + 雙模式完整流程
- 12 項新功能：問事輸入、音效、觸覺、主題、圖鑑、統計、姓名、AI、位置解讀、備份、i18n、設定

## Session 4-5 — 功能深化 (7/27-7/28)
- 棋盤拖曳放置、Vercel 部署
- i18n 語言切換器、動畫速度控制
- PoemCard 整合、無障礙支援
- 位置解讀深化（五行生剋+方位吉凶）
- 收藏資料夾、類別記憶、每日運勢連結

## Session 6 — UX 修復 (7/28)
- 棋盤放大、返回確認、Spinner 元件、分享格式優化
- 收藏搜尋、清除歷史、撤銷上一步、棋盤提示
- 首頁最近紀錄、圖鑑展開詳情、統計日期篩選、下拉重整
- 記錄加到資料夾、PoemCard 動畫速度

## Session 7 — 字體 + 測試 (7/28)
- 書法字體 Noto Serif TC
- Jest 自動化測試 20 個全部通過

## Session 8 — 後續功能 (7/28)
- 統計日期篩選（全部/本週/本月）
- PWA 離線支援（manifest.json + Service Worker）
- 分享圖片卡美化（金色飾條設計）
- Collection 排序（最新/最早/最佳）
- Onboarding 重播、批量刪除
- 每日運勢分享、Library 抽卦按鈕
- 系統主題跟隨（dark/light/system）
- ErrorBoundary 錯誤邊界
- 成就系統（8 種徽章）+ 連續使用天數追蹤

## Session 9 — 命理正確性重建 (8/1-8/2)

完整稽核報告與後續規劃見 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)。

### Phase 0 緊急修復
- 抽棋完成後的摘要卡與「揭露籤詩」按鈕原本繼承光環動畫值，永遠只有 15% 不透明度
- 每日運勢與連續天數改用當地日期（原用 UTC，台灣 00:00–08:00 會顯示前一天）
- 抽棋動畫 effect 補上依賴與完整清理——原本動畫速度與 reducedMotion 設定從未生效

### Phase 1 命理正確性
- **修正卦序對應**：先天（伏羲）序誤當文王序使用，64 卦中 62 卦拿到與卦象不符的籤詩
- **棋子→卦改由棋種＋顏色決定**：補足兌卦，八卦全覆蓋；紅黑互為錯卦，紅車與黑車不再同卦
- **抽棋改為抽出後放回**：64 卦全部可達，雙紅／雙黑成為有效訊號
- **五行真相來源分離**：卦氣五行負責生剋、意象五行僅供文案，解除兩者矛盾
- **五行補齊五種關係**：原本漏掉「生我（印）」；方位判定改用 col/row 判八方
- **每日運勢改為起卦推導**：等級／方位／顏色／數字皆源自當日之卦，彼此自洽
- 舊記錄標記 `engineVersion`，不改寫歷史，reveal 頁標註「依舊版卦法」
- 測試 20 → 49 個，新增卦序、方位、日期三套迴歸測試

## Session 10 — 六爻系統 (8/2)

一次占卜從「1 首籤詩」變成完整卦例：本卦 → 動爻 → 互卦 → 變卦 + 體用生剋。

- **六爻推導**：先天卦序的編號本身即為爻象，六爻由卦號位運算推得，不需 64×6 對照表
- **動爻**：依梅花易數 `(上卦數 + 下卦數 + 其餘數 + 時辰數) mod 6`，納入時辰（地支）
- **變卦／互卦**：動爻反轉為變卦；二三四爻與三四五爻取互卦
- **體用生剋**：動爻所在為用（事）、另一卦為體（我），五種關係各有吉凶斷語
- **棋盤擺位終於影響卦象**：格位數總和參與動爻計算，解決長期以來「拖曳半天籤詩一樣」的問題
- **UI**：新增六爻線條圖與三卦並列面板，動爻以金色標示並加註爻名
- **解讀誠實化**：`ai.ts` → `interpretation.ts`，移除「AI 智慧解讀」字樣（原本從未呼叫任何模型），改為納入三卦與體用的規則式深度解讀
- 測試 49 → 71 個，含屯卦爻象、屯之互卦為山地剝等傳統卦例對照

## Session 11 — 主題與版面 (8/2)

- **修好亮色主題**：全 App 300+ 個硬編色碼歸零，20 個元件／頁面改為 `makeStyles(theme)`
- **守門測試**：新增規則禁止 UI 檔案出現色值字面量，防止回流
- **版面響應式**：`Dimensions.get` 歸零，改用 `useWindowDimensions`；旋轉與瀏覽器縮放終於生效
- **內容限寬 560px 置中**：平板／桌面不再出現超長行寬
- 刻意固定色的部分集中為具名色盤：宣紙卷軸、分享圖卡、錯誤邊界、等級色
- 移除死碼 `PieceDrawAnimation.tsx`（288 行）
- 順帶修掉：`PoemCard` 動畫速度設定同樣從未生效；`InkBackground` 粒子循環卸載時不停止；`stats` 自帶一份與 `getLevelColor` 不一致的等級色表

## Session 12 — 視覺質感升級（8/2）

- **真漸層**：安裝 `expo-linear-gradient`，`InkBackground` 從三段純色方塊改為 `LinearGradient`，消除色階硬邊
- **SVG 圖示系統**：安裝 `react-native-svg`，建立 32 款水墨風圖示（導覽/類別/動作/狀態），每個接受 `color` prop
- **Emoji 歸零**：12 個檔案約 80 處 Emoji 全部改為 SVG 圖示。棋子用漢字在圓形中（帥仕相車馬炮兵），不再用文化錯位的 🐘🏰⚔️
- **卦象 SVG**：`TrigramGlyph`（三爻）、`HexagramGlyph`（六爻，含動爻標示），供分享卡與未來 UI 使用
- **字體修復**：移除 `SpaceMono` 英文等寬字體及其對 App 載入的阻塞；原生端不再浪費 0.x 秒載入毫無用處的字體
- **分享卡 v2**：加入六爻卦象圖、變卦/體用資訊、宣紙紋理裝飾、SVG 圖示取代 Emoji
- 75 測試全過 · TypeScript 零錯誤 · web build 成功（所有 15 個路由正常）

## Session 13 — 動畫重製 Phase 5（8/2）

- **5.1 PieceDraw3D 修復**：修正 `perspective` 在 transform 陣列中的順序（必須放在 [0] 位置，否則 rotateY 退化為平面壓縮）；新增真翻面效果（`backfaceVisibility: 'hidden'` + 正面棋子漢字／背面卦象名稱與 glyph）
- **5.2 InkBackground Reanimated 4 遷移**：每個墨滴粒子獨立 `React.memo` 元件，各自管理 `useSharedValue` + `useAnimatedStyle` + `withRepeat`/`withSequence`/`withTiming`；unmount 時 `cancelAnimation` 清理
- **5.3 轉場動畫**：
  - **墨滴擴散遮罩**（`InkSplashOverlay.tsx`）：15 層圓形 View 從畫面中心向外擴散，模擬墨滴滴落宣紙的視覺效果；Reanimated 4 驅動，每層有獨立延遲與透明度
  - **棋子飛入**（`PieceEntryFlyIn.tsx`）：揭露籤詩後，棋子從上方旋轉落下，`withSpring` 彈簧回彈模擬落在棋盤上的物理感
  - 整合至 `reveal.tsx`：loading → splashing → revealed 三段轉場狀態機
- 75 測試全過 · TypeScript 零錯誤 · web build 成功（15 routes）

---

## 功能完整清單

### 占卜核心
- 抽棋模式（選類別→問事→動畫→籤詩）
- 棋盤佈局（選棋→拖曳放棋→深度解讀）
- 64 首七言絕句籤詩（易經 64 卦對映）
- AI 智慧解讀（離線 fallback）

### 解讀系統
- 白話解釋 + 典故 + 7 面詳解（感情/事業/財運/健康/學業/出行/綜合）
- 棋盤位置解讀（九宮/楚河/邊緣/角落 + 五行生剋）
- PoemCard 捲軸動畫展示

### 使用者功能
- 歷史記錄 + 收藏 + 資料夾分類
- 籤詩圖鑑（64 首瀏覽/搜尋/展開）
- 統計儀表板（日期篩選/吉凶分佈/棋子排行）
- 每日運勢
- 圖片卡分享 + 文字分享

### 設定與個人化
- 明暗主題 + 跟隨系統
- 語言切換（zh-TW/en/ja）
- 音效 + 觸覺回饋
- 動畫速度（慢/標準/快）
- 姓名設定 + 問事類別記憶
- 備份還原（JSON 匯出/匯入）
- Onboarding 引導重播

### 體驗優化
- 拖曳放棋 + 撤銷上一步
- 批量刪除記錄
- 收集排序（最新/最早/最佳）
- 連續使用天數追蹤 + 成就徽章
- 無障礙 reducedMotion
- 錯誤邊界 ErrorBoundary
- PWA 離線支援
- 書法字體 Noto Serif TC

---

## 未來可開發功能

> 完整的稽核與階段規劃見 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)。
> 下一步為 **Phase 4 視覺質感**（導入 `expo-linear-gradient` 做真漸層、`react-native-svg` 取代滿版 Emoji、原生端書法字體）。

### 🔴 高優先（可立即實作）
- [ ] **成就徽章展示頁** — 在設定或獨立頁面展示 8 種成就的解鎖狀態
- [ ] **頁面過場動畫** — 加入更多轉場效果（fade/slide/scale）
- [ ] **Library 隨機抽籤** — 圖鑑頁面加入「隨機瀏覽」按鈕
- [ ] **問事類別自訂** — 讓使用者自訂問事類別標籤
- [ ] **快捷手勢** — 左右滑動切換歷史記錄/收藏頁籤
- [ ] **棋盤全螢幕模式** — 橫向全螢幕棋盤佈局

### 🟡 中優先（需中等工時）
- [ ] **社群分享優化** — LINE/FB/IG 一鍵分享
- [ ] **離線完整支援** — 所有頁面離線可瀏覽
- [ ] **書法字體原生端** — iOS/Android 載入楷體字型檔
- [ ] **AI API 串接** — DeepSeek/OpenAI 個人化深度解讀
- [ ] **統計圖表視覺化** — 趨勢圖、圓餅圖
- [ ] **音效升級** — 真實象棋落子音效

### ⚪ 低優先（需外部資源）
- [ ] **每日推播通知** — expo-notifications
- [ ] **iOS/Android 原生測試** — 實機安裝
- [ ] **Cloud Sync 雲端同步** — Firebase 或自建後端
- [ ] **App Store / Google Play 上架**
- [ ] **自訂域名** — chess-divination.com
