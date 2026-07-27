// 象棋棋子資料 - 32 顆棋子完整定義
// 每種棋子包含：五行、方位、陰陽、占卜含義

export type PieceColor = 'red' | 'black';
export type PieceType = 'king' | 'advisor' | 'elephant' | 'chariot' | 'horse' | 'cannon' | 'pawn';

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  chineseName: string;
  displayChar: string;
  wuxing: string;      // 五行：金木水火土
  direction: string;    // 方位
  yinYang: '陰' | '陽';
  meaning: string;      // 占卜含義
  keywords: string[];   // 關鍵詞
  trigram: number;      // 對應八卦：0乾1兌2離3震4巽5坎6艮7坤
}

// 八卦編號（伏羲先天八卦序）
// 0=乾☰ 1=兌☱ 2=離☲ 3=震☳ 4=巽☴ 5=坎☵ 6=艮☶ 7=坤☷

const pieceTypeTrigrams: Record<PieceType, number> = {
  king:     0, // 乾 ☰ 天 — 權威、領袖
  advisor:  7, // 坤 ☷ 地 — 輔佐、包容
  elephant: 4, // 巽 ☴ 風 — 遠見、謀劃
  chariot:  5, // 坎 ☵ 水 — 力量、前行
  horse:    3, // 震 ☳ 雷 — 行動、變動
  cannon:   2, // 離 ☲ 火 — 突破、光明
  pawn:     6, // 艮 ☶ 山 — 堅持、積累
};

export function pieceTypeToTrigram(type: PieceType): number {
  return pieceTypeTrigrams[type];
}

export const TRIGRAM_NAMES: Record<number, string> = {
  0: '乾', 1: '兌', 2: '離', 3: '震',
  4: '巽', 5: '坎', 6: '艮', 7: '坤',
};

export const TRIGRAM_ELEMENTS: Record<number, string> = {
  0: '天', 1: '澤', 2: '火', 3: '雷',
  4: '風', 5: '水', 6: '山', 7: '地',
};

// 生成棋子的工廠函數
function makePiece(
  type: PieceType,
  color: PieceColor,
  index: number,
  chineseName: string,
  displayChar: string,
  wuxing: string,
  direction: string,
  yinYang: '陰' | '陽',
  meaning: string,
  keywords: string[],
): ChessPiece {
  return {
    id: `${color}-${type}-${index}`,
    type,
    color,
    chineseName,
    displayChar,
    wuxing,
    direction,
    yinYang,
    meaning,
    keywords,
    trigram: pieceTypeTrigrams[type],
  };
}

// ====== 紅方棋子 (7種，16顆) ======

export const RED_KING = makePiece(
  'king', 'red', 1, '帥', '帥',
  '土', '中', '陽',
  '統帥全局，掌握大勢。象徵領導力、決策力與核心地位。抽得此棋，主大局在握，宜主動出擊。',
  ['權威', '核心', '大局', '決策', '主導'],
);

export const RED_ADVISOR_1 = makePiece(
  'advisor', 'red', 1, '仕', '仕',
  '土', '中宮', '陰',
  '忠心輔佐，運籌帷幄。象徵謀士智慧、內在修養。抽得此棋，主有貴人相助，宜守不宜攻。',
  ['忠誠', '輔佐', '謀略', '內斂', '貴人'],
);

export const RED_ADVISOR_2 = makePiece(
  'advisor', 'red', 2, '仕', '仕',
  '土', '中宮', '陰',
  '忠心輔佐，運籌帷幄。象徵謀士智慧、內在修養。抽得此棋，主有貴人相助，宜守不宜攻。',
  ['忠誠', '輔佐', '謀略', '內斂', '貴人'],
);

export const RED_ELEPHANT_1 = makePiece(
  'elephant', 'red', 1, '相', '相',
  '木', '四方', '陽',
  '遠見卓識，全局在胸。象徵規劃能力、防禦智慧。抽得此棋，主謀定而後動，宜放眼長遠。',
  ['遠見', '規劃', '防禦', '格局', '智慧'],
);

export const RED_ELEPHANT_2 = makePiece(
  'elephant', 'red', 2, '相', '相',
  '木', '四方', '陽',
  '遠見卓識，全局在胸。象徵規劃能力、防禦智慧。抽得此棋，主謀定而後動，宜放眼長遠。',
  ['遠見', '規劃', '防禦', '格局', '智慧'],
);

export const RED_CHARIOT_1 = makePiece(
  'chariot', 'red', 1, '車', '車',
  '金', '直線', '陽',
  '橫衝直撞，勢不可擋。象徵力量、速度與事業發展。抽得此棋，主行動力強，宜勇往直前。',
  ['力量', '速度', '事業', '直行', '衝勁'],
);

export const RED_CHARIOT_2 = makePiece(
  'chariot', 'red', 2, '車', '車',
  '金', '直線', '陽',
  '橫衝直撞，勢不可擋。象徵力量、速度與事業發展。抽得此棋，主行動力強，宜勇往直前。',
  ['力量', '速度', '事業', '直行', '衝勁'],
);

export const RED_HORSE_1 = makePiece(
  'horse', 'red', 1, '馬', '馬',
  '火', '日', '陽',
  '靈活多變，日行千里。象徵機遇、感情與人際關係。抽得此棋，主變動將至，宜靈活應對。',
  ['靈活', '感情', '旅行', '變動', '機遇'],
);

export const RED_HORSE_2 = makePiece(
  'horse', 'red', 2, '馬', '馬',
  '火', '日', '陽',
  '靈活多變，日行千里。象徵機遇、感情與人際關係。抽得此棋，主變動將至，宜靈活應對。',
  ['靈活', '感情', '旅行', '變動', '機遇'],
);

export const RED_CANNON_1 = makePiece(
  'cannon', 'red', 1, '炮', '炮',
  '火', '隔位', '陰',
  '隔山打牛，一鳴驚人。象徵突破力、創意與隱藏實力。抽得此棋，主有驚喜，宜出奇制勝。',
  ['突破', '創意', '驚喜', '潛力', '奇招'],
);

export const RED_CANNON_2 = makePiece(
  'cannon', 'red', 2, '炮', '炮',
  '火', '隔位', '陰',
  '隔山打牛，一鳴驚人。象徵突破力、創意與隱藏實力。抽得此棋，主有驚喜，宜出奇制勝。',
  ['突破', '創意', '驚喜', '潛力', '奇招'],
);

export const RED_PAWN_1 = makePiece(
  'pawn', 'red', 1, '兵', '兵',
  '水', '前方', '陰',
  '步步為營，聚沙成塔。象徵堅持、累積與踏實前行。抽得此棋，主功不唐捐，宜持之以恆。',
  ['堅持', '累積', '踏實', '漸進', '毅力'],
);

export const RED_PAWN_2 = makePiece(
  'pawn', 'red', 2, '兵', '兵',
  '水', '前方', '陰',
  '步步為營，聚沙成塔。象徵堅持、累積與踏實前行。抽得此棋，主功不唐捐，宜持之以恆。',
  ['堅持', '累積', '踏實', '漸進', '毅力'],
);

export const RED_PAWN_3 = makePiece(
  'pawn', 'red', 3, '兵', '兵',
  '水', '前方', '陰',
  '步步為營，聚沙成塔。象徵堅持、累積與踏實前行。抽得此棋，主功不唐捐，宜持之以恆。',
  ['堅持', '累積', '踏實', '漸進', '毅力'],
);

export const RED_PAWN_4 = makePiece(
  'pawn', 'red', 4, '兵', '兵',
  '水', '前方', '陰',
  '步步為營，聚沙成塔。象徵堅持、累積與踏實前行。抽得此棋，主功不唐捐，宜持之以恆。',
  ['堅持', '累積', '踏實', '漸進', '毅力'],
);

export const RED_PAWN_5 = makePiece(
  'pawn', 'red', 5, '兵', '兵',
  '水', '前方', '陰',
  '步步為營，聚沙成塔。象徵堅持、累積與踏實前行。抽得此棋，主功不唐捐，宜持之以恆。',
  ['堅持', '累積', '踏實', '漸進', '毅力'],
);

// ====== 黑方棋子 (7種，16顆) ======

export const BLACK_KING = makePiece(
  'king', 'black', 1, '將', '將',
  '土', '中', '陽',
  '坐鎮中軍，運籌帷幄。象徵穩重、守成與大局觀。抽得此棋，主穩中求勝，宜沉著應對。',
  ['穩重', '守成', '大局', '掌控', '沉著'],
);

export const BLACK_ADVISOR_1 = makePiece(
  'advisor', 'black', 1, '士', '士',
  '土', '中宮', '陰',
  '暗助明輔，忠心護主。象徵暗中助力、守護力量。抽得此棋，主有幕後貴人，宜信賴他人。',
  ['守護', '暗助', '忠心', '內在', '支持'],
);

export const BLACK_ADVISOR_2 = makePiece(
  'advisor', 'black', 2, '士', '士',
  '土', '中宮', '陰',
  '暗助明輔，忠心護主。象徵暗中助力、守護力量。抽得此棋，主有幕後貴人，宜信賴他人。',
  ['守護', '暗助', '忠心', '內在', '支持'],
);

export const BLACK_ELEPHANT_1 = makePiece(
  'elephant', 'black', 1, '象', '象',
  '木', '四方', '陽',
  '大象無形，大音希聲。象徵宏觀視野、無形力量。抽得此棋，主格局宏大，宜放眼天下。',
  ['宏觀', '無形', '智慧', '大局', '遠見'],
);

export const BLACK_ELEPHANT_2 = makePiece(
  'elephant', 'black', 2, '象', '象',
  '木', '四方', '陽',
  '大象無形，大音希聲。象徵宏觀視野、無形力量。抽得此棋，主格局宏大，宜放眼天下。',
  ['宏觀', '無形', '智慧', '大局', '遠見'],
);

export const BLACK_CHARIOT_1 = makePiece(
  'chariot', 'black', 1, '車', '車',
  '金', '直線', '陽',
  '勢如破竹，長驅直入。象徵強大執行力與果斷行動。抽得此棋，主時機已到，宜當機立斷。',
  ['執行', '果斷', '力量', '直進', '行動'],
);

export const BLACK_CHARIOT_2 = makePiece(
  'chariot', 'black', 2, '車', '車',
  '金', '直線', '陽',
  '勢如破竹，長驅直入。象徵強大執行力與果斷行動。抽得此棋，主時機已到，宜當機立斷。',
  ['執行', '果斷', '力量', '直進', '行動'],
);

export const BLACK_HORSE_1 = makePiece(
  'horse', 'black', 1, '馬', '馬',
  '火', '日', '陽',
  '踏月而來，變化莫測。象徵意外轉機、人緣桃花。抽得此棋，主轉折將至，宜順勢而為。',
  ['轉機', '人緣', '變化', '感情', '機動'],
);

export const BLACK_HORSE_2 = makePiece(
  'horse', 'black', 2, '馬', '馬',
  '火', '日', '陽',
  '踏月而來，變化莫測。象徵意外轉機、人緣桃花。抽得此棋，主轉折將至，宜順勢而為。',
  ['轉機', '人緣', '變化', '感情', '機動'],
);

export const BLACK_CANNON_1 = makePiece(
  'cannon', 'black', 1, '砲', '砲',
  '火', '隔位', '陰',
  '暗藏鋒芒，厚積薄發。象徵潛能、隱忍與爆發力。抽得此棋，主蓄勢待發，宜等待時機。',
  ['潛能', '隱忍', '爆發', '蓄力', '時機'],
);

export const BLACK_CANNON_2 = makePiece(
  'cannon', 'black', 2, '砲', '砲',
  '火', '隔位', '陰',
  '暗藏鋒芒，厚積薄發。象徵潛能、隱忍與爆發力。抽得此棋，主蓄勢待發，宜等待時機。',
  ['潛能', '隱忍', '爆發', '蓄力', '時機'],
);

export const BLACK_PAWN_1 = makePiece(
  'pawn', 'black', 1, '卒', '卒',
  '水', '前方', '陰',
  '勇往直前，義無反顧。象徵決心、勇氣與不回頭的意志。抽得此棋，主破釜沉舟，宜堅持到底。',
  ['勇氣', '決心', '前進', '突破', '意志'],
);

export const BLACK_PAWN_2 = makePiece(
  'pawn', 'black', 2, '卒', '卒',
  '水', '前方', '陰',
  '勇往直前，義無反顧。象徵決心、勇氣與不回頭的意志。抽得此棋，主破釜沉舟，宜堅持到底。',
  ['勇氣', '決心', '前進', '突破', '意志'],
);

export const BLACK_PAWN_3 = makePiece(
  'pawn', 'black', 3, '卒', '卒',
  '水', '前方', '陰',
  '勇往直前，義無反顧。象徵決心、勇氣與不回頭的意志。抽得此棋，主破釜沉舟，宜堅持到底。',
  ['勇氣', '決心', '前進', '突破', '意志'],
);

export const BLACK_PAWN_4 = makePiece(
  'pawn', 'black', 4, '卒', '卒',
  '水', '前方', '陰',
  '勇往直前，義無反顧。象徵決心、勇氣與不回頭的意志。抽得此棋，主破釜沉舟，宜堅持到底。',
  ['勇氣', '決心', '前進', '突破', '意志'],
);

export const BLACK_PAWN_5 = makePiece(
  'pawn', 'black', 5, '卒', '卒',
  '水', '前方', '陰',
  '勇往直前，義無反顧。象徵決心、勇氣與不回頭的意志。抽得此棋，主破釜沉舟，宜堅持到底。',
  ['勇氣', '決心', '前進', '突破', '意志'],
);

// ====== 所有棋子陣列 ======

export const ALL_RED_PIECES: ChessPiece[] = [
  RED_KING,
  RED_ADVISOR_1, RED_ADVISOR_2,
  RED_ELEPHANT_1, RED_ELEPHANT_2,
  RED_CHARIOT_1, RED_CHARIOT_2,
  RED_HORSE_1, RED_HORSE_2,
  RED_CANNON_1, RED_CANNON_2,
  RED_PAWN_1, RED_PAWN_2, RED_PAWN_3, RED_PAWN_4, RED_PAWN_5,
];

export const ALL_BLACK_PIECES: ChessPiece[] = [
  BLACK_KING,
  BLACK_ADVISOR_1, BLACK_ADVISOR_2,
  BLACK_ELEPHANT_1, BLACK_ELEPHANT_2,
  BLACK_CHARIOT_1, BLACK_CHARIOT_2,
  BLACK_HORSE_1, BLACK_HORSE_2,
  BLACK_CANNON_1, BLACK_CANNON_2,
  BLACK_PAWN_1, BLACK_PAWN_2, BLACK_PAWN_3, BLACK_PAWN_4, BLACK_PAWN_5,
];

export const ALL_PIECES: ChessPiece[] = [...ALL_RED_PIECES, ...ALL_BLACK_PIECES];

// ====== 依類型/顏色查詢 ======

export function getPiecesByType(type: PieceType): ChessPiece[] {
  return ALL_PIECES.filter(p => p.type === type);
}

export function getPiecesByColor(color: PieceColor): ChessPiece[] {
  return ALL_PIECES.filter(p => p.color === color);
}

export function getPieceTypeName(type: PieceType, color: PieceColor): string {
  const mapping: Record<PieceType, { red: string; black: string }> = {
    king:     { red: '帥', black: '將' },
    advisor:  { red: '仕', black: '士' },
    elephant: { red: '相', black: '象' },
    chariot:  { red: '車', black: '車' },
    horse:    { red: '馬', black: '馬' },
    cannon:   { red: '炮', black: '砲' },
    pawn:     { red: '兵', black: '卒' },
  };
  return mapping[type][color];
}

export function getPieceElement(type: PieceType): string {
  const mapping: Record<PieceType, string> = {
    king: '土', advisor: '土', elephant: '木',
    chariot: '金', horse: '火', cannon: '火', pawn: '水',
  };
  return mapping[type];
}

export function getPieceYinYang(type: PieceType): '陰' | '陽' {
  return ['king', 'elephant', 'chariot', 'horse'].includes(type) ? '陽' : '陰';
}
