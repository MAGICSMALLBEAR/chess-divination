// 棋盤位置解讀服務
// 根據棋子放置的位置賦予額外意義

export interface PositionMeaning {
  zone: string;
  meaning: string;
  advice: string;
}

/**
 * 判斷棋盤位置所屬區域並回傳含義
 * 棋盤尺寸：9 列 (col 0-8) × 10 行 (row 0-9)
 */
export function getPositionMeaning(col: number, row: number): PositionMeaning {
  // 楚河漢界判斷
  const isUpper = row <= 4;      // 棋盤上半（黑方陣地）
  const isLower = row >= 5;      // 棋盤下半（紅方陣地）
  const isRiverEdge = row === 4 || row === 5; // 河界邊緣

  // 九宮格判斷 (cols 3-5, rows 0-2 or 7-9)
  const inPalaceUpper = col >= 3 && col <= 5 && row <= 2;
  const inPalaceLower = col >= 3 && col <= 5 && row >= 7;
  const inPalace = inPalaceUpper || inPalaceLower;

  // 邊線判斷
  const onEdge = col === 0 || col === 8 || row === 0 || row === 9;

  // 角落判斷
  const inCorner = (col === 0 || col === 8) && (row === 0 || row === 9);

  if (inPalace) {
    return {
      zone: '九宮格（中軍大帳）',
      meaning: '此位置象徵核心、權力中心。您的問題涉及核心利益或重要決策，需要從大局著眼。',
      advice: '沉著應對，著眼全局。身處核心位置，每一步都影響深遠。',
    };
  }

  if (isRiverEdge) {
    return {
      zone: '楚河漢界（決戰前線）',
      meaning: '此位置象徵關鍵時刻、重大抉擇。您正處於事件的轉折點，進退之間影響重大。',
      advice: '審時度勢，當機立斷。過河之卒，有進無退，但需要勇氣與智慧並存。',
    };
  }

  if (inCorner) {
    return {
      zone: '棋盤角落（絕處逢生）',
      meaning: '此位置象徵困境中的轉機。看似絕境，但往往蘊藏著意外的出路。',
      advice: '山窮水盡疑無路，柳暗花明又一村。不要放棄，轉機就在眼前。',
    };
  }

  if (onEdge) {
    return {
      zone: '棋盤邊線（臨界狀態）',
      meaning: '此位置象徵邊緣與臨界。您可能處於某個階段的邊緣，即將進入新的局面。',
      advice: '保持穩定，勿走極端。邊緣位置需要格外謹慎，避免越界。',
    };
  }

  // 一般位置
  if (isUpper) {
    return {
      zone: '棋盤上半（戰略縱深）',
      meaning: '此位置象徵規劃與準備。您正在後方佈局，思考長遠的戰略。',
      advice: '放眼長遠，深謀遠慮。好的佈局是成功的一半。',
    };
  }

  return {
    zone: '棋盤下半（前線推進）',
    meaning: '此位置象徵行動與執行。您已經越過中線，正在積極推進目標。',
    advice: '保持動力，持續前進。已經走到這一步，不要半途而廢。',
  };
}

/**
 * 根據放置的所有棋子生成綜合位置解讀
 */
export function generatePositionSummary(positions: { col: number; row: number }[]): string {
  if (positions.length === 0) return '';

  const meanings = positions.map(({ col, row }) => getPositionMeaning(col, row));
  const zones = [...new Set(meanings.map(m => m.zone))];

  let summary = '【棋盤佈局解讀】\n\n';

  if (zones.length >= 2) {
    summary += `棋子分布於${zones.length}個不同區域：${zones.join('、')}。\n`;
    summary += '這顯示您的問題涉及多個層面，需要全面考量。\n\n';
  } else {
    summary += `棋子集中於${zones[0]}。\n`;
    summary += `${meanings[0].meaning}\n\n`;
  }

  // 綜合建議
  const advices = meanings.map(m => m.advice);
  summary += `綜合建議：${advices[0]}`;

  return summary;
}
