# 象棋占卜 — 稽核報告與開發計劃

> 稽核日期：2026-08-01 · 基準 commit：`a7b1f4d`
> 現況：43 檔 / 7,413 行 · TypeScript 零錯誤 · Jest 20 測試全過
> 結論：**功能廣度已足夠，但「命理正確性」與「主題一致性」有結構性缺陷，應優先於新功能。**

## 進度

| 階段 | 狀態 |
|---|---|
| Phase 0 緊急修復 | ✅ 已完成（2026-08-02） |
| Phase 1 命理正確性重建 | ✅ 已完成（2026-08-02） |
| Phase 2 六爻系統 | ✅ 已完成（2026-08-02） |
| Phase 3 主題與版面 | ✅ 已完成（2026-08-02） |
| Phase 4 視覺質感 | ✅ 已完成（2026-08-02） |
| Phase 5 動畫重製 | ✅ 已完成（2026-08-02） |

Phase 0–4 完成後：Jest 75 測試全過 · TypeScript 零錯誤 · web build 成功 · 硬編色碼歸零 · Emoji 歸零。
詳細變更見文末「已完成變更記錄」。

---

## 一、命理系統稽核

### 🔴 A1 — 卦序對應錯誤：64 卦中 62 卦給錯籤詩（最嚴重）

**問題**
`computeHexagramIndex()` 產生的是**先天（伏羲）二進位序** `上卦×8+下卦`（0–63），
但 `ALL_POEMS` 是依**文王卦序**排列（#1 乾為天、#2 坤為地、#3 水雷屯…#64 火水未濟）。

`selectPoem()` 卻直接 `poemId = hexIndex + 1`，等於把兩套完全不同的編號系統當成同一套。

**實證**（腳本驗證，見下方驗收）

| 抽到的卦 | 應得籤詩 | 現在給的籤詩 |
|---|---|---|
| 乾上兌下（天澤履） | #10 天澤履 | #2 坤為地 |
| 乾上離下（天火同人） | #13 天火同人 | #3 水雷屯 |
| 坤上坤下（坤為地） | #2 坤為地 | #64 火水未濟 |
| 乾上乾下（乾為天） | #1 乾為天 | #1 乾為天 ✅（唯一巧合對上的兩個之一） |

**錯誤率 62/64。** 抽到「坤為地」卻顯示「火水未濟」——籤詩的卦名、白話、典故、七面詳解全部與實際卦象無關。這是整個 App 命理可信度的根本問題。

**修法**
`poems.ts` 的 `hexagramName` 欄位其實已內含正確資訊（`水雷屯` = 上坎下震，八純卦寫作 `乾為天`）。
已驗證：**64 個卦名全部可解析、無重複、完整覆蓋 64 卦**。

因此建立自動推導表，不需手工維護：

```ts
// src/services/hexagram.ts（新檔）
const SYMBOL_TO_TRIGRAM = { 天:0, 澤:1, 火:2, 雷:3, 風:4, 水:5, 山:6, 地:7 };
const PURE_TO_TRIGRAM   = { 乾:0, 兌:1, 離:2, 震:3, 巽:4, 坎:5, 艮:6, 坤:7 };

/** 先天序 index (上×8+下) → 文王卦序 poemId，由 poems.ts 卦名自動推導 */
export const XIANTIAN_TO_KINGWEN: Record<number, number> = buildMapping();
```

**驗收**：新增測試斷言 (1) 映射表恰好 64 筆、值為 1–64 不重複；(2) `selectPoem` 對每組上下卦回傳的 `poem.hexagramName` 與該上下卦組合名稱一致。

**涉及檔案**：新增 `src/services/hexagram.ts`、改 `src/services/divination.ts:91-135`、新增 `src/__tests__/hexagram.test.ts`
**工時**：0.5 天

---

### 🔴 A2 — 兌卦永遠抽不到，64 卦僅 49 卦可達

**問題**
象棋只有 7 種棋子，卻要對映 8 個卦：

```
king→乾(0)  advisor→坤(7)  elephant→巽(4)  chariot→坎(5)
horse→震(3) cannon→離(2)   pawn→艮(6)      ← 兌(1) 無人認領
```

- 抽 2 顆：`7×7 = 49` 種組合，**15 卦永遠抽不到**
- 抽 1 顆：只有 7 種重卦，**兌為澤永遠抽不到**

意味著 App 裡有 15 首籤詩是死內容。

**修法（三選一，建議 B）**

- **A 案**：把 32 顆棋子細分成 8 類（例：兵/卒依前線位置分「兵」艮、「卒」兌）——牽強。
- **B 案（建議）**：**以「顏色」補足第 8 卦**。紅黑本就是陰陽，讓 `trigram` 由「棋種 + 顏色」共同決定：

  ```
  紅帥→乾 · 黑將→兌   （同為君位，陽剛 vs 陰柔）
  紅仕→坤 · 黑士→艮
  紅相→巽 · 黑象→巽
  ...
  ```
  需重新設計對映表並在 `pieces.ts` 加 `trigram` 的顏色分支。
- **C 案**：改用**梅花易數起卦**（見 A4），棋子只提供數字，卦由取餘數決定 → 8 卦天然全覆蓋。

**驗收**：測試斷言「窮舉所有 32×32 抽棋組合，64 卦全部可達」。

**涉及檔案**：`src/data/pieces.ts:24-36`、`src/services/divination.ts`
**工時**：1 天

---

### 🔴 A3 — 紅黑（陰陽）完全不影響卦象

**問題**
`computeHexagramIndex()` 只讀 `piece.trigram`，而 `trigram` 只由 `type` 決定。
**抽到「紅車」和「黑車」得到一模一樣的籤詩。** 顏色只出現在文案裡（「紅黑調和之象」），對占卜結果零影響。

象棋占卜最獨特的資產就是「紅黑對立」，目前完全浪費。

**修法**：與 A2 的 B 案合併處理，或讓顏色決定**動爻位置**（見 A4）。

---

### 🔴 A4 — 沒有動爻、變卦、互卦（缺少易占核心）

**問題**
目前只有「本卦」一個結果。但傳統六爻／梅花易數的解讀骨幹是：

```
本卦（現況） → 動爻（變化關鍵） → 變卦（結果） → 互卦（過程中隱藏因素）
```

沒有動爻，占卜就只是「抽一張牌」，缺少「事情如何演變」的時間軸——這正是使用者最想知道的。

**修法**（梅花易數正統起卦法）

```
上卦 = (數1) mod 8
下卦 = (數2) mod 8
動爻 = (數1 + 數2 + 時辰數) mod 6   ← 目前完全缺失
```

其中「數」可由棋子提供：`棋種序 × 顏色權重 + 抽取順序`。時辰數用地支（子=1…亥=12）。

新增輸出：
- **變卦**：本卦動爻陰陽反轉後的卦
- **互卦**：本卦 2/3/4 爻為下卦、3/4/5 爻為上卦
- **體用**：不含動爻者為「體」（自己），含動爻者為「用」（外在），以五行生剋判吉凶

這是投報率最高的命理升級：一次抽棋從「1 首籤詩」變成「本卦＋變卦＋互卦＋體用生剋」的完整卦例。

**涉及檔案**：新增 `src/services/liuyao.ts`、`src/data/hexagramLines.ts`（64 卦六爻陰陽表）、改 `useDrawDivination.ts` / `useBoardDivination.ts` / `reveal.tsx`
**工時**：3 天（含 UI）

---

### 🟠 A5 — 棋子五行與八卦五行互相矛盾（7 項中 4 項衝突）

| 棋子 | `pieces.ts` 標的五行 | 所配卦的本命五行 | 狀態 |
|---|---|---|---|
| 帥/將 | 土 | 乾 = **金** | ❌ 衝突 |
| 仕/士 | 土 | 坤 = 土 | ✅ |
| 相/象 | 木 | 巽 = 木 | ✅ |
| 車 | 金 | 坎 = **水** | ❌ 衝突 |
| 馬 | 火 | 震 = **木** | ❌ 衝突 |
| 炮/砲 | 火 | 離 = 火 | ✅ |
| 兵/卒 | 水 | 艮 = **土** | ❌ 衝突 |

同一顆棋在「位置解讀」用一套五行、在「卦象」用另一套，兩段文字會給出互相打架的建議。

**修法**：確立單一真相來源。建議 `wuxing` 由 `trigram` 推導（`乾兌金 離火 震巽木 坎水 艮坤土`），棋子原有的直觀五行改名為 `imageryElement`（意象五行）僅供文案使用，並在 UI 上標明區別。

**涉及檔案**：`src/data/pieces.ts`、`src/services/position.ts`
**工時**：0.5 天

---

### 🟠 A6 — 棋盤模式：擺放位置不影響卦象

**問題**
`useBoardDivination.interpret()`（`src/hooks/useBoardDivination.ts:75-77`）：

```ts
const pieces = placedPieces.map(pp => pp.piece);
const poem = selectPoem(pieces);   // ← col / row 完全沒用到
```

使用者辛苦拖曳擺位，位置只被拿去生成一段文字敘述（`positionSummary`），**對抽到哪首籤詩毫無影響**。把棋放在九宮還是角落，籤詩一模一樣。這讓「棋盤模式」名不副實。

**修法**：讓位置進入起卦。最自然的作法是位置決定**動爻**：

```
動爻 = (Σ(col + row × 9) + 時辰數) mod 6 + 1
```
再加上「上半盤／下半盤」決定體用主客。這樣棋盤模式才真正比抽棋模式更深。

**涉及檔案**：`src/hooks/useBoardDivination.ts`、`src/services/divination.ts`
**工時**：1 天（依賴 A4）

---

### 🟠 A7 — 五行生剋少了「生我」（印）一環

`src/services/position.ts:102-110` 只判斷四種情形，把「生我」誤併入「比和」：

```ts
} else {
  result.wuxingTip = `五行比和：${pieceWuxing}與方位同氣，穩定祥和。`;  // ← 生我也走這裡
}
```

五行關係應為五種：**比和／我生（洩）／生我（印）／我剋（財）／剋我（官殺）**。缺了「生我」等於漏掉「有貴人扶助」這個最正面的訊號。

同時 `posDir` 只取 `中/北/南` 三值（`position.ts:100`），**完全沒用到 `col`**，導致九宮外的所有格子在東西向上無法區分。棋盤方位應依傳統「上南下北、左東右西」，由 `col` 判東西、`row` 判南北，得出完整八方。

**涉及檔案**：`src/services/position.ts:96-118`
**工時**：0.5 天

---

### 🟡 A8 — 每日運勢的時區錯誤與內部不自洽

1. **時區 bug**：`divination.ts:161` 用 `toISOString().slice(0,10)` 取的是 **UTC 日期**。台灣 UTC+8，**每天 00:00–08:00 之間會顯示前一天的運勢**，且跨日換籤時間錯亂。應改用本地日期。
2. **不自洽**：`luckyPiece`、`luckyColor`、`luckyDirection`、`fortuneLevel`、`fortuneText` 五者各自獨立隨機，彼此無關。可能出現「幸運棋子＝兵（水）／幸運方位＝南（火）／幸運色＝紅（火）」這種水火相剋的組合。應先抽 `luckyPiece`，其餘由該棋的五行推導（生我方位為吉方、比和色為吉色）。

**涉及檔案**：`src/services/divination.ts:157-191`
**工時**：0.5 天

---

### 🟡 A9 — AI 解讀是空殼

`src/services/ai.ts:31-35` 的 `tryRemoteAPI()` 永遠 `return null`，實際跑的是把 `poem.vernacular` + `poem.story` 重新拼接的模板，**每次抽到同一首籤，「AI 解讀」的文字完全相同**，且不會真正回應使用者輸入的問題（只是把問題字串複述一遍）。掛「🤖 AI 智慧解讀」標題有過度承諾之嫌。

**修法（二選一）**
- **誠實版（低成本）**：改名「深度解讀」，移除 AI 字樣，強化模板（納入 A4 的變卦／體用資訊，依 `questionCategory` 切換語氣）。
- **真串接版**：接 Claude API（`claude-sonnet-5`），把卦象結構化資料（本卦/變卦/互卦/體用/五行）餵進去。需注意：金鑰不可放前端，須經 Expo Router API Route（`+api.ts`）代理，並加上快取與速率限制。

**涉及檔案**：`src/services/ai.ts`、（真串接版）新增 `src/app/api/interpret+api.ts`
**工時**：0.5 天（誠實版）／ 2 天（真串接版）

---

### 🟡 A10 — 死碼與邏輯不一致

- `selectSelfHexagramPoem()`（`divination.ts:152`）**從未被呼叫**，且其對映（乾→#1、坤→#2、坎→#29…文王序）與 `selectPoem` 的（先天序）互相矛盾——這正是 A1 的線索來源。應在修完 A1 後刪除。
- `selectPoemByHash()` 亦為死碼。
- `drawPiecesMixed(2)` 永遠回傳 `[紅, 黑]`，但 `generateDrawSummary()` 有 `'紅紅'` / `'黑黑'` 分支——抽棋模式下是死分支。
- 同上，抽 2 顆時**上卦恆為紅、下卦恆為黑**，這是隱含的系統性偏差，應明確設計而非副作用。

**工時**：0.25 天

---

## 二、UI／視覺設計稽核

### 🔴 B1 — 亮色主題實質上壞掉

專案有完整的 `LightTheme`，但全 App **散落 300+ 個硬編色碼**：

```
38  src/app/(tabs)/collection.tsx
36  src/app/reveal.tsx
29  src/components/PoemCard.tsx
25  src/components/ShareCardView.tsx
24  src/app/board.tsx
22  src/components/PieceDraw3D.tsx
...
```

`reveal.tsx` 的 `StyleSheet` 幾乎全是深色硬編（`#0D0A08`、`#F5EDE0`、`#3A2F25`），只有零星幾個 `View` 套了 `theme.*`。**切到亮色主題後，會出現淺色背景配淺色文字的不可讀畫面。**

`InkBackground`（全 App 每頁都用）更是完全硬編深色 `#0D0A08 / #1A1210 / #231A14`，亮色模式下整片背景仍是黑的。

**修法**
1. 把 `StyleSheet.create` 中所有顏色抽離，改為 `useMemo(() => makeStyles(theme), [theme])` 模式。
2. `InkBackground` 接收主題色。
3. 加一條 ESLint 規則或 Jest 測試，禁止 `src/app` 與 `src/components` 出現 `#RRGGBB` 字面量（白名單除外）。

**工時**：2 天（機械性但量大）

---

### 🟠 B2 — 「水墨棋風」定位與滿版 Emoji 互相衝突

主題文件寫「墨色、朱砂、金箔、宣紙」，但介面實際充斥系統 Emoji：

```
👑 🎓 🐘 🏰 🐴 💣 ⚔️   ← 首頁幸運棋子
🏺 誠心問道 · 🔮 揭露籤詩 · 🔄 重新抽取   ← 抽棋動畫
📍 📤 🏮 🎲 ♟️ 🏠 🤖 🔥
```

Emoji 是彩色點陣、跨平台外觀不一（Windows / iOS / Android 差異極大），與水墨質感嚴重衝突，也讓截圖分享卡失去質感。用 🐘 代表「相」、🏰 代表「車」在文化上也不準確。

**修法**：導入 `react-native-svg`，自製一套水墨風單色圖示（棋子用實際漢字＋圓形邊框即可，其餘用線條圖示）。`expo-symbols` 已安裝但未使用，原生端可考慮 SF Symbols，但跨平台一致性仍以 SVG 為佳。

**工時**：2 天

---

### 🟠 B3 — 沒有真正的漸層，質感天花板很低

`InkBackground` 的「漸層背景」是三個純色 `View` 用 `flex` 疊起來（`InkBackground.tsx:110-121`），會看到**明顯的三段色階硬邊**，不是漸層。

專案未安裝 `expo-linear-gradient`。水墨、金箔、宣紙這類質感高度依賴漸層與紋理，目前全靠純色方塊，這是視覺質感的主要瓶頸。

**修法**：安裝 `expo-linear-gradient`（SDK 57 相容版本），重寫 `InkBackground`；金色按鈕與籤詩卡加入細微金屬漸層；分享卡加宣紙紋理底圖。

**工時**：1 天

---

### 🟠 B4 — 版面完全不響應式

全專案 **12 處 `Dimensions.get('window')`、0 處 `useWindowDimensions()`**，且都在**模組載入時**取值：

```ts
const { width: SCREEN_WIDTH } = Dimensions.get('window');   // reveal.tsx:23
```

後果：
- 手機**旋轉後版面不會重算**（卡片寬度、棋盤位置全部錯位）
- **Web 視窗縮放無效**——這是已上線的 Vercel PWA，桌面瀏覽器縮放是常見操作
- 平板 / 桌面寬螢幕上，卡片被硬撐成 `SCREEN_WIDTH - 64`，出現超長行寬（可讀性差）

**修法**：全面改用 `useWindowDimensions()`；加入 `maxWidth: 560` 的內容容器；為 ≥768px 設計雙欄佈局。

**工時**：1.5 天

---

### 🟡 B5 — 書法字體只有 Web 有，原生端沒有

- `+html.tsx` 透過 Google Fonts 載入 Noto Serif TC → **只有 Web 生效**
- `_layout.tsx:21-23` 的 `useFonts` 只載入 `SpaceMono-Regular.ttf`——一個等寬英文字體，對中文書法 App 毫無用處，卻**阻塞了整個 App 的首次渲染**（`if (!loaded) return null`）
- `assets/fonts/` 內僅此一個檔案

原生 iOS / Android 上籤詩會用系統預設黑體顯示，與「書法質感」的定位落差很大。

**修法**：加入 Noto Serif TC 子集字重（完整中文字體檔很大，建議只打包籤詩用得到的字元子集，或用 `expo-font` 動態載入 + 字體載入前的優雅降級）；移除 SpaceMono。

**工時**：1 天

---

### 🟡 B6 — 多語系形同虛設

`i18n.ts` 有 87 個 key、支援 zh-TW / en / ja，但全 App 只有約 **40 處 `t()` 呼叫**，且分佈極不均（`ChessBoard.tsx`、`ChessPiece.tsx`、`Spinner.tsx`、`(tabs)/_layout.tsx` 是 **0 次**）。

更根本的是：**64 首籤詩、32 顆棋子說明、位置解讀、成就名稱全部只有中文**，沒有任何翻譯基礎建設。切成英文後，使用者看到的是「英文按鈕 + 中文內容」的破碎體驗。

**修法（二選一）**
- **收斂**：移除語言切換器，明確定位為繁中 App（誠實，且省下大量工作）
- **做完整**：籤詩資料加入 `i18n` 欄位，並補齊所有 UI 字串——工作量很大（64 首 × 10 欄位 × 2 語言）

建議先收斂，等產品驗證後再投資。

**工時**：0.5 天（收斂）／ 5 天以上（做完整）

---

## 三、動畫稽核

### 🔴 C1 — 抽棋動畫的結果卡與按鈕只有 15% 不透明度（明顯 bug）

`PieceDraw3D.tsx:407-435`——摘要卡與兩顆主要按鈕的 `opacity` 綁在 `ringOpacity` 上：

```tsx
<Animated.View style={[styles.summaryCard, { opacity: ringOpacity }]}>   // 407
<Animated.View style={[styles.actions,     { opacity: ringOpacity }]}>   // 422
```

而 `ringOpacity` 是「光環擴散」的動畫值，最終停在 **0.15**（`PieceDraw3D.tsx:187-192`）。
即抽棋完成後，**「🔮 揭露籤詩」按鈕與摘要文字永遠只有 15% 不透明度**，在深色背景上幾乎看不見。`reducedMotion` 分支也只設到 0.3。

這是整個占卜流程最關鍵的轉場點，卻是最不可讀的畫面。**應列為第一優先修復。**

**修法**：為結果區建立獨立的 `contentOpacity` 動畫值，在 `landed` 階段淡入到 1。

**工時**：0.5 小時

---

### 🔴 C2 — 裝了 Reanimated 4.5 卻完全沒用

```
=== reanimated 使用檔案 ===
src/app/_layout.tsx        ← 只有 import 'react-native-reanimated' 副作用引入
```

`react-native-reanimated@4.5.0` + `react-native-worklets@0.10.0` 已安裝，但**全專案 0 處實際使用**。所有動畫（`PieceDraw3D`、`PieceDrawAnimation`、`InkBackground`、`PoemCard`、`Spinner`）都用 legacy `Animated` API。

後果：
- 動畫跑在 **JS 執行緒**，載入籤詩、讀 AsyncStorage 時會**掉幀卡頓**
- `InkBackground` 有 15 個粒子在**每一頁**無限循環，其中透明度動畫用了 `useNativeDriver: true`（可上原生），但整個循環的排程與 `setTimeout` 仍在 JS 端，且**沒有在頁面卸載時停止**——多頁堆疊時會累積多份循環
- 無法做 `useAnimatedStyle` / `withSpring` 等宣告式動畫，也用不上 Reanimated 4 的 CSS 動畫與 Shared Element Transitions

**修法**：把 `PieceDraw3D`、`InkBackground`、`PoemCard` 遷移到 Reanimated 4；`InkBackground` 改用 `withRepeat` 並在 unmount 時 `cancelAnimation`。

**工時**：3 天

---

### 🟠 C3 — 3D 是假的：`perspective` 位置錯誤

`PieceDraw3D` 多處把 `perspective` 放在 `transform` 陣列的**最後一項**：

```tsx
transform: [
  { translateY: ... },
  { rotateY: bowlRotation },
  { perspective: 600 },      // ← 太晚了
]
```

RN 的 `transform` 是**依序套用**的矩陣乘法，`perspective` 必須在旋轉**之前**（陣列前面）才會對後續旋轉產生透視效果。目前的順序讓 `rotateY` 退化成扁平的水平壓縮——所謂「3D 立體翻轉」實際上只是寬度縮放，沒有立體感。

同時 `piece3DShine`（模擬光線的亮面）是靜態的半圓，翻轉時**不會跟著轉**，反而暴露了「這是平面」。

**修法**：`perspective` 移到陣列第一位；亮面改為隨 `rotateY` 連動的動畫值；棋子背面加獨立的 back-face（`backfaceVisibility: 'hidden'` + 兩層疊合）才是真正的翻牌效果。

**工時**：1 天

---

### 🟠 C4 — 動畫 effect 依賴陣列錯誤

`PieceDraw3D.tsx:214` 的 `useEffect(..., [])` 內部讀取了 `speed`（`useAnimationSpeed()`）與 `reducedMotion`（`useReducedMotion()`），但依賴陣列為空。

若使用者在設定頁改了動畫速度或系統的「減少動態效果」，**當前掛載的動畫仍用舊值**。同時 cleanup 只 `stop()` 了 `shakeSeq` 與 `bowl3D`，**棋子飛出、粒子爆散、光環擴散這三組動畫與 `setTimeout` 都沒有被清除** → 快速返回上一頁會觸發 unmounted component 的狀態更新。

**工時**：0.5 天

---

### 🟡 C5 — 頁面轉場單薄，缺少「儀式感」

`_layout.tsx` 全部使用預設 `slide_from_right` / `slide_from_bottom` / `fade`。占卜類 App 的核心體驗是**儀式感**，目前從「抽棋」到「揭曉籤詩」是一個普通的由下往上滑入，沒有任何過渡設計。

**可做的**（Reanimated 4 遷移後）：
- 棋子 → 籤詩的 **Shared Element Transition**（抽到的棋子飛入籤詩卡）
- 籤詩卡「捲軸展開」效果（目前 `PoemCard` 有動畫但仍是淡入位移）
- 揭曉瞬間的墨滴擴散遮罩轉場

**工時**：2 天

---

### 🟡 C6 — 兩套抽棋動畫並存

`PieceDrawAnimation.tsx`（288 行）與 `PieceDraw3D.tsx`（575 行）功能重疊。需確認前者是否仍被引用，若否應刪除，避免維護兩份。

**工時**：0.25 天

---

## 四、工程體質

| 項目 | 現況 | 建議 |
|---|---|---|
| 測試覆蓋 | 20 個測試，只涵蓋 `divination` / `pieces` / `poems` 資料層 | 補 `hexagram`（A1 迴歸）、`position`、`storage`、`achievements` |
| 錯誤處理 | 多處 `try {} catch {}` 空吞（`reveal.tsx:53,96,102`） | 至少 `console.warn`，避免靜默失敗 |
| 型別 | `router.replace('/(tabs)' as any)`（`reveal.tsx:199`） | 開啟 typed routes 消除 `as any` |
| 依賴 | `expo-symbols` 已裝未用 | 為 Expo SDK 57 內建依賴，非直接安裝，無法單獨移除 |
| 無障礙 | 有 `reducedMotion`，但 `accessibilityLabel` 稀疏 | 補齊互動元件的標籤與 `accessibilityRole` |

---

## 五、開發計劃

> 排序原則：**先修正確性 → 再修可讀性 → 才做新體驗**。
> 命理錯誤會直接摧毀產品可信度，優先於任何新功能。

### Phase 0 — 緊急修復（1 天）

| # | 任務 | 檔案 |
|---|---|---|
| 0.1 | **C1** 抽棋結果按鈕透明度 bug | `PieceDraw3D.tsx:407,422` |
| 0.2 | **A8-1** 每日運勢 UTC 時區 bug | `divination.ts:161` |
| 0.3 | **C4** 動畫 effect 依賴與 cleanup | `PieceDraw3D.tsx:64-214` |

**驗收**：抽棋完成後按鈕清晰可見；台灣時間 00:30 開 App 顯示當日運勢；快速返回無 warning。

---

### Phase 1 — 命理正確性重建（1 週）

| # | 任務 | 依賴 |
|---|---|---|
| 1.1 | **A1** 建立先天序→文王序映射，修正 `selectPoem` | — |
| 1.2 | **A1** 新增 `hexagram.test.ts` 迴歸測試（64 卦全驗） | 1.1 |
| 1.3 | **A2 + A3** 重新設計棋子→卦對映，納入紅黑，補足兌卦 | 1.1 |
| 1.4 | **A5** 統一五行真相來源 | 1.3 |
| 1.5 | **A7** 五行五種關係補齊 + 八方位判定用上 `col` | 1.4 |
| 1.6 | **A10** 刪除死碼 `selectSelfHexagramPoem` / `selectPoemByHash` | 1.1 |
| 1.7 | **A8-2** 每日運勢五行自洽 | 1.4 |

**驗收**：
- 測試斷言「窮舉 32×32 抽棋組合，64 卦全部可達」
- 測試斷言「每組上下卦回傳的籤詩卦名與該組合一致」
- 手動：抽到坤上坤下 → 顯示「坤為地」而非「火水未濟」

---

### Phase 2 — 命理深度：六爻系統（1.5 週）

| # | 任務 |
|---|---|
| 2.1 | 建立 `hexagramLines.ts`（64 卦六爻陰陽表） |
| 2.2 | **A4** `liuyao.ts`：動爻、變卦、互卦、體用生剋 |
| 2.3 | **A6** 棋盤模式位置 → 動爻（讓擺位真正有意義） |
| 2.4 | `reveal.tsx` 新增「本卦 / 變卦 / 互卦」三卦展示區與卦象圖（六爻線條） |
| 2.5 | **A9** AI 解讀誠實化 or 串接 Claude API（經 `+api.ts` 代理） |

**驗收**：一次占卜產出完整卦例（本卦＋動爻＋變卦＋互卦＋體用判斷）；棋盤模式擺不同位置得到不同動爻。

---

### Phase 3 — 主題與版面（1 週）

| # | 任務 |
|---|---|
| 3.1 | **B1** 全面移除硬編色碼，改 `makeStyles(theme)`（最大宗，可分檔漸進） |
| 3.2 | **B1** 加入「禁止硬編色碼」的 lint / 測試守門 |
| 3.3 | **B4** `Dimensions.get` → `useWindowDimensions`，加 `maxWidth` 容器 |
| 3.4 | **B4** ≥768px 寬螢幕雙欄佈局（Web / 平板） |

**驗收**：亮色主題全頁面可讀；瀏覽器縮放與手機旋轉版面正確；桌面不再出現超長行寬。

---

### Phase 4 — 視覺質感升級（1.5 週）

| # | 任務 |
|---|---|
| 4.1 | **B3** 導入 `expo-linear-gradient`，重寫 `InkBackground` |
| 4.2 | **B2** 導入 `react-native-svg`，替換所有 Emoji 為水墨風圖示 |
| 4.3 | **B5** 原生端書法字體（Noto Serif TC 子集），移除 SpaceMono |
| 4.4 | 分享卡加宣紙紋理與卦象圖，配合 Phase 2 新增變卦資訊 |

---

### Phase 5 — 動畫重製（1.5 週）

| # | 任務 | 狀態 |
|---|---|---|
| 5.1 | **C2/C3** `PieceDraw3D` 重製：真透視、真翻面、Reanimated worklet | ✅ |
| 5.2 | **C2** `InkBackground` 遷移 Reanimated 4 + `withRepeat` + unmount 取消 | ✅ |
| 5.3 | **C5** 墨滴擴散遮罩轉場 + 棋子飛入動畫（`InkSplashOverlay` + `PieceEntryFlyIn`） | ✅ |
| 5.4 | 驗證：TypeScript + Jest（75 全過）+ web build（15 routes） | ✅ |

---

### 時程總覽

```
Phase 0  緊急修復        1 天      ← 立即
Phase 1  命理正確性      1 週      ← 最高價值
Phase 2  六爻系統        1.5 週    ← 產品差異化
Phase 3  主題與版面      1 週
Phase 4  視覺質感        1.5 週
Phase 5  動畫重製        1.5 週
──────────────────────────────
合計                     約 7 週
```

**若時間有限，只做 Phase 0 + 1**（約 6 個工作天）——這兩階段解決的是「App 給出的答案是錯的」，其餘都是體驗優化。

---

## 六、實作注意事項

- **Expo SDK 57**：依 `AGENTS.md`，動工前務必查閱 https://docs.expo.dev/versions/v57.0.0/ 的對應版本 API，特別是 `expo-linear-gradient`、`react-native-svg`、`expo-font` 的相容版本，一律用 `npx expo install` 安裝以取得正確版本。
- **Reanimated 4**：需要 `react-native-worklets`（已安裝）與 babel plugin 設定，遷移前先確認 `babel.config.js`（目前專案根目錄未見此檔，需確認 Expo 預設設定是否已涵蓋）。
- **Phase 1 是破壞性變更**：修正卦序後，`AsyncStorage` 中的歷史記錄 `poemId` 會與新邏輯不一致。需寫資料遷移，或在記錄上標記 `engineVersion`，舊記錄沿用舊顯示並加註「依 v1 卦法」。
- **API 金鑰**：若做 A9 真串接，金鑰必須放伺服器端（Expo Router API Route + EAS 環境變數），絕不可進前端 bundle。

---

## 七、已完成變更記錄

### Phase 0（2026-08-02）

| 項目 | 變更 |
|---|---|
| C1 | `PieceDraw3D` 新增獨立的 `contentOpacity`，摘要卡與按鈕改由它淡入到 1，不再繼承光環的 0.15 |
| A8-1 | 新增 `src/services/date.ts`，統一以當地日期取代 `toISOString()` |
| C4 | `PieceDraw3D` 的動畫 effect 改為依賴 `[speed, reducedMotion]`，並完整追蹤／清除所有動畫與計時器 |

**C4 的實際嚴重性高於原稽核**：`useAnimationSpeed` 與 `useReducedMotion` 都是掛載後才非同步取值，而 effect 依賴陣列為空 —— 代表「動畫速度」設定與「減少動態效果」無障礙偏好**對抽棋動畫從未生效過**，並非只是「設定變更時不更新」。

**A8-1 的範圍也大於原稽核**：UTC 日期問題同時存在於 `divination.ts`（產生運勢）、`storage.ts`（判斷運勢是否過期）與 `achievements.ts`（連續使用天數，4 處）。只修其中一處會讓兩邊換日時間不一致，反而更難察覺。

### Phase 1（2026-08-02）

| 項目 | 變更 |
|---|---|
| A1 | 新增 `src/services/hexagram.ts`，由 `poems.ts` 的卦名自動推導「先天序 → 文王序」對照表 |
| A2/A3 | `pieces.ts` 改為由「棋種 + 顏色」共同決定卦，八卦全覆蓋，紅黑互為錯卦 |
| A4 前置 | `computeHexagram()` 回傳 `HexagramResult`，抽三顆時計算動爻（Phase 2 消費） |
| A5 | 棋子拆為 `guaElement`（卦氣五行，生剋依據）與 `imageryElement`（意象五行，文案用） |
| A7 | `position.ts` 補齊五行五種關係，新增 `getBoardDirection()` 依 col/row 判八方位 |
| A8-2 | 每日運勢改為以當日之卦起卦，等級／方位／顏色／數字皆由卦氣五行推導 |
| A10 | 刪除 `selectSelfHexagramPoem`、`selectPoemByHash`、`drawPiecesMixed` |
| 相容性 | `DivinationRecord` 新增 `engineVersion`，舊記錄不改寫，reveal 頁標註「依舊版卦法」 |

**抽棋改為「抽出後放回」**：原本 `drawPiecesMixed` 強制回傳 `[紅, 黑]`，上卦恆紅、下卦恆黑，是隱含的系統性偏差。改為每次獨立從 32 顆抽取後：

- 64 卦全部可達（不放回的話，乾為天需兩顆紅帥、坤為地需兩顆黑將，將永遠抽不到）
- 雙紅／雙黑／紅黑相雜成為真實訊號，`generateDrawSummary` 中原本的死分支變成有效解讀
- 副作用：`PieceDraw3D` 的 React key 需帶上索引（同一顆棋可能重複出現）

**測試**：新增 `hexagram.test.ts`（含窮舉 32×32 抽棋必須覆蓋全部 64 首籤詩）、`position.test.ts`、`date.test.ts`，並改寫 `pieces.test.ts`。合計 20 → 49 個測試。

### Phase 2（2026-08-02）

| 項目 | 變更 |
|---|---|
| 2.1 | `hexagram.ts` 新增六爻推導：`trigramLine` / `hexagramLines` / `trigramsFromLines` / `lineName` |
| 2.2 | 新增 `liuyao.ts`：動爻、變卦、互卦、體用生剋（五種關係，各有吉凶等級與斷語） |
| 時辰 | `date.ts` 新增 `hourBranchNumber()`，子時橫跨半夜的邊界已處理 |
| 2.3 | **A6 解決**：棋盤各棋子的格位數總和參與動爻計算，擺位真正影響卦象 |
| 2.4 | 新增 `HexagramLines`（六爻線條圖）與 `LiuYaoPanel`（三卦並列 + 體用），接入 reveal 頁 |
| 2.5 | `ai.ts` → `interpretation.ts`，移除 AI 字樣，解讀納入三卦與體用，並依所問類別給出對應面向 |

**2.1 比原規劃簡單**：原本計劃建一份 64×6 的六爻對照表（`hexagramLines.ts`），實作時發現不需要——先天卦序的編號本身就是該卦的爻象（以陽為 0、陰為 1，自下而上為第 4、2、1 位元），六爻可由卦號直接位運算推得。少了一份需要人工維護、且容易打錯的靜態資料。

**動爻公式**：`(上卦數 + 下卦數 + 其餘數 + 時辰數) mod 6`，得 0 為上爻，依梅花易數。時辰是必要參數——同樣的棋在不同時辰起卦，變化的關鍵所在本就不同。副作用是 `computeHexagram` 變成時間相依，故每日運勢改為傳入由日期推得的固定時辰，維持整日一致。

**2.5 的取捨**：採「誠實版」而非串接語言模型。舊版 `tryRemoteAPI()` 永遠回傳 `null`，實際跑的是模板拼接卻標示為「🤖 AI 智慧解讀」，屬過度承諾。現正名為「深度解讀」，並在檔頭與 i18n 註明其為規則式推導。若日後要接真正的模型，金鑰必須經 API Route 代理。

**起卦引擎版本升至 v3**。v2 記錄的卦序正確但缺動爻資料，reveal 頁會退回顯示單一本卦；`isLegacyRecord()` 仍只針對卦序有誤的 v1，不將 v2 誤標為舊卦法。

**測試**：新增 `liuyao.test.ts`，含六爻推導對照傳統卦象（屯卦爻象、屯之互卦為山地剝）、變卦僅差一爻且可逆、體用五種關係全可達、A6 迴歸（位置必須改變動爻）。49 → 71 個測試。

### Phase 3（2026-08-02）

| 項目 | 變更 |
|---|---|
| B1 | 新增 `useThemedStyles`，全部 20 個元件與頁面改為 `makeStyles(theme)` 模式 |
| B1 | 新增守門測試 `theming.test.ts`，禁止 UI 檔案出現色值字面量 |
| B4 | 新增 `useLayout`，全面改用 `useWindowDimensions`，`Dimensions.get` 歸零 |
| B4 | 內容限寬 560px 並置中，平板／桌面不再出現超長行寬 |
| C6 | 移除死碼 `PieceDrawAnimation.tsx`（288 行，無任何引用） |

**硬編色碼從 300+ 降到 0**（守門測試允許的四個檔案除外）。

**刻意不主題化的部分**，各有理由，集中於具名色盤常數：

- `PaperSurface` — 籤詩卷軸是「宣紙」意象，紙面與墨字在明暗主題下都該維持紙色。深色主題下呈現為暗底上的一卷淺色紙，正是預期效果。
- `ShareCardPalette` — 分享卡是匯出成圖片的成品，不是介面。若跟隨主題，同一張卡在不同使用者手上會長得不一樣。
- `FallbackPalette` — `ErrorBoundary` 是 class component，且可能在 `ThemeProvider` 本身崩潰時才被觸發，不能依賴主題 context。
- `LevelColors` / `FolderColors` / `Highlight` — 語意化資料色盤與純白高光，與佈景無關。

**新增的主題欄位**：`boardBg` / `boardLine` / `boardText`（棋盤在兩種主題都是木色，僅深淺不同）、`goldSoft` / `goldFaint`（選取態與可放置提示的半透明強調色）。

**順帶修掉的既有缺陷**：

- `PoemCard` 與 `PieceDraw3D` 同樣有「`useAnimationSpeed` 非同步取值但 effect 依賴為空」的問題，動畫速度設定對捲軸展開動畫也從未生效，已一併修正並補上 cleanup。
- `InkBackground` 的粒子動畫原以遞迴 `start()` 無限循環且從未在卸載時停止，多頁堆疊會累積多份循環持續佔用 JS 執行緒；已改用 `withRepeat` 式的 `Animated.loop` 並在 unmount 時取消。
- `stats.tsx` 自行維護了一份與 `getLevelColor` 不一致的等級色表（中吉一個是 `#6B9B6B`、一個是 `#8AB87A`），已統一。

### Phase 4（2026-08-02）

| 項目 | 變更 |
|---|---|
| B3 | 安裝 `expo-linear-gradient`，`InkBackground` 三段式純色改為真漸層 |
| B2 | 安裝 `react-native-svg`，建立 32 款水墨風 SVG 圖示元件 |
| B2 | 全 App 的彩色點陣 Emoji 歸零，改為單色 SVG 圖示（導覽、類別、動作、狀態、模式） |
| B2 | 象棋棋子圖示改用漢字在圓形中（帥仕相車馬炮兵），取代文化上不準確的 👑🎓🐘🏰🐴💣⚔️ |
| B2 | 新增卦象 SVG 元件（`TrigramGlyph`、`HexagramGlyph`），供分享卡使用 |
| B5 | 移除 `SpaceMono` 英文字體及其阻塞 App 載入的行為；原生端改為系統字體後備（**只做了一半**：載入拔掉了，`assets/fonts/SpaceMono-Regular.ttf` 這 92 KB 卻留在 repo 跟著原生 build 打包，Session 36 才真的刪掉並補上字型孤兒守門） |
| 4.4 | `ShareCardView` v2：加入六爻卦象圖與變卦/體用資訊，宣紙紋理裝飾，SVG 圖示 |

**4.2 取代範圍**：12 個檔案（首頁、導覽、抽棋、棋盤、籤詩、揭曉、設定、收藏、成就、引導、圖鑑、錯誤邊界），共約 80 處 Emoji → SVG 圖示。

**圖示設計原則**：24×24 視埠、1.6px 筆觸、`strokeLinecap="round"`，與墨色/金箔風格一致。每個圖示接受 `color` prop 跟隨主題。

**字體策略**：Web 仍經 `+html.tsx` 載入 Google Fonts 的 Noto Serif TC。原生端不再阻塞在無用的 SpaceMono 載入上，籤詩字體宣告為 `fontFamily: 'Noto Serif TC, KaiTi, STKaiti, serif'`，原生端自動後備至系統楷書或襯線體。完整中文書法字體需子集化（籤詩用字僅約 800 個不重複漢字），留待日後處理。

**測試**：theming.test.ts 白名單新增三個圖示檔案。75 測試全過。

### 尚未處理

技術面已無剩餘程式待辦；其餘皆卡在外部資源（帳號／裝置／付費），完整清單見
`WORKLOG.md` 的「未來待辦」。

- ~~**拖曳落子沒有作用**~~ ✅ 兩道關卡分兩輪修完。
  **Session 40（事件層）**：Web 在 pointerdown 後暫時把 pointermove／pointerup／
  pointercancel 監聽掛到 document，故指標離開棋子後仍能結束拖曳並以 `clientX/Y`
  落到正確格，`onDragEnd` 因此會觸發。
  **Session 41（狀態層）**：`placePieceOnBoard` 原本只認 `selectedPiece`，拖曳
  沒有「先選取」這一步，未先點選時仍在第一行就 return；改為
  `placePieceOnBoard(col, row, piece?)` 取 `piece ?? selectedPiece`，
  順帶修掉「已選 A 再拖 B 會放下 A」。端對端測試**刻意不先點選**直接拖
  （先點會讓測試自己滿足前提，壞掉也照樣通過）。
  原生端仍保留既有 PanResponder，是否同樣正常留待實機確認。

Session 38、37 各留下的一項已於 Session 39 結案：

- ~~`summarizeReading()` 是死碼~~ ✅ 刪除。「供分享與離線解讀使用」的兩個用途早已
  分別由 `formatDivinationShareText()` 與 `interpretation.ts` 做完且更完整，
  接上去只會多一份沒有 i18n 的重複內容。旺衰不變量改測 `reading` 本身留下。
- ~~棋盤頁的棋子池位置~~ ✅ 側置到棋盤右側（`computeBoardTray()`）。「需重構才能做」
  的估計高估了：棋盤與棋子池本來就是同一個容器的兩個子節點，把容器改成 row 即可，
  `screenToGrid` 原地不動。門檻 720 沿用既有的容器上限，沒有動到任何既有寬度。

### 刻意不做（已釘住理由，不要重開）

- **文王卦的應期與親屬關係斷語**——前者起卦只到日柱，推到時辰等於編日期；
  後者 App 沒有問卜者與對象的關係輸入（Session 26 重新檢視後維持此界線）。
- **《周易》爻辭原典 384 條不翻譯**——翻經文是另一種工作（Wilhelm、Legge、Lynn
  各成一本書），不該由這個 App 自己動手，更不該讓機器翻。三種語言下維持原文，
  有 `divinationProse.test.ts` 守著（Session 38）。
- **資料值字面量不翻譯**——五行、六親、吉凶等級、卦名會存進記錄並被比對，
  且納甲盤上就以漢字印著；譯掉會讓斷語與盤面對不起來。
- **棋盤頁不套雙欄**——內容不足一屏，沒有「憑據被捲走」的問題，且側欄會截斷
  問事類別列，而 720px 單欄寬度的存在理由正是不讓它被截斷（Session 37，有 e2e 釘住）。
- **A24 卦象機率不均維持現狀**、**A23 日干支不改時區**——理由見 `pieces.ts`
  與 `sexagenary.ts` 的註解，兩者都有守門測試。

### 已完成（原「尚未處理」項目）

- ~~寬螢幕雙欄佈局（3.4）~~ ✅ Session 37（揭曉頁）。「需要重新設計資訊層級」這句話是對的：
  真正要解的不是留白，是**憑據與結論被垂直距離拆散**——讀到最下面的解讀時六爻盤早已捲出畫面。
  故主欄放解讀、側欄放六爻盤並 sticky。
- ~~棋盤模式無法組出乾為天／坤為地~~ ✅ Session 24 加「允許重複棋子」開關。
- ~~原生端書法字體子集化~~ ✅ Session 27（Noto Serif TC 子集 1.2MB + JP 補新字體）。

#### 四路審查未修項（Session 32 提出，Session 33–35 全部結案）

Session 32 修掉「線上壞掉」與「靜默毀資料」兩層後留下 25 條，Session 33
清掉 8 條，Session 34 再清掉 16 條（含 2 條判定為維持現狀並把理由釘成
測試），Session 35 清掉最後的 A25。25 條全數結案。詳細說明見 WORKLOG
「未來待辦」。

**已結案（Session 33）**：A5 設定寫入序列化、A9 無障礙標籤與觸控目標、
A13 隨機籤詩捲動、A14 等級配色、A15 收藏頁搜尋、A18 all_levels 成就、
A19 負數延遲。

**已結案（Session 34）**：

- **A2** 通知處理器由 `_layout` 掛上，並補通知點擊導頁（含冷啟動）與畫面白名單
- **A10** 抽棋頁真的讀 `pieceCountPreset`（標為建議選項），設定頁補上動畫速度 UI
- **A22** 用神兩現改優先取發動之爻，回頭生剋與進退神才會被檢查
- **A8** `InkSplashOverlay` 接上 reducedMotion（跳過時仍通知父層完成）
- **A3** 資料夾／自訂類別加刪除墓碑（`deletedFolderIds`／`deletedCategoryKeys`）
- **A4** 雲端那份改存聯集（1000 筆），本機仍 500；payload v3 不再重複夾帶
  收藏副本，伺服器上限 512KB → 1MB
- **A6** 同步失敗改為具名原因；並修掉「下載失敗仍上傳」會抹平雲端聯集的路徑
- **A7** 主題文字色全面套用 WCAG AA 4.5:1（判準改以最暗的文字底色 bgMedium
  為準），根源的 `gold` 一色兩用拆開：52 處文字改用 `textGold`，`gold`
  留給底色與邊框；另修掉金色 CTA 按鈕文字只有 3.04:1
- **A16** 三處儲存失敗補 catch（抽棋不再卡在「解讀中…」、回填與收藏會告知）
- **A17** 統計「本週／本月」改日曆週期，並夾住未來時間戳
- **A20** `buildBackup` 逐鍵降級，壞鍵記進 `skippedKeys`
- **A21** ErrorBoundary 加「前往設定」逃生出口
- **A11** 空白名稱改為明確不可用；姓名 trim 並限長
- **A12** web 的 `lang` 依設定補正、`theme-color` 跟隨系統與 App 主題
- **A23 判定為不宜照做**：日柱、時辰、月建取自同一個裝置本地時鐘是刻意的
  （傳統起卦以問卜者當下所在時間為準），只把日柱改成台北時間會讓卦盤
  自身不自洽。已寫明理由並以「同一個時鐘」守門測試釘住

**A1 為誤判已刪除**：react-native-web 0.21 的 `PressResponder.onClick` 本來
就會 `stopPropagation()`，巢狀 Touchable 不會連鎖觸發；結論以真瀏覽器
e2e（`e2e/nestedPress.spec.ts`）釘住。

- **A24 決定維持現狀**：卦象機率不均來自棋盤組成（一支帥 vs 五個兵）
  而非抽取偏差。取「忠於棋盤實際子數」，理由與日後改動的代價寫在
  `pieces.ts`，並以分佈守門測試釘住。

**已結案（Session 35）**：

- **A25** 分享卡離屏截圖三層處理：拿掉 `opacity: 0`（與離屏定位重複且是
  風險來源）、加空白截圖偵測（`shareCapture.ts`，低於門檻改走文字分享
  降級）、補 `aria-hidden` 修掉讀屏雙重播報。守門測試含注入迴歸。
  「實機確認分享圖片有內容」隨下方實機測試一併驗證。
- 平台/UI 一路全清：TrendChart 畫出中性/凶分佈、棋盤 90 格無障礙標籤、
  成就進度環改 SVG 弧線、InkSplashOverlay 改走 useViewport、web 提醒
  文案、深色主題類別 chip 隱形（F 系列）等
- 資料流五條：資料夾操作與同步合併走寫入佇列、自訂類別改佇列合併、
  清除歷史連帶取消占驗提醒（含孤兒）、占驗/收藏補錯誤處理
- 命理三條：月破不暗動、用神入局必須真的在局中、分享卡卦象索引越界防線
- 測試品質：守門測試補反空轉自我檢查、i18nCoverage 擴到 hooks（當場抓到
  兩支 hook 直接 import `t` 不訂閱語言變更）、通知函式補 14 則測試、
  字型子集重建補上 5 個新字形

### Session 36 — 孤兒資產與死翻譯鍵（8/27）

四路審查掃的是「行為對不對」，沒查過「已經沒人用的東西還在不在」。
這輪補掃，找到兩類並各補一條守門：

- **孤兒字型檔**：B5 只拔掉 `SpaceMono` 的載入、沒刪檔，92 KB 仍跟著
  每個原生 build 打包。刪檔並加「字型資產孤兒守門」——`assets/fonts`
  底下每個字型檔都必須有人在 `src`／`scripts`／`app.json` 裡指名
- **死翻譯鍵**：404 個鍵裡 7 個沒人用（多是改版時換了更好的鍵、舊鍵沒刪）。
  真正的代價是誤導——`settings.syncPartial` 會讓人以為同步有「部分成功」
  狀態，其實狀態表裡沒有。刪鍵並在 `i18nCoverage.test.ts` 補反方向守門
  （原本只守「畫面不准硬編中文」）；動態組出的鍵走前綴白名單，
  每條都要註明是誰組的
- **順帶**：反向守門第一版注入驗證**紅不起來**——`usageText()` 掃到
  `__tests__`，註解裡舉的死鍵例子把它自己餵飽了。修法是排除 `__tests__`
  並先剝註解。這條記在這裡，因為它正是「新守門一律做注入迴歸」的理由

### Session 37 — 揭曉頁雙欄（8/27）

`SplitReading` 元件 + `useLayout` 的 `split` 配置：主欄放要一路讀下去的解讀，
側欄放查證用的六爻盤並在捲動時固定。斷點 1160（高於 desktop 的 1024——
1024 分欄後主欄會壓在可讀行寬下緣，兩欄都不好讀）；側欄固定 340px。

`split` 刻意與網格的 `columns`／`gridWidth` 分開：後者給同質卡片網格，
前者給異質的閱讀版面，共用會把籤詩切成跟六爻盤一樣寬的窄柱。

**棋盤頁原本也做了，截圖後改回單欄**——它的內容在 900px 視窗下幾乎不用捲，
本功能要解的問題在那頁不存在；而側欄會截斷問事類別列，牴觸
`board.tsx` 裡「放寬到 720 就是為了不讓類別列被截斷」的既有決定。
教訓：留白是症狀不是病，而這件事單元測試看不出來，是截圖看出來的。

sticky 以 e2e 注入迴歸驗證（改成 relative 後，紅的正是「捲動後側欄仍在視窗內」
那條斷言）——它能不能生效取決於捲動祖先、`alignItems: 'flex-start'`、
以及 RN 型別不認得的 `'sticky'` 有沒有真的傳到 DOM，三件都只有真瀏覽器知道。

### Session 38 — 六爻散文翻譯（8/27）

Session 35 把這條估成「需另立術語表」而擱置，實際清點發現那是把三堆混在一起算：
《周易》爻辭原典 384 條、資料值字面量 148 條、專案自撰散文 57 條。
只有第三堆該翻，而且不難。

- `data/translations/divination.ts` + `localizeProse(key, fallback, params?)`，
  沿用籤詩那套「中文在服務裡當真相來源、en/ja 在資料層」的分工
- **術語保留漢字、只翻連接文、英文首見加註**：納甲盤上就印著 `妻財`／`世爻`，
  斷語譯成 Wealth 會讓兩處對不起來
- 經文與資料值維持原文，邊界釘進 `divinationProse.test.ts`（含注入驗證）
- **清點時我自己漏了一整塊**：第一輪只掃單引號字串、沒掃樣板字串，
  而文王卦那份逐條理由全是樣板組的。是英文截圖看出來的，不是測試

順帶發現 `summarizeReading()` 是死碼（註解說供分享用，實際只有測試呼叫），
未翻並列入待辦，不順手刪。

#### 外部資源／產品決策（與 WORKLOG 同步）

- Vercel 加 `DEEPSEEK_API_KEY`（AI 解讀最後一步；前端已會降級）
- iOS/Android 實機測試（Expo Go）→ EAS Build → 上架（App Store $99/年、Google Play $25）→ 自訂域名。實機時一併確認分享圖片有內容（A25 防線的現場驗證）
- ~~**待產品決策**：LiuYaoPanel 的六類命理散文~~ ✅ Session 38 結案。
  57 條自撰散文已翻成 en/ja（術語保留漢字、只翻連接文、英文首見加註）；
  384 條《周易》爻辭原典與 148 條資料值字面量維持原文，理由與邊界
  釘在 `divinationProse.test.ts`

### Session 43 — 靈棋補成完整占卜模式（8/31）

Session 42 的靈棋原型已掛上首頁卻只有擲卦沒有卦辭。本次以《靈棋經》原典
（維基文庫，公有領域 PD-old）補齊 125 卦目，經 `scripts/build-lingqi-oracles.mjs`
逐字解析成 `src/data/lingqiOracles.ts`。

**吉凶等級刻意不生成**——原典未載，不代為補寫。這條決定往外推成
`recordHasLevel()` 閘門：統計的吉凶分佈與占驗簿的依等級應驗率都排除靈棋，
但總次數、依模式應驗率、歷史、收藏、占驗回填都照計。邊界釘在 `lingqi.test.ts`。

**原文更正全部列名可稽核**（`OCR_FIXES`）：三處破折號是「一」的誤認、
三處衍字（判準是七言絕句的句長）、一處來源自己標成 `XX` 的闕字改標為 `□□`
而不臆補。解析器另認七類版式變體（「許曰」「又」「又曰」、五種標點、
頓號分隔的方位、維基模板），每一類不處理都會靜靜地少字或多字。

**接線時的隱形坑**：`localizedPoemTitle(record.poemId)` 對 poemId 0 會走
`getPoemById` 的 fallback 回傳籤詩 #1，每一筆靈棋記錄都會印成「龍騰九霄」
且看起來完全正常。新增 `recordTitle()` 當唯一入口，靜態守門改寫並做注入驗證。

**版面問題仍是截圖看出來的**：17 條單元測試與 8 條 e2e 全綠之後，
才看到類別膠囊一行只排兩個——整欄套了 `contentWidth` 被夾成 256px。
這是同一條教訓的第三次（Session 37、39、43）。

### Session 44 — 靈棋的收藏與分享（8/31）

Session 43 之後靈棋比揭曉頁少收藏、分享、AI 解讀三樣。本次補前兩項。

分享文字另立 `formatLingqiShareText()`——籤詩版的標題含吉凶等級，靈棋沒有，
共用會分享出「 · 明陽卦」與一行空的「抽得：」。

分享卡修掉兩個「不報錯、只默默印錯」的地方：空等級標籤改為有等級才畫；
底部模式的 `mode === 'draw' ? ... : ...` 改成對照表（與 collection.tsx 同一式子，
Session 43 漏了這處）。

**新教訓**：靜態守門若在註解裡舉出被禁的寫法，會把自己餵成紅燈——
與 Session 36 被餵成綠燈同源。**靜態守門一律先剝註解再比對。**

**仍未做**：靈棋的 AI 深度解讀（產品決策：要不要有、提示詞怎麼設計）。

### Session 45 — 依占卜模式的應驗率接上畫面（8/31）

`accuracyByMode()` 有匯出、有測試卻無人呼叫，是 `accuracyBy*` 家族唯一沒接上
統計頁的一支；功能清單卻寫著它。與靈棋原型同一種毛病——**做好了、測試綠，
就是沒接到畫面上**，而單元測試對此無感。

順帶修掉它的預設標籤 `k === 'draw' ? '抽棋' : '棋盤'`：靈棋會被標成棋盤，
分項表上多出一組冒充別人的資料。改成對照表，認不得的鍵回傳原鍵。

**兩個過程中的判斷**：

- 差點把三處的模式標籤併成一張共用鍵表，發現它們用的是不同標籤集
  （收藏卡短標、分享卡長標、統計頁短標）才撤回。**併之前先確認三處要的
  真的是同一組字。**
- e2e 第一版用 `locator('div').filter(...)` 猜 DOM 形狀定位整節，三條紅兩條。
  改為替六個分項區塊加 testID。**版面測試不要猜 react-native-web 的巢狀結構。**

### 未來功能構想（未排期）

#### 兩軍對壘陣（Session 42 提出）

傳統象棋占驗裡，「布陣」還有比三才法更字面的玩法：紅黑雙方各布一陣，
看楚河漢界兩側的強弱消長——紅為我方、黑為對方，最適合問對立型問題
（感情雙方、競爭、官司）。現行棋盤模式五種牌陣都是三子結構
（`useBoardDivination` 硬編 `maxPieces = 3`），沒有這個模式。

- **玩法草案**：每方各擺 3 子（共 6 顆），落子限制在己方半場；
  解讀層加一段兩軍強弱對比（子力、方位、生剋），起卦結構二選一——
  「上卦＝紅方陣、下卦＝黑方陣、動爻＝雙方子力差」，或維持既有引擎
  只把六子合卦。
- **需要的改動**：`maxPieces` 從常數改成依牌陣可變；起卦輸入要能
  區分紅黑兩組；棋盤要能限制落子半場並顯示兩軍分界。
- **動工前要決定的**：起卦結構（兩陣各成一卦 vs. 六子合卦）；
  是否沿用「允許重複棋子」開關。守門測試一併補上。

