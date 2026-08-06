# 象棋占卜 — 工作日誌

## 專案總覽

| 項目 | 數值 |
|------|------|
| 原始碼檔案 | 74 個 |
| Git Commits | 32 次 |
| Jest 測試 | 170 個 · 12 套件 · 全部通過 |
| E2E 測試 | 24 個 · Playwright · mobile + desktop |
| TypeScript | 零錯誤 |
| 頁面 | 12 個 |
| 元件 | 13 個 |
| Hooks | 8 個 |
| 服務 | 15 個 |
| 籤詩 | 64 首七言絕句 |
| 起卦引擎 | v3（六爻：本卦／變卦／互卦／體用） |

### 技術棧
Expo SDK 57 · React 19.2 · RN 0.86 · TypeScript 6.0 · Expo Router · AsyncStorage · Reanimated · Gesture Handler · Web Audio API · expo-haptics · expo-sharing · view-shot · Jest · Playwright

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

### 程式碼品質
- 消除 4 處路由 `as any`（改用 Expo Router 原生字串路徑）
- 9 處空 `catch {}` 補上中文 `console.warn`
- `cloudSync.ts` 定義 `CloudRecord` 介面取代 `as any[]`

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

## 未來待辦

### 🟢 短期（本週可做）

| # | 待辦 | 狀態 | 備註 |
|---|------|------|------|
| 1 | **iOS/Android 實機測試** | ⬜ 待做 | `npx expo start --go`，用手機掃碼進 Expo Go 測試原生端 |
| 2 | **Vercel 部署驗證** | ⬜ 待做 | 確認 `privacy.html` 可透過 `chess-divination-app.vercel.app/privacy.html` 存取 |
| 3 | **螢幕截圖製作** | ⬜ 待做 | 照 `SCREENSHOTS_GUIDE.md` 擷取 6 張，上架必需 |
| 4 | **多語系決策** | ⬜ 待決定 | 選項 A：移除 en/ja 切換器，純繁中定位；選項 B：補齊 64 籤詩翻譯（5 天+） |
| 5 | **其餘頁面套用多欄** | ⬜ 待做 | 目前只有圖鑑與收藏用了 `useGrid`，統計/成就頁仍是單欄 |
| 6 | **E2E 納入 CI** | ⬜ 待做 | GitHub Actions 跑 `npm run verify && npm run e2e` |

### 🟡 中期（需外部資源）

| # | 待辦 | 狀態 | 備註 |
|---|------|------|------|
| 7 | **App Store 實際上架** | 🟡 文案/設定已備妥 | 需 Apple Developer $99/年 + 1024×1024 圖示（已有）+ 6 張截圖 |
| 8 | **Google Play 實際上架** | 🟡 文案/設定已備妥 | 需 Google Play Console $25 一次性 + 截圖 |
| 9 | **自訂域名** | ⬜ 待做 | 購買 `chess-divination.com` + DNS 指向 Vercel |
| 10 | **EAS Build 原生測試** | ⬜ 待做 | `eas build --platform ios/android --profile preview`，在 TestFlight/內部測試安裝 |

### ⚪ 長期（設計增強）

| # | 待辦 | 狀態 | 備註 |
|---|------|------|------|
| 11 | **寬螢幕多欄佈局** | ✅ 已完成（Session 16） | `useGrid` 以 onLayout 量測容器，圖鑑與收藏已套用 |
| 12 | **原生端書法字體子集化** | ⬜ 刻意延後 | 目前原生端用系統楷書後備，完整 Noto Serif TC 需子集（籤詩用字約 800 字） |
| 13 | **棋盤重複選子限制** | ⬜ 設計取捨 | 2 顆棋無法組出乾為天/坤為地，但加入位置動爻後變化度已大幅提升 |
| 14 | **單元測試覆蓋率提升** | ✅ 已完成（Session 16） | storage/achievements/layout/grid，75 → 170 個 |
| 15 | **E2E 測試** | ✅ 已完成（Session 16） | Playwright 24 個，mobile + desktop 兩組 viewport |
| 16 | **多語系完整翻譯** | ⬜ 待決定 | 64 籤詩 + 32 棋子說明 + 成就名稱全翻譯，約 5 天+ |

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
| 收尾 | 上架素材 + 程式碼品質 | 8/2 |
| 測試 | 單元 170 + E2E 24 + 多欄佈局 | 8/7 |
