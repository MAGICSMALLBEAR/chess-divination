// 棋盤位置解讀服務
// 根據棋子放置的位置 + 五行屬性賦予深度意義

export interface PositionMeaning {
  zone: string;
  meaning: string;
  advice: string;
  wuxingTip?: string;
  directionLuck?: string;
}

// 五行生剋關係
const WUXING_CYCLE: Record<string, { generates: string; overcomes: string; overcomeBy: string }> = {
  '金': { generates: '水', overcomes: '木', overcomeBy: '火' },
  '木': { generates: '火', overcomes: '土', overcomeBy: '金' },
  '水': { generates: '木', overcomes: '火', overcomeBy: '土' },
  '火': { generates: '土', overcomes: '金', overcomeBy: '水' },
  '土': { generates: '金', overcomes: '水', overcomeBy: '木' },
};

// 方位五行對應（棋盤方位）
const DIRECTION_WUXING: Record<string, string> = {
  '中': '土', '東': '木', '南': '火', '西': '金', '北': '水',
  '東南': '木', '西南': '土', '東北': '土', '西北': '金',
};

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

  let result: PositionMeaning;

  if (inPalace) {
    result = {
      zone: '九宮格（中軍大帳）',
      meaning: '核心權力區域，涉及關鍵決策與大局。',
      advice: '沉著應對，著眼全局。',
    };
  } else if (isRiverEdge) {
    result = {
      zone: '楚河漢界（決戰前線）',
      meaning: '關鍵轉折點，進退影響深遠。',
      advice: '審時度勢，當機立斷。',
    };
  } else if (inCorner) {
    result = {
      zone: '棋盤角落（絕處逢生）',
      meaning: '困境中的轉機，絕境蘊藏出路。',
      advice: '不要放棄，柳暗花明。',
    };
  } else if (onEdge) {
    result = {
      zone: '棋盤邊線（臨界狀態）',
      meaning: '處於階段邊緣，即將進入新局面。',
      advice: '保持穩定，勿走極端。',
    };
  } else if (isUpper) {
    result = {
      zone: '棋盤上半（戰略縱深）',
      meaning: '規劃與準備階段，後方佈局。',
      advice: '放眼長遠，深謀遠慮。',
    };
  } else {
    result = {
      zone: '棋盤下半（前線推進）',
      meaning: '行動與執行階段，積極推進。',
      advice: '保持動力，持續前進。',
    };
  }

  // 五行互動分析
  if (pieceWuxing) {
    const cycle = WUXING_CYCLE[pieceWuxing];
    if (cycle) {
      const posDir = inPalace ? '中' : isUpper ? '北' : '南';
      const dirElement = DIRECTION_WUXING[posDir] || '土';
      if (dirElement === cycle.generates) {
        result.wuxingTip = `五行相生：${pieceWuxing}生${dirElement}，氣運流通，大吉。`;
      } else if (dirElement === cycle.overcomes) {
        result.wuxingTip = `五行相剋：${pieceWuxing}剋${dirElement}，需要付出努力但可掌控。`;
      } else if (dirElement === cycle.overcomeBy) {
        result.wuxingTip = `五行受剋：${dirElement}剋${pieceWuxing}，外部壓力較大，宜守不宜攻。`;
      } else {
        result.wuxingTip = `五行比和：${pieceWuxing}與方位同氣，穩定祥和。`;
      }
    }
  }

  // 方位吉凶
  if (pieceDirection) {
    result.directionLuck = `方位「${pieceDirection}」：${getDirectionLuck(pieceDirection)}。`;
  }

  return result;
}

/**
 * 深度版：傳入棋子五行與方位資訊
 */
export function generatePositionSummaryDeep(
  placements: { col: number; row: number; wuxing: string; direction: string; pieceName: string }[],
): string {
  if (placements.length === 0) return '';

  const meanings = placements.map(p =>
    getPositionMeaning(p.col, p.row, p.wuxing, p.direction)
  );

  let summary = '【棋盤佈局深度解讀】\n\n';

  // 每顆棋子逐一解讀
  placements.forEach((p, i) => {
    const m = meanings[i];
    summary += `▸ ${p.pieceName}（${p.wuxing}）→ ${m.zone}\n`;
    summary += `  ${m.meaning}\n`;
    if (m.wuxingTip) summary += `  ${m.wuxingTip}\n`;
    if (m.directionLuck) summary += `  ${m.directionLuck}\n`;
    summary += `  建議：${m.advice}\n\n`;
  });

  // 綜合五行互動
  if (placements.length >= 2) {
    const elements = placements.map(p => p.wuxing);
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
