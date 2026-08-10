# 象棋占卜 — 工作日誌

## 專案總覽

| 項目 | 數值 |
|------|------|
| 原始碼檔案 | 83 個 |
| Git Commits | 50 次 |
| Jest 測試 | 265 個 · 18 套件 · 全部通過 |
| E2E 測試 | 78 個 · Playwright · mobile + desktop |
| TypeScript | 零錯誤 |
| 頁面 | 14 個 |
| 元件 | 18 個 |
| Hooks | 11 個 |
| 服務 | 17 個 |
| 籤詩 | 64 首七言絕句 |
| 起卦引擎 | v3（六爻：本卦／變卦／互卦／體用） |
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

---

## 功能完整清單

### 占卜核心
- 抽棋模式（選類別→問事→動畫→籤詩）
- 棋盤佈局（選棋→拖曳放棋→深度解讀）
- 64 首七言絕句籤詩（易經 64 卦對映）
- AI 深度解讀（DeepSeek API via Vercel serverless function，未配置時降級為規則式解讀）

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

## 未來待辦

### 🟢 技術面（不需外部資源）

| # | 待辦 | 優先度 | 備註 |
|---|------|--------|------|
| 1 | **Vercel 部署驗證 + AI 解讀上線** | 🔴 高 | `git push` → Vercel 自動部署，在專案設定加入 `DEEPSEEK_API_KEY` 即可啟用 AI 解讀 |
| 2 | **單元測試覆蓋率補強** | 🟡 中 | 265 → 目標 300+。仍缺：`i18n`、`sound`、`socialShare`、`notifications`、`useDrawDivination`、`useBoardDivination` |
| 3 | **iOS/Android 實機測試** | 🟡 中 | `npx expo start --go`，用手機掃碼進 Expo Go 測試原生端觸覺、字體、手勢 |
| 4 | **EAS Build 原生測試** | 🟢 低 | `eas build --platform ios/android --profile preview`，在 TestFlight/內部測試安裝 |

### 🟡 上架相關（需外部資源）

| # | 待辦 | 優先度 | 備註 |
|---|------|--------|------|
| 5 | **螢幕截圖製作** | 🔴 高 | 照 `SCREENSHOTS_GUIDE.md` 擷取 6 張，App Store / Google Play 必需 |
| 6 | **App Store 實際上架** | 🟡 中 | 文案與設定已備妥（`STORE_LISTING.md`）。需 Apple Developer $99/年 |
| 7 | **Google Play 實際上架** | 🟡 中 | 文案與設定已備妥。需 Google Play Console $25 一次性 |
| 8 | **自訂域名** | 🟢 低 | 購買 `chess-divination.com` + DNS 指向 Vercel |

### ⚪ 設計面（需產品決策）

| # | 待辦 | 優先度 | 備註 |
|---|------|--------|------|
| 9 | **多語系策略決定** | 🟡 中 | A：移除 en/ja 切換器，純繁中定位（半天）；B：補齊 64 籤詩翻譯（5 天+） |
| 10 | **原生端書法字體子集化** | 🟢 低 | 目前原生端用系統楷書後備；完整 Noto Serif TC 需子集（籤詩用字約 800 字） |
| 11 | **棋盤重複選子限制** | 🟢 低 | 2 顆棋時無法組出乾為天／坤為地，但位置動爻已大幅提升變化度 |

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
