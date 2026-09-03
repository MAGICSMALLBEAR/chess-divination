# 象棋占卜 — 工作日誌

## 專案總覽

| 項目 | 數值 |
|------|------|
| 原始碼檔案 | 149 個 |
| Git Commits | 127 次 |
| Jest 測試 | 1064 個 · 52 套件 · 全部通過 |
| E2E 測試 | 178 個 · Playwright · mobile + desktop |
| TypeScript | 零錯誤 |
| 頁面 | 15 個 |
| 元件 | 22 個 |
| Hooks | 12 個 |
| 服務 | 39 個 |
| 籤詩 | 64 首七言絕句 |
| 靈棋 | 《靈棋經》125 卦目原典＋規則式深度解讀 |
| 起卦引擎 | v3（六爻：本卦／變卦／互卦／體用）＋兩軍對壘陣（上紅下黑、動爻＝子力差） |
| AI 解讀 | Vercel serverless function（DeepSeek API，未配置時降級） |

### 技術棧
Expo SDK 57 · React 19.2 · RN 0.86 · TypeScript 6.0 · Expo Router · AsyncStorage · Reanimated · Gesture Handler · Web Audio API · expo-haptics · expo-sharing · view-shot · Jest · Playwright · GitHub Actions

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

## Session 14 — Phase 6 功能補完（8/2）

13 項新功能全面實作，從高優先到低優先依序完成。

### 高優先（6.1–6.3）
- **6.1 自訂問事類別**：`CustomCategoriesSection` CRUD UI（名稱+圖示選擇器），`useQuestionCategories` hook 合併內建 7 類別與使用者自訂類別
- **6.2 收藏管理**：`collection.tsx` 改為水平 `ScrollView` 分頁（歷史/收藏/資料夾），`onMomentumScrollEnd` 手勢偵測切換頁籤
- **6.3 全螢幕棋盤**：`board.tsx` 雙重 JSX 結構，全螢幕模式跳脫 ScrollView/SafeAreaView，棋盤填滿全螢幕

### 中優先（6.4–6.9）
- **6.4 社群分享**：`socialShare.ts` 三管道（LINE URL scheme → Facebook sharer URL → 原生 Share API），結構化卦象文字
- **6.5 PWA 離線**：`sw.js` 重寫為 Network-first 策略 + 快取回退 + skipWaiting + clients.claim
- **6.6 字體載入**：`useFontLoad` hook，Web 用 Google Fonts CSS、原生用系統後備
- **6.7 AI API Route**：`src/app/api/interpret+api.ts`，POST handler 接 DeepSeek API，金鑰經 server-side env vars
- **6.8 趨勢圖表**：`TrendChart.tsx` SVG 7 日長條圖（react-native-svg Rect/Line/SvgText）
- **6.9 音效重構**：`sound.ts` 全面升級——三角波木擊合成 + 噪聲瞬態 + 五聲音階揭示旋律

### 低優先（6.10–6.13）
- **6.10 每日提醒**：`notifications.ts`，expo-notifications 本地排程每日 9:00
- **6.11 EAS Build**：`eas.json`（development / preview / production 三設定檔）
- **6.12 雲端同步**：`cloudSync.ts`，JSON 上傳/下載/合併，去重依 ID + 排序依 timestamp
- **6.13 商店上架**：`STORE_LISTING.md` 完整中英文文案、截圖需求、建置指令
- **6.14 最終驗證**：TS 零錯誤、75 tests passing、web build 15 routes 全部匯出

23 檔案、+1632/-284 行。全部功能獨立可運作、無跨功能相依。

## Session 15 — 上架準備 + 程式碼品質收尾（8/2）

Phase 6 完成後的收尾工作。

### 上架素材準備
- **隱私權政策**：`public/privacy.html`，完整繁體中文隱私權政策（資料收集、通知權限、第三方服務、兒童隱私、聯絡方式），部署於 Vercel
- **截圖指南**：`SCREENSHOTS_GUIDE.md`，6 張建議截圖場景、App Store/Google Play 尺寸表、四種截圖方法、ImageMagick 後製指令
- **WORKLOG.md 更新**：Phase 6 13 項 checkbox 全部勾選、Session 14 記錄補上、未來待辦重整

### 程式碼品質修復
- **路由 `as any` ×4 消除**：`reveal.tsx`、`achievements.tsx`、`onboarding.tsx`、`+not-found.tsx` 改用 Expo Router 原生字串路徑
- **空 `catch {}` ×9 補 warning**：`haptics.ts`、`useReducedMotion.ts`、`useAnimationSpeed.ts`、`notifications.ts`、`socialShare.ts`、`ShareCardView.tsx`、`reveal.tsx`、`index.tsx` — 全部補上中文 `console.warn`，靜默失敗不再無法追蹤
- **`cloudSync.ts` 型別化**：定義 `CloudRecord` 介面取代 `as any[]`
- **`expo-symbols`**：確認是 Expo SDK 57 內建依賴，無法單獨移除，DEVELOPMENT_PLAN.md 已更新備註

### GitHub 推送
- 全部分支 `master` 已推送至 `MAGICSMALLBEAR/chess-divination`
- 累積 30 commits，全部通過 CI（TS 零錯誤 + Jest 75 全過 + web build 15 routes）

## Session 16 — 測試補強與版面收尾（8/6–8/7）

### 單元測試 75 → 170
- `storage.test.ts`（33）：歷史 CRUD、500 筆上限、收藏雙向同步、設定合併與毀損降級、資料夾 CRUD、每日運勢跨日過期、v1/v2 記錄版本判定
- `achievements.test.ts`（29）：8 種成就解鎖條件、重複解鎖防護、連續天數累加/中斷/去重、`week_streak` 自動解鎖
- `layout.test.ts`（23）：斷點判定、限寬、無效尺寸防護
- `grid.test.ts`（10）：欄數與卡片寬度計算

### #9 寬螢幕多欄佈局
- 新增 `useGrid` hook：以 `onLayout` 量測**容器**寬度決定欄數（1/2/3 欄）
- `library.tsx`、`collection.tsx` 卡片改為多欄網格
- `Layout.maxGrid = 1080`——多欄若沿用 `maxContent`(560)，每欄只剩 270px，反比單欄更難讀
- 實測：1440px→3 欄(卡片 355)、800px→2 欄(380)、390px→1 欄(358)

### #13 E2E 測試（Playwright，24 個）
- 測 `expo export` 的**靜態產物**（與 Vercel 同一份），非開發伺服器
- 兩組 viewport：mobile(iPhone 13) + desktop(1440×900)
- `divination.spec`：抽棋→揭曉→記錄→收藏主線、圖鑑搜尋、7 條路由可達性（含 JS 例外檢查）
- `responsive.spec`：多欄佈局、視窗縮放重算、無水平捲軸
- `onboarding.spec`：首次啟動引導（其餘測試由 fixture 跳過）
- npm scripts：`e2e` / `e2e:ui` / `typecheck` / `build:web` / `verify`

### 測試抓到的兩個真實 bug

**1. 資料夾 ID 碰撞**（由單元測試發現）
`addFolder` 用 `folder-${Date.now()}` 當 ID，同一毫秒內建立的兩個資料夾會拿到**相同 ID**，刪除其一會連帶刪掉另一個。改用含隨機後綴的 `generateId()`。

**2. Web 版響應式版面從未生效**（由 E2E 發現）
Expo 靜態匯出的 Web 版，`useWindowDimensions()` 在 hydration 之後仍回傳 0，連 `globalThis.innerWidth` 都是 `undefined`——實測要等使用者**縮放視窗**才會出現正確值。
結果 `contentWidth` 恆為 `-64px`，Session 11 做的「內容限寬 560px」在**已部署的 PWA 上從未生效**。
且因為 RN Web 會靜默忽略無效寬度，畫面只是退回滿版拉伸，沒有任何錯誤訊息，純看畫面不會發現。
- `computeLayout` 加上視窗寬下限，杜絕負寬度
- 網格改以 `onLayout` 量測容器，完全不依賴 window 全域

### 多欄佈局擴及其餘頁面
- 成就頁：每張成就自成一卡，桌面 3 欄／手機 1 欄
- 統計頁：吉凶分佈與棋子排行在寬螢幕並排（2 欄）
- **TrendChart 同一類 bug**：原以 `useLayout().width` 計算，在 Web 上寬度恆為最小值約 264px。改用 `useMeasuredWidth`（onLayout 量測自身容器），實測容器 1080 → SVG 1040

### E2E 測試環境修正
一度回報「24 全過」，實為誤讀被截斷的輸出——真實結果是 25 過 / 31 失敗：
- `mobile` project 用 `devices['iPhone 13']`（WebKit）但只裝了 chromium，整個 project 起不來 → 改用 `devices['Pixel 5']`（Chromium 核心），本機與 CI 只需一種瀏覽器
- `gridColumns()` 以「第一個 flex-wrap 容器」猜網格，會誤抓總覽列 → 改以 `testID="card-grid"` 定位
- 版面斷言改用 `expect.poll`：`onLayout` 是非同步量測，直接斷言會在版面收斂前就跑

修正後 **56/56 全過**，並已驗證 `webServer` 能自行啟動（CI 的實際情境）。

### CI
`.github/workflows/ci.yml`：
- `verify` job：typecheck → jest → web build，上傳 dist 產物
- `e2e` job：取回產物 → 裝 chromium → 跑 Playwright，失敗時上傳報告

### 程式碼品質
- 消除 4 處路由 `as any`（改用 Expo Router 原生字串路徑）
- 9 處空 `catch {}` 補上中文 `console.warn`
- `cloudSync.ts` 定義 `CloudRecord` 介面取代 `as any[]`

## Session 17 — 實際看畫面，抓出四個功能性缺陷（8/7–8/8）

前幾個 Session 的驗證都停在「測試綠燈」。這次改為**實際截圖檢視每一頁**，
結果在通過全部 170 個單元測試與 56 個 E2E 的情況下，
仍發現四個使用者一定會遇到的缺陷。

### 🔴 籤詩頁被墨滴遮罩永久覆蓋

App 的核心產出頁整頁極暗，卦例推演、宣紙卷軸、白話解釋幾乎全不可見。

根因在 `InkSplashOverlay`：完成回呼掛在 `withTiming` 的第三參數上，
那個回呼跑在 UI thread（worklet），要呼叫 JS 閉包必須經 `runOnJS`，
直接呼叫會**靜默失效**。`onComplete` 從未觸發 → `reveal.tsx` 的狀態機
永遠停在 `splashing` → 15 層墨色圓形（1841px、opacity 0.92）永久蓋在頁面上。

修法：完成通知改由 JS `setTimeout` 發出，完全不經 worklet。

### 🔴 棋盤在 Web 上一直是最小尺寸

`cellSizeFor(視窗寬)` 在 Web 上取到 clamp 後的 320，格子恆為 32px、
棋盤只有 288px。改用量測到的容器寬度後為 **504px**。

值得注意的是**同一頁面有兩套算法**——全螢幕分支本來就用對了量測寬度，
只有一般模式沿用視窗寬。所以只有全螢幕模式的棋盤是正常大小。

### 🔴 圖鑑等級篩選列高度塌陷成 5px

水平 ScrollView 在 Web 上沒有明確高度時會塌陷，整排篩選變成點不到的細線。
`maxHeight: 36` 改為 `height: 40`。棋盤頁的問事類別列有同樣問題，一併修正。

### 🔴 統計頁棋子排行顯示英文 key

畫面上直接顯示 `king` / `chariot` 這種程式內部代號，
改用既有的 `PIECE_CHINESE_NAMES` 顯示「帥/將」「車」。

### 其餘版面修正
- 搜尋框在墨色背景上幾乎不可見（深底配深邊框）→ 改 `bgCard` 底 + 金色淡邊
- 控制列全寬貼邊、內容網格卻置中限寬 → 統一限寬置中
- 成就頁元素寬度不一（卡 560、網格 1080、按鈕 560）→ 統一
- 趨勢圖柱固定 32px，在 1040px 容器下過細 → 依欄距推算（夾在 24–72）
- 統計頁兩張卡套用三欄網格會空掉一整欄 → 改 `flexGrow` + `flexBasis`
- 棋盤頁限寬 560 導致 7 個問事類別被截斷，「出行」完全看不到 → 放寬到 720
- 首頁「快速抽一籤」副標在金色底上用淺灰字 → 改反白 + opacity

### 新增視覺可見性測試（e2e/visual.spec.ts，16 個）

沒有做像素比對——那在不同機器上太脆弱，而且只會說「有東西變了」，
不會說「使用者看不見內容」。改測三件事：

1. **遮擋偵測**：`elementFromPoint` 確認內容沒被蓋住 + 累乘父鏈 opacity
2. **全螢幕遮罩殘留**（排除 zIndex 低的 InkBackground）
3. **可點擊高度與實際尺寸**

這三類正是上述缺陷的共同盲點：**元素都在 DOM 中、都有尺寸，
`toBeVisible` 全數通過，畫面卻是壞的**。

已驗證測試有效：把棋盤 bug 改回去，對應測試 2/2 失敗，還原後通過。
（一個不會在 bug 存在時失敗的迴歸測試沒有價值。）

### 測試補強 170 → 220
- `interpretation.test.ts`（20）：使用者直接讀到的解讀文案
- `backup.test.ts`（16）、`cloudSync.test.ts`（14）：出錯會遺失使用者資料

順帶修掉三個資料相關缺陷：
- **`restoreData` 的 Promise 可能永遠不 resolve**——`JSON.parse` 寫在
  async 回呼裡，格式不對時沒有人 catch，使用者選到錯檔案後畫面靜靜卡住
- **`mergeFromCloud` 缺乏防護**——本地無記錄時直接寫入雲端資料，
  不驗證形狀也不套用 500 筆上限
- **`lineName` 對越界爻位產生「六undefined」**——爻位來自儲存的記錄，
  舊版或損毀資料會讓 undefined 直接顯示在畫面上

## Session 18 — AI 深度解讀全端打通（8/10）

Phase 6.7 原只做了後端半邊（API Route 檔案存在但沒有任何前端呼叫），
且在 static output 下 Expo Router 根本不會匯出 API Route。
三階段逐步把缺口補齊。

### 第一階段：接上前端（commit 7ea1d26）

- 新增 `src/services/aiInterpretation.ts`：客戶端呼叫 `/api/interpret`，
  用可辨識聯集回報三種結果（ok / unavailable / error），而非拋錯。
  AI 解讀是加值內容，任何失敗都必須退回規則式解讀，刻意不讓錯誤往上拋。
- `reveal.tsx` 新增「AI 深度解讀」區塊，四種狀態：
  待命（按鈕）→ 載入中（Spinner）→ 完成（顯示）／失敗（說明 + 重試）
- 規則式深度解讀維持在下方獨立區塊，不受 AI 狀態影響
- **新增測試**：`aiInterpretation.test.ts`（14）——成功路徑、501/404 降級、
  靜態站台把未知路徑導回 HTML、逾時、任何情況都不拋錯
- **E2E**：端點不可用時的降級 + 以 `page.route` 模擬成功路徑
- 前端會顯示「AI 解讀尚未啟用」——因為 static output 下 API Route 不會被匯出

### 第二階段：記錄啟用門檻（commit 446c998）

- 實測把 `web.output` 改為 `"server"` 的後果：
  API Route 確實會被匯出，但產出結構從扁平 HTML 變成 client/server 分離，
  現有 `vercel.json` 與 `npx expo serve` 全部失效（78 個 E2E 也跑不起來）
- 查閱 Expo SDK 57 文件確認：server 模式需自建 Node.js 伺服器，
  官方未提供 Vercel + server output 的部署指引，建議改用 EAS Hosting
- `.env.example` 記錄結論與啟用條件

### 第三階段：換方向——Vercel serverless function（commit a2e598a）

上一輪的結論是「要啟用 AI 得換部署平台」，但那是把問題想窄了。

- **關鍵洞察**：Vercel 原生支援根目錄 `api/` 的 serverless function，
  與 Expo 靜態網站產出並存——不需要改 `web.output`
- 新增 `src/services/aiPrompt.ts`（156 行）：提示詞建構與模型呼叫的共用邏輯，
  零依賴、不使用 `@/` 別名（Vercel 的 TypeScript 不處理 path mappings）
- 新增 `api/interpret.ts`（78 行）：Vercel serverless function，Web Standard 簽章
- `src/app/api/interpret+api.ts` 改為呼叫同一份共用邏輯，保留給日後 EAS Hosting 或原生端
- `vercel.json` 的 catch-all rewrite 排除 `/api`，否則請求會被導向 `index.html`
- **前端不需改動**——本來就是呼叫 `/api/interpret`

### 測試抓到的安全問題

上游錯誤訊息原本被原封不動轉發到前端。部分服務會在錯誤中回顯 Authorization 標頭，
等於把金鑰送到瀏覽器。改為：詳細內容只寫伺服器日誌，回客戶端的僅有通用訊息與狀態碼。

### 新增測試 234 → 265

- `aiPrompt.test.ts`（20）：提示詞組成、類別代碼轉中文標籤、模型呼叫、上游失敗不外洩金鑰
- `apiInterpret.test.ts`（11）：501/400/413/405、金鑰不出現在回應中、驗證失敗時不呼叫外部服務

### 啟用方式

在 Vercel 專案設定加入 `DEEPSEEK_API_KEY` 環境變數即可，不需改動任何程式碼。
未設定時端點回 501，前端顯示「AI 解讀尚未啟用」並保留規則式深度解讀。

### Session 18 總結

11 檔案、+1043/-102 行。TS 零錯誤 · Jest 265 全過 · E2E 78 全過。
Phase 6.7 AI 深度解讀從「後端半邊」變成「全端可用」，且不需更換部署平台。

## Session 19 — 多語系補齊翻譯（8/11）

前一版語言切換器提供 zh-TW/en/ja 三種語言，但 en/ja 僅翻譯了 UI 字串（約 76 個 key）。
64 首籤詩、32 顆棋子、8 項成就仍只顯示中文——使用者切到英文會看見一片中文夾雜。

### 翻譯架構
- 資料翻譯與 UI i18n 分層：
  - UI i18n（`src/services/i18n.ts`）：按 key 查字典，76 個 UI 字串
  - 資料翻譯（`src/services/localize.ts`）：`localizePoem()` / `localizePiece()` / `localizeAchievement()`，接收資料物件，回傳翻譯後的拷貝
- 降級策略：缺翻譯時 fallback 到 zh-TW 原文，不讓畫面出現空白
- 翻譯資料放在 `src/data/translations/`（poems.ts / pieces.ts / achievements.ts）

### 翻譯規模
- **64 首籤詩 × 10 個欄位 × 2 語言**（標題、詩句、白話、典故、7 面解籤） = 1,280 個翻譯字串
- **32 顆棋子 × 2 個欄位 × 2 語言**（含義、關鍵詞 5 字） = 128 個翻譯字串
- **8 項成就 × 2 個欄位 × 2 語言**（標題、描述） = 32 個翻譯字串
- **總計 1,440 個翻譯字串**，全人工翻譯（中→英、中→日）

### 日文標題特殊處理
- 15 首籤詩的日文標題若只寫漢字會與中文完全一致，無法通過測試守門（檢查 `localized.title !== poem.title`）
- 加入日文訓讀註記，例如「龍騰九霄」→「龍 九霄に騰がる」

### UI 整合
- `PoemCard.tsx`、`reveal.tsx`、`library.tsx`：呼叫 `localizePoem()` 後用 `localized` 渲染
- `achievements.tsx`：呼叫 `localizeAchievement()`

### 測試守門
- `i18n.test.ts` 新增 33 個本地化測試（共 53 個）：
  - `localizePoem`：zh-TW 恆等、en/ja 翻譯、jieYue 七面向、全部 64 首 en/ja 完整守門、explicit lang 參數
  - `localizePiece`：zh-TW 恆等、en/ja 翻譯、全部 32 顆棋子守門
  - `localizeAchievement`：zh-TW 恆等、en/ja 翻譯、全部 8 項成就守門
- 守門測試會自動抓到漏翻的欄位，不需人工抽查

### 副作用修正
- `package.json` 將 `screenshots/` 加入 `testPathIgnorePatterns`，避免 Playwright 截圖測試被 Jest 誤載
- 修正日本詩題中與中文相同的 15 個標題

### Session 19 總結

8 檔案、+2100/-30 行。TS 零錯誤 · Jest 405 全過 · web build 15 routes。

## Session 20 — TypeScript 零錯誤收尾（8/11）

### Playwright 截圖設定修復
- `playwright.screenshots.config.ts` 的 `reducedMotion` 不存在於 Playwright 1.62.1 的 `UseOptions` 型別中
- 此錯誤自 Session 17 起存在，使 `npm run verify` 的 `tsc --noEmit` 步驟失敗，連帶跳過後續的 test 與 web build
- 移除該屬性（`'no-preference'` 即瀏覽器預設，不需顯式指定）

### 驗證鏈確認
- `tsc --noEmit`：零錯誤
- `npm test`：405/405 全過（23 suites）
- `npm run build:web`：15 routes 全部匯出

## Session 21 — Phase 7：占驗簿 + 月建旺衰（8/12）

補上兩個結構性缺口：一個在「這卦怎麼解」，一個在「後來怎麼了」。

### 7.1 占驗簿——App 記了 500 次占卜，卻不知道哪一次準過

傳統易占的基本功是「占驗簿」：占完記下所斷，事後回填實際結果。
少了這一步，占卜就只是每次重新開始，舊記錄沒有任何回訪理由，
統計頁也只能數「抽到什麼」，永遠數不出「準不準」。

**資料層**
- `DivinationRecord` 新增 `outcome?: { status, note, verifiedAt }`
- 三態而非五級量表：事後回想本就模糊，選項太細只會降低回填率
- `setOutcome` / `clearOutcome` **同時更新歷史與收藏兩份副本**——
  收藏存的是完整副本，只改歷史的話同一筆記錄在兩個頁面會顯示不一致

**統計層（`verification.ts`）**
- 加權應驗率：應驗 1 分、部分應驗 0.5 分、未應驗 0 分
- **未回填的不計入分母**。這是整個統計的關鍵取捨——
  把沒驗過的當成「不準」會讓應驗率隨占卜次數單調下降，
  那個數字反映的是回填勤勞度，不是準確度
- 沒有已回填記錄時 `rate` 為 `null` 而非 `0`：
  「還沒有資料」和「驗過但全不準」不該顯示成同一個數字
- 分項統計：依吉凶等級／問事類別／占卜模式，並只列出有回填資料的組
- `bestCategory` 預設要求 5 筆樣本——三筆全中就宣告「你問感情特別準」是拿雜訊當訊號
- 無法辨識的狀態值（舊版或手動匯入的備份）歸為未驗，不讓 NaN 汙染應驗率

**UI**
- `OutcomeMarker.tsx`：三態選擇 + 自述備註，放在籤詩頁**最下方**——
  剛揭曉時結果還沒發生，此處出現「準不準」只會困惑
- 收藏／歷史清單加上占驗小徽章，一眼看出哪些已驗、驗得如何
- 統計頁新增「占驗簿」區塊：加權應驗率、三態計數、回填延遲中位數、
  個人洞察（哪類問事最準）、待回填提醒
- 兩項新成就：「占而後驗」「占驗有簿」

### 7.2 月建旺衰——同一卦在一月和七月不該給出一樣的斷語

六爻判吉凶不只看體用生剋，還要看體卦五行在當月是**旺相休囚死**哪一態。
金在秋為旺、在夏為囚；同樣是「體剋用」，體卦當令則真能剋得動，
體卦入死則有心無力。舊版沒有這一層，全年給同一個答案。

- `date.ts`：`monthBranchNumber`（正月建寅）、`seasonOf`、`SEASON_ELEMENT`
  - 辰未戌丑為「土旺」而非歸進前後季節——否則土永遠沒有當令的時候，
    屬土的艮坤兩卦將永遠判不到「旺」
  - 月建以國曆月份近似而非節氣交接：換取零外部資料、可離線、可測試。
    誤差只在月初數日內，對五級粗判影響有限
- `liuyao.ts`：`strengthState` 五態判定 + `applyStrength` 吉凶位移
  - 旺相 +1 級、休 0、囚死 −1 級，**位移限定 ±1 並夾在序列兩端**——
    旺衰是輔助條件，不該把「用剋體」翻成大吉
  - `bodyUse.level` 保留未調整的原值，新增 `finalLevel` 為調整後結論。
    兩者並存讓使用者看得出調整從何而來，既有記錄語意也不變
- `buildLiuYaoReading` 新增 `at` 參數，**reveal 頁傳入記錄的 timestamp**
  還原起卦當時的時令——用現在時間會讓同一筆舊記錄每個月重看都得到不同斷語
- LiuYaoPanel 顯示月建、季節、當令五行與旺衰徽章；
  旺衰真的改動判定時才印出「由 X 調整為 Y」，沒改動就不多印一句沒資訊的話
- 旺衰同時餵給規則式解讀的行動建議與 AI 提示詞

### 順手修掉：全部成就對所有使用者永遠鎖住

`checkAchievements` 寫好了條件判斷，但**沒有任何畫面在呼叫它**。
實際會跑的只有 `recordUsage` 裡的連續天數，所以除了「七日問道」之外，
其餘 7 項成就對每一位使用者都是永久鎖住的——成就頁永遠顯示 0/8。

這與 Session 17 那批缺陷同一類：測試全綠、函式本身正確，
但沒有人接上去，純看單元測試看不出來。

- 新增 `syncAchievements()`：讀歷史與收藏 → 算統計 → 檢查全部成就，
  讓呼叫端不必自己拼統計而漏算
- reveal 頁每次揭曉後呼叫；成就頁載入時先補算，讓既有使用者的歷史一次補上

### 測試 405 → 486（+81）

- `verification.test.ts`（33）：加權計分、未驗不入分母、null 與 0 的區分、
  分項排序、樣本門檻、毀損狀態值防護、回填延遲中位數
- `storage.test.ts` +11：占驗 CRUD、歷史與收藏雙份同步、備註修白、不存在 id 的防護
- `date.test.ts` +9：十二月建對十二地支、四季與土旺月、當令五行完整性
- `liuyao.test.ts` +14：五態定義（每個當令五行下五種五行恰好分到五種相異的態）、
  位移夾制、同卦異月斷語不同、64 卦 × 6 動爻 × 五季全覆蓋
- `achievements.test.ts` +14：占驗成就、`syncAchievements` 由歷史推算、重複呼叫不重報

### Session 21 總結

15 檔案。TS 零錯誤 · Jest 486 全過（24 suites）· web build 15 routes。

---

## Session 22 — 介面字串全面 i18n 化（8/14）

### 問題：語言切換只換掉了一半

Session 19 補齊了「資料」的翻譯——64 首籤詩、32 顆棋子、8 項成就都有了
en/ja，共 1,440 條。但**介面文字**（按鈕、標題、提示、Alert、空狀態）
仍大量寫死在 JSX 裡。切到英文後，籤詩是英文的，包圍它的一切卻還是中文：
分頁列寫「首頁／收藏／設定」、刪除確認跳出「確定要刪除此記錄嗎？」、
占驗簿整張卡片沒有一個字變過。

語言切換器把三種語言都列出來，實際上只有一種能用完整。

### 字典 76 → 300 key

新增約 230 個介面 key，涵蓋 14 個頁面與 12 個元件。分工維持不變：
`services/i18n.ts` 管介面 chrome，`data/translations/` 管資料內容——
兩者資料形狀不同，混在一起會讓一份 key-value 字典硬吞 1,440 條長文。

**t() 支援佔位符插值**。原本只能查表，遇到帶數字的句子只好用字串相接，
而那會把語序焊死在中文上：

```
「連續 7 天」  →  '連續 ' + n + ' 天'
```

英文是 `7-day streak`、日文是 `7日連続`——數字的位置與前後綴各語言都不同，
相接的寫法在其餘語言只能拼出破碎的句子。改為 `t('home.streak', { n: 7 })`，
字典裡以 `{n}` 標記填空處。漏傳參數時原樣保留 `{n}` 而非換成空字串：
留著佔位符在畫面上很顯眼，靜靜少一段文字反而更難發現。

### 順帶修掉的既有缺陷

- **`settings.syncUnset` 指錯環境變數**。文案要使用者設定
  `EXPO_PUBLIC_SYNC_URL`，但 `cloudSync.ts` 讀的是
  `EXPO_PUBLIC_CLOUD_SYNC_URL`。照著設的人不會生效，且毫無線索。
- **`board.hint` 的符號與畫面不符**。提示說「點擊棋盤上的 ✛ 號」，
  `ChessBoard` 實際畫的是 `+`。
- **ShareCardView 的日期永遠是 zh-TW**。`toLocaleDateString('zh-TW')` 寫死，
  改為跟隨當前語言。分享卡的**色彩**刻意固定為品牌樣式（見 Phase 3），
  但**文字**該是使用者讀得懂的語言，兩者不是同一件事。
- **五處畫面 import 了 `t` 而非 `useI18n`**（首頁、收藏、統計、籤詩頁、
  抽棋頁）。直接 import 的 `t` 不訂閱語言變更，切語言後那些畫面不會重繪——
  使用者得離開再回來才看得到新語言。

### 模組層級常數會把語言凍結在載入當下

`PoemCard` 的 `CATEGORIES`、`onboarding` 的 `STEPS`、
`useQuestionCategories` 的 `BUILT_IN` 都是模組頂層的陣列，
存的是已經取好的文字。那個取值發生在模組載入時，之後切語言不會重取。
三處都改為存**譯文 key**，在 render 時才呼叫 `t()`。

`aiInterpretation.ts` 的 `UNAVAILABLE_MESSAGE` 同樣的問題，改為函式。

### 純服務不引入 i18n

`verification.ts` 被大量測試直接呼叫。若讓它自己查譯文，結果會隨全域語言
狀態而變，測試就相依於執行順序。改為 `accuracyByCategory` /
`accuracyByMode` / `bestCategory` 接受可選的 `labelOf`，由畫面注入譯文；
預設值維持 zh-TW，舊呼叫端行為不變。

### 刻意不翻譯的部分

- **棋子上的漢字**（帥將仕士相象車馬炮砲兵卒）—— 那就是棋子本身
- **棋盤上的「楚河漢界」**—— 畫在棋具上的字，不是介面
- **吉凶等級／五行／卦名的字面量**—— 是儲存在記錄裡的資料值，
  程式拿它們做比較與查表，不是拿來顯示
- **`api/interpret+api.ts` 的錯誤訊息**—— 伺服器端沒有使用者的語言資訊。
  這些訊息其實也不會被顯示：客戶端只看 HTTP 狀態碼，自行產生譯好的文案

### 測試 486 → 499（+13）

- `i18n.test.ts` +11：插值填入／多語序位置不同／漏傳參數保留佔位符／
  未知 key 不插值／`categoryLabel` 三語與自訂類別原樣回傳；
  另加守門測試「帶佔位符的 key 三種語言必須有同一組佔位符」——
  少一個會靜靜少掉數字，多一個會在畫面留下沒填掉的 `{n}`
- `i18nCoverage.test.ts`（2，新檔）：掃描 `src/app` 與 `src/components`，
  禁止硬編中文字串，並禁止直接 import `t`（`ErrorBoundary` 是唯一例外，
  class component 不能用 hook）

守門測試已用注入迴歸驗證過會失敗，不是空過。

### E2E 抓到的 hydration bug（單元測試看不見）

介面字串改完後單元測試 499 全綠、TS 零錯誤，**E2E 卻爆掉 21 個**——
七個路由的「可正常載入」全數失敗。先 stash 掉改動跑基準線確認是新傷，
再逐層縮小到 [useI18n.ts](src/hooks/useI18n.ts)：

```ts
useSyncExternalStore(subscribeToLang, getSnapshot)             // 壞
useSyncExternalStore(subscribeToLang, getSnapshot, getSnapshot) // 修好
```

`expo export` 會把 15 個路由預先渲染成靜態 HTML，那個階段沒有瀏覽器端的
訂閱來源。少了第三個參數 `getServerSnapshot`，React 在預渲染時拋
minified error #419，整頁 hydration 失敗退回客戶端渲染，DOM 會短暫停在 0×0。

**這是既有的潛在缺陷**：原本只有設定頁用 `useI18n`，一頁還撐得過去；
推廣到 26 個檔案後才變成全站致命。也就是說線上版本本來就帶著這顆地雷。

### `verify` 補上 E2E

CI 本來就有獨立的 e2e job，但本機的 `npm run verify` 只跑
typecheck + jest + build，正是上面那個 bug 能一路滑到 E2E 才現形的原因。
已改為 `typecheck && test && build:web && e2e`，讓本機與 CI 的關卡一致。

### 順帶稽核了新進的納甲模組

`najja.ts` / `sexagenary.ts` / `useGod.ts` / `yaoReading.ts` 這批京房六爻
結構層是另外進來的，一併查核：

**命理正確性全部通過**，且是用可機械驗證的規則查的，不是肉眼看：

- 日干支以三個獨立已知日期反查（2000-01-01 戊午、1949-10-01 甲子、
  2024-02-10 甲辰），JDN 公式與 J2000 曆元相符
- 八宮卦表 64 卦恰好各歸一宮，八宮各領八卦、世次不重複
- 世應恆相隔三位（六種世次全數驗過）
- 納甲六親抽驗水雷屯，六爻的干支、五行、六親、世應與傳統盤面逐條一致
- 384 條爻辭的爻名與卦象陰陽全數相符（陽稱九、陰稱六，
  這是唯一能純機械驗證經文有無錯位的規則）

**修掉三個缺陷**：

- **`api/sync.ts` 的下載永遠失敗**。Upstash `/get` 回的是
  `{result: "<字串>"}`，`result` 是字串不是物件；直接
  `Response.json(body.result)` 會把 JSON 再包一層字串，客戶端
  `r.json()` 拿到 string，`isCloudPayload()` 必然為 false。
  症狀是「上傳看似成功、下載永遠回 null」——雲端同步等於沒有作用。
- **`MAX_BODY_BYTES` 用字數而非位元組數判斷**。`raw.length` 是 UTF-16
  code unit 數，而這個 App 存的是中文籤詩，一個字佔 3 個 UTF-8 位元組，
  上限實際放寬到約三倍。
- **第 12 卦（天地否）的爻辭用逗號**，其餘 63 卦用全形冒號。
  任何依冒號切分爻名的處理都會在那一卦上得到整句。

另 `kv()` 的 `command` 參數從未被讀取（讀寫實際由 `value` 是否給定決定），
已移除以免誤導。

**新增 `najja.structure.test.ts`（6 個）**：把上述那些機械規則固定成守門測試。
這兩份都是人工整理的靜態表，抄錯一格不會讓程式壞掉，只會安靜地輸出錯誤的
命理盤面——「函式回傳非 null」這種測試是抓不到的。

### 尚未處理

`najja.ts` 不做**伏神**：當某個六親在本卦中缺席時，傳統六爻需從本宮卦
取伏神。`useGodForCategory` 目前只涵蓋財運／事業／學業三類，其餘回 null
交由使用者自行判讀——這是模組檔頭寫明的刻意取捨，不是遺漏。

### Session 22 總結

52 檔案。TS 零錯誤 · Jest 524 全過（30 suites）· E2E 78 全過 · web build 15 routes。

---

## Session 23 — 伏神與用神斷語（8/16）

### 問題：卦中缺六親時，整張盤給不出答案

Session 22 的「尚未處理」明列了這個缺口：najja 不做伏神。實際影響比字面上大——
問財而卦中無妻財、問事業而卦中無官鬼，是常見到不能再常見的情況。沒有伏神，
就等於「無用神可斷」：六爻面板能展示裝卦、六親、世應、空破，卻回答不了
使用者真正問的那句話（「這筆錢拿不拿得到」）。

### 伏神：從本宮首卦取卦中不現的六親

- **`buildHiddenSpirits`（najja.ts）**：缺席的六親改由本宮首卦（八純卦）同位爻取出。
  八純卦的六個地支必涵蓋五行，故**任何缺失的六親都一定找得到伏神**——這條性質
  被寫成測試固定下來，不是偶然成立的。
- **飛伏關係五種**：飛來生伏／飛來剋伏／伏去生飛／伏去剋飛／飛伏比和。
  飛剋伏則被壓住透不出來；伏去生飛是洩己之氣同樣無力，兩者判為不能透出。

### 用神斷語：把整張盤收斂成「所問之事如何」

新增 `wenwang.ts`。取定用神（上卦取卦中之爻，多爻兩現取最先出現者並註明；
不上卦改看伏神），再逐項權衡：月建旺衰、日辰作用（沖合先判、再判生剋比和）、
空亡月破、伏神飛伏、動爻生剋用神、用神自化回頭生剋。

**可檢查的加減分**：所有條件的分數集中在 `SCORE` 常數，`reasons` 逐條列出實際
採計了哪些條件，UI 每條理由後直接印出 +2／−1。使用者看得到結論是怎麼算出來的，
不是一句沒有來歷的判詞。

**誠實邊界**（延續 Session 10 對「AI 字樣」的處理）：檔頭寫明這是規則式加權，
不是斷語的權威。三合局、六沖變六合、進神退神、反吟伏吟、暗動刻意不做——在
本 App 的輸入條件（沒有確切占時與問事人身分）下判進去，只會製造看似精確的雜訊。
同樣地，`useGodForCategory` 只涵蓋財運／事業／學業三個語意明確的類別；其餘類別
取不到用神就**不出斷語**，硬猜身分反而會給出看似精確、其實無根據的結論。

### 順帶修掉的既有缺陷

- **伏神漏判月破**。上卦用神逢月建沖會計月破，伏神卻沒有——初版只檢查了
  `subject.isMonthBroken`。伏神的地支被月建沖到同樣是月破、同樣是「事起不來」
  之象，不該因為沒上卦就躲過這一項。已改為上卦與伏神一視同仁。
- **`buildNaJiaReading` 的 return 內嵌 .map 重構**：伏神需要「卦中已現哪些六親」
  的集合，而原寫法在 return 物件內直接 map，沒有地方能先算出這個集合。

### 測試增減（524 → 536，新增 wenwang.test.ts 12 個）

斷語是加權結果，測「分數等於某個數字」會綁死權重、改一個常數就全紅，故一律測
**方向性**與可機械驗證的**結構性質**：

- 64 卦全窮舉：缺席的六親一定找得到伏神；已上卦的六親不會再出現在伏神裡；
  八純卦六親俱全故無伏神
- 飛伏關係五種方向全覆蓋；飛剋伏／伏去生飛判為不能透出
- 用神上卦取卦中之爻不取伏神；不上卦時改用伏神五行論斷
- 總分必須等於各條理由之和（不得有隱藏的加減）；斷語落五等第之內
- 用神當令的分數高於失令（方向性迴歸，防月建權重反號）；伏而不出比伏而可出扣分更多
- 伏神逢月破與上卦用神一視同仁（4 個日期 × 64 卦窮舉）

### Session 23 總結

TS 零錯誤 · Jest 536 全過（31 suites）· E2E 78 全過 · web build 15 routes。

---

## Session 24 — 上架截圖與棋盤重複子（8/18）

處理未來待辦中不需外部資源的部分。#5 螢幕截圖與 #11 棋盤重複選子都做完了，
其餘（Vercel 環境變數、實機、$99／$25 帳號）卡在外部資源，非程式問題。

### 問題：截圖腳本會過，但拍到的不是那個畫面

`npm run screenshots` 24 張全綠，實際打開看卻有兩張根本不能用——
**截圖測試的綠燈只代表「檔案寫出來了」，不代表畫面對**。這類缺陷用
斷言數量是抓不到的，只能真的把圖打開看。

- **抽棋動畫拍成了問事表單**。腳本找 `/抽取|開始/` 這顆按鈕，但抽棋是由
  「單棋／雙棋／三棋」卡片直接啟動的，根本沒有這顆按鈕。選不到時
  `.catch(() => {})` 把失敗吞掉，於是拍下一張下半部全空的表單當上架素材。
  改為點數量卡片，並以「誠心問道」斷言確實進入動畫——**選不到就該紅**。
- **棋盤拍成空棋盤**。指南要的是「已放置的棋子＋位置解讀」，腳本卻只
  `goto('/board')` 就截圖，0/3 顆棋。改為實際擺三顆再拍。

### 順帶修掉的既有缺陷

- **示範資料用了不存在的吉凶等級**。種子寫「吉」「平」，但 `poems.ts`
  實際只有大吉／上吉／中吉／中平／下下五級。後果是吉凶分佈圖有三列恆為 0，
  趨勢圖的好壞分類還會默默漏算這些記錄——圖表看起來像壞的，但沒有任何
  測試會紅。
- **占驗簿在截圖裡是空狀態**。Phase 7 的招牌功能，示範資料卻沒有任何
  `outcome`，只顯示「尚無占驗記錄」。已補上七筆回填、刻意留一筆未回填——
  全部填滿就看不出「未回填不計入分母」這個設計。
- **每日運勢由擷取當天的日期決定**。曾擷到「下下·舉步維艱」當商店第一張圖。
  素材必須可重現，改為種入固定的 #14 火天大有。
- **窄螢幕標題被切掉**。點放置點會觸發 `scrollIntoView`，Android 1080×1920
  上把標題捲出畫面。截圖是固定視窗的，捲動位置就是成品的一部分。
  注意 `window.scrollTo` 在這裡完全無效——react-native-web 捲的是內層
  ScrollView 容器。

### #11 棋盤重複選子：其實早就做完了

待辦寫「2 顆棋時無法組出乾為天／坤為地」，但 `allowRepeatedPieces` 開關
早已存在（預設關閉，開啟後可重複放置）。缺的是**測試**——功能沒有任何
守門，改壞了不會有人知道。已補兩個：預設必須為關、開啟後同一顆棋可重複
放置。這正是待辦與程式碼脫節的典型情況，靠讀 code 才發現。

### 新增 testID

棋子與放置點都是 SVG，Playwright 靠漢字只會定位到不可點的 `<text>`。
沿用專案既有的 `card-grid` 慣例，替棋子庫與放置點加上 testID。

### 測試增減（536 → 538）

- `divinationHooks.test.tsx` +2：允許重複棋子預設關閉、開啟後可重複放置

### Session 24 總結

TS 零錯誤 · Jest 538 全過（31 suites）· 截圖 24 張（6 場景 × 4 尺寸）可重現。

---

## Session 25 — 用神擴充至感情／健康／出行（8/19）

待辦 #12 一直卡在一句話：「需先決定是否在問事流程加身分／對象輸入」。
實際拆開來看，三個類別要的東西並不一樣——**只有感情真的需要問**。

### 健康與出行：不必問，傳統本來就有答案

疾病與出行問的是「我自己如何」，六爻的取法是**世爻為用神**——
世爻就代表問卜者本人，不需要猜是哪一個六親。原本卡住的理由其實是
把三個類別當成同一個問題。所以這兩類零輸入就能出斷語，一步都沒加。

為此在 `judgeUseGod` 加了世爻取法：世爻必在卦中，故永遠不會有伏神那條
路徑。斷語第一行會先講明「世在 N 爻某某持世」——否則使用者只看到一個
分數，不知道斷的是哪一爻。

### 感情：只有這一類非問不可

男占以妻財、女占以官鬼，**取法完全相反**。猜錯就等於把用神取反，
比不出斷語更糟。故新增設定「占者性別」（預設不指定），未指定時
不出斷語，但**改為在盤上說明缺什麼**——原本靜靜不顯示，使用者只會
以為功能壞了。

性別放在設定而非問事流程：它是穩定屬性，不像問事類別每次都不同，
每占一次問一次是多餘的摩擦。

### 喜神與忌神

各類問事另有助事／壞事之神（問病忌官鬼喜子孫、問財忌兄弟喜子孫……），
在兩種情況計分：**持世**（只在世爻為用時判，六親為用時「忌神持世」
講的是問卜者處境，與用神旺衰不同層）與**發動**。

發動這項刻意加了防重複：動爻若已依五行生剋計過分，就不再以喜忌之神
身分計第二次——同一個動作扣兩次分會讓權重悄悄變成兩倍。有測試守著。

### 順帶修掉的上架素材缺陷

Session 24 的教訓（截圖全綠不代表畫面對）在讀 seed 時又中一次：

- **示範記錄用了不存在的類別 key `love`**。內建類別是 `marriage`，
  `categoryLabel` 找不到就原樣回傳——統計頁的分類欄位會直接印出英文
  `love` 當商店素材。
- **`drawAnimationSpeed: 'standard'`**：型別只有 slow／normal／fast，
  'standard' 不是合法值。

### 測試增減（538 → 549，E2E 78 → 86）

- `useGod.test.ts` +4：世爻取法、感情依性別相反、未設性別回 null、
  喜忌之神不得自相矛盾
- `wenwang.test.ts` +7：世爻為用永無伏神、忌神／喜神持世的方向性、
  六親為用時不計持世、喜忌與生剋不重複計分
- `divination.spec.ts` E2E +4（× 2 專案）：疾病出斷語、感情缺性別顯示
  提示、設定性別後以妻財為用、性別設定寫入與清除

寫 E2E 時踩到兩個自己挖的坑，都是斷言寫錯而非程式錯：提示文字裡也
含「用神斷語」四個字，`getByText` 預設是子字串比對會連提示一起選到；
另一個是想測「重載後仍在」，但 fixture 的 `addInitScript` 每次導覽都會
重寫設定，那樣測到的是 fixture 不是 App。

### Session 25 總結

TS 零錯誤 · Jest 549 全過（31 suites）· E2E 86 全過 · 截圖 24 張仍可重現。
七個內建問事類別中，六類可出用神斷語（僅「綜合」不出——問法本身不明確，
沒有用神可取）。

---

## Session 26 — 文王卦進階條件：進退神／暗動／三合局（8/19）

待辦 #13 原本的備註是「需確切占時等前提，要做之前須先補問事時間輸入」。
重新檢視後發現這說法只對一半：**進退神、暗動、三合局的判定前提，
卦本身與日月已經給足**——進退神只看動爻與變爻地支，暗動看靜爻與日辰
之沖，三合局看六爻地支能否湊成一局。起卦時盤上全都有了，不需要新輸入。
真正缺「確切占時」的是**應期**，那仍維持刻意不做（起卦只到日柱，推到
時辰等於編日期）。新層在 `src/services/conditions.ts`，判法與計分都集中
在 `wenwang.ts` 的 SCORE 常數，逐條理由照舊。

### 進退神

用神自身發動、化出**同五行**地支時：順行（寅→卯、巳→午、申→酉、亥→子，
土以丑→辰→未→戌四步循環）為進神 +1，逆行退神 -1。丑↔未、辰↔戌是沖
不是進退。與回頭生剋不重疊——同五行必為比和，那兩條本來就不會觸發。

### 暗動

靜爻**旺相**而逢日辰沖，暗中有力。與日破的分野只在旺衰：同樣是日沖
靜爻，不分旺衰就會把有力的爻當成壞掉的爻。生用神 +1、剋用神 -1；
用神自身不算（斷的是它的處境，不是它動不動）。

### 三合局

無動不成局——發動的爻必須在局內，日辰可補足缺的一支。局成則該五行
成勢，對用神的作用比單一爻大：用神入局 +2、局生用神 +1、局剋用神 -1、
用神在局中而洩氣 -1（把力氣送出去）。全局最多計一次，取影響最大的
那一條。

### 反吟伏吟：證明了做不到，而不是沒做

爻級反吟伏吟的定義是動出之卦與本卦**同位**地支相沖或相同。單動爻模型
下窮舉 64 卦 × 6 爻 = 384 種全部不成立——翻一爻只會換掉上下卦其中一個
三爻卦，而單位元相異的兩個三爻卦，同位爻的納甲地支既不會相同也不會
相沖（乾變震那種伏吟要整個三爻卦替換，兩爻以上同動才做得到）。所以
它不是「刻意不做」，是數學上不可能。`conditions.test.ts` 有窮舉測試守著
這個前提：哪天改成多爻同動，那條測試會紅，屆時補反吟伏吟才有意義。

### 空轉防護的兩個實例

- **反吟伏吟計分一度寫好**，用探針測試發現 384 種盤面 0 次觸發——不是
  測試難寫，是程式碼根本跑不到。確認不可能成立後整段移除，不留死程式。
- **暗動整合測試一度是空的**：預設日期（乙亥日）整年碰不到暗動爻。
  全年掃描找到第一個暗動日（己卯日）後，把測試釘在 `2026-01-05`，
  並以 `expect(seen).toBeGreaterThan(0)` 守門——測不到觸發的測試
  是假綠燈。

### 測試增減（549 → 564，E2E 86 不變）

- `conditions.test.ts` 全新 11 條：進退方向性、土四步循環、沖非進退、
  同五行不變量、三合局的無動不成局／動爻入局／三支俱在／日辰補足、
  暗動的靜爻＋日沖＋旺相三要件（含旺相精確性窮舉）
- `wenwang.test.ts` +4：進退神僅在用神自發動時計、暗動不重算動爻本身、
  無動不成局、五級吉凶與總分加總不變量（64 × 6 全盤掃描）

### Session 26 總結

TS 零錯誤 · Jest 564 全過（32 suites）· E2E 86 全過 · build:web 成功。
進退神、暗動、三合局正式納入用神斷語；反吟伏吟以數學證明排除並留
守門測試。仍刻意不做：應期與親屬關係（前提不足，不是懶）。

---

## Session 27 — 原生端書法字體子集化（8/19）

待辦 #10。原生端終於不必再靠系統楷書後備：Noto Serif TC 子集到 App
實際用字的規模，籤詩在原生端也看得到書法字體。

### 子集策略：過度收錄是故意的

收錄規則 = src 全部 .ts/.tsx 出現過的非 ASCII 字元（含註解）＋ ASCII
可列印＋常用標點，共 2,763 字元。完整字型 9.5MB → 子集 1.2MB。
連註解都收的理由：字形檔多幾個 KB 無感，漏一個字就是一個豆腐塊。
產生腳本 `scripts/subset-font.py` 進 repo，可重跑。

### 日文新字體的插曲

TC 字型的 cmap 沒有日文新字體漢字（価、単、厳……），而 ja 譯文用得到。
解法不是讓那 129 個字走系統後備，而是再以 Noto Serif JP 子集補上、
fontTools 合併成一個字型檔——家族名統一為 NotoSerifTC，iOS／Android
用同一個 key。

### 字符檢查抓出兩個陳年錯字

子集腳本的「不該缺的字」硬檢查順帶揪出兩個混進簡體字的錯處：

- 爻辭「三歲不觌」——觌 是簡體，易經原文是「三歲不覿」（yaoReading.ts）
- ja 譯文「隆中に隐居」——隐 是簡體，日文新字體是「隠居」（poems.ts）

### 載入方式：執行期 loadAsync 而非 config plugin

SDK 57 文件建議 config plugin，但 plugin 只對 prebuild 的建置生效，
Expo Go（待辦 #3 的實機測試方式）吃不到。故用 expo-font 的
`loadAsync`，成功失敗都不阻塞渲染。`useFontLoad` 拆出 `.web.ts` 版——
原生版 require 的 1.2MB 字型若留在共用檔，會被 Metro 包進 web 匯出
（dist 4.9M → 3.7M，還掉一張無用載重）。

### 守門測試（+3，564 → 567）

`fontSubset.test.ts` 三條：

1. 字型檔存在且大小合理（100KB～5MB）——防空檔、也防 9.5MB 完整檔誤入
2. src 每個非 ASCII 字元都落在「子集收錄」或「排除清單」其一——新字串
   用到新字元測試就紅，重跑 `python scripts/subset-font.py` 即可
3. 排除清單只允許符號與 emoji：漢字／假名／全形標點不得缺席（測試檔
   不計——`[一-鿿]` 這種正規式範圍界標不需要字形）

### 產出可重現性修正（同 session 後補）

收尾重跑子集腳本時發現 commit 進去的 manifest 宣稱覆蓋 ◈、❤ 兩字，
但字型 cmap 查無——產出物是在字型套件中繼狀態下生成的。用 fontTools
逐一查驗 cmap 證實後，以提交版 node_modules 重跑腳本，manifest 與
字型自此互相一致；排除清單內容未變（◈、❤️ 本來就在系統後備範圍）。
守門測試兩版皆綠，但「重跑腳本等於原樣還原」這條可重現性，只有
自洽的那一版才守得住。

### Session 27 總結

TS 零錯誤 · Jest 567 全過（33 suites）· E2E 86 全過 · 截圖 24 張仍可重現。
原生端籤詩改用以子集化 Noto Serif TC 渲染；web 端維持 Google Fonts 不變。
至此 14 項未來待辦中僅餘需外部資源／產品決策的項目（Vercel env var、
實機測試、上架、字體以外的低優先項）。

---

## Session 28 — 部署上線與文件校正（8/22）

收尾這輪唯一還動得到的待辦：把 Session 25–27 的程式推到線上，
順帶清掉幾個過期文件。

### 部署

`npx vercel --prod`（本機 CLI 已有登入）重推後，驗證 live bundle
確實含新代碼——用 Session 26 的字串標記（暗動、化進神、合局）逐一
比對。`api/interpret` 上線正常，未設 `DEEPSEEK_API_KEY` 時回 501、
前端照舊降級規則式解讀，符合設計。

### 驗證過程的教訓

線上 bundle 的中文全部編碼成字面 `\uXXXX`，用 grep 查標記字串時
`\u` 會被 GNU grep 的 BRE 摺疊掉、MSYS 對原生 Python 的引數轉換又會
吃掉反斜線——兩層加在一起讓「線上是舊版」的假結論通過了三次檢查。
最後改用檔案型 Python 腳本、raw string 比對才一次命中。**在 Windows
上用 shell 查 Unicode escape 一律走腳本，不要 inline。**

### 文件校正

- 專案總覽數字與實際同步：原始碼檔案 86 → 111、元件 18 → 19、
  Hooks 11 → 12（Session 26/27 新增檔未計入）
- DEVELOPMENT_PLAN 的「尚未處理」段落更新：棋盤重複選子限制與
  字體子集化都已做完，僅剩寬螢幕雙欄佈局（產品決策）

### Session 28 總結

E2E 86 重跑全過。線上 = 最新程式，13 項技術面／可自辦的待辦至此全數
清空；餘 Vercel 金鑰、實機測試、上架帳號、域名等外部資源項目。

---

## Session 29 — 全面查錯與修復（8/22-8/23）

四路並行審查（UI／同步／AI／引擎）掃過約 1 萬行核心代碼，逐條對照原始碼
驗證後修掉 25 條真實缺陷——全部屬於「上線了但沒人踩到」的那一類：另一台
裝置、第二次操作、失敗路徑，手動測試幾乎不可能踩到。

### UI 層（11 條）

- **拖曳放子全程失效**：PanResponder 只建一次，閉包抓死首渲的 onDragEnd
  （當時 selectedPiece 還是 null）→ 最新回呼存 ref，處理器一律建立
- 每日運勢分享：原生直接取 navigator.share/clipboard（原生端兩者皆無），
  未 await 的 share 被取消時 rejection 無人接 → 統一走 shareNative /
  copyToClipboard 後備鏈
- ShareCardView 截圖失敗靜默假成功 → share() 回傳 boolean，失敗才走文字後備
- reveal 分享成功後仍往下走文字後備鏈 → `if (shared) return`
- reveal 對壞記錄（NaN 時間戳等）白屏 → missing 狀態與錯誤 UI，進 najja 前擋下
- 抽棋／棋盤解讀後返回卡在「正在為您解讀…」、重抽寫重複記錄 →
  in-flight guard + 導航後立刻 reset
- 語言切換不持久（setLang 未寫設定；App 重啟模組狀態遺失）→ 持久化 +
  _layout 啟動還原語言／音效／觸覺
- 墨跡背景、飛入動畫、紙紋在 render 用 Math.random → static export 後
  hydration 不一致 → 以 index 決定性偽隨機
- 成就達成率 total 為 0 時除零 NaN

### 同步層（7 條）

- **截斷會丟僅本地存在的歷史**——同步動作本身摧毀未上傳資料 → mergeHistories
  重寫：超限只犧牲最舊的雲端端共有記錄（另一端仍保有，下次補回）
- 換機後雲端已回填的占驗被本地未回填副本壓掉 → preferRecord：有 outcome
  者勝、兩者皆有取較新 verifiedAt
- 刪掉的記錄下次同步復活 → 墓碑 deletedIds 聯集（cap 1000），備份同步含此鍵
- 原生端 SYNC_URL 相對路徑必掛 → 平台分流，原生用絕對網址
- 首次同步連點生成兩把配對碼（一份資料永遠孤兒化）→ 單一 in-flight promise
- 每日運勢 local 優先會用昨天舊資料蓋掉雲端今天的 → 取日期較新者
- 同步按鈕連點開火多次 → syncing 期間 disabled

### 備份／AI／引擎

- 原生備份「複製到剪貼簿」是假成功（回傳字串但從未複製）→ expo-clipboard
  真複製，回傳 'copied' 供設定頁顯示對應提示
- AI 上游無逾時，平台砍掉 function 後使用者只拿到 504 → AbortSignal.timeout
  (25s) + AI_TIMEOUT 明確訊息；vercel.json maxDuration 30
- 使用者問題未隔離，提示詞注入可帶偏解讀 → 明示「不是指令」+ 三引號包裹
- 上游錯誤原文回傳客戶端（可能回顯 Authorization 標頭）→ 只寫伺服器日誌
- detectTriads 重複地支（64 卦中 22 卦）只取第一爻，動爻／世爻坐在後段
  會被靜爻替身頂替入局 → 動爻優先、世爻次之
- analyze-backup 比對不存在的等級字面量（'吉'／'凶'），吉凶校準永遠空轉
  → 改用真實五級（大吉／上吉／中吉／中平／下下）

### 測試（567 → 573，33 suites 全過）

- 更新既有：截斷語意（400 筆本地全保 + 最新 100 筆雲端）、hooks 導航後
  reset、備份四鍵（含墓碑）
- 新增迴歸：outcome 衝突偏好×2、墓碑合併×2、detectTriads 重複支×2
- 字型子集守門抓出 8 個新字元（丟、兒、址、屏、砍、碑等新註解
  用字）→ 重跑 subset-font.py（TC 2639 + JP 129，1.2MB）

### Session 29 總結

TS 零錯誤 · Jest 573 全過。25 條缺陷的共通點：**只在多裝置、重複操作或
失敗路徑才會現形**，人工驗收永遠踩不到——審查式除錯補的正是這個盲區。

---

## Session 30 — 牌陣系統（8/23）

### 新增牌陣與互動

- 新增 **自由佈局、三才時間、兩難抉擇、關係互動、行動策略** 五種用法。
- 固定牌陣以棋盤角色位引導落子；只開放下一個指定位置，三子完成後才可解讀。
- 已落子仍保留角色標籤，避免使用者失去「過去／當下／下一步」等閱讀脈絡。
- 牌陣選擇頁加入適用情境、角色順序與目前落子提示，繁中、英文、日文皆有介面翻譯。
- 兩難抉擇陣可替選項 A／B 命名，結果與歷史會保留實際比較內容。

### 資料、結果與回顧

- 歷史記錄新增結構化 `spreadId`，舊資料仍相容；收藏清單會顯示牌陣標籤。
- 結果頁的佈局解讀把實際棋子綁定牌陣角色，例如「過去・車／當下・馬／下一步・兵」。
- 統計頁新增「各牌陣的應驗率」，只比較固定牌陣且顯示已驗樣本數，避免自由佈局與舊資料稀釋結果。

### 驗證與部署

- 已通過 TypeScript、牌陣／儲存／占驗／i18n 相關 Jest 測試與 Expo Web 靜態匯出。
- 新增固定牌陣的 Playwright 流程測試。（撰寫當下本機 Chromium 未能安裝而未實跑，
  已於 Session 31 補跑：該測試的定位字串同時命中標題與位置摘要內文，觸發 strict mode
  錯誤，修正為比對只存在於角色解讀中的字串後通過。）
- **Production 已部署**：2026-08-23 23:34（Asia/Taipei）發布至 https://chess-divination-app.vercel.app；Vercel deployment `dpl_DRnqadTTgftYhzwmWHwbQeqLHmH4` 狀態為 Ready，`api/interpret` 與 `api/sync` 亦已建置。

---

## Session 31 — 主題接線修復、原生還原、平行工作整合（8/23-8/24）

本 session 與 Session 30（牌陣系統）平行進行，兩邊的改動一度交纏在
同一批提交中，故最後一段是把兩者整合收束。

### 主題切換的接線斷裂

設定頁的主題按鈕只呼叫 `saveSettings`，從未通知 ThemeProvider，
而 Provider 只在掛載時讀一次設定——**按鈕會亮起、設定也存了，畫面卻要
重開 App 才變色**。色盤、token、`useThemedStyles` 全都正確，斷的只有那一條線。

- 改由 context 的 `mode` 作單一真相，切換走 `setMode`（它自己會持久化）
- `loadSettings()` 升格為「儲存 → 即時狀態」的單一同步點：還原備份與
  雲端同步在背後改寫設定後，主題與語言也會跟著回推（原本同樣只更新元件狀態）
- 實測驗證：點宣紙 `rgb(26,18,16)` → `rgb(237,224,208)`，切回墨色亦即時

這是與 Session 29 的「語言切換不持久」完全同類的缺陷，只是還活著。

### 原生端還原備份（備份原本只做了一半）

`restoreData()` 在原生一律回 `false`——使用者按「還原備份」必定失敗。

- 備份：寫進 cache 後交系統分享表單（存到「檔案」App／雲端），分享不可用時退回剪貼簿
- 還原：DocumentPicker 選檔 → 讀檔 → 驗證 → 寫回；只有選檔管道整個不可用才讀剪貼簿
- 檔案格式兩平台一致——**web 匯出的 .json 可在手機還原**，換機搬家靠這條
- 取消與失敗分流為 `'ok' | 'canceled' | 'invalid' | 'error'`：取消是正常操作，
  不再誤報「還原失敗」

寫測試時另外抓到一個設計缺陷：讀檔失敗被歸進「選檔器不可用」而去讀剪貼簿，
等於拿一份無關內容當作使用者的意圖。已把 catch 範圍收窄。

### UI 一致性

- **PieceIcon 接上主題**：三個色值原本寫死，且**混用了兩個主題的值**——
  邊框取暗色主題的金（宣紙主題應為較深的 `#A08040`）、黑子取宣紙主題的墨。
  同一顆棋子在棋盤上跟著主題走、首頁的幸運棋子卻不動。已從 `theming.test.ts`
  的 allowlist 移除（原豁免理由「呼叫端會傳主題色覆蓋」對它並不成立）。
- **Switch 滑塊**：金色軌道配 Material 青綠滑塊。查 `react-native-web` 原始碼
  才找到真因——**開啟狀態讀的是 `activeThumbColor`，`thumbColor` 只管關閉狀態**，
  所以只補後者無效。修正後滑塊為 `theme.bgRice`，兩個主題各自正確。

### 牌陣的介面混語

`t('board.spreadNext', { label: slot.label })` 把硬編中文角色名插進已翻譯的
句子，英文介面顯示 **`Next: 過去`**。`SpreadSlot` 增設 `labelKey`，介面一律走
翻譯鍵；`label`（中文）保留供寫入歷史記錄，與 `position.ts`、`interpretation.ts`
等解讀服務一致——生成的命理文字本來就是中文限定，這一點不動。
補 12 個角色名鍵 × 3 語言。實測英文介面得到 `Next: Past`。

### 平行工作整合

- 三張牌陣 i18n 對照表（名稱／說明／適用提示）原本兩張在 `spreads.ts`、
  一張留在 `board.tsx`，統一收進 `spreads.ts`
- `translations` 對外匯出，讓三語完整性可被測試直接檢查——先前以正規式掃
  原始碼會被含撇號而改用雙引號的英文值誤判（如 `"Today's ..."`）
- WORKLOG 的牌陣段落原被追加在「功能完整清單」之後，已歸位並改名 Session 30
- 補跑 Session 30 未能執行的 e2e：其牌陣測試的定位字串同時命中標題與位置摘要
  內文而觸發 strict mode 錯誤，改為比對只存在於角色解讀中的字串後通過

### 測試（601 → 617，e2e 86 → 108）

- `themeMode.test.tsx`：ThemeProvider 行為 7 條 + 接線靜態守門 2 條
- `backup.test.ts`：原生備份還原通道 13 條，含跨平台往返
- `spreads.test.ts`：三語覆蓋、角色解讀邊界、三張對照表完整性
- `i18n.test.ts`：全表三語完整性、空白值、佔位符一致性 4 條
- `e2e/theme.spec.ts`：**淺色主題首次獲得自動化覆蓋** 20 條——先前 86 條 e2e
  與 24 張截圖全跑暗色，主題切換的缺陷正是這樣活下來的

### 原生端音效（原本全靜音）

六個音效都是 Web Audio 即時合成，`getCtx()` 在原生直接回 null——
iOS/Android 一聲都沒有，設定頁的音效開關卻照樣可切。

不在原生另寫一套音色（那會讓兩個平台愈走愈遠），改成
**用 Web 版完全相同的合成參數離線算成 WAV**：

- `scripts/generate-sounds.mjs`：零依賴的 Node 合成器，重現三角波滑音、
  白雜訊經 RBJ 帶通的撞擊瞬態、五聲音階與鈴鐺泛音；搖棋的抖動改用
  決定性偽隨機，重跑腳本得到位元相同的檔案（否則 diff 永遠是髒的）
- 產物 `assets/sounds/*.wav` 六個共 392KB（16-bit PCM、單聲道、44.1kHz）
- 原生播放走 `expo-audio`：播放器延遲建立並重用，每次播放前 `seekTo(0)`
  ——不倒帶的話快速落子只有第一次有聲音；關閉音效時釋放播放器停掉殘響
- `setAudioModeAsync({ playsInSilentMode: true })`：iOS 靜音鍵預設會讓
  App 無聲，但占卜音效是使用者主動觸發的回饋，且設定頁已有獨立開關

平台分檔沿用字型的既有作法（`X.ts` 原生／`X.web.ts` web）：
`sound.ts` 為原生版、`sound.web.ts` 為 Web Audio 版。
六個 WAV 若留在共用檔會被 Metro 一起包進 web 匯出——已驗證 dist 維持 3.8M
且不含任何 .wav。

既有的 34 條 Web Audio 測試改為明確 import `sound.web`：jest-expo 的預設
平台是 ios，寫 `'../services/sound'` 會解析到原生版。

### Session 31 總結

TS 零錯誤 · Jest 635 全過（36 suites）· E2E 108 全過。
四項 UI／功能缺口至此清空：主題接線、原生還原、UI 一致性、原生音效。
⚠️ Production 停在 8/23 23:34 的部署，尚未包含本 session 的修復。
（已於 Session 32 一併上線，見下。）

---

## Session 32 — 四路審查：線上壞掉與靜默毀資料（8/24）

起點只是「把 Session 31 推上線」。推之前先做了一輪四路審查——原生端落差、
資料完整性、使用者流程／i18n／無障礙、命理正確性——結果比預期嚴重得多，
於是先修完再一起部署。

四路一共確認 35 條缺陷。本 session 修掉的是兩層：**線上已經壞掉的**、
與**會靜默弄壞使用者資料的**。其餘 25 條經原始碼核對後寫進「未來待辦」，
不讓它們隨對話消失。

### `Alert.alert` 在 web 是空函式（最嚴重）

`react-native-web` 的 Alert 是 `class Alert { static alert() {} }`——
呼叫它什麼都不會發生。線上 PWA 因此有一整批動作是死的：

- **還原備份**、清空歷史、刪除單筆／批量記錄、刪除資料夾、刪除自訂類別
- 棋盤有落子時的「返回」確認：按了沒反應，只能用瀏覽器上一頁逃出去
- 所有告知型提示（備份成功／失敗、同步結果、配對碼格式錯誤）

有確認鈕的更糟：`onPress` 永遠不會被呼叫，整個功能等於不存在，而且**沒有
任何錯誤訊息**——使用者只會覺得按鈕壞了。這正是 Session 31 原生還原缺陷的
鏡像：還原在原生修好了，在 web 卻是死的。

`reveal.tsx` 早在很久以前就改用 `window.confirm` 繞開這件事——**知道問題
存在卻只修了自己那一處**，其餘 17 處沒跟上。

修法沿用專案既有的平台分檔慣例（`sound.ts` / `sound.web.ts`）：
新增 `services/dialog.ts`（原生走 `Alert.alert`）與 `dialog.web.ts`
（走 `window.confirm` / `window.alert`），對外是 Promise 介面——
`Alert.alert` 是 callback、`window.confirm` 是同步回傳，Promise 是唯一
能同時包住兩者的形狀。17 處全部改接，`reveal.tsx` 的自製版本一併收編
（它在原生端沒有 `window`，等於整段降級在手機上是靜默的：不問就複製、
複製完也不說）。

原生版另外補了 `onDismiss`：Android 可用返回鍵或點外面關掉對話框，
兩者都不觸發任何 `onPress`——少了它，Promise 會永遠懸著，`await` 之後的
程式一行都不會執行。

**守門**：新增三條測試禁止 `src/` 下任何檔案（`dialog.ts` 自身除外）
呼叫 `Alert.alert`、從 react-native 匯入 `Alert`、或在畫面層直接用
`window.confirm` / `window.alert`。這個缺陷能活這麼久，正是因為沒有東西擋著它。

### 靜默毀資料的三條

**備份還原不驗值的型別**（`backup.ts`）。`parseBackup` 只檢查「認得的鍵在不在」，
值是什麼一概照收，而還原是直接把值寫回儲存。讀取端對壞值的反應是安靜地當作
空的、或直接崩潰：`history` 給物件而非陣列 → `normalizeRecords` 回 `[]`，
使用者看到的是「還原成功」配上一片空白的歷史，**像是還原動作本身刪光了資料**；
`settings.folders` 給物件 → 收藏頁的 `folders.map` 當場炸開。手改過或半途截斷
的備份檔都長這樣，而還原正是換機搬家的正規路徑。

現在逐鍵驗形狀，不符就整份拒絕而非略過壞鍵——使用者按的是「還原我的資料」，
只還原一半卻回報成功比明白說「這個檔案不對」更糟。版本比本版新的也拒絕：
形狀未知，寧可不還原也不要照著猜測寫進儲存。

**雲端同步會抹掉本地編輯**（`cloudSync.ts`）。`unique()` 保留*最先出現者*，
而呼叫時是 `[...remote, ...local]`——遠端永遠勝出。`Folder` 帶 `recordIds`，
於是：把記錄放進資料夾 → 同步 → 那筆歸檔消失。不是競態，是每次必然。
改為依 id 對齊合併，`recordIds` 取聯集（兩台裝置可能各自歸檔到同一個資料夾，
只留一邊就是同步動作本身在刪資料），標量欄位維持本地優先。

**刪除記錄不刪收藏副本**（`storage.ts`）。收藏存的是完整記錄副本。刪掉歷史後
記錄仍留在收藏頁，那裡的刪除鈕再按一次 `removeHistory` 也是 no-op，**卡片
怎麼刪都刪不掉**；記錄還會進每一份備份。清空所有歷史後收藏頁照樣全滿，
與剛接受的破壞性確認互相矛盾。連帶把墓碑改成取歷史與收藏 id 的聯集——
只記歷史的話，舊版留下的孤兒收藏被清掉卻沒墓碑，下次同步就復活。

### 動爻公式與梅花易數差 2

`computeHexagram` 把 0 基的 trigram 索引當卦數相加，但梅花易數用的是**先天數**
乾一 兌二 離三 震四 巽五 坎六 艮七 坤八，即 `trigram + 1`。每一卦的動爻因此
比古法少 2（三顆棋時少 3），連帶變卦、體用、吉凶乃至爻辭全部偏移。

水雷屯午時：古法 (6+4+7) mod 6 = 5 → 五爻動，用坎體震，用生體，大吉；
本程式 (5+3+7) mod 6 = 3 → 三爻動，體用對調成小凶。**同一副棋同一時辰，
結論相反。**

分佈仍均勻、內部也自洽，所以既有測試全綠——`liuyao.test.ts` 只驗了範圍、
六個值都到得了、時辰與棋盤位置會改變結果，全是「有在動」的性質，
**沒有任何一條釘住它應該等於多少**。缺陷正好活在這個縫裡。

`DIVINATION_ENGINE_VERSION` 升到 4。舊記錄一律不改寫：`movingLine` 是起卦
當下就存下來的，顯示時直接取用而非重算，所以升版不會動到任何既有解讀——
使用者回填的占驗仍對應他當時看到的那一卦。新增 `usesLegacyMovingLine()`
與獨立的提示文案，與 v1 的「卦序整個錯」分開：那些記錄的卦序、籤詩、卦名
都是對的，不該掛同一面旗子。

### 分享卡的卦象圖 48/64 畫反

`HexagramGlyph` 取 `[bit2, bit1, bit0]`（由下而上的第 1、2、3 爻）卻把
index 0 畫在 `y=0`（最上面）——每個八卦上下顛倒，畫出來的是各自的綜卦。
震為雷渲染成陰陰陽的反面，讀起來是**艮為山**，而同一張卡片上印著「震為雷」。
只有乾坤坎離四個回文卦不受影響，其餘 48 卦全錯。動爻圓點也因此落在錯的列，
`ShareCardView` 的六個爻位標記更是 1→6 由上往下印，初爻跑到最頂端。

這是命理層唯一的跨層矛盾——圖與名互相打臉，正是這個專案最在意的那類缺陷。
修法是把列序抽成純函式（`hexagramGlyphRows`、`movingLineRowIndex`），
由 `hexagram.ts` 既有的 `trigramLine` 產生，讓兩個檔案共用同一套位元約定。

### 順帶修掉的既有缺陷

- **原生端「複製」從來沒有複製**（`socialShare.ts`）：`copyToClipboard` 在原生
  呼叫的是 `Share.share`，註解寫「Expo 沒有 clipboard API」，但 `expo-clipboard`
  一直是相依套件且 `backup.ts` 就在用。後果是使用者一關掉分享選單，同一個選單
  立刻又跳出來，而且什麼都沒被複製。既有測試把這個行為寫成了規格。
- **web 分享成功被判為失敗**：`react-native-web` 的 `Share.share` 直接回傳
  `navigator.share()` 的結果，成功時 resolve 的是 `undefined`——讀 `result.action`
  拋 TypeError 被 catch 接走。於是每一次**成功**的分享之後，籤詩頁都跳出多餘的
  「分享到 LINE？」，首頁則偷偷覆寫使用者的剪貼簿。測試一律 mock 成
  `{ action: sharedAction }`，真實形狀從沒被測到。
- **AI 解讀在原生用相對路徑 fetch**（`aiInterpretation.ts`）：原生 fetch 沒有
  origin 可解析，直接拋錯並被歸類成網路問題——手機上永遠顯示「網路似乎有問題」，
  重試按鈕不可能成功。**同一個 bug `cloudSync.ts` 早就修過並留了註解**，這支漏掉。
- **圖鑑搜尋比對原始中文**（`library.tsx`）：畫面渲染 `localizePoem` 的翻譯結果，
  搜尋卻比對 `ALL_POEMS` 的中文原文。en/ja 介面下，輸入畫面上看得到的任何字
  都是零結果。順帶修掉 `lang` 沒進 `useMemo` 依賴的陳舊問題，以及首頁與收藏頁
  顯示中文原標題、籤詩頁卻顯示翻譯標題的同一份資料兩種語言。
- **API 端點上限用 UTF-16 長度**（`api/interpret.ts`）：16KB 上限用 `raw.length`
  判斷，中文一字佔 3 位元組卻只算 1——實際放寬約三倍。`api/sync.ts` 早就改用
  位元組數並留了註解說明，這支沒跟上。實測 18KB 的中文 payload 原本會穿過上限
  直接打到模型端。
- **限流器計數表只增不減**：每遇到一個新來源就新增一筆且永不刪除，暖實例會一路
  長大。抽成共用的 `rateLimit.ts` 並補上清理與硬上界，順便給 `api/sync.ts` 也接上
  ——它原本完全沒有限流，而任何格式正確的 48 位配對碼都能寫入 512KB，
  不需要猜中既有的碼。
- **測試互相污染的隱患**：`apiInterpret.test.ts` 的所有請求共用同一個來源，
  距離 12 次／分鐘的上限只差 3 個測試。再多加幾條就會集體轉紅，而失敗原因
  看起來與被測行為毫不相干。改為每次呼叫帶不同來源。

### 測試（635 → 743，36 → 42 suites）

新增 `dialog`、`rateLimit`、`movingLine`、`poemList`、`aiInterpretationEndpoint`、
`trigramGlyph` 六個檔，既有檔案補測。E2E 維持 108 全過。

**每一條新測試都做了注入迴歸**——把缺陷放回去確認測試真的變紅，再還原。
專案慣例如此，而這次特別必要：`movingLine` 的 12 條規則測試對舊公式全紅，
`trigramGlyph` 10 條中 8 條轉紅（另 2 條剛好是乾坤這類回文卦，本來就不受影響），
`backup` 的型別驗證 10 條中 8 條轉紅。位元組上限那條在第一次注入時是撞在
`FIELD_TOO_LARGE` 上——改成「每欄都在單欄上限內、只有整體超標」的 payload
才真正只測到 body 上限這一關，而那樣的請求在舊版是一路穿到模型端（回 502）。

### Session 32 總結

TS 零錯誤 · Jest 743 全過（42 suites）· web build 成功 · E2E 108 全過。
線上壞掉與靜默毀資料兩層清空；餘 25 條中低嚴重度缺陷列於「未來待辦」。

**Production 已部署**：2026-08-24（Asia/Taipei）發布至
https://chess-divination-app.vercel.app ；deployment `dpl_2NbXtLbVFvmUxgx7XeTqyqGnaZwJ`
狀態 Ready，一次涵蓋 Session 31 與 32（含 8/23 起累積的三個未推 commit）。
上線後實測首頁與 `/reveal` 皆回 200；`api/interpret` 回 501 `AI_NOT_CONFIGURED`
——這是既有的外部資源缺口（`DEEPSEEK_API_KEY` 未設），App 會降級為本地解讀，
不是本輪的迴歸。

---

## Session 33 — 清 Session 32 的待辦，並證偽其中最嚴重的一條（8/25）

接續上一輪留下的 25 條待辦，從嚴重度最高的往下做。第一件事就是意外：
**唯一那條 🔴 高是誤判。**

### A1 不成立——react-native-web 本來就會擋

上一輪的審查認為 web 底下 DOM click 會往外冒泡而 RN-web 的 handler 不擋，
因此「按每日運勢的分享圖示會同時跳到抽棋頁」。實際讀 rn-web 0.21 的
`PressResponder`，其 `onClick` 在未 disabled 時**第一件事就是**
`event.stopPropagation()`，原始碼註解也明講「`onPress` 只會在 click target
最近的那一個 PressResponder 祖先上觸發」。

但「讀原始碼覺得沒事」與「瀏覽器裡真的沒事」是兩回事，而這件事當時
沒有任何測試守著——所以沒有直接把它劃掉，而是寫成 e2e 釘在真瀏覽器裡：
按分享圖示，斷言分享確實發生**且**網址沒變；再加一條對照組確認整張卡片
本身仍然可按（少了對照組，卡片壞掉不能按也會讓上一條照樣過）。desktop
與 mobile 兩個 project 都綠。

留著這個檔案的理由是：哪天升級 rn-web 改掉了這個行為，這裡會紅，
而不是等使用者回報「按分享跳走了」。

### 設定寫入沒有序列化（A5）

`saveSettings` 是「讀出整包 → 合併 → 寫回整包」。reveal 頁的同一個 effect
裡 `recordUsage()` 與 `syncAchievements()` 併發且都不 await，兩邊讀到同一份
舊值，後寫的把先寫的整個蓋掉。撞上時當日的 `usageDates`／`currentStreak`
更新遺失——**連續天數就這麼斷了，而且不像成就會在下次進頁面時自我修復，
那一天過了就補不回來。**

修在儲存層而不是呼叫端：加一條序列化佇列，並新增 `updateSettings(updater)`
讓 updater 收到的一定是輪到它時的最新值。只序列化寫入還不夠——
`checkAchievements` 與 `recordUsage` 都是在佇列外先讀、算完再寫，
讀到的仍是可能過期的快照，兩者都改成把判斷搬進 updater 裡。
`recordUsage` 原本還會分兩次寫（天數一次、七日成就一次），第二次用的是
最初那份舊值，會抹掉兩次之間別人解鎖的成就；現在併成同一筆。

佇列另外做了一件事：某次寫入失敗不讓整條斷掉，否則一次意外就讓設定
永久寫不進去。

### 白字印在米黃底上（A7 的工具 + A14）

首頁最近紀錄的等級色是手寫的三元式，而且**兩個分支都回 `theme.textMuted`**
——中平與下下看起來一模一樣；收藏頁更是 中吉／中平／下下 三個等級共用
同一個灰。專案其實早就有 `getLevelColor` 這份語意色盤，兩個畫面各自
重寫了一遍，然後各自寫壞。

改接 `getLevelColor` 之後浮出下一層問題：等級標籤的文字一律白字，
而中平的米黃底對白字只有約 **1.9:1**，那枚標籤才 11px，等於印了看不見的字。
於是新增 `services/contrast.ts`（WCAG 2.1 相對亮度／對比度／`readableTextOn`），
讓前景色由底色算出來，而不是每加一個底色就重挑一次白或黑然後漏掉。

寫測試時發現自己的假設是錯的：我原本斷言「沒有任何顏色會同時對黑與對白
都低於 4.5:1」，但那只在**純黑**成立。專案的墨色是柔化過的 `#1A1A1A`
（亮度約 0.010 而非 0），這讓亮度落在約 0.183–0.222 的中間調底色兩邊都不到
——「下下」的灰褐（亮度 0.201）正好卡在缺口裡。修的是函式而不是測試：
達不到 AA 時退到純黑保底，常見的深底／淺底仍拿到柔化的墨或紙色，
讓步只發生在非讓不可的地方。守門測試掃過整個 sRGB 空間的取樣點，
另有一條專門確認保底那一支真的會被走到（否則它可能從未執行卻無人察覺）。

### 順帶清掉的其餘幾條

- **收藏頁搜尋仍比對中文原文（A15）**：卡片印的是 `localizedPoemTitle`，
  搜尋卻比對 `record.poemTitle`——起卦當下存下的中文原題。en/ja 介面下
  輸入卡片上明明看得到的譯名是零結果。圖鑑的同型缺陷 Session 32 修過，
  收藏頁當時漏掉，**正是因為沒有東西擋著**；這次連守門一起補上。
  新的 `recordMatchesSearch` 也納入問題本文——它不顯示在卡片上，
  卻是使用者回頭找某次占卜最好用的線索。
- **「隨機籤詩」從來沒有捲動（A13）**：函式叫 `handleRandomScroll`，
  裡面只有 `setExpandedId`。64 張卡片裡隨機挑一張多半在畫面外，
  按了骰子什麼都看不到。卡片高度不一又會多欄並排，算不出可靠位置，
  改在 `onLayout` 記下實際 y 座標再捲過去。
- **`all_levels` 成就可被壞資料解鎖（A18）**：條件是
  `new Set(levels).size >= 5`，湊滿五個相異字串就成立，不管是不是真的
  那五個等級。**既有測試自己就示範了問題**——它拿「小吉／平／凶」
  這種不存在於 `POEM_LEVELS` 的值當作集滿，把缺陷寫成了規格。
  改為明確比對那五個等級，並把舊測試改寫成真實等級 + 兩條反向案例。
- **回填延遲可能是負數（A19）**：`verifiedAt` 早於 `timestamp` 只可能來自
  時鐘變動、跨時區搬機或手改過的備份，不是真的在占卜前就驗證了。
  統計頁原本會顯示「-3 天」。夾到 0。
- **純圖示按鈕的無障礙（A9）**：首頁分享、收藏頁的資料夾／收藏／刪除、
  資料夾刪除、圖鑑隨機、棋盤全螢幕——全部補上 `accessibilityRole` 與
  `accessibilityLabel`，並以 `hitSlop` 把 14–22pt 的圖示撐到約 44pt。
  用 hitSlop 而非放大實體尺寸：這些按鈕都是三顆並排或緊貼標題列，
  放大會擠掉旁邊的內容。

### 一個小決定：色值放哪裡

`contrast.ts` 一開始自己定義了 `#1A1A1A` 與 `#FFFFFF`，被 `theming.test.ts`
擋下來。沒有放寬允許清單，而是把色值移進 `constants/theme.ts`——
那是專案唯一的色盤定義處，守門測試也是照這條線畫的。守門測試擋下來的
第一反應應該是「我是不是放錯地方了」，而不是「把我加進白名單」。

### 測試（743 → 781，42 → 43 suites；E2E 108 → 112）

新增 `contrast.test.ts`（18 條）與 e2e `nestedPress.spec.ts`（2 條 × 2 project），
其餘補在既有檔案。注入迴歸照做：三條併發測試對未序列化的舊實作全紅
（第四條「失敗不卡住」本就與序列化無關，維持綠是對的），
負值夾取兩條轉紅，`all_levels` 的兩條反向案例對舊條件全紅。

### Session 33 總結

TS 零錯誤 · Jest 781 全過（43 suites）· web build 成功 · E2E 112 全過。
25 條待辦處理掉 8 條（含 1 條證偽），餘 17 條。

**Production 已部署**：2026-08-25（Asia/Taipei）發布至
https://chess-divination-app.vercel.app ；deployment `dpl_6wGbaMjajcoroZGKQqLTG4FNdDUy`
狀態 Ready。上線後實測首頁、`/reveal`、`/library`、`/collection` 皆回 200。

---

## Session 34 — 清掉四路審查剩下的中嚴重度項（8/26）

接 Session 33 留下的 17 條往下做，這一輪清掉 8 條，🟡 中全數結案。
每一條都補了守門或迴歸測試——修好而沒有測試釘住的，下一輪就會回來。

### 兩條「設定看起來存在，實際上不存在」（A2、A10）

`setupNotificationHandler()` 從來沒有任何畫面呼叫過，只有測試引用。
expo-notifications 未設 handler 的預設行為就是**不顯示**——App 開著的
時候，每日提醒與 14 天占驗提醒直接被丟棄，使用者只會覺得提醒時靈時不靈
（關掉 App 才收得到）。同時沒有任何 `addNotificationResponseReceivedListener`，
通知裡的 `data.screen` 是死資料，點占驗提醒只會打開首頁，而提醒的用意
正是「現在就去回填那一筆」。

處理器改由 `_layout` 在最外層掛上（web 端不註冊，該平台沒有本地通知），
並補上點擊導頁：白名單只認 `/(tabs)` 與 `/stats`——通知的 data 雖然是
我們自己寫的，但它會經過作業系統來回一趟，直接餵給 router 等於讓外部
資料決定導頁目標。冷啟動另外用 `getLastNotificationResponseAsync` 補，
App 被通知叫醒時事件早於監聽器掛上。

`pieceCountPreset` 是反過來的孿生問題：存得進設定卻從不被讀，抽棋頁三顆
按鈕永遠一視同仁；`drawAnimationSpeed` 則是有人讀（`useAnimationSpeed`）
卻沒有 UI 可寫。前者改為在抽棋頁標示為「建議」選項——抽棋是按下去就直接
開始、沒有確認那一步，所以預設值能有的誠實作用是把偏好那顆標出來，不是
替使用者按下去（測試釘住這一點，防止日後有人改成自動起卦）；後者補上
設定頁的三段速度選項。

`settingsWiring.test.ts` 用來源掃描守住這兩條接線，並窮舉 `AppSettings`
每個欄位都同時有人讀、有人寫——與其等下一個欄位再壞一次，不如讓
「加了欄位卻只接一半」當場失敗。掃描先剝註解，避免「只在註解裡提到」
被算成有接線。

### 用神兩現取錯爻（A22）

卜筮正宗的取法是兩現時優先取發動之爻，現行寫法一律取 `lines[0]`。
若第二現才是動爻，`isUseGodMoving` 恆為 false——回頭生剋與進退神整段
不會被檢查，斷語因此少計。`reasons` 雖然有揭露「取 X 爻為主」，
但那個分數是不完整的。

改為兩現且動爻在其中時取動爻，皆靜則維持取最先出現者，兩種情形在
`reasons` 用不同說法呈現，使用者看得出這一爻是怎麼選的。更細的
「俱動取旺相、俱靜取空破」沒有採計：單動爻模型下不會有俱動，
空破取用則是另一套有爭議的取法，理由寫在原始碼裡而不是默默不做。

迴歸測試釘在具體卦例上，而非只驗抽象性質：天風姤 #44 兄弟現於 3、5 爻，
動 5 爻時回頭生剋確實被採計；乾為天 #1 父母現於 3、6 爻，動 6 爻時
進退神被採計。另窮舉 64 卦 × 6 爻 × 5 種六親，確認揭露的取用爻必定
在兩現之中、且動爻在兩現中時必定取動爻。

### 墨滴轉場漏接 reducedMotion（A8）

每次開牌都跑約 1.7 秒的全螢幕墨滴，完全不理會「減少動態效果」。
`PieceDraw3D` 與 `PieceEntryFlyIn` 都接了 `useReducedMotion`，所以這是
漏接而非政策。跳過動畫的同時**仍要通知父層完成**——否則 reveal 頁的
狀態機停在 `splashing`，內容永遠等不到轉場結束，畫面看起來就是壞的。

測試遇到的坑：Reanimated 4 的原生 worklets 在 jest 下載不起來，
官方的 `react-native-reanimated/mock` 自己也會 import 原生 initializers
而同樣爆炸。這支測的是計時與接線而不是動畫引擎，所以只 mock 該元件
用到的四個 API，不動全域 setup。

### 雲端同步三修（A3、A4、A6）

**刪除墓碑只做了一半**：記錄有墓碑，資料夾與自訂類別沒有，而
`mergeSettings` 對它們一律取聯集——一端刪掉的資料夾會從另一端的舊副本
復活，使用者刪一次它回來一次。比照 `usageDates` 在 `AppSettings` 加
`deletedFolderIds`／`deletedCategoryKeys`（不必新增儲存鍵，也自動進備份），
刪除改走 `updateSettings` 佇列，避免刪除與墓碑其中一邊被併發寫入蓋掉。

**兩台都滿 500 筆時互不交換記錄**：舊註解說超限時犧牲的雲端記錄
「下次同步會補回」，但那句話只在雲端存得下聯集時才成立。兩端都滿載時，
每次 PUT 都用自己的 500 筆整個取代雲端，雲端從不持有聯集，兩台永遠
來回覆蓋。改為雲端那份存聯集（1000 筆），本機仍只留 500。空間從
payload v3 騰出：收藏與歷史是同生同死的（`removeHistory` 兩邊一起清），
`favorites` 等於把同一批記錄再存一次，v3 上傳空陣列、收藏由 history 的
`isFavorited` 還原——`mergeFromCloud` 本來就是這樣重建的，舊版讀 v3 也
照樣還原，不需要遷移。伺服器 `MAX_BODY_BYTES` 512KB → 1MB（實測單筆
440–610 bytes，1000 筆約 500KB，舊上限會讓滿載使用者一同步就撞 413）。

**失敗訊息與實情不符**：`syncWithCloud` 只回 `'ok' | 'error'`，任何失敗
都顯示「尚未設定雲端同步伺服器」。斷網、payload 超限、被限流的使用者
拿到的是錯誤的診斷，照著訊息去設環境變數也不會好。改為具名原因
（offline／not-configured／invalid-key／too-large／rate-limited／
server-error），各有三語訊息。

### 順帶修掉的既有缺陷

**同步的下載失敗會抹平雲端聯集**。舊流程把下載失敗一律當成「雲端是空的」
繼續往下 PUT——一次暫時的斷網或伺服器錯誤，就用本機那份把雲端蓋掉。
現在下載失敗就地停手，測試釘住「只發出 GET、沒有 PUT」。這條沒有列在
審查清單裡，是修 A6 時把回傳值攤開才看見的。

**淺色主題的金色 CTA 按鈕文字只有 3.04:1**。修 A7 時實測才發現：
`textInverse` 是宣紙色，坐在中間調的金色按鈕上，反而是全 App 最難讀的
一段文字，而它正是主要行動鈕（quickDraw／interpretBtn／nextBtn）。

### 主題對比度：問題比原稽核更廣（A7）

原稽核說「淺色主題 textMuted 2.88:1、gold 3.6:1」，實測後範圍更大：
淺色的 success 3.46:1、warning 3.21:1 也不過，深色的 textMuted 對 bgDark
4.42:1、danger 3.39:1 同樣不過。另外查出一件原稽核沒提的事——**作用中的
分頁籤底色是 `bgMedium`**（board／reveal 的類別籤），`textMuted` 與
`textGold` 就坐在上面，所以最暗的文字底色是它而不是 `bgInk`，判準因此
改以 `bgMedium` 為準。

根源是 `gold` 一色兩用：同一個色不可能同時滿足「在淺底上當 12px 小字
要夠深」與「當按鈕底色要夠亮」。色盤本來就分了 `gold`（裝飾／邊框）與
`textGold`（文字），是 52 處畫面把 `gold` 當文字用。與其把整個金色調暗
（連按鈕與邊框一起變濁），不如把那 52 處遷回 `textGold`，`gold` 留給
底色與邊框（UI 元件邊界只需 3:1）。深色主題兩者本來就同值，所以這次
遷移在深色主題下沒有任何視覺變化。

加深文字色時一併加深了 `textSecondary`：只修對比度會讓 `textMuted` 逼近
`textSecondary`，變成「修好了對比、弄丟了層級」。守門測試因此除了
4.5:1 之外，還要求相鄰兩級至少差 1.3 倍。

### 後半輪：六條低嚴重度 + 一條判定不宜照做

**儲存失敗的未處理 rejection（A16）**。`await addHistory(record)` 沒有
catch，AsyncStorage 寫入失敗時抽棋模式永遠停在「正在為您解讀…」——
`setStep('result')` 沒跑到，使用者只能殺掉 App；回填占驗與收藏則是按了
完全沒有回饋，下次回來才發現東西不見了。三處都補上 catch 並告知。
棋盤模式失敗時刻意**不** reset：辛苦擺的佈局不該因為儲存失敗被清掉，
退回 `place-pieces` 讓他直接重按解讀。測試用 `mockRejectedValueOnce`
注入失敗，實測走進失敗路徑，並確認 in-flight 旗標沒有把後續操作鎖死。

**統計的「本週／本月」是滾動視窗（A17）**。`now - timestamp < 7/30 天`
與標籤講的不是同一件事：週一早上點「本週」，上週三四的占卜會被算進來。
改用日曆週期（週一為界，依 ISO 8601），並夾住未來的時間戳——時鐘偏移
或手改過的備份會產生未來時間，減法對它們永遠成立，那些記錄會賴在
每一個區間裡。測試窮舉一整年，確認起點恆為週一且不晚於當下。

**備份遇單一壞鍵整份失敗（A20）**。逐鍵 raw `JSON.parse`，一個鍵壞掉就
「備份失敗」——而最需要備份的正是資料已經開始出問題的時候。讀取端
（`normalizeRecords`／`normalizeSettings`）對壞鍵一向降級成 `[]`／預設值，
備份端卻整份放棄，兩邊策略本來就不一致。改為逐鍵降級，壞鍵記進
`skippedKeys`；壞掉的原文不進備份，免得還原時再 parse 一次把問題帶著走。

**ErrorBoundary 沒有出路（A21）**。它包住整個 Stack 含導覽，畫面一旦是
必然重現的錯誤，「重試」只會再炸一次——沒有任何路徑回設定頁還原備份
或匯出資料，資料還在，只是拿不到。加「前往設定」出口：`router` 取模組
層級的 singleton 而非 hook，因為邊界被觸發時壞掉的往往正是 context 樹。
先導頁再清狀態，順序反過來會先重繪那個必炸的畫面。

**空白名稱靜默無反應（A11）**。名稱為空時 handler 只是 `return`，按鈕
看起來就是壞的；改為明確的不可用狀態——按不下去，而且看得出按不下去。
姓名另外補 trim：原本整串空白也存得進去，畫面一片空白，而
`settings.userName || t('nameUnset')` 的後備因為字串非空永遠不出現。

**web 的 lang 與 theme-color（A12）**。靜態 HTML 只知道建置時的預設值，
所以 lang 由 head 裡的 inline script 依儲存的設定補正——讀屏與斷字是依
lang 決定的，等 React 掛載才改，第一段內容已經用中文的規則念過了。
切換語言時由 `i18n.setLang` 同步。`theme-color` 拆成深淺兩個 media 標籤，
使用者若在 App 內選了與系統相反的主題，再由 `useAppTheme` 於執行期覆寫。

### A23 判定為不宜照做

審查建議日干支改用固定的台北時間（裝置設在別的時區時日柱會差一天）。
查下去發現前提站不住：起卦的三個時間量——日柱、時辰（`hourBranchNumber`）、
月建（`monthBranchContext`）——**全部取自同一個裝置本地時鐘**，而這是
刻意的，傳統起卦本就以問卜者當下所在的時間為準。

只把日柱改成台北時間，時辰與月建仍是本地的，兩者會互相打架：使用者在
倫敦晚上八點起卦，會得到「戌時」配上台北隔天的日柱（當地已是凌晨四點），
旬空、六神、暗動全部跟著錯位。那比「日柱差一天」更糟——裝置時區設錯時
三者一起錯，至少仍是一張內部一致的盤；只改一個就再也不自洽了。

比照 Session 33 對 A1 的處理：不直接把這條劃掉，而是把結論釘住。
`sexagenary.ts` 寫明理由，並加「同一個時鐘」守門測試（含連續 400 天的
日柱遞增窮舉）——日後真要改時區政策，必須三者一起改，不能只動其中一個。

### 測試增減

| 項目 | 前 | 後 |
|---|---|---|
| Jest 測試 | 781（43 suites） | 894（47 suites） |
| E2E | 112 | 112 |

新增四個測試檔：`settingsWiring.test.ts`（設定接線窮舉）、
`inkSplashOverlay.test.tsx`（reducedMotion 與轉場計時）、
`errorBoundary.test.tsx`（逃生出口）、`inputGuards.test.ts`（空白輸入與
web 文件層）。既有檔案：`cloudSync.test.ts` 24 → 42、`contrast.test.ts` +12、
`wenwang.test.ts` +4、`notifications.test.ts` +8，date／backup／sexagenary／
divinationHooks 各補迴歸。

兩條新的守門規則都做過注入迴歸——還原舊的 `textMuted` 值、注入一處
`color: theme.gold`，確認測試確實會紅，不是空過的規則。

### Session 34 總結

TS 零錯誤 · Jest 894 全過（47 suites）· web build 成功 · E2E 112。
17 條待辦處理掉 15 條（含 1 條判定為不宜照做），**餘 2 條**——
兩條都需要專案外的輸入：

- **A24 決定維持現狀**：`仕/士` 與 `兵/卒` 共用同一組錯卦（艮/兌），
  造成艮兌各 7 子、乾坤各 1 子，兩顆棋時機率差約 49 倍。但這不是模除
  偏差——`drawPieces` 從 32 顆均勻抽取，差異來自棋盤組成：一副象棋本來
  就只有一支帥、卻有五個兵。取「忠於棋盤實際子數」而非「卦象等機率」，
  因為抽棋占卜的前提是「你抽到的是一顆真正的棋子」；若為了六十四卦
  等機率而改成先抽卦再挑棋，抽到的棋子就不再是真正被抽出的那一顆。
  理由寫進 `pieces.ts`，並以分佈守門測試釘住（含「每一卦都至少有一顆棋」
  這條真正的缺陷條件，以及錯卦成對的棋子數相等）。日後若改變決定，
  最小改動與代價也一併記在該處。
- **A25 待實機**：分享卡以 `opacity: 0` 離屏渲染截圖，iOS 有產生空白
  PNG 的回報，無法從原始碼判定。

**Production 已部署**：2026-08-26（Asia/Taipei）發布至
https://chess-divination-app.vercel.app 。本輪共三次部署——
`dpl_CKkCELu3o8PdRvjEqKyXUNajAR57`（前半輪：接線、用神、同步、對比度）、
`dpl_7kY6qwToUXs45vM3dcJ28TRwqrDY`（後半輪：儲存失敗、日曆週期、
備份降級、錯誤逃生、空白輸入、web 文件層）、
`dpl_AnjmVtVjAD1GFHyp92EELbfzM9eB`（A24 決定文件化，push d3e6c58 觸發），
三者狀態皆 Ready。
後半輪的線上驗證同樣比對產出物內容：HTML 已含 lang 補正腳本與深淺兩個
`theme-color`，bundle 已含 `error.goSettings`／`error.saveRecordFailed`／
`startOfLocalWeek`。上線後實測首頁、
`/reveal`、`/library`、`/collection` 皆回 200，`api/interpret` 仍回 501
（`DEEPSEEK_API_KEY` 未設，前端降級為規則式解讀）。
第三次部署同樣以 bundle 內容驗證：`vercel inspect` 確認 production
alias 指向 d3e6c58 的 Ready 部署，線上 entry bundle 含
`startOfLocalWeek`／`startOfLocalMonth`／`syncRateLimited`／
`saveRecordFailed`／`deletedCategoryKeys`／`not-configured` 全部 Session 34
標記。

驗證新版是否真的上線，用的是 bundle 內的色值而非只看狀態碼——
線上 entry bundle 已含新的 `#654C20`／`#5A5045`／`#962C22`，舊的
`#9A8A78` 已消失（`#8A6830` 仍在，那是裝飾用的 `goldDark`，非文字色）。
第一次輪詢時線上仍是舊 bundle，是部署尚未跑完，不是沒觸發——
`vercel ls` 才看得出 Production 已 Ready。

**e2e 的本機偶發假紅**：三次全跑中有兩次各紅一條，都是開頭 mobile 的
`/draw` 頁面載入逾時；單獨重跑該測試 6/6、7/7 全過，第三次全跑 112 全綠。
判定為 4 個 worker 對 `expo serve` 冷啟動的基礎設施 flake，未改程式也
未放寬 timeout——把 timeout 調大只會讓真的變慢時測不出來。

---

## Session 35 — 四路審查收尾：A25 三層防線、資料流、命理、測試品質（8/26）

四路審查 25 條至此全數結案：修掉最後的 A25 與平台/UI 一路的全部
中低嚴重度項，一併清掉資料流 B1–B5、命理 D1–D3、以及審查指出但
先前未及處理的 F 系列。測試從 894 → 935，且把守門測試自己的弱點
（空轉不報錯）補起來。

### A25：分享卡離屏截圖（最後一條待實機項）

`opacity: 0` 的離屏渲染在 iOS 上截圖可能得到空白 PNG，但無法從原始碼
判定，所以做了三層處理，讓「截圖失敗」從「分享出空白圖」降級成
「退回文字分享」，不需要實機才驗得了：

- **拿掉 `opacity: 0`**——它與離屏定位（`top/left: -9999`）本來就重複，
  而它就是風險來源。style 只留離屏定位。
- **加空白截圖偵測**（新檔 `services/shareCapture.ts`）：分享前量截圖
  位元組數（web 的 data URI 用 base64 算回原始位元組，原生走
  `new File(uri).size`），低於門檻就 `console.warn` 並回 false，呼叫端
  走既有的文字分享降級。讀不到大小時（null）一律放行——這條防線
  自己不能變成新的故障點。
- **補 `aria-hidden`**：離屏的分享卡原本會被讀屏器整張念出來
  （先修 A9 時留下的雙重播報），順手修掉。

`shareCapture.test.ts` 15 則釘住 base64 換算與門檻，並用來源掃描守住
「shareHidden 不得再出現 opacity」與「必須有 aria-hidden」兩條規則。
兩條都做過注入迴歸：暫時還原 `opacity: 0`、拿掉 `aria-hidden`，測試
確實會紅。實機確認分享圖片有內容仍列在 DEVELOPMENT_PLAN。

### 狀態資料流五條（B1–B5）

- **addFolder／addToFolder／removeFromFolder 走寫入佇列**。原來是佇列外
  的快照讀-改-寫，與另一次資料夾寫入交錯時後寫的把前寫的蓋掉。
- **同步合併設定走佇列且在輪到它時重算**。`mergeFromCloud` 原本直接
  `setItem` 寫整包設定——同步期間排在佇列裡的設定寫入（成就解鎖、
  當日連續天數）會被這一包連根蓋掉。現在 `updateSettings(current =>
  mergeSettings(current, data.settings))`，合併基底是輪到它時的 `current`，
  不是寫前的快照。
- **自訂類別新增/編輯改走佇列合併**（B3 殘餘）。`CustomCategoriesSection.
  saveCategories` 原本 `saveSettings({ customCategories })` 快照覆寫，
  會蓋掉並發寫入；改走 `updateSettings`，墓碑原樣保留。
- **清除所有歷史連帶取消全部占驗提醒**（新函式 `cancelAllVerificationReminders`）。
  清除歷史沒有 id 清單可逐筆取消（記錄已不在），而且先前刪掉的記錄
  留下孤兒排程，14 天後照樣響、指向不存在的占卜。改為掃排程本身，
  前綴相符一律取消——孤兒一併清乾淨。
- **占驗/收藏的錯誤處理**：回填占驗、收藏頁七個 handler（重整、批量刪除、
  資料夾三操作、刪除、切換收藏）補 try/catch + 三語提示，刪除路徑
  連帶取消該筆的占驗提醒；設定頁的雲端同步失敗不再靜默。

### 命理三條（D1–D3）

- **月破之爻逢日沖不算暗動**。少了這條，土旺月的月破之爻（月破必為
  土支、土令必旺）在月建＝日支的日子被當成暗動，憑空多出加減分——
  月破優先於旺衰。刻意**不**排除空亡之爻：沖空填實是傳統規則，
  排除反而錯。窮舉測試把暗動改為「旺相 ∧ 非月破」全表驗證。
- **三合局「用神入局」必須真的在局中**。原本只看五行相同就貼入局標籤，
  用神爻位置不在三合位置也算「入局得助」。改為同時檢查位置；窮舉
  64 卦 × 6 動爻，凡入局提及必驗用神爻位置 ∈ 三合位置（含 seen > 0 的
  反空轉檢查）。
- **分享卡卦象索引越界防線**。記錄可能來自使用者匯入的備份，
  `hexagramIndex` 越界不會 crash，但 `trigramLine` 只取低三位元，
  分享出去的圖片會默默畫出另一卦。`hasHexagram` 改為驗證
  `Number.isInteger && 0–63`。

### 平台/UI 一路收尾（含審查遺留的 F 系列）

- **趨勢圖畫出中性/凶分佈**。舊版只畫「吉」一段——某天抽三次全是下下，
  圖上看起來跟沒抽一樣。改為真堆疊柱（凶在下、中性居中、吉在上），
  並補 Svg 無障礙標籤。
- **棋盤 90 格無障礙**。落子格與可放置格原本在語音導覽裡全是「按鈕」。
  補 `accessibilityRole="button"` 與口述標籤：牌陣角色名優先
  （「過去」的帥，點擊移除），自由佈局退到行列座標（「第 4 行第 5 列」）。
- **成就進度環真正反映百分比**。舊版只畫「半個環」——0% 與 100%
  看起來一樣，解鎖一個就從半圈跳到滿。改為 SVG 弧線
  （strokeDashoffset 換算）+ progressbar 角色。
- **InkSplashOverlay 改走 useViewport**。web 靜態匯出下
  `useWindowDimensions` 取不到值，墨滴直徑算成 0；與 InkBackground、
  collection 同一政策。Spinner、PoemCard 接 reducedMotion（半弧靜態
  呈現、直接顯示完整內容），墨滴整段跳過但**仍通知父層完成**。
- draw 頁深色主題的類別 chip 改用主題色（原先背景與文字同色而隱形）；
  web 的每日提醒開關改為明確告知不支援；ModeSelector 雙卡與自訂類別
  的圖示按鈕補無障礙角色與標籤。

### 守門測試的自我檢查（審查 T 系列）

守門測試自己也會壞：掃描路徑改了、檔數歸零，測試照樣綠。補上
「掃到的檔數必須大於下限」的反空轉檢查（theming／i18nCoverage／
contrast）。i18nCoverage 掃描範圍擴到 `hooks`、攔住 namespace 與別名
import——擴張當場抓到兩條真實缺陷：**useDrawDivination 與
useBoardDivination 直接 import `t`，不訂閱語言變更**，儲存失敗的提示
永遠用抽棋頁載入當下的語言。已改走 useI18n。theme 掃描補攔 `hsl()`
（hex/rgb 之外的硬編色碼會整筆溜過）。

### 順帶修掉的既有缺陷

- **通知測試空白**：`scheduleVerificationReminder`／`cancelVerificationReminder`／
  `cancelAllVerificationReminders`／`hasNotificationPermission` 零直接測試。
  補 14 則，含「只取消前綴相符、每日提醒不受影響」與 web 早退。
- **字型子集缺字**：新增字串的 5 個字形（挪脅淨檻≥）不在子集裡，
  守門測試紅了才發現；重跑 `scripts/subset-font.py` 重建子集
  （TC 2676 + JP 129、1221 KB）。注意：`python` 在本機指向無 pip 的
  venv，要改用 `Python313\python.exe`（fontTools 裝在那裡）。
- **A25 的孿生問題**：reveal 頁的 shareHidden View 讀屏雙重播報
  （A9 修復時留下），隨 A25 一併處理。

### 測試增減

| 項目 | 前 | 後 |
|---|---|---|
| Jest 測試 | 894（47 suites） | 935（48 suites） |
| E2E | 112 | 112 |

新增 `shareCapture.test.ts`（15 則）。既有檔案：`notifications.test.ts` +14、
`conditions.test.ts`／`wenwang.test.ts` 各補窮舉、`theming.test.ts`／
`i18nCoverage.test.ts`／`contrast.test.ts` 各補反空轉與掃描範圍。
三條新守門（截圖防線、取消前綴、反空轉）都做過注入迴歸——注入缺陷
測試確實紅，不是空過的規則。

### Session 35 總結

TS 零錯誤 · Jest 935 全過（48 suites）· E2E 112。四路審查 25 條全數
結案（24 條修掉或證偽 + A25 改為「防線已上、實機仍列待辦」）。

**Production 已部署**：2026-08-26 push `0b8a3c0` 觸發
`chess-divination-gf53oc6f1-magicsmallbears-projects.vercel.app`（Ready）。
線上驗證比對 bundle 內容：entry bundle 已含 `isPlausibleCapture`／
`cancelAllVerificationReminders`／`board.removePieceAt`／`board.placePieceAt`／
`board.cellPosition`／`share.captureFailed` 全部 Session 35 標記；
首頁與 `/reveal`／`/library`／`/collection`／`/stats`／`/achievements`／
`/settings`／`/draw`／`/board` 皆回 200。

---

## Session 36 — 清孤兒資產與死翻譯鍵，並補上防它們回來的守門（8/27）

### 問題

四路審查把「行為對不對」掃乾淨了，但沒人查過**已經沒人用的東西還在不在**。
這類東西不會讓測試變紅，只會安靜地跟著 bundle 出貨、並在日後誤導讀者。
這輪專門掃它。

**孤兒字型檔**。B5 當初把 Expo 範本留下的 `SpaceMono-Regular.ttf` 從
`useFonts` 拔掉了——`_layout.tsx` 甚至留了一行「不再阻塞在無用的
SpaceMono 英文字體載入上」的註解——但**檔案本身沒刪**。它從此沒有任何
程式碼引用，卻仍躺在 `assets/fonts`，每個原生 build 照樣把這 92 KB
打包進去。「停止載入」與「停止打包」是兩件事，當初只做了前者。

**死翻譯鍵**。介面改版時常見的是換一個更好的鍵：`collection.empty` 被
`collection.noHistory` 取代、`library.keyword` 被 `library.search` 取代，
舊鍵沒人刪。查下來 404 個鍵裡有 7 個沒有任何人用：`poem.level`、
`collection.empty`、`common.ok`、`home.shareFailed`、`home.copyFailed`、
`library.keyword`、`settings.syncPartial`。真正麻煩的不是那點體積，是
**它們會誤導**——日後有人看到 `settings.syncPartial` 會以為同步真的有
「部分成功」這個狀態，但 `settings.tsx` 的狀態表裡根本沒有這一項。

### 怎麼修

刪掉字型檔與 7 個死鍵，但重點是**補上防它們回來的守門**——這兩類東西
的共同特徵就是「刪掉之後沒有任何機制阻止它再長回來」。

`fontSubset.test.ts` 加「字型資產孤兒守門」：`assets/fonts` 底下每個
字型檔都必須有人在 `src`／`scripts`／`app.json` 裡指名。
`i18nCoverage.test.ts` 加「翻譯鍵反向覆蓋」：原本只守「畫面不准硬編中文」
這個方向，現在補上反方向——翻譯表裡不准有沒人用的鍵。

動態組出來的鍵掃不到字面量，所以列前綴白名單，且**每一條都要寫出是誰組的**
（目前兩條：`outcome.` 來自 `t(\`outcome.${'$'}{status}\`)`，`stats.season`
來自 `stats.tsx`）。白名單長出來本身就是訊號，代表動態鍵變多了該檢討。

### 順帶修掉的既有缺陷

**先被自己的守門測試餵飽的假綠**。反向覆蓋守門第一版寫完是綠的，
注入驗證時把 `collection.empty` 加回去——**測試竟然還是綠**。原因是
`usageText()` 掃了整個 `src`，包含 `__tests__`，而我在這條守門的註解裡
剛好舉了 `collection.empty` 當例子，於是它「找到有人用」了。

這正是專案要求新守門一律做注入迴歸的理由：規則寫得再對，掃描範圍錯了
就是空過。修法是排除 `__tests__` 並先剝註解——測試檔與註解裡出現的鍵名
是在**討論**這個鍵，不是在**用**它。

另外查證時發現三個看似死掉的鍵（`outcome.accurate`／`partial`／
`inaccurate`）其實是 `t(\`outcome.${'$'}{status}\`)` 動態組的，
`collection.empty` 與 `library.keyword` 則要先確認畫面是「改用更好的鍵」
而不是「漏接空狀態與搜尋框」——確認過 `collection.noHistory` 與
`library.search` 都有正常渲染，才是死鍵不是缺功能。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 935 | 939 |
| 套件 | 48 | 48 |
| E2E | 112 | 112 |

新增 4 則：`fontSubset.test.ts` +2（孤兒守門 + 反空轉自我檢查）、
`i18nCoverage.test.ts` +2（反向覆蓋 + 反空轉自我檢查）。
兩條新守門都做過注入迴歸並確實轉紅——其中一條還是**先紅不起來**才被
抓出掃描範圍的瑕疵。

### Session 36 總結

TS 零錯誤 · Jest 939 全過（48 suites）· E2E 112。
資產與翻譯表清乾淨，兩個方向都補上守門。

**Production 已部署**：2026-08-27 push `19866b8` 觸發
`chess-divination-50xvof75x-magicsmallbears-projects.vercel.app`（Ready）。

這輪是刪東西，所以線上驗證要反過來比對——**被刪的必須從 bundle 消失**。
但單看它們消失不算數：抓到 404 頁或空回應也會「消失」。所以驗證腳本
同時比對正向對照，兩邊都對才算數：

- 正向對照 FOUND：`collection.noHistory`、`library.search`（取代死鍵的
  那兩個）、`board.removePieceAt`、`isPlausibleCapture`、`settings.syncOffline`
- Session 36 刪除 GONE：`poem.level`、`collection.empty`、`common.ok`、
  `home.shareFailed`、`home.copyFailed`、`library.keyword`、`settings.syncPartial`
- `SpaceMono` ABSENT（任何資產路徑都查不到）
- entry bundle hash 由 `e4e25177…` 換成 `55cb874e…`，確認不是快取舊檔
- 九條路由（`/`／`/reveal`／`/library`／`/collection`／`/stats`／
  `/achievements`／`/settings`／`/draw`／`/board`）皆回 200

---

## Session 37 — 揭曉頁雙欄：把憑據留在畫面上（8/27）

### 問題

寬螢幕雙欄是待辦裡唯一還沒做、又不需要外部資源的技術項，備註寫著
「需要重新設計資訊層級，不是單純的版面切換」。實際看過才懂那句話的份量。

揭曉頁在桌面是 560px 限寬置中的單欄長捲軸，1440px 螢幕左右各空 440px。
但**空白只是症狀**。真正的問題是內容有九個區塊，讀到最下面的「規則式解讀」
時，判斷依據的六爻盤早就捲出畫面外了——想對照「為什麼說我該守不該進」
只能捲回頁首，看完再捲下來。憑據與結論被垂直距離拆散。

所以這輪要解的不是「填滿空白」，是「讓憑據跟著結論走」。

### 怎麼修

新增 `SplitReading` 元件與 `useLayout` 的 `split` 配置：主欄放要一路讀下去的
內容（籤詩、詳解、AI 與規則式解讀、占驗回填），側欄放查證用的憑據
（六爻盤、卦名、問題、棋盤位置）並在捲動時固定。

**`split` 刻意不重用既有的 `columns`／`gridWidth`**。那組是給同質卡片網格的
（圖鑑、收藏——每張卡地位相同，切幾欄只是密度問題）；閱讀版面是異質的，
主欄要保住行寬、側欄只是憑據。共用一組斷點會把籤詩切成跟六爻盤一樣寬的窄柱。

斷點取 1160 而非 desktop 的 1024：1024 分欄後主欄會壓在可讀行寬的下緣，
兩欄都不好讀。寬度不夠時單欄長捲軸仍優於兩條窄柱。側欄寬度固定 340——
它裝的是尺寸大致固定的六爻盤，跟著視窗長大只會在圖表旁邊產生更多空白。

窄螢幕不分欄時，側欄內容排在主欄之前，與分欄前的順序完全一致，
手機版視覺上沒有任何變化。

### 順帶修掉的既有缺陷

**棋盤頁本來也要分欄，截圖之後決定不做**。這是這輪最有價值的一段。

原本的計畫是 reveal + board 兩頁都改，board 也照做了。但截圖一看就發現兩件事：

1. **棋盤頁根本沒有這個問題**。它的內容在 900px 視窗下總高約 950px，
   幾乎不用捲——驅動整個功能的「憑據被捲走」在這頁不存在，它只是左右空。
2. **側欄把問事類別列截斷了**（「健康」只剩半個）。而 `board.tsx` 的樣式註解
   寫得很清楚：單欄寬度從 560 放寬到 720 的理由**正是**「類別列會被截斷」。
   我把它塞進 340px，直接牴觸了一個已經寫在程式碼裡的決定。

所以棋盤頁改回單欄，並補兩條測試把這個結論釘住（維持單欄、類別列不被截斷），
免得日後有人看到「閱讀型畫面都分欄了」就順手把它也改掉。

教訓是先入為主：我假設「桌面有留白 ⇒ 該分欄」，但留白是症狀不是病。
這件事單元測試看不出來，是**截圖**看出來的。

另外字型子集守門在這輪紅了兩次——我註解裡的「倚」「搶」是新字形，
照慣例重跑子集（TC 2678 + JP 129，1222 KB）。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 939 | 947 |
| 套件 | 48 | 48 |
| E2E | 112 | 124 |

Jest +8：`layout.test.ts` 補 split 斷點、主欄下限與上限、側欄固定寬、
兩欄放得進視窗、以及「split 與網格欄數互不影響」。
E2E +12（6 × 2 專案）：新增 `splitReading.spec.ts`。

**sticky 這條一定要在真瀏覽器測**，因為它能不能生效取決於三件單元測試碰不到的事：
RN Web 的 ScrollView 是不是 sticky 的定位祖先、那一列有沒有
`alignItems: 'flex-start'`（預設 `stretch` 會把側欄拉成與主欄等高，
等高的元素沒有可移動的餘裕，sticky 形同 relative）、以及 RN 0.86 型別不認得
`'sticky'` 而是轉型硬塞的值有沒有真的傳到 DOM。

注入迴歸：把 `position: 'sticky'` 改成 `'relative'` 後，紅的正是
「側欄頂端必須仍在視窗內」那一條斷言（側欄被捲到負座標），
不是其他附帶檢查——確認測的是 sticky 本身而非別的東西。

### Session 37 總結

TS 零錯誤 · Jest 947 全過（48 suites）· E2E 124。
揭曉頁桌面雙欄上線，棋盤頁維持單欄並把理由釘成測試。

**Production 已部署**：push `5ca1294` 觸發
`chess-divination-ivgh8fa3o-magicsmallbears-projects.vercel.app`（Ready）。

版面這種東西比對 bundle 字串不算數——「檔案裡有這段程式碼」不等於
「瀏覽器裡排出來是對的」。所以線上驗證改成**對 production 量實際幾何**：

- 1440px 視窗下 split 容器 x=194／寬 1052，側欄 x=906／寬 340
  （確實在右半邊，不是疊在下面）
- **捲動 700px 後側欄停在 y=24**——sticky 在 production 真的生效，
  不是只有本機 dist 會動
- `/board` 在同一視窗下查無 `reading-split`，維持單欄

---

## Session 38 — 六爻散文翻譯：把一個卡了三個 Session 的決策拆開（8/27）

### 問題

「LiuYaoPanel 六類命理散文在 en/ja 下仍是中文」從 Session 35 提出後就一直掛著，
理由是「命理術語翻譯後會喪失原意，要翻譯需另立術語表」。

實際清點才發現，那個估計**把三堆性質完全不同的東西混在一起算**：

| 類別 | 條數 | 該不該翻 |
|---|---|---|
| 《周易》爻辭原典 | 384 | 不翻——翻經文是另一種工作 |
| 資料值字面量 | 148 | 不翻——早已決定，且會與盤面比對 |
| **專案自撰散文** | **57** | **這才是爭點** |

384 條經文確實不該由這個 App 自己動手（Wilhelm、Legge、Lynn 各成一本書），
但它不該把另外 57 條一起拖下水。拆開之後，這件事一點也不難。

### 怎麼修

新增 `data/translations/divination.ts` 與 `localize.ts` 的 `localizeProse(key, fallback, params?)`，
沿用籤詩／棋子／成就那套「中文在服務裡當真相來源、en/ja 在資料層」的分工。
fallback 就是原本那句中文，所以中文版不需要兩邊同步。

**術語一律保留漢字，只翻連接文，英文首見加註**。這不是偷懶——截圖就是證據：
斷語寫「妻財 (Wife-Wealth)」，正下方的納甲表逐列印著 `兄弟／官鬼／父母／子孫`。
若斷語譯成 Wealth 而盤上寫妻財，使用者根本無法把兩者對起來，反而比不翻更難懂。

### 順帶修掉的既有缺陷

**我自己的清點也漏了一整塊**。第一輪數出「自撰散文 28 條」並做完，測試全綠；
直到把英文版截圖出來，才看見「Use-God Judgment」下面那四條理由仍是全中文。
原因是我只掃了單引號字串，**沒掃樣板字串**——而文王卦那份逐條加權的理由
正好全是樣板組出來的。補掃後又找到 38 條，實際規模是 57 而非 28。

這是這兩個 Session 第二次發生同一件事：**測試全綠不代表做對了，截圖才看得出來**
（Session 37 是棋盤頁不該分欄）。

另外掃樣板字串時順手發現 `summarizeReading()` 是死碼——它的註解寫著
「供分享與離線解讀使用」，但全專案只有測試在呼叫它。本輪不花力氣翻它的 6 條樣板，
並列進待辦（見下方 🟢 #15）——它與翻譯決策無關，且有 4 則測試掛著，不該順手刪。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 947 | 958 |
| 套件 | 48 | 49 |
| E2E | 124 | 124 |

新增 `divinationProse.test.ts`（11 則）。守的不只是「有沒有翻」，而是那條界線：

- **漏翻偵測**：英文譯文剔除登記在案的術語後不得殘留中文。注入驗證：把一條 en 填回中文，
  這條紅而「每條都有 en/ja」仍綠——鍵存在只是內容沒翻，正是需要第二條守門的理由
- **常數表汙染**：`localized()` 若就地改寫而非回傳副本，第一次呼叫就會把常數表
  釘死在當時的語言。注入驗證確實讓兩條轉紅
- **經文不可被翻**：三種語言下爻辭都必須維持原文，且 64×6 覆蓋率不得因翻譯改動而流失
- **資料值不可被翻**：`subject`／`favorable`／`taboo` 切語言前後必須相同

允許清單是**逐條登記**而非「凡是漢字都放行」，收錄標準寫在測試裡：
該詞必須在盤面上也以漢字印著。剔除時先長後短，否則「世」會把「世爻」拆成「爻」、
「生」會把「回頭生」拆成「回頭」，殘留字看起來像漏翻其實不是。

字型子集兩度重跑（TC 2681 + JP 130，1224 KB）——日文譯文會在原生端渲染，
那些假名與漢字必須進子集，守門確實拓住了。

### Session 38 總結

TS 零錯誤 · Jest 958 全過（49 suites）· E2E 124。
六爻散文翻譯決策結案：**57 條自撰散文已翻（術語保留），384 條經文與
148 條資料值維持原文並釘成測試**。設計面 #14 結案。

**Production 已部署**：push `52480b9` 觸發
`chess-divination-oqqq4zue8-magicsmallbears-projects.vercel.app`（Ready）。

線上驗證直接切語言讀側欄文字，四條同時成立才算數
（少任何一條都可能是「看起來對」的假象）：

- **連接文已翻**：en 出現 `is the candidate`、ja 出現 `用神の候補`
- **術語仍是漢字**：兩種語言下都還找得到 `妻財`，與納甲盤對得起來
- **爻辭維持原文**：`六二：屯如邅如` 在三種語言下都在
- **不是降級 fallback**：中文原句 `為候選用神，可觀其在本卦的位置` 已不存在
  ——沒有這條的話，「找得到妻財」在完全沒翻的情況下也會通過

---

## Session 39 — 清掉最後兩條技術待辦：死碼與棋子池側置（8/28）

待辦表上「不需外部資源」只剩 #15 與 #16 兩條，兩條都寫著「要先確認原意／
需另立範圍」。這輪把兩條都做完，而兩條都證明那句備註高估了難度。

### #15 `summarizeReading()` 是死碼 —— 刪

備註寫「要先確認原意：接上分享流程讓註解成真，或連同 4 則測試一起刪」。
原意寫在函式的註解裡：「供分享與離線解讀使用」。查下去發現**兩個用途都早已
各有主人**，而且都比它完整：

| 它宣稱的用途 | 實際由誰做 | 內容差異 |
|---|---|---|
| 分享 | `socialShare.formatDivinationShareText()` | 已含本卦→變卦、動爻、體用等級 |
| 離線解讀 | `interpretation.ts` 規則式解讀 | 同樣三卦＋體用＋旺衰，散文更完整**且已翻譯** |
| （順帶）AI 提示 | `aiPrompt.ts` | 自己組本卦／變卦行 |

所以「接上去」不是一個真的選項——它會在畫面上多出一份重複、而且是唯一沒有
i18n 的內容（Session 38 掃樣板字串時它那 6 條中文之所以沒翻，正是因為沒人渲染）。
決策因此不必問：刪。

**刪之前先分辨測試在測什麼**。掛在它身上的 4 則測試裡，只有斷言字串長相的部分
跟著它走；底下的旺衰不變量是真邏輯，改成直接測 `reading` 本身留下來：

- `strength.text` 帶月建與旺衰狀態（原本測「摘要字串裡有酉月」）
- `shift === 0` ⇒ `finalLevel === bodyUse.level`
- 秋月 64 組裡至少有一組 `finalLevel !== bodyUse.level`（否則 `applyStrength` 等同沒接上）
- 三卦與動爻名稱成立（「解讀文字裡有沒有提到三卦」本來就由 `interpretation.test.ts` 顧）

刪掉的是重複的呈現層斷言，不是覆蓋率。

### #16 棋子池移到棋盤右邊 —— 做了，而且不必重構

備註寫「要把 tray 從 `ChessBoard` 拆出來，而拖曳定位邏輯（`screenToGrid`）
在裡面，屬於重構而非版面切換」。這句話的前提是「側置＝把 tray 搬到別的元件裡」，
但棋盤與棋子池已經是同一個容器的兩個子節點——**側置只要把那個容器改成 row**，
`screenToGrid` 原地不動，什麼都不用拆。

於是 `ChessBoard` 只多了兩個 prop（`trayPosition`／`trayWidth`），
幾何算術抽成 `useLayout.ts` 的純函式 `computeBoardTray()`，與 `computeLayout`
同一個模式：純函式吃寬度、hook 只負責接上量測。

規則：

- **門檻 720**。這個數字不是新挑的——`board.tsx` 的內容容器上限本來就是 720
  （Session 37 釘住的「類別列不被截斷」）。剛好夠：棋盤吃滿 56 格距（504px）
  之後還餘 160px，放得下三欄棋子。**沒有動任何既有寬度**，也就沒有動到
  Session 37 那兩條守門測試的前提。
- **池寬只能三或四欄**。兩欄會把 16 顆棋排成 8 列、比棋盤還高；五欄以上比棋盤
  本身還寬。兩者都讓「同一視線高度挑子落子」失效，所以超寬螢幕多出來的空間
  寧可留白也不灌進池子（1440 與 3840 的池寬相同）。
- **全螢幕同一套規則**，只是換參數（格距上限 68、留白 16）。1440 下棋盤仍吃滿
  68 格距，池子四欄。
- **提示文字跟著方位走**。新增 `board.hintSide`：原句是「先從**下方**棋子庫
  選擇一顆棋子」，側置後不改就是叫使用者往一個沒有東西的方向找。

實測幾何（production build，非 dev server）：

| 視窗 | 棋盤 | 棋子池 | 判定 |
|---|---|---|---|
| 1440 | x=376 w=504 h=560 | x=904 w=160 h=331 | 側置，同一 y=313 |
| 820 | x=66 w=504 | x=594 w=160 | 側置 |
| 393 | x=16 w=361 | y=738（棋盤底 714） | 下方 |
| 1440 全螢幕 | x=302 w=612 h=680 | x=938 w=200 | 側置，四欄 |

### 順帶查出來的：拖曳落子沒有作用（診斷分兩輪，見 Session 40 與 41）

寫 e2e 時原本要測「從側邊池子拖一顆棋到棋盤中央」，結果落子數 0。
**先確認這不是我弄壞的**：`git stash` 回到改動前的 build 重跑同一支腳本——

```
改動前  w=1440 placedPieces=0 dropTargets=0   點擊路徑 -> dropTargets=90
改動前  w=393  placedPieces=0 dropTargets=0   點擊路徑 -> dropTargets=90
```

兩種寬度都是 0，而點擊路徑正常，所以與本輪的版面調整無關。當時據此推斷是
「指標離開棋子後 release 不再送達」，列為待辦 #17 交給手勢層。

> **這段推斷只對了一半，Session 41 有更完整的說明。**
> 「release 沒送達」確實是原因之一（Session 40 以 document-level pointer 事件修掉），
> 但把它修好之後拖到棋盤上仍然毫無反應——下游還有第二道關卡。
> 兩個原因疊在一起時，先看到的那個很容易被當成唯一的那個。

**這條的價值在於「先回到改動前跑一次」**。不做這一步，就會把一個既有問題
當成自己剛弄壞的東西去修，或者更糟——改壞版面來遷就它。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 958 | 966 |
| 套件 | 49 | 49 |
| E2E | 124 | 132 |

Jest +8：`layout.test.ts` 補 `computeBoardTray` 的門檻、預設值、不壓縮棋盤、
放得進容器、三到四欄、池寬不隨視窗長大、全螢幕參數。
（`liuyao.test.ts` 4 則改寫但條數不變。）
E2E +8（4 × 2 專案）：新增 `boardTray.spec.ts`。

注入迴歸：把 `containerSide` 的 `flexDirection: 'row'` 拿掉後，紅的正是
「池子左緣不早於棋盤右緣」那一條（972 → 492），不是其他附帶檢查。

字型子集守門照慣例紅了——註解新增「池」「矮」「划」三個字形，重跑
`subset-font.py`（TC 2684 + JP 130，1225 KB）。

### Session 39 總結

TS 零錯誤 · Jest 966 全過（49 suites）· E2E 132 全過。
**「不需外部資源」的待辦至此清空**，新開的 #17（Web 拖曳落子）與
#16 一樣是被誤估過的類型，但這次的難度估計有事件層證據撐著。

兩條待辦的備註都寫著「要先確認／需另立範圍」，實際做起來一條是查三個呼叫端
就能結案的決策、一條是加兩個 prop 的版面切換。**Session 38 的教訓在這輪又應驗
一次：卡住的估計往往卡在把不同性質的東西綁在一起算**——#15 把「刪測試」和
「刪死碼」綁在一起，#16 把「換版面」和「拆元件」綁在一起。拆開就都不難。

---

## Session 41 — 拖曳落子的第二道關卡：放的是哪一顆（8/28）

Session 40 把 Web 的 pointer 事件接好之後，`onDragEnd` 確實會觸發了。
但實際拖一顆棋到棋盤上，**還是什麼都沒發生**。

### 一個會區分兩種可能的實驗

第一次診斷時只看了「拖到棋盤上沒反應」，就跳到「回呼沒觸發」。這次先問
**如果回呼其實觸發了，我會看到什麼不一樣的東西**——答案是：拖到棋盤外時
`screenToGrid` 回傳 null，走的是 `onSelectAvailable` 分支，那顆棋會變成已選取。
於是把落點分成兩種：

| 實驗 | 結果 | 讀出什麼 |
|---|---|---|
| 未選取，拖到**棋盤外空白處** | 該顆變已選取、90 個落點標記出現 | 回呼有觸發，走 null 分支 |
| 未選取，拖到**棋盤上** | 什麼都沒發生 | 回呼有觸發、grid 也算對了，卡在下游 |
| 先選第 0 顆，再拖第 1 顆到空白處 | 選取換成第 1 顆 | 再次確認回呼有到 |

第一列直接推翻了「release 沒送達」。

### 真正的原因

```ts
const placePieceOnBoard = useCallback((col, row) => {
  if (!selectedPiece) return;              // ← 拖曳沒有「先選取」這一步
  setPlacedPieces(prev => [...prev, { piece: selectedPiece, col, row }]);
```

拖曳落子沒有中間的選取步驟，**被拖的那顆就是要放的那顆**，但這個函式只認得
`selectedPiece`。兩種後果：

- **什麼都沒選就直接拖**：第一行 return，拖過去毫無反應。這是最自然的走法，
  於是「拖曳放棋」看起來像不存在
- **已選 A 再拖 B**：放下去的是 A。落子數一樣變 1/3，只看計數看不出來，
  要比對棋子的字才抓得到

修法是讓拖曳把棋子帶過來：`placePieceOnBoard(col, row, piece?)`，取
`piece ?? selectedPiece`。`ChessBoard` 的拖曳分支改傳 `p`，點擊分支不傳——
點擊路徑的行為完全不變。

### 為什麼 Session 40 的 e2e 沒抓到

那條測試在拖曳前先 `click()` 了棋子。一旦先點過，`selectedPiece` 就有值，
`placePieceOnBoard` 的第一道關卡自然過得去——**測試把自己要驗的前提先給滿足了**。
改成不點直接拖，同一條立刻紅。

新的兩條 e2e 因此刻意：一條完全不先點選，一條先選 A 再拖 B 並比對落下的字。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 966 | 968 |
| 套件 | 49 | 49 |
| E2E | 134 | 136 |

Jest +2：`divinationHooks.test.tsx` 補「未選取時帶著棋子仍能落子」與
「帶著棋子時不沿用已選取的另一顆」。
E2E：`boardTray.spec.ts` 的拖曳條改寫為不先點選，並新增「已選取別顆時拖曳
落下的仍是被拖的那一顆」（+1 × 2 專案）。

注入迴歸：把 `onPlacePiece?.(grid.col, grid.row, p)` 的 `p` 拿掉後，紅的正是
這兩條——前者停在 0/3（什麼都沒放），後者放成「帥」而非被拖的「仕」。
其餘十條全綠，確認測的是這個參數而不是別的東西。

### Session 41 總結

TS 零錯誤 · Jest 968 全過 · E2E 136 全過。
**「拖曳放棋」到這裡才真的可用**：不必先點，拖過去就落在放手的那一格。

教訓是診斷的方法而不是這個缺陷：**兩個原因疊在一起時，先看到的那個很容易被
當成唯一的那個**。分辨的辦法不是多讀原始碼，是設計一個「假設錯的話會看到不同
結果」的實驗——這裡就是把落點分成棋盤內與棋盤外兩種。

---

## 今日（8/31）— Sessions 42–46：靈棋成完整占卜模式，兩軍對壘陣上線

一天五個 session，主題是一條線：**靈棋從原型變成完整占卜模式，再讓
積欠已久的兩軍對壘陣從構想上線**。各段細節在下方各自的 session 條目。

| Session | 做了什麼 | 順帶修掉的既有缺陷 |
|---------|----------|--------------------|
| 42 | 靈棋十二子原型接上首頁與 i18n；S39–41 積欠的五筆 commit 入庫 | — |
| 43 | 靈棋補成完整占卜模式：《靈棋經》125 卦目原典入庫（公有領域、逐字保留、更動可稽核），接上歷史／占驗簿／統計 | 不生成原典沒有的吉凶等級（誠實原則） |
| 44 | 靈棋補上收藏與分享 | 分享卡的空等級標籤、draw 三元式默默印錯 |
| 45 | 「依占卜模式應驗率」接上統計頁——做好了、測試綠、就是沒接到畫面 | 靈棋被標成棋盤的預設標籤（分項表多一組冒充別人的資料） |
| 46 | 兩軍對壘陣上線（上卦＝紅方陣、下卦＝黑方陣、動爻＝子力差，半場各限三子）；靈棋深度解讀定案為**規則式**（三才三檔＋三步行動計畫） | 靈棋 e2e 三條隱性 flaky（5 個卦目不以「卦」結尾）、字型子集缺 4 字 |

**今日收尾**：tsc 零錯誤 · Jest 1019（51 套件）· E2E 162 全綠。
三筆 commit 入庫（`1066b15` 兩軍對壘陣、`2c7f0b0` 靈棋深度解讀、
`a04b522` 記錄）。**程式待辦清空**——剩下的都是外部資源：Vercel
`DEEPSEEK_API_KEY`（AI 解讀脫離 501）、Expo Go 實機測試、EAS Build 上架。

---

## Session 42 — 靈棋與問事帶入接上 i18n、積欠工作整理入庫（8/31）

**問題**：收尾驗證時工作樹積了三批沒 commit 的東西——Session 39–41 的程式
成果一直沒有 commit（那陣子的 commit 全是 Session 38 的 docs/feat）；另有兩批
新功能 WIP：靈棋十二子（《靈棋經》上中下各四枚成卦，125 卦目）與問事快速帶入。
`i18nCoverage` 守門紅燈：新頁面整頁硬編中文、沒走 `useI18n`，抓出 15 處——
守門本身運作正常，它擋的正是還沒接上翻譯層的新頁面。

**怎麼修**：

- 靈棋頁所有介面字串改走 `t()`，新增 `lingqi.*` 與 `prompts.*` 共 10 個鍵
  （三語齊全）。卦目標記（如「二上一中」）是《靈棋經》原典名，與棋子漢字、
  卦名同屬命理資料值，維持漢字不譯——`notation()` 移進 `services/lingqi.ts`
  （資料服務層本來就不在 UI 掃描範圍），改名 `lingqiNotation()` 並寫明理由。
- `QuestionPrompts` 的標題與無障礙標籤走 `t('prompts.a11y', { prompt })`；
  順帶刪掉它沒在用的 `ThemeColors` import。
- 新字串用到子集沒有的字元，`fontSubset` 守門當場紅——照例重跑
  `scripts/subset-font.py`（TC 2684 + JP 131，1225 KB）。

**順帶**：把積欠的工作拆成五筆 commit，每筆都能獨立站住（A 樹單獨跑過
tsc + jest，968 全過，正好對上 Session 41 的記錄數可作交叉確認）：

- `d4d5193` Session 39–41——棋子池側置、拖曳落子修復、summarizeReading 死碼刪除
- `8edc4d0` 靈棋十二子原型與問事快速帶入（i18n 三語接入）
- `0686405` 籤詩筆記——占驗之外可留自由筆記，空白儲存即清除
- `e98e4c7` 成就進度環改用 transform 屬性（rotation/origin 已淘汰）
- docs 一筆（本記錄＋兩軍對壘陣構想）

拆分手法是先把 `board.tsx`／`i18n.ts` 的新功能部分暫時還原、commit 舊批、
再還原回去，用 stash 驗證中間樹。

**待辦**：DEVELOPMENT_PLAN 新增「兩軍對壘陣」構想（未排期）——紅黑各布一陣
看楚河漢界兩側消長，適合對立型問題；動工前要決定起卦結構，且 `maxPieces`
需從常數改成依牌陣可變。

**測試增減**：

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 968 | 970 |
| 套件 | 49 | 50 |
| E2E | 136 | 136 |

Jest +2：`lingqi.test.ts`（靈棋擲卦與卦目）。tsc 零錯誤。

**總結**：積欠的 Session 39–41 成果與兩批新功能全部入庫，工作樹清空。
守門測試再一次證明價值——它在 WIP 還沒接上翻譯層時就擋在 commit 之外，
而不是等英文版截圖才發現（與 Session 37/38 同一條教訓，這次是事前攔下）。

---

## Session 43 — 靈棋補成完整占卜模式：125 卦目原典入庫（8/31）

**問題**：Session 42 把靈棋原型併進來並掛上首頁，但它只做了一半——
擲完只顯示卦目標記（「二上一中」），**125 卦目一句卦辭都沒有**，
也不進歷史、不進占驗簿、不進統計，更沒有 e2e。
首頁上唯一一個「按下去沒有解讀」的入口。待辦表當時寫著「沒有剩餘的
程式待辦」，那句在 Session 42 之後就過期了。

**卦辭來源**：《靈棋經》原典，取自維基文庫（公有領域，頁面標記 PD-old），
以 `scripts/build-lingqi-oracles.mjs` 逐字解析成 `src/data/lingqiOracles.ts`。
不憑記憶寫原典——那會變成假原典，比自撰更糟。

**解析器抓出來的東西**比預想多。原文版式大致固定（卦目／卦名 象／斷 方位／
象曰／詩曰），但一路撞出七類變體，每一類都是「不處理就會靜靜地少字或多字」：

| 變體 | 處理 |
|---|---|
| 標記標點有「：；，。．」五種 | 一併認得 |
| 「四上一中三下」的詩以「許曰：」起首 | 認作詩曰標記，字句照收 |
| 41 卦在詩曰後另附一首「又：」 | 另立 `shiAlt` 欄位收下 |
| 「二上四中」在象曰後另有「又曰：」 | 另立 `xiangAlt`，全書僅此一卦 |
| 「三上二中四下」的斷與方位用頓號分隔 | 分隔符加上頓號 |
| 頁尾 `{{footer}}`／`{{PD-old}}` 模板 | 先剝模板，否則成為末卦的詩句 |
| 三處破折號、三處衍字、一處闕字 | 逐條列在 `OCR_FIXES`，見下 |

**動原文的地方全部列名可稽核**。判準是句長——七言絕句的四句都該是七字：

- `賜藥—丸`／`名香—炷`／`—牛兩尾`：U+2014 是「一」的 OCR 誤認
- `東風吹動九挈闕卻卻衢開` → `東風吹動九衢開`（衍出四字，去掉正好七字）
- `彩賒鸞銜詔下天涯` → `彩鸞銜詔下天涯`（`賒` 自上句「驛路賒」重複）
- `仕進功 民名世垃名世所誇` → `仕進功名世所誇`
- `遷居每致XX` → `遷居每致□□`——來源自己就以 XX 表示轉錄不出的字，
  改標成缺字符而**不臆補**：使用者該看到「原文有闕」，不是我們編的兩個字

**吉凶等級不生成**。原典未載，也不代為補寫。這決定往外推了三處：
`DivinationRecord.poemLevel` 對靈棋記錄留空、新增 `recordHasLevel()` 當閘門、
統計的吉凶分佈與占驗簿的依等級應驗率都先過這道閘（否則會多出一條以空字串
為名的長條，而那一組的意思是「原典沒說」，不是一個等級）。
靈棋仍計入總次數、依模式應驗率、歷史、收藏、占驗回填。

**接線時挖出一個看不出來的坑**：`localizedPoemTitle(record.poemId)`
對靈棋記錄會走 `getPoemById(0)` 的 fallback，回傳籤詩 #1——每一筆靈棋
記錄都會在首頁與收藏印成「龍騰九霄」，**而且看起來完全像一筆正常記錄**。
修法是新增 `recordTitle()` 當唯一入口，並把 `poemList.test.ts` 原本
「兩個畫面都走 localizedPoemTitle」那條守門改寫成「都走 recordTitle、
且不得直接呼叫 localizedPoemTitle」。注入驗證確認 `localizedPoemTitle(0)`
真的回「龍騰九霄」，守門不是空轉。
同理 `recordLink()` 讓靈棋記錄點回靈棋頁而非 reveal 頁。

**又是截圖看出來的，不是測試**。17 條單元測試與 8 條 e2e 全綠之後截圖，
才看到類別膠囊一行只排得下兩個（抽棋頁是四個）——整欄都套了 `contentWidth`，
容器被夾成 256px。抽棋頁只把它用在輸入框上。量出膠囊 x 座標
62/150/238/326 與抽棋頁完全一致才算修好。
順帶補上問題回顯（與 reveal 頁同一個位置與鍵值）——從歷史點回來時，
光看卦辭想不起來這是問什麼的。

**字型子集**：新卦辭帶進大量新字元，`fontSubset` 守門當場紅，
重跑 `scripts/subset-font.py`（TC 2684→3010、JP 131，1225→1378 KB，+153 KB）。

**測試增減**：

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 970 | 985 |
| 套件 | 50 | 50 |
| E2E | 136 | 144 |

Jest +15 全在 `lingqi.test.ts`（卦目資料完整性、附段筆數、標記不得漏進內容、
不得有 level 欄位、卦目標記與三才數量互校、記錄接線、統計邊界）。
E2E +8：擲卦後看得到卦辭本文而非只有卦目標記、記錄落地、再擲一次、
從首頁點回靈棋頁。tsc 零錯誤。

**總結**：靈棋從「按下去沒有解讀」的原型變成完整占卜模式。
兩個教訓都是舊識的再一次驗證——**「沒有剩餘待辦」要以最近一次 commit
為準重新確認**（Session 42 自己併進來的半成品沒進待辦表）；
以及 **測試全綠之後仍要截圖**（版面問題單元測試看不出來，這次是第三次）。

---

## Session 44 — 靈棋補上收藏與分享（8/31）

**問題**：Session 43 把靈棋做成完整占卜模式，但比揭曉頁少三樣：收藏鈕、
分享、AI 解讀。前兩項是實作缺口（第三項是產品決策，暫不做——AI 的提示詞
繞著六十四卦與六爻盤寫，靈棋要接得另設一套）。

**分享另立一支文字格式**而非共用 `formatDivinationShareText`：籤詩版的標題是
`${poemLevel} · ${poemTitle}`，靈棋沒有等級，套進去會分享出前面缺一塊的
「 · 明陽卦」，還多一行空的「抽得：」。新增 `formatLingqiShareText()`，
排的是卦目、象、象曰、詩曰。

**分享卡改了兩處**，兩處都是「畫面不會報錯、只會默默印錯」：

- 吉凶等級標籤改為有等級才畫。`ShareCardLevelColors[''] || 中平` 會讓靈棋
  的卡片印出一格中平色的無字色塊
- 底部模式的 `mode === 'draw' ? 'dice' : 'chess-board'` 改成對照表——
  與 Session 43 在 collection.tsx 修掉的同一個式子，這裡漏了。
  分享卡是送出去的成品，錯了看不出來也收不回來

**靜態守門被自己的註解餵成紅燈**。「不得出現 `mode === 'draw' ?`」那條，
第一版沒剝註解，而我解釋這條規則的註解裡正好寫著那個式子。
與 Session 36 反向守門被註解餵成綠燈同源，方向相反而已——
**靜態守門一律只看程式碼本身**。修法照舊：比對前先剝註解。
兩條守門都做了注入迴歸，確認會紅。

**e2e 的分享那條原本 flaky**。Web 端降級會連跳兩個原生對話框
（confirm 問 LINE、複製完再 alert 通知），`page.once` 只接第一個，
第二個落到 Playwright 的自動關閉，複製與通知之間的時序就變成看運氣。
改成常駐 handler ＋ 輪詢剪貼簿，`--repeat-each=3` 共 36 次全過。

**測試增減**：

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 985 | 991 |
| 套件 | 50 | 50 |
| E2E | 144 | 148 |

Jest +6：靈棋分享文字三條（含「不得長成籤詩版式」）、分享卡靜態守門三條。
E2E +4：收藏鈕來回、Web 端分享降級的內容。tsc 零錯誤。
字型子集因新字串重跑（TC 3010，1378 KB，字數未增）。

**尚未做的**：靈棋的 AI 深度解讀——要不要有、提示詞怎麼寫，是產品決策。

---

## Session 45 — 把「依占卜模式的應驗率」接到畫面上（8/31）

**問題**：`accuracyByMode()` 有匯出、有單元測試，**沒有任何畫面呼叫它**——
它是 `accuracyBy*` 家族裡唯一沒接上統計頁的（等級、類別、體用、動爻、
季節、牌陣六個都有）。而功能清單寫著「分項應驗率：依吉凶等級／問事類別／
**占卜模式**」，最後一項使用者從來沒看過。

與靈棋原型是同一種毛病：**東西做好了、測試也綠，就是沒接到畫面上。**
單元測試對「有沒有接上」這件事是無感的。

**順帶修掉一個它藏著的錯**：預設標籤是 `k === 'draw' ? '抽棋' : '棋盤'`，
Session 43 加了靈棋之後，靈棋會被標成「棋盤」——分項表上多出一組冒充別人的
資料，而畫面看起來完全正常。改成對照表，認不得的鍵回傳原鍵：
標成一個看得出不對的值，好過冒充某個既有模式。

**差點做出一個假抽象**。原本打算把模式標籤併成一張 `MODE_LABEL_KEYS`
放進 storage.ts（比照 `SPREAD_LABEL_KEYS`），寫到一半才發現三處用的是
**不同的**標籤集：收藏卡短標（抽棋／佈局）、分享卡長標（抽棋占卜）、
統計頁沿用總覽磚的短標。併成一張會把三處的用字都改掉。撤回，各自保留。

**e2e 的選擇器不要猜 DOM 形狀**。第一版用
`locator('div').filter({ hasText: /^各占卜模式的應驗率/ }).last()` 定位整節，
三條裡兩條紅——react-native-web 的 div 巢狀不是那個形狀。
改為替六個分項區塊加 testID，選擇器就穩定了。

**測試增減**：

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 991 | 993 |
| 套件 | 50 | 50 |
| E2E | 148 | 154 |

Jest +2：靈棋不冒充棋盤、認不得的模式以原鍵為標籤。
E2E +6：統計頁真的畫出這一節、靈棋自成一列（列數是最直接的證據——
標籤壞掉時它會併進佈局而看不出來）、吉凶等級那節不因靈棋多出空白列。

**尚未做的**：靈棋的 AI 深度解讀（產品決策——現有提示詞整套繞著六十四卦
與六爻盤寫，靈棋要接得另設一套）。

---

## Session 46 — 兩軍對壘陣 + 靈棋規則式深度解讀（8/31）

**問題**：Session 42 以來積了兩件。

1. **兩軍對壘陣**（Session 42 提出、DEVELOPMENT_PLAN 未排期）：紅黑雙方各在
   己方半場布三子，看楚河漢界兩側的強弱消長。動工前卡著兩個產品決策：
   起卦結構（兩陣各成一卦 vs. 六子合卦）、`maxPieces` 硬編 3 的既有架構。
2. **靈棋深度解讀**（Session 43–45 三度擱置的產品決策）：靈棋比揭曉頁少
   收藏、分享、深度解讀三樣，前兩樣已補，解讀卡在「要不要有、提示詞怎麼
   寫」——現有 AI 提示詞整套繞著六十四卦與六爻盤寫，靈棋要接得另設一套。

**產品決策（本次定案）**：

- 起卦結構採「**上卦＝紅方陣、下卦＝黑方陣、動爻＝雙方子力差**」：
  半場本身有方位意義（紅為我方、黑為對方），各自成卦才讀得出對立。
  動爻取子力差（紅減黑，有符號），數和＝上卦序＋下卦序＋子力差＋時辰，
  餘數模 6、0 視為 6——與既有起卦路徑同一套餘數規則。
- 靈棋解讀採**規則式，不接 AI**：三才（天＝上、人＝中、地＝下）各自
  以朝上子數分「全伏／中平／盛」三檔，主軸取獨盛或並盛（兩才同數）或
  均衡，再依問事類別給一段類別視角，最後三步行動計畫。**不生成原典沒有
  的吉凶等級**——與 Session 43 的誠實原則同源。

**怎麼修**：

- `services/formation.ts`（新）：半場判定／計數、取爻排序（先河距後列序，
  棋色定陰陽——紅＝陽、黑＝陰，與棋子待在哪一半場無關）、子力總和、
  起卦（上紅下黑）、兩軍對比文字（紅方子力較盛／黑方較盛／勢均力敵）。
- `spreads.ts`：`SpreadDefinition` 加 `maxPieces`，`getSpreadMaxPieces(id, fallback)`
  只對兩軍對壘陣回 6，其餘牌陣維持 3；此陣無固定格位（`slots: []`），
  角色是「哪一半場」不是「哪一格」。
- `ChessBoard` 加 `formationMode`：`formationHalfFull(row)` 讓滿三子的半場
  不再出現落子點——**點擊與拖曳兩條路徑都在棋盤元件裡守住**，不靠頁面
  記得；楚河漢界兩側淡染陣區（黑＝ink、紅＝cinnabar，theme token 而非
  硬編色，守門測試看得見）；口述標籤加半場名——螢幕閱讀器分不出棋盤
  上下，不加就是半盤的「按鈕」。半場計數**不放棋盤上**：棋盤每一格都能
  落子，任何固定位置的標籤都可能被棋子壓住，計數放牌陣導覽區。
- `useBoardDivination(maxPieces = 3)`：兩軍對壘陣走另一條起卦路徑，
  兩軍對比文字併入 `positionSummary`——揭曉頁與歷史記錄照舊印
  `positionSummary`，**不必為新牌陣改揭曉頁**。
- `lingqiInterpretation.ts`（新）：檔次文案是**函式不是字串**——
  `localizeProse` 的 zh 回傳不插值，zh fallback 要把數字烘進去
  （liuyao.ts／wenwang.ts 的既有慣例），en／ja 才走 `{n}` 佔位。

**順帶修掉的既有缺陷**：

1. **靈棋 e2e 三條隱性 flaky**：卦名比對用 `/卦$/`——原典 125 卦目有 5 個
   不以「卦」結尾（抑災勢、救助教、鬼災勢、歲登勢、人事勢），擲到那五卦
   就紅。改為以歷史記錄裡的 `poemTitle` 為準。`象曰`／`詩曰` 比對加
   `{ exact: true }`——深度解讀句子裡也會提到這兩個詞，一條文字匹配三處。
2. **字型子集缺 4 字**（壘／鏡／棚／絡——來自兩軍對壘陣、以象為鏡、日文
   棚卸し／絡み合う）：`fontSubset.test.ts` 紅，照既有流程
   `python scripts/subset-font.py` 重建。
3. **expo-router 疊棧的隱藏頁**：e2e 用 `/兩軍對壘/` 比對解讀文字，匹配到
   還掛在背景的 /board 頁牌陣晶片。改比帶冒號的摘要句
   （`/兩軍對壘：/`、`/紅方陣：/`）——只有 positionSummary 這樣寫。
   這是 Session 37 之後第二次踩到同一坑，特此再記一次。

**測試增減**：

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 993 | 1019 |
| 套件 | 50 | 51 |
| E2E | 154 | 162 |

Jest +26：`formation.test.ts`（起卦錨例＝風地觀、負子力差動爻、純紅上純黑下
＝天地否、取爻排序用混色驗「棋色定陰陽」、半場計數）、靈棋深度解讀 7 條
（125 卦全擲都有解讀與三步計畫、zh 無 `{n}` 殘留、檔次與主軸分類、en 無
漢字、ja 異於 zh）、兩軍對壘陣進 `spreads.test.ts`。
E2E +8（4 條 × 桌面／手機兩專案）：`formation.spec.ts` 3 條（陣區幾何以
楚河漢界相接無縫、半場滿後落子點只剩 45 個、六子成陣後記錄帶
`spreadId: 'formation'` 且揭曉頁印兩軍對比）+ 靈棋深度解讀 1 條（卦辭之後
接著三才導讀與三步行動計畫，歷史還原不重擲也還在）。

**總結**：

- 兩軍對壘陣從「未排期構想」變成完整占卜模式：起卦、半場限制、陣區視覺、
  解讀、歷史記錄一路打通；揭曉頁一行都沒改。
- 靈棋深度解讀走規則式是正確的——三才檔次全部由擲出來的數字推得，
  沒有假造等級，與《靈棋經》原典的誠實原則一致。
- 版面無法在本環境直接看圖（Read 工具不支援），改以 e2e boundingBox
  幾何斷言＋截圖存檔（`test-results/dev-layout/*.png`）雙軌驗證。

---

## Session 47 — 新模式接完主流程，周邊系統還沒接：成就與 AI 提示詞（9/1）

**問題**：DEVELOPMENT_PLAN 與 WORKLOG 都寫著「目前沒有剩餘的程式待辦」。
照 Session 43 立下的規矩——**這句話要以最近一次 commit 為準重新確認**——
把最近三個 session 新加的兩樣東西（靈棋、兩軍對壘陣）拿去對周邊系統，
找到兩處只接了主流程、周邊沒跟上的缺口。兩處都不會壞畫面、不會紅測試。

### 一、成就系統不認靈棋

`syncAchievements()` 只數 `mode === 'draw'` 與 `'board'`：

```ts
totalDraws: history.filter(r => r.mode === 'draw').length,
totalBoard: history.filter(r => r.mode === 'board').length,
```

`ten_draws`／`fifty_draws` 算的是這兩者之和。靈棋自 Session 43 起就是完整
占卜模式（歷史、收藏、分享、統計、深度解讀一應俱全），**只擲靈棋的使用者
一個成就都解不開，連「累積 10 次占卜」的計數都不會動**。成就頁上方那行
「N 次占卜」讀的是 `history.length`，靈棋算得進去——於是畫面同時顯示著
「10 次占卜」與一片全鎖的徽章，兩個數字自己打架。

**怎麼修**：

- `checkAchievements` 加選填的 `totalLingqi`／`hasLingqi`（與 `totalVerified`
  同一種選填做法：舊呼叫端不傳就是 0／false，行為與加入靈棋前一致）。
- 「累積 N 次占卜」改數 `totalDraws + totalBoard + totalLingqi`——
  **它數的是占卜，不是某一種占卜**。
- 新增兩項成就：`first_lingqi`（靈棋初擲）、`all_modes`（三法俱通）。
- **`both_modes` 維持原意不動**（抽棋＋棋盤）。已經解鎖的人不該因為多了
  第三種模式，回頭看見自己的成就說明變了；三種都用過另給 `all_modes`。
- 靈棋的 `poemLevel` 是空字串，`all_levels` 不受影響——它比對的是那五個
  等級的字面值，空字串湊不進去（既有註解已寫明理由，此處補測試釘住）。

### 二、AI 深度解讀看不到棋盤

`InterpretRequestBody` 只有 `poem`／`hexagram`／`question` 三塊。記錄裡明明
存著 `spreadId` 與 `positionSummary`，**五種牌陣的落子與陣勢從來沒進過
提示詞**：使用者特地選了「抉擇陣」或新上線的「兩軍對壘陣」，模型收到的
東西和自由佈局一字不差，紅黑消長整段被丟掉。

**怎麼修**：

- `InterpretRequestBody` 加 `board { spreadName, pieces, brief }`，
  `buildPrompt` 印成「牌陣：」「落子：」「盤面：」三行。
- `brief` 從已存檔的 `positionSummary` 切出來——**切在深度解讀標題之前**。
  為什麼不整段送：標題之後那半是本 App 自己的規則式長文（每顆棋的五行、
  方位、建議各一段），餵給模型只會換回一份改寫版，還排擠掉真正只有它
  做得到的事。標題之前那半才是模型推不出來的：哪個牌陣、哪顆棋擔任
  哪個角色、兩軍強弱如何。
- 切點 `POSITION_DEEP_HEADING` 從 `position.ts` 匯出，不在兩個檔案各寫
  一次字面量——改了標題會靜默切不到，症狀只是 AI 少拿一段資料。
- **系統提示同步加一句**「若附有牌陣與盤面，第 2 點須扣合牌陣角色與盤面
  局勢」。資料送過去而不要求使用，等於沒送。
- 盤面帶著「不是給你的指令」的框：抉擇陣的選項名稱是使用者自己打的字，
  會原樣出現在這一段，與既有的使用者問題同級處理。
- `api/interpret.ts` 的單欄長度上限補進 `board` 三欄——漏掉等於在 body
  上限之下留一條沒有上限的路把 context 撐大。

### 順帶修掉的既有缺陷

1. **成就翻譯守門測試手抄 id**：`i18n.test.ts` 抄了八個 id，而清單早已
   十項——漏在外面的 `first_verify`／`ten_verify` 剛好有人補了翻譯，才沒
   在英文介面露出中文成就名。改為列舉匯出的 `ACHIEVEMENTS`。
   **手抄的清單不會跟著新項目長大，這種守門測試綠得沒有意義。**
2. **成就數量測試寫死 10**：改為比對 id 序列，連「重複 id」與「順序被
   打亂」一起守住，加成就時也不必回頭改數字。
3. **字型子集缺 3 字**（🎋／抄／概，來自新成就圖示與本次註解）：
   照既有流程 `python scripts/subset-font.py` 重建，1382 KB。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 1019 | 1036 |
| 套件 | 51 | 51 |
| E2E | 162 | 166 |

Jest +17：靈棋計入成就 6 條（只擲靈棋也解得開累積成就、三模式混算、
`all_modes` 要三種都有、`both_modes` 維持原意、靈棋空等級湊不出
`all_levels`、舊呼叫端不傳新欄位行為不變）、`spreadBriefFromSummary`
5 條（切在標題之前、兩軍對壘保留子力對比、自由佈局回空、舊記錄無
`positionSummary` 不炸、找不到標題時整段當牌陣段落）、提示詞 5 條
（三行都進得去、盤面帶注入框、抽棋靈棋不冒出這一段、自由佈局只帶落子、
系統提示要求扣合盤面）、端點單欄上限 1 條。
E2E +4（2 條 × 桌面／手機）：只擲靈棋十筆後成就頁解得開 `first_lingqi`
與 `ten_draws` 且不誤開抽棋／棋盤成就、兩張新徽章在畫面上看得到。

### 總結

- 兩處缺口是同一型：**新模式接完主流程就當作完成，周邊系統沒有逐一走過**。
  Session 45 的「應驗率沒接上畫面」也是這一型，這已經是第三次。
  日後新增占卜模式，周邊清單至少要走過：歷史／收藏／分享／統計／成就／
  AI 提示詞／圖鑑。
- 靈棋仍**刻意沒有** AI 深度解讀（Session 46 定案走規則式），
  這次的 `board` 欄位只給棋盤模式，不改那個決定。
- 圖鑑仍只收 64 籤詩，《靈棋經》125 卦目沒有可瀏覽的目錄——
  這是產品決策不是缺陷，列入下方待辦等你決定。

---

## Session 48 — 靈棋進圖鑑、分享看得出牌陣，以及 AI 解讀真的上線（9/1）

**問題**：Session 47 留下的兩項由使用者拍板——靈棋 125 卦目要進圖鑑、
分享卡要印牌陣名。另外 `DEEPSEEK_API_KEY` 設好了，AI 解讀從 501 脫身。

### 一、AI 深度解讀上線（外部資源 #1 結案）

使用者在 Vercel 設好金鑰後端點仍回 501。**原因不是金鑰，是部署時序**：
環境變數在部署當下被烘進去，而現行正式部署（8/31 17:27）比變數（9/1）
更早出生，跑的仍是「沒有金鑰」的那份。重新部署後即為 200。

**這一條值得記住**：Vercel 環境變數設好不會回頭套用到既有部署，
「設了沒生效」十之八九是沒 redeploy，而不是設錯。

順帶驗到 Session 47 的成果——模型的回覆裡寫著「紅方車馬兵三軍並進，
子力鼎盛……黑方雖有炮士卒，然士僅守衛之姿」，盤面資料確實到得了。

**驗證過程本身也留下一個教訓**：第一次打端點，回來的內容有亂碼、
模型還把牌陣名編成「安門八陣」。那不是 App 壞掉，是 **Windows 主控台
把 curl 參數轉成了 cp950**，送出去的是 Big5 位元組。改成把 JSON 寫成
UTF-8 檔案再 `--data-binary @file` 就完全正常。與記憶裡「查 bundle 一律
用檔案型腳本」是同一個坑的兩種面貌——**中文內容要進外部指令，一律走檔案**。

### 二、《靈棋經》125 卦目進圖鑑

**為什麼另開分頁而不是併成同一份清單**：兩者的欄位對不起來。籤詩有
吉凶等級與卦名，等級與五行兩排篩選都建立在這上面；靈棋原典沒有等級，
有的是三才卦目與方位。混成一份清單，篩選列會對一半的資料失效。

- `library.tsx` 加 `LibraryTab = 'poems' | 'lingqi'`，等級與五行篩選只在
  籤詩分頁出現；骰子鈕隨分頁挑對象——在靈棋分頁按骰子卻展開一首籤詩，
  等於這顆按鈕有一半機率答非所問。
- 卡片座標表的鍵改成帶前綴的字串（`p:1` / `l:1-1-1`）：兩個分頁共用一張
  表，靈棋的識別是卦目鍵值，與籤詩編號不同型。
- `lingqiMatchesSearch()` **刻意不收 lang**，與 `poemMatchesSearch` 不同：
  原典逐字保留、三語都顯示漢字，卡片上看得到的字就只有這一份。
  比對範圍含展開後才看得到的象曰與詩曰——使用者記得的往往是某一句
  四言七言，不是卦名。
- 收合只印卦目、象與詩曰（與籤詩卡的資訊密度對齊），展開才給斷、方位、
  象曰、又曰、又與原典出處。125 張卡片一次倒出整本《靈棋經》沒人讀得下去。
- **標題改名**：`library.title` 從「籤詩圖鑑」改為「占卜圖鑑」，設定頁的
  入口名稱與說明一併改（同一個畫面在兩處叫不同名字是自找混亂）。

### 三、分享看得出牌陣

分享出去的內容原本只有籤詩與卦象——選了兩軍對壘陣或抉擇陣，分享給人看
跟隨手擺三顆棋長得一模一樣。圖片與文字**兩條路徑都補**：
`ShareCardView` 的模式標籤後接牌陣名，`formatDivinationShareText` 多一行
`牌陣：{name}`。牌陣名由 reveal 端譯好再傳進去——`SPREAD_LABEL_KEYS`
是 i18n 鍵不是字面值，元件自己查會拿到鍵名。自由佈局與非棋盤模式不帶，
與收藏頁的牌陣晶片同一個判斷。

### 順帶修掉的既有缺陷

1. **改標題漏了三處**：先只改了兩個 e2e marker，`responsive.spec.ts` 的
   深色主題對比測試裡還有兩處（locator 與 `textContent` 比對），
   全套 e2e 才紅出來。**改使用者看得到的字串時，要 grep 整個 repo 而不是
   只找「marker」這個字**。
2. `PoemCard` 的分享鈕補 `testID="poem-share"`：新 e2e 原本用
   `getByText('分享')`，那是 expo-router 疊棧下最容易誤中的寫法。
3. **字型子集重建兩次**（新註解與新介面字串各一次）。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 1036 | 1046 |
| 套件 | 51 | 51 |
| E2E | 166 | 174 |

Jest +10：`lingqiMatchesSearch` 7 條（卦名／卦目／象、展開後的象曰詩曰、
斷與方位、空白查詢、不相干不命中、切語言仍以漢字搜得到、125 卦全數
搜得到自己的卦名）、分享牌陣 3 條。
E2E +8（4 條 × 桌面／手機）：靈棋分頁 125 卦與篩選列收起、卡片展開才有
象曰、搜詩句找得到卦目且切回籤詩分頁不憑空冒出結果、兩軍對壘陣的分享
文字帶牌陣名（走剪貼簿降級路徑）。

### 總結

- 圖鑑的定位由「籤詩圖鑑」變成「占卜圖鑑」，這是產品決策不是重構——
  改名之所以必要，是因為頁面裝的東西真的變了。
- AI 解讀從 Phase 6.7 打通全端算起，到今天才真正可用。中間卡的兩關
  （金鑰、redeploy）都不是程式問題，而**驗證方式本身出過一次錯**，
  差點把主控台編碼問題當成 App 的 bug 報出去。

---

## Session 49 — 靈棋擲完不算數：連續天數、成就與音效都停在 reveal 頁（9/2）

**問題**：接續 Session 47 定下的檢查法，把清單再走一遍。這次走的是
「使用者做完一次占卜之後，App 該替他記下什麼」——而不是畫面長不長得出來。
找到三處都指向同一個成因：**那些事情全掛在 reveal 頁上，靈棋不走 reveal。**

### 一、只擲靈棋的人，連續天數永遠是 0

`recordUsage()`（記使用日、算連續天數、解「七日問道」）與
`syncAchievements()`（重算全部成就）**只掛在 `reveal.tsx` 的 mount**。
抽棋與棋盤都會收束到那一頁，靈棋自成一頁（見 `lingqi.tsx` 檔頭），
於是只擲靈棋的使用者：

- `usageDates` 一天都沒被記下 → 首頁的「連續 N 天」與七日問道永遠是 0；
- Session 47 為靈棋補的成就要等使用者**自己翻開成就頁**才補算得到
  （成就頁載入時會補算一次——這正是它沒被發現的原因）。

修法是在 `lingqi.tsx` 加一個 `markUsage()`，時機與 reveal 對齊：
**看到卦目就算一次使用**——擲出來的、從歷史記錄點回來的都算，
單純打開本頁還沒擲則不算。

**Session 47 的教訓要再補一句**：成就系統認靈棋補的是「條件」，
這次補的是「時機」。條件全綠、使用者那端依然全鎖，兩者要分開檢查。

### 二、靈棋一聲不響

抽棋有 drawPiece、棋盤落子有 placePiece、揭曉頁有 reveal——只有靈棋
沒有任何音效，設定頁的音效開關對只擲靈棋的人等於沒有作用。
`playShakeSound`（搖籤筒）自六個音效寫成起**從未被任何畫面呼叫過**，
而「搖了再擲」正是它寫出來的用途，接上去即可。

### 三、占驗提醒印的是中文原題

`scheduleVerificationReminder` 的通知內文取 `record.poemTitle`——那是
起卦當下的中文原題。首頁與收藏早已改走 `recordTitle()`，只有這條漏掉：
en/ja 介面下，通知裡是中文、點進去的畫面卻是譯文。
靈棋記錄也靠 `recordTitle()` 才不會被 `getPoemById` 的 fallback
印成籤詩 #1「龍騰九霄」（其 `poemId` 恆為 0）。

### 四、`playClickSound` 刪除（#22 當場結案）

六個音效裡最後一個沒有呼叫端的。使用者拍板刪掉而非接到按鈕上——
其餘五個都是「占卜動作的回饋」，通用點擊聲是另一種設計語彙，
現在沒有它介面也不缺什麼。刪的範圍：`sound.ts` 的 SOURCES 與匯出、
`sound.web.ts` 的合成函式、`assets/sounds/click.wav`、
`generate-sounds.mjs` 的 `clickTone()` 與 `click()`，以及兩支測試裡
借它當替身的用例（改用 `playFavoriteSound`）。

刪完重跑 `node scripts/generate-sounds.mjs`：剩下五個 WAV **位元組完全
相同**（383.5KB），確認拿掉 click 沒有擾動其他音色的合成參數。

同時補上**反向守門**：`sound.web.ts` 的每個 `play*Sound` 匯出都必須有
畫面在呼叫，掃描範圍排除 `__tests__`（測試檔提到某個函式是在討論它，
不是在用它——同 S36 的翻譯鍵反向覆蓋守門）。`playClickSound` 之所以能
活這麼久，正是因為它的實作、WAV 與單元測試一應俱全，**唯一的使用者
就是測試自己**。這條守門以注入一個假的 `playOrphanSound` 驗過會紅。

### 五、實機驗證清單補上 S43 之後的東西

`NATIVE_TESTING.md` 第一階段停在 Session 39 的 14 項——**靈棋、兩軍對壘陣、
AI 解讀上線這些後來才有的東西，一項都不在上面**。清單是給人照著做的，
漏掉的部分不會有人想起來要驗。補了六項（14 → 20）：

| # | 補什麼 | 為什麼不能沿用既有項目 |
|---|---|---|
| 4b | 《靈棋經》原典字形 | 125 卦目的罕用字最多，是子集最容易漏收的一批 |
| 15 | 靈棋分享圖 | 靈棋卡沒有等級標籤與棋子列，位元組數與籤詩卡不同量級——A25 的 4KB 門檻得對它另驗一次 |
| 16 | 兩軍對壘陣半場落子 | 原生拖曳走 PanResponder、Web 走 document pointer，是兩套實作（同 #13 的理由） |
| 17 | 原生的 AI 端點 | Web 用相對路徑、原生用絕對網址，是不同分支；而失敗會被歸進「網路錯誤」，看起來像使用者網路不好 |
| 18 | 占驗提醒的標題語言 | 通知內文排程當下就烘好，Web 端整條路徑早退；S49 才改成 `recordTitle()` |
| 19 | 靈棋的連續天數 | 就是這個 session 修的那條，牽涉原生 AsyncStorage 的真實寫入時序 |

**#4b 的判定寫得比別項嚴**：測試只保證「掃到的字都收了」，收進去的字形在
真機上長什麼樣，仍然只能用眼睛看。

### 六、上架素材也停在兩種模式

同一個病灶的另一處：`STORE_LISTING.md` 的完整描述開頭寫著「提供**兩種**
問事方式」，六種牌陣、靈棋、AI 解讀、占驗簿、三語介面全都不在上面；
`npm run screenshots` 的六個場景也沒有一張拍得到靈棋。**這份文案是要付
$99 之後貼上去的東西，停在 S42 的功能集等於白付。**

- 描述改成三種問事方式，各給一段；特色功能補上納甲盤、用神斷語、
  AI 深度解讀、占驗簿、占卜圖鑑、三語介面。
- **「所有資料儲存在本地裝置」改掉**——雲端同步上線後這句不再為真。
  改成「資料預設只存在你的裝置上；雲端同步為選用功能，需自行建立配對碼」。
  商店文案裡的隱私敘述寫錯，性質跟程式缺陷不同，代價更大。
- 截圖加第 7 場景（靈棋十二子），走 `?recordId=demo-lingqi` 還原**固定的
  「大通卦」**而不是按下擲卦——擲卦是隨機的，不固定的話每跑一次素材就
  換一個卦名（與 `DAILY_FORTUNE` 同一個理由，那次的教訓是擷到「下下·
  舉步維艱」當商店主圖）。示範記錄同時補進歷史，統計頁的「依占卜模式
  應驗率」這才湊得出三種模式，在此之前那一區在素材上永遠少一列。

順帶踩到一次：第一版斷言用全頁 `getByText('大通卦')`，離屏的分享卡也印
同一個卦名，strict mode 兩處匹配當場紅。**斷言範圍要限在結果區**——
與 S37／S46 的「疊棧背景頁被匹配到」是同一類問題的第三種面貌。

### 這三處為什麼測試全綠

服務層本來就是對的：`recordUsage`、`playShakeSound`、`recordTitle`
都有自己的單元測試而且全過。**缺的是畫面與服務之間的那條線**，
型別擋不住、單元測試感覺不到。因此三處都補上來源掃描守門：

- `achievements.test.ts`：兩個占卜終點畫面（`reveal.tsx`、`lingqi.tsx`）
  都要呼叫 `recordUsage` 與 `syncAchievements`；
- `sound.test.ts`：四種占卜動作各自對應的音效呼叫；
- `notifications.test.ts`：en 介面印譯文標題、靈棋記錄印卦名。

E2E 那兩條刻意**不開成就頁**——既有的兩條靈棋成就 e2e 都先 `goto('/achievements')`，
而成就頁載入時會補算一次，於是「擲卦當下什麼都沒發生」被它遮得好好的。
**用到會自我修復的畫面當前置動作，測到的就不是你以為的那條路徑。**

### 驗證

改動前把 `lingqi.tsx` stash 起來重建 web、單跑新 e2e 確認它會紅
（守門若在缺陷版本也綠，守的就不是這個缺陷）。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 1046 | 1052 |
| 套件 | 51 | 51 |
| E2E | 174 | 178 |

Jest +10 −4：新增成就接線守門 4、音效接線守門 4、占驗提醒標題 2、
音效孤兒反向守門 1；刪掉 `playClickSound` 帶走 5 條（含它自己那條
「建立一個振盪器」——改由 `playFavoriteSound` 的雙音測試涵蓋起訖配對）。
E2E +4（2 條 × 桌面／手機）：擲完不開成就頁也記下使用日與成就、
昨天用過今天擲靈棋首頁接得上「連續 2 天」。

---

## Session 50 — 快速提問範本改成三層問題庫：面向 → 情境 → 範本（9/2）

**動機**：原本的快速帶入是「類別在頁面別處選、範本只有 3 條、一次全攤開」。
類別列在三個占卜頁各寫一套（draw 的格子、board 的水平 ScrollView、lingqi
又一組格子）；要問「這次面試該怎麼準備」，使用者得自己在七類裡找到「事業」，
而範本一條都沒碰到面試。先出單檔原型
`ui-planning/quick-question-library.html` 把三層互動做出來看，再照著接進 App。

### 一、三個頁面共用同一套元件

draw／board／lingqi 各自內建的類別列全部刪除，類別選擇併入
`QuestionPrompts`。同一件事有三套長得互不相同的實作，是這個專案
「周邊清單漏改」的同源問題——改一件事要記得改三個地方。

新結構三層：**面向格**（綜合／感情／事業／財運／學業／健康／出行，自訂類別
併成第八格）→ **情境 chip**（該面向有子領域時才出現，不佔沒必要的空間）→
**範本卡**（每頁 4 條 + 換一批）。點範本即帶入上方問題欄，再點可替換，
編輯提示明說「帶入後仍可修改」。

### 二、10 個子領域，命理規則仍只認 6 個主類別

新增 relationship／reconciliation（感情）、jobSearch／promotion／workplace／
business（事業）、cashflow（財運）、exam（學業）、wellbeing（健康）、
relocation（出行）10 個子領域，三語標籤全上。

關鍵是 `src/services/questionCategories.ts` 的 `questionCategoryDomain()`：
**子領域只負責讓使用者把問題說清楚，規則式解讀、靈棋鏡頭、用神取法、
AI 提示詞標籤全部先映回主類別再運作**。不要直接以子領域 key 擴寫
`useGod`——「求職該看官鬼還是父母」沒有公認定法，寫進去等於把沒有定法
的細節誤裝成定論（檔頭註解把這條釘住）。

### 三、範本庫擴充

- zh-TW：每個子領域 4 條、既有主類別 3 → 5 條，都是完整問句。
- 無專屬範本的語言（en／ja 的子領域）與自訂類別走**通用 5 條填空式範本**
  （3 → 5），類別名由譯好的標籤帶入——三語都可用；要逐語逐類別翻 40 條
  zh-TW 範本是內容工作，不擋接線。
- `useQuestionCategories` 改存 `labelKey` 由 render 時查譯表，不再經
  `categoryLabel()` 間接取值。

### 四、守門重錨：畫面被重設計時，舊守門用「紅」通知你

全套 e2e 紅 2 條（desktop／mobile 同一個測試）：`visual.spec.ts` 的
「棋盤頁問事類別列有可點擊的高度」守的是水平 ScrollView 在 Web 上塌陷成
細線的迴歸——那條列已不存在，測試量到的是新面向按鈕**內層文字節點**
（16px）而紅掉。

重錨方式：改量面向按鈕本身的 boundingBox（`getByRole('button')`）——
量內層文字只量得到字高，量不到可點擊目標。`splitReading.spec.ts` 兩處
註解同步改名（類別列 → 面向格）；它守的「單欄不被截斷」結論仍然成立。

**守門是釘在當時的畫面上的**：畫面重設計時它會以失敗告訴你「我守的東西
不在了」；重錨時要確認原迴歸還可不可能發生，而不是把斷言改到剛好會過。

### 驗證

typecheck ✓、Jest ✓、`build:web` ✓、全套 e2e ✓（178 條）。字型子集守門
沒紅——新字串用到的字元都已在子集內，不需重建。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 1052 | 1064 |
| 套件 | 51 | 52 |
| E2E | 178 | 178 |

Jest +12（新套件 `questionPrompts.test.ts`）：10 個子領域各有 ≥4 條不重複
中文範本、en／ja／自訂類別走 5 條通用範本、test.each 10 條釘住子領域 →
主類別的映回表。E2E 0 新增，2 條重錨（× 2 專案）。

---

## Session 51 — 子領域只做對了一半：四處只認七個主類別的地方（9/3）

**動機**：Session 50 把問事拆成十個子領域，並在 `questionCategories.ts`
釘住「子領域先映回主類別再運作」。當時接上的是解讀、靈棋鏡頭、用神取法、
AI 提示詞四處，但**只認七個主類別的地方不只那四處**。照 S47／S49 留下的
清單逐一走過周邊系統（歷史／收藏／分享／統計／成就／AI／圖鑑，加上「做完
一次占卜之後 App 該替他記下什麼」），找到四處：三處是 S50 漏接，一處是
更早就在、被 S50 放大成看得見的不一致。

### 一、籤詩詳解預設展開的是綜合，不是所問的那一面

`reveal.tsx` 把 `record.questionCategory` 原樣交給 PoemCard 當預設分頁。
選了「求職」時那個字串對不上七個分頁的任何一個，於是**七格全暗，內容
靜靜掉回綜合**——看起來就像使用者根本沒選過類別。自訂類別（`custom-<ts>`）
早就有同樣的毛病，只是選自訂類別的人少，一直沒被看見。

修法是把「哪一面」這件事變成一個純函式 `poemFacetForCategory()`：先映回
主類別，映不回來就退回綜合。放在 `questionCategories.ts` 而不是 PoemCard
內部，才驗得到，也才有地方釘住「七個面向 = `Poem.jieYue` 的欄位」。

### 二、感情子領域既沒有斷語，也沒有「請補性別」的提示

`useGodForCategory()` 早就走映回，所以「復合／修復關係」確實照感情取法；
但 `LiuYaoPanel` 的提示條件寫的是 `questionCategory === 'marriage'`。
兩邊對的不是同一個東西：**取法看映回後的類別，提示看原始 key**。
結果是未設性別時斷語不出（正確），提示也不出（錯）——那正是 S23 當初
寫下「沒設定就靜靜不出斷語，使用者只會覺得功能壞了」要避免的情況。

### 三、統計把同一個人生面向切成好幾列

`accuracyByCategory` 依原始 key 分組。子領域上線後，「求職」「升遷」
各自成列，還會與**上線前記的「事業」分立兩行**——同一件事散在三處，
`bestCategory` 要求的樣本數就再也湊不到，「哪類問事最準」等於停擺。
改成分組前先映回主類別，與 `accuracyBySpread` 排除自由佈局的理由一致：
不可比的東西混在一起，統計就只剩下沒有意義的平均。自訂類別映不回來，
仍自成一列。

### 四、棋盤頁不記得上次選的類別（S50 之前就在）

「問事類別記憶」抽棋與靈棋都有做，棋盤頁從來沒有——不是 S50 弄丟的，
是它一直沒接。S50 把三頁的類別選擇併成同一個元件之後，這個差異才變得
說不通：同一個元件，在其中一頁按下去就是不算數。補上讀回與寫入。

### 五、引導頁還停在「雙重占卜模式」

同一輪清單走到 App 自己的第一印象：`onboarding.step2` 寫的是
**「雙重占卜模式」**，step2desc 只介紹抽棋與棋盤——靈棋 S43 就完整上線了，
新使用者第一次開 App 看到的說明從那時起就是舊的。上一筆 commit
（`ca367de`）修的是 `STORE_LISTING.md` 與 `NATIVE_TESTING.md` 的同一個
毛病，**同一個病灶的第三個位置沒改到：App 內的引導**。

三語都補上第三段（靈棋十二子：一次擲定十二子，讀《靈棋經》的原典卦目），
用語沿用既有的 `lingqi.homeDesc`，字型子集因此不需重建（守門沒紅）。

守門以 `DivinationMode` 的成員數當真相來源——引導第二步的段落數必須等於
模式數，加第四種模式時三種語言各紅一條。以「拿掉 ja 的第三段」注入驗過
會紅，不是空過。

### 守門

- Jest：七面向 ⇄ `jieYue` 欄位、每個子領域都對得到面向、自訂類別退回綜合；
  兩條來源掃描（PoemCard 的分頁鍵、LiuYaoPanel 的比對式）；三頁的類別記憶。
- 統計：子領域與舊記錄同一列、自訂類別自成一列、`bestCategory` 湊得到樣本。
- E2E：感情子領域出得了性別提示、事業子領域預設展開事業詳解、三頁按下
  面向都寫進設定。**逐一還原成修前的程式重跑確認會紅**——四條新 e2e
  在修前各紅在它該紅的那一頁，不是靠斷言寫得剛好才過。

### 測試增減

| 項目 | 之前 | 之後 |
|------|------|------|
| Jest | 1064 | 1080 |
| 套件 | 52 | 52 |
| E2E | 178 | 188 |

### 教訓

S50 已經寫下「子領域要映回主類別」並在四處照做了——**漏的不是原則，
是清單**。「哪些地方只認七個主類別」比「哪些地方要映回」好查：前者
grep 得到（`=== 'marriage'`、以 key 分組、以 key 當索引），後者只能靠記得。
引導頁那一條是同一個道理的另一面：**「數量寫死在文案裡」的地方也要有真相
來源**——`DivinationMode` 有幾個成員是程式知道的，讓守門去問它，就不必
指望三年後還記得有這麼一句話。
**新增一層分類時，要找的是所有拿舊那層的值去比對、分組、當索引的地方**，
而不是回想哪些功能「應該」要跟著改。

---

## 功能完整清單

### 占卜核心
- 抽棋模式（選類別→問事→動畫→籤詩）
- 棋盤佈局（選棋→拖曳放棋→深度解讀）
- 靈棋十二子（《靈棋經》125 卦目原典，逐字保留；無吉凶等級，不入吉凶統計；規則式深度解讀＋三步行動計畫）
- 兩軍對壘陣（紅黑各布三子於己方半場，上卦＝紅方陣、下卦＝黑方陣、動爻＝子力差）
- 64 首七言絕句籤詩（易經 64 卦對映）
- AI 深度解讀（DeepSeek API via Vercel serverless function，未配置時降級為規則式解讀）

### 解讀系統
- 白話解釋 + 典故 + 7 面詳解（感情/事業/財運/健康/學業/出行/綜合）
- 棋盤位置解讀（九宮/楚河/邊緣/角落 + 五行生剋）
- 六爻推演（本卦/動爻/互卦/變卦 + 體用生剋）
- 納甲六爻盤（干支/五行/六親/世應/空破/伏神，京房八宮）
- 用神斷語（財運/事業/學業/感情/健康/出行六類；自占身命之事以世爻為用神，感情依占者性別取法；含喜神忌神持世與發動、進退神、暗動、三合局，逐條列出採計條件）
- 月建旺衰（體卦五行的旺相休囚死，據以微調吉凶斷語）
- PoemCard 捲軸動畫展示

### 占驗簿
- 事後回填實際結果（應驗／部分應驗／未應驗 + 自述備註）
- 加權應驗率統計（未回填者不計入分母）
- 分項應驗率：依吉凶等級／問事類別／占卜模式
- 個人洞察：哪類問事最準（要求足夠樣本）
- 待回填提醒與回填延遲中位數

### 使用者功能
- 歷史記錄 + 收藏 + 資料夾分類
- 占卜圖鑑（64 首籤詩與《靈棋經》125 卦目雙分頁，瀏覽/搜尋/展開）
- 統計儀表板（日期篩選/吉凶分佈/棋子排行）
- 每日運勢
- 圖片卡分享 + 文字分享
- 快速提問範本（面向→情境→範本三層、10 個子領域，抽棋／棋盤／靈棋三頁共用）

### 設定與個人化
- 明暗主題 + 跟隨系統
- 語言切換（zh-TW/en/ja）
- 音效 + 觸覺回饋
- 動畫速度（慢/標準/快）
- 姓名設定 + 問事類別記憶
- 備份還原（JSON 匯出/匯入）
- 雲端同步（選用，以配對碼隔離資料；預設不啟用）
- Onboarding 引導重播

### 體驗優化
- 占卜圖鑑雙分頁：64 首籤詩（等級／五行篩選）與《靈棋經》125 卦目（全文搜尋）
- 分享的圖片卡與文字都印出牌陣名
- 拖曳放棋＋撤銷上一步
- 寬螢幕棋子池側置於棋盤右側（含全螢幕模式）
- 批量刪除記錄
- 收集排序（最新/最早/最佳）
- 連續使用天數追蹤 + 成就徽章
- 無障礙 reducedMotion
- 錯誤邊界 ErrorBoundary
- PWA 離線支援
- 書法字體 Noto Serif TC（web 端 Google Fonts；原生端子集化 1.2MB）

---

## 未來待辦

### 🔵 四路審查的未修項（Session 32 提出，Session 33–35 全部結案）

Session 32 修掉「線上壞掉」與「靜默毀資料」兩層，留下 25 條；Session 33
處理掉 8 條，Session 34 再清掉 16 條（含 2 條判定為維持現狀並釘住理由），
Session 35 清掉最後 1 條（A25）。**25 條全數結案**。A25 的截圖防線已上，
「實機確認分享圖片有內容」仍列於下方 🟢 技術面第 3 條的實機測試範圍。

已結案的 15 條不再列出，於此記錄去向：

- **Session 33**：A5 設定寫入序列化、A9 無障礙標籤與觸控目標、A13 隨機
  籤詩捲動、A14 等級配色、A15 收藏頁搜尋、A18 all_levels 成就、A19 負數延遲
- **Session 34**：A2 通知處理器與點擊導頁、A10 設定接線（預設抽棋數量／
  動畫速度）、A22 用神兩現取發動之爻、A8 墨滴轉場接 reducedMotion、
  A3 資料夾／類別刪除墓碑、A4 兩台滿載時的記錄聯集、A6 同步失敗診斷、
  A7 主題文字色套用 WCAG AA（含金色一色兩用的根源）、A16 儲存失敗的
  未處理 rejection、A17 統計改日曆週期、A20 備份逐鍵降級、
  A21 ErrorBoundary 逃生出口、A11 空白名稱、A12 web 的 lang 與 theme-color
- **Session 34 判定不宜照做**：A23 日干支時區——起卦的日柱、時辰、月建
  取自同一個裝置本地時鐘是刻意的，只改日柱會讓卦盤自身不自洽（詳見
  Session 34 記錄與 `sexagenary.ts` 的註解），已改為寫明理由並加守門測試
- **Session 35**：A25 分享卡離屏截圖——拿掉 `opacity: 0`（與離屏定位
  重複且是風險來源）、加空白截圖偵測（低於門檻改走文字分享降級）、
  補 `aria-hidden`；守門測試含注入迴歸。實機確認分享圖片有內容歸入
  下方 🟢 技術面第 3 條

**A1 為誤判，已刪除**：react-native-web 0.21 的 `PressResponder.onClick`
本來就會 `stopPropagation()`，巢狀 Touchable 不會連鎖觸發。結論已用
真瀏覽器 e2e（`e2e/nestedPress.spec.ts`）釘住，而非只憑讀原始碼。

每一條都經原始碼核對，非推測。25 條全數結案，無剩餘。

> 編號沿用歷史序號（#1–#16），不重新編排——舊的 session 記錄會引用它們。
> 分組改依「**卡在什麼**」而非功能類別，因為那才是決定下一步的問題。

### 🔴 卡在外部資源（我做不了，需要你的帳號／裝置／付費）

| # | 待辦 | 你要做的 | 之後我能接手 | 成本 |
|---|------|---------|------------|------|
| 3 | **iOS/Android 實機測試** | `npx expo start --go`，手機掃碼 | 依你回報的現象修 | 免費 |
| 4 | **EAS Build preview** | Expo 帳號登入 | 寫 build profile、跑 build | 免費額度內 |
| 6 | **App Store 上架** | Apple Developer 帳號 | 文案與 24 張截圖已備妥 | $99/年 |
| 7 | **Google Play 上架** | Play Console 帳號 | 同上 | $25 一次性 |
| 8 | **自訂域名** | 買 `chess-divination.com` | DNS 指向 Vercel | 域名年費 |

**#1 已結案（Session 48，9/1）**：`DEEPSEEK_API_KEY` 設好、重新部署後
`api/interpret` 回 200。卡了兩關都不是程式問題——先是金鑰未設，
再來是**環境變數不會套用到既有部署**，非得 redeploy 不可。
解讀品質由使用者自行判斷，不滿意時調的是 `SYSTEM_PROMPT`。

**現在投報率最高的是 #3**——不花錢、不需帳號，而且能驗的東西最多。

**#3 的重點在 A25**：`isPlausibleCapture` 的 4KB 門檻是估的，從沒有實機樣本驗證過。
要看的是兩件事——分享圖打開後有沒有內容、以及正常卡片會不會被誤判成空白而降級成文字分享。
完整清單見 `NATIVE_TESTING.md` 第一階段（21 項，已標明 Expo Go 驗得到與驗不到）。
其中 #13 拖曳落子與 #14 棋子池側置是 Session 39 新增的；#4b 靈棋原典字形、
#15 靈棋分享圖、#16 兩軍對壘陣半場落子、#17 原生的 AI 端點、#18 占驗提醒的
標題語言、#19 靈棋的連續天數是 Session 49 補的，#20 快速提問範本的三層介面
是 Session 50 補的——**S43 之後上線的東西，原本一項都不在這張清單上**。

### 🟢 不需外部資源

目前沒有剩餘的程式待辦。Session 51 依同一份清單走了 S50 的子領域，
找到並修完四處只認七個主類別的地方（籤詩詳解分頁、感情性別提示、
統計分組、棋盤頁的類別記憶），見 #23。

Session 49 提出的 #22（`playClickSound` 沒有呼叫端）已於同一個 session
由使用者拍板刪除，並補上音效孤兒反向守門。

Session 47 提出的兩項已於 Session 48 由使用者拍板並做完：靈棋 125 卦目
進圖鑑（另開分頁，頁面改名「占卜圖鑑」）、分享的圖片與文字都印出牌陣名。
Session 49 走的是同一份清單的下一層——見下方註。

> Session 43 註：上一次寫下「沒有剩餘待辦」時，Session 42 自己併進來的
> 靈棋原型並不在表上——它已掛在首頁，卻只有擲卦沒有卦辭。**這句話要以
> 最近一次 commit 為準重新確認，而不是沿用上一輪的結論。**
>
> Session 47 又確認了一次，又找到兩處：成就系統不認靈棋、AI 提示詞
> 看不到棋盤。兩處都不會壞畫面也不會紅測試，只會讓新功能有一半到不了
> 使用者手上。**檢查方式已固定下來：新模式上線後逐一走過歷史／收藏／
> 分享／統計／成就／AI 提示詞／圖鑑，而不是只看主畫面跑不跑得起來。**
>
> Session 49 再確認一次，又找到三處，而且是同一個成因：連續天數、成就
> 重算、音效全都掛在 reveal 頁上，靈棋不走那一頁。**清單要再加一問：
> 「使用者做完一次占卜之後，App 該替他記下什麼？」**——那些事情不長在
> 畫面上，走畫面清單走不到。另外，Session 47 補的是成就的「條件」，
> 這次補的是「時機」；條件全綠不代表使用者解得開。
>
> Session 51 對 S50 的子領域再走一次，又找到四處。這次的成因不同：
> 原則早就寫下來了（子領域先映回主類別），漏的是清單。**要找的是所有
> 拿舊那層的值去比對、分組、當索引的地方**——那個 grep 得到，靠回想
> 「哪些功能應該跟著改」則會漏。

### ✅ 已結案（不再展開）

- **#2** 單元測試覆蓋率補強（265 → 536，8/16）
- **#5** 上架截圖 6 場景 × 4 尺寸＝24 張，`npm run screenshots` 可重現（8/18）
- **#9** 多語系策略：B 方案，64 籤詩 + 32 棋子 + 8 成就全翻（Session 19）
- **#10** 原生端書法字體子集化，TC + JP 合併子集 1.2MB（8/19）
- **#11** 棋盤「允許重複棋子」開關，可組出乾為天／坤為地（8/18）
- **#12** 用神斷語擴充至感情／健康／出行（8/19）
- **#13** 文王卦進階條件：進退神／暗動／三合局（8/19）
- **#14** 六爻散文翻譯決策（Session 38，見下方）
- **#15** `summarizeReading()` 死碼刪除——分享與離線解讀早各有主人，接上去只會多一份沒翻的重複內容（Session 39）
- **#16** 棋子池側置到棋盤右側，門檻 720 沿用既有容器上限，不需拆元件（Session 39）
- **#17** 拖曳落子，兩道關卡分兩輪修完：Session 40 讓 pointer 事件跨出棋子後
  仍追蹤得到（`onDragEnd` 會觸發了）；Session 41 讓拖曳把「被拖的是哪一顆」
  帶進 `placePieceOnBoard`，否則未先點選時仍在 `!selectedPiece` 就 return。
  e2e 改為**不先點選**直接拖，並另加一條比對「已選 A 拖 B 落下的是 B」

- **#18** 成就系統不認靈棋——累積類成就改數全部占卜，新增靈棋初擲與
  三法俱通；`both_modes` 維持原意不動，避免改動既有使用者已解鎖的成就
  說明（Session 47）
- **#19** AI 深度解讀看不到棋盤——`board` 欄位帶牌陣名、落子與盤面摘要，
  盤面切在深度解讀標題之前（不把自家規則式長文餵回模型）（Session 47）

- **#20** 《靈棋經》125 卦目進圖鑑——另開分頁而非併入同一份清單，
  因為等級與五行篩選對靈棋無意義；頁面改名「占卜圖鑑」（Session 48）
- **#21** 分享看得出牌陣——圖片卡與文字兩條路徑都補，牌陣名由呼叫端
  譯好再傳入（Session 48）

- **#22** `playClickSound` 刪除——六個音效裡最後一個沒有呼叫端的，
  使用者拍板刪而非接到按鈕上（通用點擊聲是另一種設計語彙）；
  同時補上「每個音效都要有畫面在播」的反向守門（Session 49）

- **#23** 子領域只認七個主類別的四處——籤詩詳解預設分頁（改走
  `poemFacetForCategory()`，自訂類別退回綜合）、感情性別提示（比對映回後
  的主類別）、應驗率分組（映回後再分組，否則與舊記錄分立兩行）、棋盤頁
  補上問事類別記憶（S50 之前就沒接）（Session 51）

**⚪ 設計面待辦（#9–#14）已全數結案**，目前沒有等待產品決策的項目。
**Session 41 後 #15–#17 均已結案**——目前沒有可在本地繼續實作的項目。

#### #14 的結論值得留著

原估「需另立術語表才做得起來」是把三堆性質不同的東西混在一起算：

| 類別 | 條數 | 結論 |
|---|---|---|
| 《周易》爻辭原典 | 384 | 不翻——翻經文是另一種工作 |
| 資料值字面量 | 148 | 不翻——會與盤面比對 |
| 專案自撰散文 | 57 | 已翻，術語保留漢字 |

拆開之後一點也不難。**日後遇到「這件事做不起來」的估計，先確認它有沒有把不同性質的東西綁在一起算。**

### ✅ 已全數完成的階段

| 階段 | 內容 | 完成日 |
|------|------|--------|
| Phase 0 | 緊急修復（C1/A8-1/C4） | 8/2 |
| Phase 1 | 命理正確性重建（A1–A10） | 8/2 |
| Phase 2 | 六爻系統（動爻/變卦/互卦/體用） | 8/2 |
| Phase 3 | 主題與版面（300+ 硬編色碼歸零） | 8/2 |
| Phase 4 | 視覺質感（真漸層/SVG/Emoji歸零） | 8/2 |
| Phase 5 | 動畫重製（Reanimated 4/墨滴轉場） | 8/2 |
| Phase 6 | 功能補完（13 項新功能） | 8/2 |
| Phase 6.7 | AI 深度解讀全端打通（Vercel serverless function） | 8/10 |
| 收尾 | 上架素材 + 程式碼品質 | 8/2 |
| Session 16 | 多欄佈局 + E2E + CI（測試 170、E2E 56） | 8/7 |
| Session 17 | 截圖檢視修復 4 個功能性缺陷（測試 220、E2E 74） | 8/9 |
| Session 18 | AI 解讀全端打通（測試 265、E2E 78） | 8/10 |
| Session 19 | 多語系翻譯補齊（1,440 字串、測試 405） | 8/11 |
| Session 20 | TS 零錯誤收尾（reducedMotion fix、驗證鏈確認） | 8/11 |
| Phase 7 | 占驗簿 + 月建旺衰 + 成就解鎖修復（測試 486） | 8/12 |
| Session 22 | 介面字串全面 i18n 化 + 京房六爻結構層（測試 524） | 8/14 |
| Session 23 | 文王卦伏神 + 用神斷語（測試 536、E2E 78） | 8/16 |
| Session 24 | 上架截圖修復 + 棋盤重複子守門（測試 538） | 8/18 |
| Session 25 | 用神擴充至感情／健康／出行（測試 549、E2E 86） | 8/19 |
| Session 26 | 文王卦進階條件：進退神／暗動／三合局（測試 564） | 8/19 |
| Session 27 | 原生端書法字體子集化（測試 567） | 8/19 |
| Session 28 | 部署上線驗證 + 文件校正（E2E 86） | 8/22 |
| Session 30 | 牌陣系統：五種佈局 + 占驗統計（測試 601） | 8/23 |
| Session 31 | 主題接線 + 原生還原 + 原生音效 + 平行工作整合（測試 635、E2E 108） | 8/24 |
| Session 32 | 四路審查：修掉線上壞掉（web Alert 空殼等）與靜默毀資料兩層；動爻先天數修正（測試 743、E2E 108） | 8/24 |
| Session 33 | 四路審查續清 8 條，其中 A1 證偽（測試 781、E2E 112） | 8/24 |
| Session 34 | 四路審查再清 15 條（1 條證偽）：通知／設定接線、用神兩現、reducedMotion、雲端同步三修、主題對比度、儲存失敗、日曆週期、備份降級、錯誤逃生（測試 894、E2E 112） | 8/26 |
| Session 35 | 四路審查收尾（A25 三層防線＋平台/UI 全清）：資料流佇列、命理三條、守門自我檢查、通知測試補齊、字型子集重建（測試 935、E2E 112） | 8/26 |
| Session 36 | 清孤兒資產（SpaceMono 字型）與 7 個死翻譯鍵，補上字型孤兒守門與翻譯鍵反向覆蓋守門（測試 939、E2E 112） | 8/27 |
| Session 37 | 揭曉頁桌面雙欄（主欄解讀＋sticky 卦例側欄）；棋盤頁截圖後判定不分欄並釘成測試（測試 947、E2E 124） | 8/27 |
| Session 38 | 六爻散文翻譯結案：57 條自撰散文翻成 en/ja（術語保留漢字），384 條經文與 148 條資料值維持原文並釘成測試（測試 958、E2E 124） | 8/27 |
| Session 39 | 技術待辦清空：刪 `summarizeReading()` 死碼、寬螢幕棋子池側置（含全螢幕）；順帶查出 Web 拖曳落子為既有失效並覆核於改動前 build（測試 966、E2E 132） | 8/28 |
| Session 40 | Web 拖曳落子修復：指標離開棋子後改由 document 接手 pointermove／pointerup，新增實際跨元素拖曳 e2e（測試 966、E2E 134） | 8/28 |
| Session 41 | 拖曳落子的第二道關卡：`placePieceOnBoard` 收下被拖的棋子，未先點選也能拖曳落子、已選別顆時落下的仍是被拖的那顆（測試 968、E2E 136） | 8/28 |
| Session 42 | 靈棋與問事帶入接上 i18n 守門、積欠工作拆五筆 commit 入庫、兩軍對壘陣構想入待辦（測試 970、E2E 136） | 8/31 |
| Session 43 | 靈棋補成完整占卜模式：《靈棋經》125 卦目原典入庫（公有領域，逐字保留、更正列名可稽核），接上歷史／占驗簿／統計，不生成原典沒有的吉凶等級（測試 985、E2E 144） | 8/31 |
| Session 44 | 靈棋補上收藏與分享；分享卡的空等級標籤與 draw 三元式一併修掉；靜態守門被自身註解餵紅的修法（測試 991、E2E 148） | 8/31 |
| Session 45 | 把從未接上畫面的「依占卜模式應驗率」接進統計頁，順帶修掉它把靈棋標成棋盤的預設標籤；分項區塊加 testID（測試 993、E2E 154） | 8/31 |
| Session 46 | 兩軍對壘陣上線（上卦＝紅方陣、下卦＝黑方陣、動爻＝子力差，半場限三子）＋靈棋規則式深度解讀定案（三才三檔、不造吉凶等級）；順帶修掉靈棋 e2e 三條隱性 flaky 與字型子集缺字（測試 1019、E2E 162） | 8/31 |
| Session 47 | 新模式的周邊接線：成就系統認靈棋（累積數改數全部占卜、新增靈棋初擲與三法俱通）、AI 提示詞帶入牌陣與盤面（切在深度解讀標題之前，系統提示要求扣合）；順帶把手抄 id 的成就翻譯守門改為列舉真清單（測試 1036、E2E 166） | 9/1 |
| Session 48 | AI 深度解讀正式上線（卡的是 redeploy 不是金鑰）；《靈棋經》125 卦目進圖鑑並改名「占卜圖鑑」；分享的圖片與文字兩條路徑都印出牌陣名（測試 1046、E2E 174） | 9/1 |
| Session 49 | 靈棋擲完不算數的三處：連續天數與成就重算只掛在 reveal 頁（靈棋不走那一頁）、靈棋全程無音效（`playShakeSound` 從未有呼叫端）、占驗提醒印中文原題而非 `recordTitle()`；三處都補來源掃描守門，e2e 刻意不開會自我補算的成就頁；順帶依使用者決定刪掉 `playClickSound`（六個音效最後一個孤兒）並補反向守門，實機驗證清單補上 S43 之後上線的六項（14 → 20）（測試 1052、E2E 178） | 9/2 |
| Session 51 | S50 子領域的周邊接線：籤詩詳解預設展開所問的那一面（自訂類別退回綜合）、感情子領域也出得了「請補性別」提示、應驗率分組先映回主類別（否則與上線前的舊記錄分立兩行）、棋盤頁補上問事類別記憶；另修掉引導頁停在「雙重占卜模式」（靈棋 S43 就上線了），守門改以 `DivinationMode` 成員數為真相來源；新守門逐一注入驗過會紅（測試 1080、E2E 188） | 9/3 |
