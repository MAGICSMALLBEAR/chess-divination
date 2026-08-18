# 象棋占卜 — 工作日誌

## 專案總覽

| 項目 | 數值 |
|------|------|
| 原始碼檔案 | 84 個 |
| Git Commits | 51 次 |
| Jest 測試 | 536 個 · 31 套件 · 全部通過 |
| E2E 測試 | 78 個 · Playwright · mobile + desktop |
| TypeScript | 零錯誤 |
| 頁面 | 14 個 |
| 元件 | 18 個 |
| Hooks | 11 個 |
| 服務 | 22 個 |
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

## 功能完整清單

### 占卜核心
- 抽棋模式（選類別→問事→動畫→籤詩）
- 棋盤佈局（選棋→拖曳放棋→深度解讀）
- 64 首七言絕句籤詩（易經 64 卦對映）
- AI 深度解讀（DeepSeek API via Vercel serverless function，未配置時降級為規則式解讀）

### 解讀系統
- 白話解釋 + 典故 + 7 面詳解（感情/事業/財運/健康/學業/出行/綜合）
- 棋盤位置解讀（九宮/楚河/邊緣/角落 + 五行生剋）
- 六爻推演（本卦/動爻/互卦/變卦 + 體用生剋）
- 納甲六爻盤（干支/五行/六親/世應/空破/伏神，京房八宮）
- 用神斷語（財運/事業/學業以用神旺衰加權斷吉凶，逐條列出採計條件）
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
| 1 | **Vercel 部署驗證 + AI 解讀上線** | 🔴 高 | 部署 ✅（8/16 push `aa1910a`，線上回應 200）。AI 解讀僅餘最後一步：在 Vercel 專案設定加入 `DEEPSEEK_API_KEY`，加完再驗證 `api/interpret` |
| 2 | ~~**單元測試覆蓋率補強**~~ ✅ | 🟢 已完成 | 265 → 536，31 套件全過（8/16） |
| 3 | **iOS/Android 實機測試** | 🟡 中 | `npx expo start --go`，用手機掃碼進 Expo Go 測試原生端觸覺、字體、手勢 |
| 4 | **EAS Build 原生測試** | 🟢 低 | `eas build --platform ios/android --profile preview`，在 TestFlight/內部測試安裝 |

### 🟡 上架相關（需外部資源）

| # | 待辦 | 優先度 | 備註 |
|---|------|--------|------|
| 5 | ~~**螢幕截圖製作**~~ ✅ | 🟢 已完成 | 6 場景 × 4 尺寸＝24 張，`npm run screenshots` 可重現（8/18） |
| 6 | **App Store 實際上架** | 🔴 高 | 文案（`STORE_LISTING.md`）與截圖皆已備妥，只差帳號。需 Apple Developer $99/年 |
| 7 | **Google Play 實際上架** | 🔴 高 | 文案與截圖皆已備妥，只差帳號。需 Google Play Console $25 一次性 |
| 8 | **自訂域名** | 🟢 低 | 購買 `chess-divination.com` + DNS 指向 Vercel |

### ⚪ 設計面（需產品決策）

| # | 待辦 | 優先度 | 備註 |
|---|------|--------|------|
| 9 | ~~**多語系策略決定**~~ ✅ | 🟢 已完成 | B 方案：補齊全部 64 籤詩 + 32 棋子 + 8 成就的 en/ja 翻譯（Session 19） |
| 10 | **原生端書法字體子集化** | 🟢 低 | 目前原生端用系統楷書後備；完整 Noto Serif TC 需子集（籤詩用字約 800 字） |
| 11 | ~~**棋盤重複選子限制**~~ ✅ | 🟢 已完成 | 「允許重複棋子」開關（預設關）已可組出乾為天／坤為地，補上守門測試（8/18） |
| 12 | **用神斷語擴充（感情／健康／出行）** | 🟢 低 | 需先決定是否在問事流程加「身分／對象」輸入——目前取不到用神就不出斷語，是 Session 23 的刻意取捨 |
| 13 | **文王卦進階條件（三合局／進退神／暗動等）** | 🟢 低 | 需確切占時等前提，目前刻意不做；要做之前須先補問事時間輸入，否則只是看似精確的雜訊 |

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
