# 象棋占卜 — 工作日誌

## 2026-07-27 — Session 2 (MVP 建立)

- 資料層：32 棋子 + 64 籤詩 + 主題 + storage + divination
- 核心元件：ChessPiece, ChessBoard, InkBackground, ModeSelector
- 抽棋模式 + 棋盤模式 + reveal/collection/settings/onboarding
- 導覽配置 + Web 端測試通過

## 2026-07-27 — Session 3 (12 項新功能)

- 問事輸入框、音效系統、觸覺回饋
- 亮色主題、籤詩圖鑑、統計儀表板
- 姓名設定、AI 解籤、棋盤位置解讀
- 備份還原、多語言 i18n、設定整合
- 棋盤棋子放置 Bug 修復

## 2026-07-28 — Session 4 (功能深化)

### 新功能
- **棋盤拖曳放置** — 棋子庫支援 drag-to-board，拖到棋盤自動計算格位放置
- **Vercel 部署** — 全新專案 `chess-divination-app.vercel.app`
- **i18n 全面套用** — Singleton+Listener 即時語言切換，設定頁加入 zh-TW/en/ja 選擇器，70+ 翻譯條目
- **動畫速度控制** — 新增 `useAnimationSpeed` hook，設定 slow=2x / normal=1x / fast=0.5x

### 重構/優化
- **PoemCard 整合** — reveal.tsx 改用 PoemCard 元件（捲軸動畫+分類詳解），精簡 ~100 行重複程式碼
- **亮色主題深化** — draw.tsx 卡片/按鈕/輸入框使用 theme 動態色
- **無障礙支援** — `useReducedMotion` hook（Web matchMedia + native AccessibilityInfo），簡化動畫偏好
- **分享 Web fallback** — ViewShot 失敗時自動降級 → Web Share API → 剪貼簿

---

## 專案總覽

### 檔案統計
```
src/
├── app/                   11 頁面 (index, draw, board, reveal, collection,
│                           settings, onboarding, library, stats, + 3 layouts)
├── components/             7 元件 (ChessPiece, ChessBoard, InkBackground,
│                           ModeSelector, PieceDrawAnimation, PoemCard, ShareCardView)
├── data/                   2 資料 (pieces.ts 32棋子, poems.ts 64籤詩)
├── constants/              1 主題 (theme.ts 水墨棋風色系)
├── hooks/                  6 hooks (useDrawDivination, useBoardDivination,
│                           useAppTheme, useI18n, useAnimationSpeed, useReducedMotion)
└── services/               8 服務 (storage, divination, sound, haptics,
                            ai, position, backup, i18n)

總計：36 個原始碼檔案 · TypeScript 零錯誤
```

### 技術棧
Expo SDK 57 · React 19.2 · RN 0.86 · TypeScript 6.0 · Expo Router · AsyncStorage · Reanimated · Gesture Handler · Web Audio API · expo-haptics · expo-sharing · view-shot

### 部署
- **GitHub**: [MAGICSMALLBEAR/chess-divination](https://github.com/MAGICSMALLBEAR/chess-divination)
- **Vercel**: https://chess-divination-app.vercel.app
- **本地**: `npx expo start --web` → http://localhost:8081

---

## 未來功能待辦

### 高優先 (可立即實作)
- [ ] **棋盤位置解讀深化** — 目前只有文字區域解讀，可加入五行生剋、方位吉凶
- [ ] **i18n 更多頁面套用** — draw/board/collection/library/stats 頁面標題和按鈕換成 t()
- [ ] **收藏分類資料夾** — 讓使用者可建立自訂分類整理收藏
- [ ] **問事類別記憶** — 記住上次選擇的類別，下次預設選中
- [ ] **每日運勢點擊抽棋** — 首頁每日運勢卡片點擊可直接跳到抽棋模式

### 中優先 (需中等工時)
- [ ] **書法字體** — 引入楷體/行書字型用於籤詩展示，強化水墨棋風視覺
- [ ] **音效升級** — 錄製真實象棋音效（落子、吃子）替代程式化音效
- [ ] **棋盤對弈模式** — 除了放棋占卜，加入簡單的人機對弈功能
- [ ] **社群分享優化** — 分享圖片卡美化、一鍵分享到 LINE/FB/IG
- [ ] **離線 PWA** — Service Worker 完整離線支援
- [ ] **AI API 串接** — 目前只有離線 fallback，整合 DeepSeek/OpenAI 提供更個人化解讀

### 低優先 (需外部資源)
- [ ] **每日推播通知** — expo-notifications 推送每日運勢
- [ ] **iOS/Android 原生測試** — 實機安裝測試
- [ ] **Jest 自動化測試** — unit tests + E2E tests
- [ ] **Apple App Store / Google Play 上架**
- [ ] **自訂域名** — 設定 chess-divination.com 或其他域名
