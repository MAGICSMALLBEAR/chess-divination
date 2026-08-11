// 棋子說明翻譯（en / ja）
// 以棋子 id 為 key（如 "red-king-1", "black-pawn-3"），
// 但因同類棋子的 meaning/keywords 相同，這裡用 type+color 簡化。
// localizePiece 會直接用 piece.id 查表，我們為每顆棋子建一份。

import type { Lang } from '@/services/i18n';

type PieceLocale = {
  meaning: string;
  keywords: string[];
};

type PieceI18nEntry = Partial<Record<Lang, PieceLocale>>;

// 生成所有 32 顆棋子的 id → 翻譯對照
function buildPieceTranslations(): Record<string, PieceI18nEntry> {
  const map: Record<string, PieceI18nEntry> = {};

  const specs: Record<string, { count: number } & PieceLocale> = {
    'red-king': {
      count: 1,
      meaning: 'Commands the overall situation, seizing the momentum. Symbolizes leadership, decision-making power, and core status. Drawing this piece suggests you hold the initiative — take the lead.',
      keywords: ['Authority', 'Core', 'Big Picture', 'Decision', 'Leadership'],
    },
    'red-advisor': {
      count: 2,
      meaning: 'Loyal counsel, devising strategies behind the scenes. Symbolizes the wisdom of an adviser and inner cultivation. Drawing this piece suggests helpful allies are near — defend rather than attack.',
      keywords: ['Loyalty', 'Support', 'Strategy', 'Reserve', 'Patron'],
    },
    'red-elephant': {
      count: 2,
      meaning: 'Far-sighted vision, grasping the entire situation. Symbolizes planning ability and defensive wisdom. Drawing this piece suggests acting only after careful deliberation — take the long view.',
      keywords: ['Vision', 'Planning', 'Defense', 'Perspective', 'Wisdom'],
    },
    'red-chariot': {
      count: 2,
      meaning: 'Sweeping across the board, unstoppable momentum. Symbolizes strength, speed, and career development. Drawing this piece suggests powerful drive — forge ahead boldly.',
      keywords: ['Strength', 'Speed', 'Career', 'Directness', 'Drive'],
    },
    'red-horse': {
      count: 2,
      meaning: 'Flexible and versatile, galloping a thousand miles a day. Symbolizes opportunity, romance, and interpersonal relationships. Drawing this piece suggests change is coming — adapt nimbly.',
      keywords: ['Flexibility', 'Romance', 'Travel', 'Change', 'Opportunity'],
    },
    'red-cannon': {
      count: 2,
      meaning: 'Striking across the mountain, a stunning surprise. Symbolizes breakthrough power, creativity, and hidden strength. Drawing this piece suggests a pleasant surprise — win by the unexpected.',
      keywords: ['Breakthrough', 'Creativity', 'Surprise', 'Potential', 'Unorthodox'],
    },
    'red-pawn': {
      count: 5,
      meaning: 'Step by step, grains of sand become a tower. Symbolizes perseverance, accumulation, and steady progress. Drawing this piece suggests no effort goes to waste — persist with determination.',
      keywords: ['Perseverance', 'Accumulation', 'Steadiness', 'Progress', 'Willpower'],
    },
    'black-king': {
      count: 1,
      meaning: 'Sitting in command at central headquarters, planning the grand strategy. Symbolizes steadiness, consolidation, and big-picture thinking. Drawing this piece suggests seeking victory through stability — respond with composure.',
      keywords: ['Steadiness', 'Consolidation', 'Big Picture', 'Control', 'Composure'],
    },
    'black-advisor': {
      count: 2,
      meaning: 'Quietly assisting and protecting, loyal guardian at the heart. Symbolizes behind-the-scenes support and protective power. Drawing this piece suggests hidden allies — trust in others.',
      keywords: ['Protection', 'Hidden Aid', 'Loyalty', 'Inner Strength', 'Support'],
    },
    'black-elephant': {
      count: 2,
      meaning: 'The great image has no form, the great sound is barely heard. Symbolizes macro-level vision and intangible power. Drawing this piece suggests thinking on a grand scale — embrace the world.',
      keywords: ['Macro View', 'Intangible', 'Wisdom', 'Grand Scale', 'Foresight'],
    },
    'black-chariot': {
      count: 2,
      meaning: 'Sweeping forward like splitting bamboo, driving straight into the heart. Symbolizes powerful execution and decisive action. Drawing this piece suggests the moment has arrived — act without hesitation.',
      keywords: ['Execution', 'Decisiveness', 'Power', 'Direct Advance', 'Action'],
    },
    'black-horse': {
      count: 2,
      meaning: 'Arriving under moonlight, unpredictable and versatile. Symbolizes unexpected turns, social charm, and romantic fate. Drawing this piece suggests a turning point approaches — flow with the current.',
      keywords: ['Turning Point', 'Social Grace', 'Change', 'Romance', 'Agility'],
    },
    'black-cannon': {
      count: 2,
      meaning: 'Hidden edge, building strength quietly before eruption. Symbolizes latent potential, patient endurance, and explosive force. Drawing this piece suggests momentum is building — wait for the right moment.',
      keywords: ['Potential', 'Endurance', 'Eruption', 'Building', 'Timing'],
    },
    'black-pawn': {
      count: 5,
      meaning: 'Marching forward courageously, never turning back. Symbolizes determination, courage, and relentless will. Drawing this piece suggests burning your boats — see it through to the end.',
      keywords: ['Courage', 'Determination', 'Advance', 'Breakthrough', 'Will'],
    },
  };

  // 日文翻譯
  const jaSpecs: Record<string, PieceLocale> = {
    'red-king': {
      meaning: '全局を統率し、大勢を掌握する。リーダーシップ・決断力・核心的地位を象徴。この駒を引いたなら、主導権はあなたにある——積極的に攻めよ。',
      keywords: ['権威', '核心', '大局', '決断', '主導'],
    },
    'red-advisor': {
      meaning: '忠心をもって補佐し、帷幄で計略を巡らす。謀士の知恵と内面の修養を象徴。この駒を引いたなら、貴人が助けてくれる——守りを固めよ。',
      keywords: ['忠誠', '補佐', '謀略', '内省', '貴人'],
    },
    'red-elephant': {
      meaning: '遠くを見通す識見、全局を胸に抱く。計画力と防御の知恵を象徴。この駒を引いたなら、熟慮の後に行動せよ——長期的視野を持て。',
      keywords: ['遠見', '計画', '防御', '格局', '知恵'],
    },
    'red-chariot': {
      meaning: '縦横無尽に駆け抜け、勢いは止められない。力・速度・事業発展を象徴。この駒を引いたなら、行動力は十分——勇往邁進せよ。',
      keywords: ['力', '速度', '事業', '直行', '突破'],
    },
    'red-horse': {
      meaning: '柔軟に変化し、一日に千里を駆ける。機会・恋愛・人間関係を象徴。この駒を引いたなら、変化が訪れる——臨機応変に対応せよ。',
      keywords: ['柔軟', '恋愛', '旅行', '変化', '好機'],
    },
    'red-cannon': {
      meaning: '山越しに敵を撃ち、一鳴りで人を驚かす。突破力・創造性・秘めた実力を象徴。この駒を引いたなら、嬉しい驚き——奇襲で勝て。',
      keywords: ['突破', '創造', '驚喜', '潜在', '奇策'],
    },
    'red-pawn': {
      meaning: '一歩ずつ陣を固め、砂を積んで塔となる。堅持・蓄積・着実な前進を象徴。この駒を引いたなら、努力は無駄にならない——持続あるのみ。',
      keywords: ['堅持', '蓄積', '着実', '漸進', '意志'],
    },
    'black-king': {
      meaning: '中軍に坐し、帷幄で計略を練る。穩重・守成・大局観を象徴。この駒を引いたなら、安定の中で勝機を探れ——冷静に対処せよ。',
      keywords: ['穩重', '守成', '大局', '掌握', '沈着'],
    },
    'black-advisor': {
      meaning: '陰ながら助け、明るく補佐する。忠誠の守護者。この駒を引いたなら、背後に貴人がいる——信頼を置け。',
      keywords: ['守護', '内助', '忠心', '内面', '支援'],
    },
    'black-elephant': {
      meaning: '大象は形なく、大音は声希なり。巨視的視野と無形の力を象徴。この駒を引いたなら、格局は宏大——世界を見渡せ。',
      keywords: ['巨視', '無形', '知恵', '大局', '遠見'],
    },
    'black-chariot': {
      meaning: '破竹の勢いで、長駆して敵陣に入る。強大な実行力と果断な行動を象徴。この駒を引いたなら、時機は到来——即断即行せよ。',
      keywords: ['実行', '果断', '力', '直進', '行動'],
    },
    'black-horse': {
      meaning: '月を踏んで来たり、変化は測れない。意外な転機・人縁・恋愛運を象徴。この駒を引いたなら、転換点が近い——流れに乗れ。',
      keywords: ['転機', '人縁', '変化', '恋愛', '機動'],
    },
    'black-cannon': {
      meaning: '鋒を隠し、厚く積んで薄く発する。潜在能力・忍耐・爆発力を象徴。この駒を引いたなら、勢いは蓄えられている——時機を待て。',
      keywords: ['潜在', '忍耐', '爆発', '蓄力', '時機'],
    },
    'black-pawn': {
      meaning: '勇往にして前に進み、義をもって顧みない。決心・勇気・不退の意志を象徴。この駒を引いたなら、舟を破って釜を沈めよ——最後までやり遂げよ。',
      keywords: ['勇気', '決心', '前進', '突破', '意志'],
    },
  };

  for (const [key, spec] of Object.entries(specs)) {
    const [color, type] = key.split('-') as [string, string];
    for (let i = 1; i <= spec.count; i++) {
      const id = `${color}-${type}-${i}`;
      const ja = jaSpecs[key];
      map[id] = {
        en: { meaning: spec.meaning, keywords: spec.keywords },
        ja: { meaning: ja.meaning, keywords: ja.keywords },
      };
    }
  }

  return map;
}

export const pieceTranslations = buildPieceTranslations();
