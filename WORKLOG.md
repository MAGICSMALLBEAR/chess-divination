# 象棋占卜 — 工作日誌

## 專案總覽

| 項目 | 數值 |
|------|------|
| 原始碼檔案 | 41 個 (.ts/.tsx) |
| 頁面 | 11 個 |
| 元件 | 8 個 |
| Hooks | 6 個 |
| 服務 | 8 個 |
| 籤詩 | 64 首七言絕句 |
| 棋子 | 32 顆完整定義 |
| Jest 測試 | 20 個 · 3 套件 · 全部通過 |
| TypeScript | 零錯誤 |
| 部署 | Vercel + GitHub |

### 技術棧
Expo SDK 57 · React 19.2 · RN 0.86 · TypeScript 6.0 · Expo Router · AsyncStorage · Reanimated · Gesture Handler · Web Audio API · expo-haptics · expo-sharing · view-shot · Jest

### 部署
- **GitHub**: [MAGICSMALLBEAR/chess-divination](https://github.com/MAGICSMALLBEAR/chess-divination)
- **Vercel**: https://chess-divination-app.vercel.app
- **本地**: `npx expo start --web` → http://localhost:8081

---

## Session 1 — 專案初始化與架構設計 (7/26)
- Expo SDK 57 專案建立、目錄結構
- 需求確認：抽棋+棋盤雙模式、64 首籤詩
- 完整架構設計（data model、route、元件樹）

## Session 2 — MVP 建立 (7/27)
- 資料層：32 棋子 + 64 籤詩 + 主題 + storage + divination
- 核心元件：ChessPiece, ChessBoard, InkBackground, ModeSelector
- 雙模式完整流程：draw + board + reveal + collection + settings + onboarding
- Web 端測試通過

## Session 3 — 12 項新功能 (7/27)
- 問事輸入框、音效系統、觸覺回饋
- 亮色主題、籤詩圖鑑、統計儀表板
- 姓名設定、AI 解籤、棋盤位置解讀
- 備份還原、多語言 i18n、設定整合
- 棋盤放置 Bug 修復 (ChessPiece 觸控衝突)

## Session 4 — 功能深化 (7/28)
- **棋盤拖曳放置** — drag-to-board 自動計算格位
- **Vercel 部署** — chess-divination-app.vercel.app
- **i18n 全面套用** — Singleton+Listener 即時切換，70+ 翻譯條目
- **動畫速度控制** — useAnimationSpeed hook, slow=2x/normal=1x/fast=0.5x
- **PoemCard 整合** — reveal.tsx 改用捲軸動畫，精簡 ~100 行
- **無障礙支援** — useReducedMotion, accessibilityRole/Label
- **分享 Web fallback** — ViewShot → Web Share API → 剪貼簿

## Session 5 — 位置解讀與細節完善 (7/28)
- **位置解讀深化** — 五行生剋分析、方位吉凶、逐棋子深度解讀
- **收藏資料夾** — Folder CRUD、6 色標籤、記錄分配
- **問事類別記憶** — 自動儲存/載入上次選擇
- **每日運勢連結** — 卡片點擊直達抽棋

## Session 6 — UX 全面修復 (7/28)
### 🔴 嚴重問題
- 棋盤 cellSize 放大 (31px→44px)
- 棋盤返回確認 Alert
- Spinner 動畫元件
- 分享格式優化

### 🟡 中等問題
- 收藏記錄搜尋
- 設定頁清除所有歷史
- 棋盤撤銷上一步
- 首頁最近 3 筆紀錄摘要
- 棋盤首次操作提示

### 🟢 細節
- 圖鑑卡片點擊展開詳情
- 統計日期篩選（全部/本週/本月）
- Collection 下拉重整 (RefreshControl)
- 記錄加到資料夾按鈕
- PoemCard 動畫速度套用

## Session 7 — 字體與測試 (7/28)
- **書法字體** — Google Fonts Noto Serif TC + KaiTi/STKaiti fallback
- **Jest 自動化測試** — 3 套件 20 測試全部通過
  - `pieces.test.ts`：棋子數量/屬性/卦象
  - `poems.test.ts`：64 籤詩完整性/七言格式/卦名
  - `divination.test.ts`：抽棋確定性/PRNG/卦象計算

---

## 未來待辦

### 需外部資源
- [ ] 每日推播 — expo-notifications 原生設定
- [ ] iOS/Android 實機測試
- [ ] App Store / Google Play 上架
- [ ] 自訂域名

### 可繼續完善
- [ ] 棋盤完整對弈模式（人機對弈）
- [ ] AI API 串接 (DeepSeek/OpenAI)
- [ ] 離線 PWA Service Worker
- [ ] 社群分享圖片美化
- [ ] i18n 剩餘頁面完整套用
