# 原生版驗證清單

此專案的 Web 自動測試不涵蓋原生能力。每次準備上架前，請先建立 preview binary：

```sh
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

在真機（至少一台 Android 13+ 與一台 iPhone）完成下列檢查：

1. 首次啟動、深色／淺色／系統主題，以及安全區與橫向縮放。
2. 抽棋、棋盤拖曳、撤銷、揭露動畫；開啟「減少動態效果」後不得殘留遮罩。
3. 音效、觸覺回饋與圖片分享；檢查分享圖上的繁中、英文、日文日期。
4. 開啟每日提醒，確認 iOS／Android 權限提示、上午 9 點排程與點擊通知後可進入 App。
5. 於兩台裝置完成雲端同步：第一台起卦、第二台輸入相同配對碼、確認歷史／收藏／資料夾／自訂類別皆出現。
6. 斷網、拒絕通知權限、關閉 AI 金鑰及 AI 限流時，主流程皆需保留規則式解讀且不能當機。

`expo-notifications` 的設定屬 native build-time config；改動 app.json 後必須重新建立 binary，不能只靠 Expo Go 驗證。
