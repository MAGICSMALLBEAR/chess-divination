/**
 * 靈棋十二子：上、中、下各四枚；一次擲出，以朝上數量成卦。
 * 鍵值共有 5 × 5 × 5 = 125 種，正好對應《靈棋經》的卦目。
 */
import { LINGQI_ORACLES, type LingqiOracle } from '@/data/lingqiOracles';

export type { LingqiOracle };

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

const BY_KEY = new Map(LINGQI_ORACLES.map(oracle => [oracle.key, oracle]));

/**
 * 取該擲法對應的卦目。125 種組合在原典中皆有卦，因此查不到即為資料檔損毀，
 * 讓它擲出例外而不是靜默回傳預設卦——後者會讓使用者讀到與擲出結果無關的斷語。
 */
export function lingqiOracle(cast: LingqiCast): LingqiOracle {
  const key = lingqiKey(cast);
  const oracle = BY_KEY.get(key);
  if (!oracle) throw new Error(`靈棋卦目缺漏：${key}`);
  return oracle;
}

export function lingqiOracleByKey(key: string): LingqiOracle | undefined {
  return BY_KEY.get(key);
}

/**
 * 卦目標記（如「二上一中」）。與棋子漢字、卦名同屬命理資料值——
 * 它是《靈棋經》原典的卦目名稱，維持漢字原樣不翻譯。
 *
 * 取自資料檔而非自行拼字：原典對數量為零的一才略去不寫，全零者另有專名
 * 「純陰饅」而不是照規則拼出來的空字串。自行拼字會在那一卦上與原典對不起來。
 */
export function lingqiNotation(cast: LingqiCast): string {
  return lingqiOracle(cast).notation;
}
