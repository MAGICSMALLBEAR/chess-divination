# 象棋占卜 — 工作日誌

## 2026-07-27 — Session 2 (MVP 建立)

### 完成項目
- [x] Phase 1-7: 專案初始化 + 完整 MVP 架構
  - 資料層：32 棋子定義 + 64 首七言絕句籤詩
  - 核心元件：ChessPiece, ChessBoard, InkBackground, ModeSelector
  - 抽棋模式：問事類別 → 數量選擇 → 搖筒動畫 → 籤詩解讀
  - 棋盤模式：紅/黑棋子庫 → 點擊棋盤放置 → 解讀
  - 功能頁：reveal, collection, settings, onboarding
  - 導覽：Tab 導覽 (首頁/收藏/設定) + Stack 頁面

## 2026-07-27 — Session 3 (功能完善)

### 修復項目
- [x] 棋盤棋子放置 Bug — ChessPiece 觸控事件衝突修復
- [x] 籤詩展示頁補全 — 白話解釋、典故、7 類詳解（切換分類）

### 新增功能 (12項)
- [x] **1. 問事輸入框** — draw.tsx/board.tsx 加入文字輸入，reveal.tsx 顯示問題
- [x] **2. 音效系統** — `src/services/sound.ts` Web Audio API 程式化音效（抽棋/落子/揭示/收藏）
- [x] **3. 觸覺回饋** — `src/services/haptics.ts` expo-haptics + Web vibrate fallback
- [x] **4. 亮色主題** — 全部 7 頁面 SafeAreaView 套用 ThemeContext 動態背景色
- [x] **5. 籤詩圖鑑** — `src/app/library.tsx` 瀏覽 64 首籤詩 + 搜尋 + 等級篩選
- [x] **6. 統計儀表板** — `src/app/stats.tsx` 總次數/吉凶分佈長條圖/棋子排行
- [x] **7. 姓名設定** — 設定頁可編輯使用者名稱
- [x] **8. AI 解籤** — `src/services/ai.ts` 離線 fallback + 遠端 API 擴充接口
- [x] **9. 棋盤位置解讀** — `src/services/position.ts` 九宮/楚河/邊緣/角落含義
- [x] **10. 備份還原** — `src/services/backup.ts` Web JSON 下載 + 上傳還原
- [x] **11. 多語言 i18n** — `src/services/i18n.ts` zh-TW / en / ja 翻譯字典
- [x] **12. 設定頁整合** — 連結圖鑑/統計 + 備份/還原按鈕 + 名稱編輯

### 部署
- [x] GitHub repo: [MAGICSMALLBEAR/chess-divination](https://github.com/MAGICSMALLBEAR/chess-divination)
- [x] `vercel.json` 設定檔已推送（待手動串接 Vercel Dashboard）

---

## 專案總覽

### 檔案統計
```
src/
├── app/                  # 11 個頁面 (index, draw, board, reveal, collection,
│                         #   settings, onboarding, library, stats, + 3 layouts)
├── components/           # 7 個元件 (ChessPiece, ChessBoard, InkBackground,
│                         #   ModeSelector, PieceDrawAnimation, PoemCard, ShareCardView)
├── data/                 # 2 個資料檔 (pieces.ts, poems.ts)
├── constants/            # 1 個主題設定 (theme.ts)
├── hooks/                # 3 個 hooks (useDrawDivination, useBoardDivination, useAppTheme)
└── services/             # 8 個服務 (storage, divination, sound, haptics,
                          #   ai, position, backup, i18n)

總計：32 個原始碼檔案
- 64 首原創七言絕句籤詩
- 32 顆棋子完整定義
- TypeScript 零錯誤
- Web 端 HTTP 200 驗證通過
```

### 技術棧
- Expo SDK 57, React 19.2.3, React Native 0.86.0
- TypeScript 6.0, Expo Router (file-based routing)
- AsyncStorage, Reanimated, Gesture Handler
- Web Audio API, expo-haptics, expo-sharing, react-native-view-shot

---

## 未來待辦

### 短中期 (優先度高)
- [ ] **棋盤位置解讀實際套用** — position.ts 已寫好但尚未在 board.tsx 的 interpret 流程中調用
- [ ] **AI 解籤 API 串接** — 目前只有離線 fallback，可整合 DeepSeek/OpenAI API 提供個人化解讀
- [ ] **i18n 實際套用** — 翻譯字典已建立，需逐頁面替換硬編碼中文字串
- [ ] **Vercel 部署串接** — 至 vercel.com/new 匯入 GitHub repo 完成自動部署
- [ ] **亮色主題深層套用** — 目前只改了背景色，卡片/文字/邊框等需全面套用 ThemeContext
- [ ] **PoemCard 元件整合** — 已寫好但 reveal.tsx 目前用內聯展示，可改用 PoemCard 的捲軸動畫
- [ ] **動畫速度設定** — 設定頁有開關但未實際控制動畫 duration

### 中長期 (體驗提升)
- [ ] **每日推播通知** — 整合 expo-notifications 推送每日運勢
- [ ] **棋盤拖曳放置** — 目前是點擊放置，可升級為拖曳 (ChessPiece 已有 draggable 支援)
- [ ] **原生平台測試** — iOS / Android 實機測試
- [ ] **社群分享優化** — 分享圖片卡美化、一鍵分享到社群平台
- [ ] **音效升級** — 錄製真實象棋音效替代程式化音效
- [ ] **字體優化** — 引入書法字體 (楷體/行書) 用於籤詩展示
- [ ] **無障礙優化** — reducedMotion、螢幕閱讀器支援
- [ ] **Test 自動化** — Jest unit tests + E2E tests

### 啟動方式
```bash
cd "c:\Users\user\Desktop\象棋占卜"
npx expo start --web
```
