// 棋盤位置解讀服務
// 根據棋子放置的位置 + 五行屬性賦予深度意義

export interface PositionMeaning {
  zone: string;
  meaning: string;
  advice: string;
  /** 棋盤方位，如「東南」 */
  boardDirection: string;
  wuxingTip?: string;
  directionLuck?: string;
}

/**
 * 五行生剋關係。
 * generatedBy（生我／印）在舊版被遺漏，導致「有貴人扶助」這個最正面的
 * 訊號被誤判為「比和」。五行關係必須完整涵蓋五種。
 */
const WUXING_CYCLE: Record<
  string,
  { generates: string; generatedBy: string; overcomes: string; overcomeBy: string }
> = {
  '金': { generates: '水', generatedBy: '土', overcomes: '木', overcomeBy: '火' },
  '木': { generates: '火', generatedBy: '水', overcomes: '土', overcomeBy: '金' },
  '水': { generates: '木', generatedBy: '金', overcomes: '火', overcomeBy: '土' },
  '火': { generates: '土', generatedBy: '木', overcomes: '金', overcomeBy: '水' },
  '土': { generates: '金', generatedBy: '火', overcomes: '水', overcomeBy: '木' },
};

// 方位五行對應（棋盤方位）
const DIRECTION_WUXING: Record<string, string> = {
  '中': '土', '東': '木', '南': '火', '西': '金', '北': '水',
  '東南': '木', '西南': '土', '東北': '土', '西北': '金',
};

/**
 * 由格子座標推得棋盤方位。
 *
 * 依傳統棋盤方位「上南下北、左東右西」：
 *   row 小（棋盤上方）為南，row 大（下方）為北
 *   col 小（左側）為東，col 大（右側）為西
 *
 * 舊版只取 中／北／南 三值且完全沒用到 col，
 * 導致九宮以外的所有格子在東西向上無法區分。
 */
export function getBoardDirection(col: number, row: number): string {
  const inPalace = col >= 3 && col <= 5 && (row <= 2 || row >= 7);
  if (inPalace) return '中';

  // 中間三路（col 3–5）不分東西；中間兩列（row 4–5，楚河漢界）不分南北
  const ns = row <= 3 ? '南' : row >= 6 ? '北' : '';
  const ew = col <= 2 ? '東' : col >= 6 ? '西' : '';

  const CORNERS: Record<string, string> = {
    '南東': '東南', '南西': '西南', '北東': '東北', '北西': '西北',
  };

  if (ns && ew) return CORNERS[`${ns}${ew}`];
  return ns || ew || '中';
}

// 方位吉凶（簡化版）
function getDirectionLuck(direction: string): string {
  const map: Record<string, string> = {
    '東': '利學業、新開始', '南': '利名聲、社交', '西': '利財運、收穫',
    '北': '利沉澱、內省', '東南': '利合作、貴人', '西南': '利家庭、穩定',
    '東北': '利變革、突破', '西北': '利權威、領導', '中': '利核心、大局',
    '四方': '利全局觀', '直線': '利行動、效率', '日': '利情感、創意',
    '隔位': '利驚喜、轉折', '前方': '利前進、突破',
  };
  return map[direction] || '順其自然';
}

/**
 * 判斷棋盤位置所屬區域並回傳含義
 * 棋盤尺寸：9 列 (col 0-8) × 10 行 (row 0-9)
 */
export function getPositionMeaning(
  col: number, row: number,
  pieceWuxing?: string,
  pieceDirection?: string,
): PositionMeaning {
  const isUpper = row <= 4;
  const isRiverEdge = row === 4 || row === 5;
  const inPalaceUpper = col >= 3 && col <= 5 && row <= 2;
  const inPalaceLower = col >= 3 && col <= 5 && row >= 7;
  const inPalace = inPalaceUpper || inPalaceLower;
  const onEdge = col === 0 || col === 8 || row === 0 || row === 9;
  const inCorner = (col === 0 || col === 8) && (row === 0 || row === 9);

  const boardDirection = getBoardDirection(col, row);

  let zone: string;
  let meaning: string;
  let advice: string;

  if (inPalace) {
    zone = '九宮格（中軍大帳）';
    meaning = '核心權力區域，涉及關鍵決策與大局。';
    advice = '沉著應對，著眼全局。';
  } else if (isRiverEdge) {
    zone = '楚河漢界（決戰前線）';
    meaning = '關鍵轉折點，進退影響深遠。';
    advice = '審時度勢，當機立斷。';
  } else if (inCorner) {
    zone = '棋盤角落（絕處逢生）';
    meaning = '困境中的轉機，絕境蘊藏出路。';
    advice = '不要放棄，柳暗花明。';
  } else if (onEdge) {
    zone = '棋盤邊線（臨界狀態）';
    meaning = '處於階段邊緣，即將進入新局面。';
    advice = '保持穩定，勿走極端。';
  } else if (isUpper) {
    zone = '棋盤上半（戰略縱深）';
    meaning = '規劃與準備階段，後方佈局。';
    advice = '放眼長遠，深謀遠慮。';
  } else {
    zone = '棋盤下半（前線推進）';
    meaning = '行動與執行階段，積極推進。';
    advice = '保持動力，持續前進。';
  }

  const result: PositionMeaning = { zone, meaning, advice, boardDirection };

  // 五行互動分析：以棋子卦氣對該格方位之五行，判五種生剋關係
  if (pieceWuxing) {
    const cycle = WUXING_CYCLE[pieceWuxing];
    const dirElement = DIRECTION_WUXING[result.boardDirection];
    if (cycle && dirElement) {
      if (dirElement === pieceWuxing) {
        result.wuxingTip = `五行比和：${pieceWuxing}與${result.boardDirection}方同氣，根基穩固，守成有餘。`;
      } else if (dirElement === cycle.generatedBy) {
        result.wuxingTip = `五行生我：${dirElement}生${pieceWuxing}，得方位之助，有貴人扶持，最為有利。`;
      } else if (dirElement === cycle.generates) {
        result.wuxingTip = `五行我生：${pieceWuxing}生${dirElement}，才華得以發揮，惟耗損心力，宜留餘地。`;
      } else if (dirElement === cycle.overcomes) {
        result.wuxingTip = `五行我剋：${pieceWuxing}剋${dirElement}，局面可掌控，需付出努力方能收成。`;
      } else {
        result.wuxingTip = `五行剋我：${dirElement}剋${pieceWuxing}，外部壓力較大，宜守不宜攻。`;
      }
    }
  }

  // 方位吉凶
  if (pieceDirection) {
    result.directionLuck = `方位「${pieceDirection}」：${getDirectionLuck(pieceDirection)}。`;
  }

  return result;
}

export interface Placement {
  col: number;
  row: number;
  /** 棋子的卦氣五行 — 生剋運算依據 */
  guaElement: string;
  /** 棋子的行棋方位特性，如「直線」「隔位」 */
  direction: string;
  pieceName: string;
}

/**
 * 深度解讀的標題行。
 *
 * 匯出成常數而不是各處各寫一次字面量：positionSummary 是「牌陣自己那一段
 * ＋這段深度解讀」串起來的，要把兩者分開就得認得這條界線（見 spreads.ts
 * 的 spreadBriefFromSummary）。字面量散在兩個檔案裡，改了標題就會靜默
 * 切不到，而症狀只是 AI 少拿到一段資料，畫面上完全看不出來。
 */
export const POSITION_DEEP_HEADING = '【棋盤佈局深度解讀】';

/**
 * 深度版：傳入棋子卦氣五行與方位資訊
 */
export function generatePositionSummaryDeep(placements: Placement[]): string {
  if (placements.length === 0) return '';

  const meanings = placements.map(p =>
    getPositionMeaning(p.col, p.row, p.guaElement, p.direction)
  );

  let summary = `${POSITION_DEEP_HEADING}\n\n`;

  // 每顆棋子逐一解讀
  placements.forEach((p, i) => {
    const m = meanings[i];
    summary += `▸ ${p.pieceName}（卦氣屬${p.guaElement}）→ ${m.zone}，居${m.boardDirection}方\n`;
    summary += `  ${m.meaning}\n`;
    if (m.wuxingTip) summary += `  ${m.wuxingTip}\n`;
    if (m.directionLuck) summary += `  ${m.directionLuck}\n`;
    summary += `  建議：${m.advice}\n\n`;
  });

  // 綜合五行互動
  if (placements.length >= 2) {
    const elements = placements.map(p => p.guaElement);
    const uniqueElements = [...new Set(elements)];
    if (uniqueElements.length >= 2) {
      summary += `五行綜合：${uniqueElements.join('、')}並存，`;
      // 檢查是否有相生鏈
      const hasGenerating = uniqueElements.some((e, i) =>
        uniqueElements.some((e2, j) => i !== j && WUXING_CYCLE[e]?.generates === e2)
      );
      // 檢查是否有相剋鏈
      const hasOvercoming = uniqueElements.some((e, i) =>
        uniqueElements.some((e2, j) => i !== j && WUXING_CYCLE[e]?.overcomes === e2)
      );
      if (hasGenerating && !hasOvercoming) summary += '相生有情，萬事順遂。';
      else if (hasOvercoming && !hasGenerating) summary += '相剋較重，需多加調和。';
      else summary += '生剋並存，有挑戰亦有機遇。';
    }
  }

  return summary;
}

/**
 * 簡易版（向後相容）
 */
export function generatePositionSummary(positions: { col: number; row: number }[]): string {
  if (positions.length === 0) return '';
  const meanings = positions.map(({ col, row }) => getPositionMeaning(col, row));
  const zones = [...new Set(meanings.map(m => m.zone))];
  let summary = '【棋盤佈局解讀】\n\n';
  if (zones.length >= 2) {
    summary += `棋子分布於${zones.length}個區域：${zones.join('、')}。\n`;
  } else {
    summary += `棋子集中於${zones[0]}。${meanings[0].meaning}\n\n`;
  }
  summary += `建議：${meanings[0].advice}`;
  return summary;
}
