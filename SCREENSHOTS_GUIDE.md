# 象棋占卜 — 螢幕截圖準備指南

## 上架所需尺寸

### Apple App Store (iPhone)
| 尺寸 | 機型 | 數量需求 |
|------|------|----------|
| 1290×2796 | iPhone 16 Pro Max (6.9") | 至少 3 張 |
| 1179×2556 | iPhone 16 Pro (6.3") | 至少 3 張 |
| 1284×2778 | iPhone 16 Plus (6.7") | 至少 3 張 |

### Google Play
| 尺寸 | 用途 |
|------|------|
| 1080×1920 | 手機截圖（主要） |
| 1024×500 | 橫幅圖片（宣傳圖） |
| 512×512 | App 圖示 |

## 建議截圖場景（7 張）

### 截圖 1：首頁 — 每日運勢
- 路徑：`/`（首頁 Tab）
- 畫面內容：每日運勢卡片、今日之卦、幸運棋子與方位
- 文案疊加：**「每日運勢 — 以當日之卦起課，觀象知機」**

### 截圖 2：抽棋動畫
- 路徑：`/draw` → 點擊「抽取棋子」
- 畫面內容：3D 棋筒正在搖晃、棋子飛出
- 文案疊加：**「誠心問道 — 從 32 顆象棋中抽取命運指引」**

### 截圖 3：籤詩揭曉
- 路徑：`/reveal`（抽棋完成後自動跳轉）
- 畫面內容：宣紙卷軸籤詩卡 + 六爻卦象圖 + 本卦/變卦/互卦面板
- 文案疊加：**「64 首七言絕句籤詩 × 完整六爻卦象推演」**

### 截圖 4：棋盤佈局
- 路徑：`/board`（全螢幕模式）
- 畫面內容：半透明棋盤上方格線、已放置的棋子、位置解讀面板
- 文案疊加：**「棋盤佈局 — 拖曳棋子，格位數參與動爻計算」**

### 截圖 5：統計儀表板
- 路徑：`/stats`
- 畫面內容：7 日趨勢長條圖 + 吉凶分佈 + 棋子排行
- 文案疊加：**「占卜記錄統計 — 趨勢追蹤，掌握運勢變化」**

### 截圖 6：占卜圖鑑
- 路徑：`/library` 或 `/collection`（收藏分頁）
- 畫面內容：64 卦籤詩圖鑑網格 + 已收藏標記（另一個分頁是《靈棋經》125 卦目）
- 文案疊加：**「64 籤詩 × 125 靈棋卦目，全文可查」**

### 截圖 7：靈棋十二子
- 路徑：`/lingqi?recordId=demo-lingqi`（帶記錄進去會還原固定的一卦，不重擲）
- 畫面內容：卦名與卦目標記、象曰／詩曰原典、規則式深度解讀
- 文案疊加：**「靈棋十二子 — 《靈棋經》125 卦目，原典逐字保留」**
- 為什麼固定一卦：擲卦是隨機的，不固定的話每跑一次素材就換一個卦名與卦辭

## 截圖方法

### 方法 A：Web 截圖（最快）
```bash
# 啟動 Web 版本
npx expo start --web
```
在瀏覽器中按 F12 → 切換至行動裝置模式（375×812 iPhone 或 412×915 Android），用系統截圖工具擷取。

### 方法 B：iOS 模擬器（Mac 必需）
```bash
eas build --platform ios --profile preview
# 或用 Xcode Simulator
xcrun simctl io booted screenshot screenshot1.png
```

### 方法 C：Android 模擬器
```bash
eas build --platform android --profile preview
# 或手動在模擬器中按電源+音量鍵截圖
```

### 方法 D：實機截圖
- iOS：側鍵 + 音量上鍵
- Android：電源鍵 + 音量下鍵

## 後製處理

建立 `scripts/generate_screenshots.sh`：
```bash
# 將原始截圖縮放至各上架尺寸
# 需安裝 ImageMagick (brew install imagemagick / apt install imagemagick)
```

用 ImageMagick 處理範例：
```bash
# 為截圖加上金色邊框與文字標題（用於 Google Play 宣傳圖）
convert screenshot1.png \
  -resize 1080x1920^ \
  -gravity center \
  -extent 1080x1920 \
  -bordercolor '#C8A96E' \
  -border 2 \
  store_screenshot1.png
```

## App 圖示現狀

 `assets/images/icon.png` 已為 1024×1024 PNG，可直接用於 App Store 及 Google Play。
- Android 自適應圖示元件：`android-icon-foreground.png` + `android-icon-background.png`
- Web 用 favicon：`favicon.png`

## 隱私權政策 URL

部署後位於：`https://chess-divination-app.vercel.app/privacy.html`

（若使用自訂域名則為 `https://chess-divination.com/privacy.html`）
