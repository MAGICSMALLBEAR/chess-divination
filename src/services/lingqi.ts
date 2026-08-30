/**
 * 靈棋十二子：上、中、下各四枚；一次擲出，以朝上數量成卦。
 * 鍵值共有 5 × 5 × 5 = 125 種，能直接對應《靈棋經》的卦目。
 */
export interface LingqiCast {
  upper: number;
  middle: number;
  lower: number;
}

export function lingqiKey({ upper, middle, lower }: LingqiCast): string {
  validate({ upper, middle, lower });
  return `${upper}-${middle}-${lower}`;
}

export function castLingqi(random: () => number = Math.random): LingqiCast {
  const count = () => Array.from({ length: 4 }, () => random() < 0.5).filter(Boolean).length;
  return { upper: count(), middle: count(), lower: count() };
}

function validate(cast: LingqiCast): void {
  for (const count of [cast.upper, cast.middle, cast.lower]) {
    if (!Number.isInteger(count) || count < 0 || count > 4) throw new Error('靈棋數量必須介於 0 至 4。');
  }
}

// 卦目標記法（如「二上一中」）。與棋子漢字、卦名同屬命理資料值——
// 它是《靈棋經》原典的卦目名稱，維持漢字原樣不翻譯。
const NUMERALS = ['零', '一', '二', '三', '四'];

export function lingqiNotation(cast: LingqiCast): string {
  const parts: Array<[string, number]> = [['上', cast.upper], ['中', cast.middle], ['下', cast.lower]];
  return parts
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${NUMERALS[count]}${kind}`)
    .join('') || '三才皆隱';
}
