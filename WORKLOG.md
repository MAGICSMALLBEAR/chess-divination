# 象棋占卜 — 工作日誌

## 2026-07-27 — Session 2 (全部完成)

### 完成項目
- [x] Phase 2: 資料層
  - `src/data/pieces.ts` — 32 顆棋子完整定義（五行/方位/陰陽/卦象對映/關鍵詞）
  - `src/data/poems.ts` — 64 首原創七言絕句籤詩（易經 64 卦對映 + 白話 + 典故 + 7 類詳解）
  - `src/constants/theme.ts` — 水墨棋風主題色系 + 設計 Token + 棋盤尺寸
  - `src/services/storage.ts` — AsyncStorage CRUD（歷史/收藏/設定/每日運勢）
  - `src/services/divination.ts` — 抽棋演算法（確定性 PRNG）+ 卦象對映 + 每日運勢

- [x] Phase 3: 核心元件
  - `src/components/ChessPiece.tsx` — 圓形棋子、拖曳支援、紅黑配色
  - `src/components/ChessBoard.tsx` — 9×10 格線棋盤 + 楚河漢界 + 棋子放置
  - `src/components/InkBackground.tsx` — 水墨粒子動畫背景
  - `src/components/ModeSelector.tsx` — 雙模式選擇卡片

- [x] Phase 4: 抽棋模式
  - `src/hooks/useDrawDivination.ts` — 抽棋狀態機
  - `src/components/PieceDrawAnimation.tsx` — 搖筒→棋子飛出→金光動畫
  - `src/app/draw.tsx` — 抽棋流程頁面（問事類別 + 數量選擇）

- [x] Phase 5: 棋盤模式
  - `src/hooks/useBoardDivination.ts` — 棋盤狀態機
  - `src/app/board.tsx` — 棋盤佈局頁面（棋子庫 + 放置 + 解讀）

- [x] Phase 6: 籤詩與功能頁
  - `src/components/PoemCard.tsx` — 捲軸展開動畫 + 分類解讀
  - `src/app/reveal.tsx` — 籤詩展示頁（收藏/分享/再抽/回首頁）
  - `src/app/(tabs)/collection.tsx` — 歷史記錄 + 收藏（切換/刪除/查看）
  - `src/app/(tabs)/settings.tsx` — 設定頁（主題/動畫/音效/預設）
  - `src/app/onboarding.tsx` — 4 步驟首次引導

- [x] Phase 7: 導覽與收尾
  - `src/app/_layout.tsx` — Root Stack（draw/board/reveal/onboarding）
  - `src/app/(tabs)/_layout.tsx` — Tab 導覽（首頁/收藏/設定）
  - `src/app/(tabs)/index.tsx` — 首頁（每日運勢 + 模式選擇）
  - TypeScript 零錯誤編譯通過
  - Web 端測試通過 (HTTP 200)

### 檔案統計
- 總檔案數：20+ 個原始碼檔案
- 籤詩：64 首七言絕句，每首含 7 類詳解
- 棋子：32 顆完整定義含 7 種屬性

### 驗證清單
- [x] TypeScript 編譯零錯誤
- [x] Web 端可正常啟動
- [ ] 抽棋模式完整流程（需實際操作）
- [ ] 棋盤模式完整流程（需實際操作）
- [ ] 收藏/歷史功能
- [ ] 設定頁功能

### 啟動方式
```bash
cd "c:\Users\user\Desktop\象棋占卜"
npx expo start --web
```
