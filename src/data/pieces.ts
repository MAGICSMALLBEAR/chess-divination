// 象棋棋子資料 — 32 顆棋子完整定義
// 每種棋子包含：對應八卦、卦氣五行、意象五行、方位、陰陽、占卜含義

import {
  TRIGRAM_ELEMENTS,
  TRIGRAM_YINYANG,
  TRIGRAM_NAMES,
  TRIGRAM_GLYPHS,
} from '@/services/hexagram';

export type PieceColor = 'red' | 'black';
export type PieceType = 'king' | 'advisor' | 'elephant' | 'chariot' | 'horse' | 'cannon' | 'pawn';

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  chineseName: string;
  displayChar: string;
  /** 對應八卦（先天序 0–7），由「棋種 + 顏色」共同決定 */
  trigram: number;
  /** 卦氣五行 — 生剋運算的唯一依據，由 trigram 推得 */
  guaElement: string;
  /** 意象五行 — 僅供文案使用的直覺聯想（如「車屬金」），不參與生剋運算 */
  imageryElement: string;
  /** 陰陽 — 由卦之陰陽推得 */
  yinYang: '陰' | '陽';
  direction: string;
  meaning: string;
  keywords: string[];
}

// ====== 棋子 → 八卦對映 ======
//
// 先天八卦序：0乾☰ 1兌☱ 2離☲ 3震☳ 4巽☴ 5坎☵ 6艮☶ 7坤☷
//
// 設計原則：
// 1. 同一棋種的紅黑兩子互為「錯卦」（六爻全變），呼應象棋紅黑對立的本質。
//    四組錯卦：乾↔坤、兌↔艮、離↔坎、震↔巽。
// 2. 卦象依該棋子的行棋特性選配（帥居中為乾、炮隔子而擊為離火、馬走日為震雷…）。
//    君位以紅帥＝乾（純陽）、黑將＝坤（純陰）定調紅陽黑陰的基準。
// 3. 七種棋子分入四組錯卦，**八卦全部有棋可對應**。
//    舊版僅以棋種決定卦（7 種對 8 卦），兌卦永遠無棋，導致 15 首籤詩永遠抽不到，
//    且紅車與黑車得到完全相同的卦——象棋最核心的紅黑對立在占卜上等於不存在。
//
// ── 卦象機率不均是「棋盤本身」的性質，不是缺陷（審查 A24，決定維持現狀）──
//
// 七種棋子要塞進四組錯卦，必然有兩種棋共用一組：`advisor` 與 `pawn` 同用
// 艮／兌。加上象棋的實際子數（帥1 仕2 相2 車2 馬2 炮2 兵5），每卦的棋子數
// 因此是 乾1 兌7 離4 震4 巽4 坎4 艮7 坤1。兩顆棋時，乾為天／坤為地各約
// 1/1024（0.1%），兌為澤／艮為山約 49/1024（4.8%），相差約 49 倍。
//
// 這不是模除偏差——`drawPieces` 從 32 顆均勻抽取，每一顆的機率相同。
// 差異來自棋盤的組成：一副象棋本來就只有一支帥、卻有五個兵。取「忠於
// 棋盤實際子數」而非「卦象等機率」是刻意的選擇：抽棋占卜的前提是
// 「你抽到的是一顆真正的棋子」，若為了讓六十四卦等機率而改成先抽卦、
// 再挑一顆棋來代表，抽到的棋子就不再是真正被抽出的那一顆。
//
// 若日後要改為機率均衡，最小的改動是把 `advisor` 併到乾／坤、讓 `pawn`
// 獨佔艮／兌：分佈從 1–7 收斂到 3–5，機率差距降到約 2.8 倍；代價是
// 「仕守宮不出」的意象要從艮山改成乾天，文案需一併調整。
//
// 這個決定由 `pieces.test.ts` 的分佈守門測試釘住——數字若被動到會紅，
// 逼人重新看過這段理由，而不是默默改掉。
const PIECE_TRIGRAMS: Record<PieceType, { red: number; black: number }> = {
  king:     { red: 0, black: 7 }, // 帥 乾☰天（君臨天下）  ↔ 將 坤☷地（坐鎮中軍）
  advisor:  { red: 6, black: 1 }, // 仕 艮☶山（守宮不出）  ↔ 士 兌☱澤（暗助滋潤）
  elephant: { red: 4, black: 3 }, // 相 巽☴風（遠見謀劃）  ↔ 象 震☳雷（宏大震動）
  chariot:  { red: 5, black: 2 }, // 車 坎☵水（奔流直行）  ↔ 車 離☲火（勢如破竹）
  horse:    { red: 3, black: 4 }, // 馬 震☳雷（疾行如雷）  ↔ 馬 巽☴風（變化莫測）
  cannon:   { red: 2, black: 5 }, // 炮 離☲火（一鳴驚人）  ↔ 砲 坎☵水（暗藏潛伏）
  pawn:     { red: 6, black: 1 }, // 兵 艮☶山（步步為營）  ↔ 卒 兌☱澤（有去無回）
};

/** 取得某棋種、某顏色所對應的八卦編號 */
export function pieceTrigram(type: PieceType, color: PieceColor): number {
  return PIECE_TRIGRAMS[type][color];
}

// ====== 棋子外觀與文案 ======

interface PieceSpec {
  chineseName: string;
  imageryElement: string;
  direction: string;
  meaning: string;
  keywords: string[];
}

/** 每種棋子的數量 */
const PIECE_COUNTS: Record<PieceType, number> = {
  king: 1, advisor: 2, elephant: 2, chariot: 2, horse: 2, cannon: 2, pawn: 5,
};

const PIECE_SPECS: Record<PieceColor, Record<PieceType, PieceSpec>> = {
  red: {
    king: {
      chineseName: '帥', imageryElement: '土', direction: '中',
      meaning: '統帥全局，掌握大勢。象徵領導力、決策力與核心地位。抽得此棋，主大局在握，宜主動出擊。',
      keywords: ['權威', '核心', '大局', '決策', '主導'],
    },
    advisor: {
      chineseName: '仕', imageryElement: '土', direction: '中宮',
      meaning: '忠心輔佐，運籌帷幄。象徵謀士智慧、內在修養。抽得此棋，主有貴人相助，宜守不宜攻。',
      keywords: ['忠誠', '輔佐', '謀略', '內斂', '貴人'],
    },
    elephant: {
      chineseName: '相', imageryElement: '木', direction: '四方',
      meaning: '遠見卓識，全局在胸。象徵規劃能力、防禦智慧。抽得此棋，主謀定而後動，宜放眼長遠。',
      keywords: ['遠見', '規劃', '防禦', '格局', '智慧'],
    },
    chariot: {
      chineseName: '車', imageryElement: '金', direction: '直線',
      meaning: '橫衝直撞，勢不可擋。象徵力量、速度與事業發展。抽得此棋，主行動力強，宜勇往直前。',
      keywords: ['力量', '速度', '事業', '直行', '衝勁'],
    },
    horse: {
      chineseName: '馬', imageryElement: '火', direction: '日',
      meaning: '靈活多變，日行千里。象徵機遇、感情與人際關係。抽得此棋，主變動將至，宜靈活應對。',
      keywords: ['靈活', '感情', '旅行', '變動', '機遇'],
    },
    cannon: {
      chineseName: '炮', imageryElement: '火', direction: '隔位',
      meaning: '隔山打牛，一鳴驚人。象徵突破力、創意與隱藏實力。抽得此棋，主有驚喜，宜出奇制勝。',
      keywords: ['突破', '創意', '驚喜', '潛力', '奇招'],
    },
    pawn: {
      chineseName: '兵', imageryElement: '水', direction: '前方',
      meaning: '步步為營，聚沙成塔。象徵堅持、累積與踏實前行。抽得此棋，主功不唐捐，宜持之以恆。',
      keywords: ['堅持', '累積', '踏實', '漸進', '毅力'],
    },
  },
  black: {
    king: {
      chineseName: '將', imageryElement: '土', direction: '中',
      meaning: '坐鎮中軍，運籌帷幄。象徵穩重、守成與大局觀。抽得此棋，主穩中求勝，宜沉著應對。',
      keywords: ['穩重', '守成', '大局', '掌控', '沉著'],
    },
    advisor: {
      chineseName: '士', imageryElement: '土', direction: '中宮',
      meaning: '暗助明輔，忠心護主。象徵暗中助力、守護力量。抽得此棋，主有幕後貴人，宜信賴他人。',
      keywords: ['守護', '暗助', '忠心', '內在', '支持'],
    },
    elephant: {
      chineseName: '象', imageryElement: '木', direction: '四方',
      meaning: '大象無形，大音希聲。象徵宏觀視野、無形力量。抽得此棋，主格局宏大，宜放眼天下。',
      keywords: ['宏觀', '無形', '智慧', '大局', '遠見'],
    },
    chariot: {
      chineseName: '車', imageryElement: '金', direction: '直線',
      meaning: '勢如破竹，長驅直入。象徵強大執行力與果斷行動。抽得此棋，主時機已到，宜當機立斷。',
      keywords: ['執行', '果斷', '力量', '直進', '行動'],
    },
    horse: {
      chineseName: '馬', imageryElement: '火', direction: '日',
      meaning: '踏月而來，變化莫測。象徵意外轉機、人緣桃花。抽得此棋，主轉折將至，宜順勢而為。',
      keywords: ['轉機', '人緣', '變化', '感情', '機動'],
    },
    cannon: {
      chineseName: '砲', imageryElement: '火', direction: '隔位',
      meaning: '暗藏鋒芒，厚積薄發。象徵潛能、隱忍與爆發力。抽得此棋，主蓄勢待發，宜等待時機。',
      keywords: ['潛能', '隱忍', '爆發', '蓄力', '時機'],
    },
    pawn: {
      chineseName: '卒', imageryElement: '水', direction: '前方',
      meaning: '勇往直前，義無反顧。象徵決心、勇氣與不回頭的意志。抽得此棋，主破釜沉舟，宜堅持到底。',
      keywords: ['勇氣', '決心', '前進', '突破', '意志'],
    },
  },
};

// ====== 棋子生成 ======

function makePiece(type: PieceType, color: PieceColor, index: number): ChessPiece {
  const spec = PIECE_SPECS[color][type];
  const trigram = PIECE_TRIGRAMS[type][color];

  return {
    id: `${color}-${type}-${index}`,
    type,
    color,
    chineseName: spec.chineseName,
    displayChar: spec.chineseName,
    trigram,
    guaElement: TRIGRAM_ELEMENTS[trigram],
    imageryElement: spec.imageryElement,
    yinYang: TRIGRAM_YINYANG[trigram],
    direction: spec.direction,
    meaning: spec.meaning,
    keywords: spec.keywords,
  };
}

const PIECE_ORDER: PieceType[] = ['king', 'advisor', 'elephant', 'chariot', 'horse', 'cannon', 'pawn'];

function buildSide(color: PieceColor): ChessPiece[] {
  const pieces: ChessPiece[] = [];
  for (const type of PIECE_ORDER) {
    for (let i = 1; i <= PIECE_COUNTS[type]; i++) {
      pieces.push(makePiece(type, color, i));
    }
  }
  return pieces;
}

// ====== 所有棋子陣列 ======

export const ALL_RED_PIECES: ChessPiece[] = buildSide('red');
export const ALL_BLACK_PIECES: ChessPiece[] = buildSide('black');
export const ALL_PIECES: ChessPiece[] = [...ALL_RED_PIECES, ...ALL_BLACK_PIECES];

// ====== 查詢輔助 ======

export function getPiecesByType(type: PieceType): ChessPiece[] {
  return ALL_PIECES.filter(p => p.type === type);
}

/** 棋子的卦名，如「乾」 */
export function getPieceTrigramName(piece: ChessPiece): string {
  return TRIGRAM_NAMES[piece.trigram];
}

/** 棋子的卦符號，如「☰」 */
export function getPieceTrigramGlyph(piece: ChessPiece): string {
  return TRIGRAM_GLYPHS[piece.trigram];
}
