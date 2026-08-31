/**
 * 由《靈棋經》原文產生 src/data/lingqiOracles.ts。
 *
 * 來源：維基文庫「靈棋經」（公有領域，頁面標記 {{PD-old}}）
 *   https://zh.wikisource.org/w/index.php?title=%E9%9D%88%E6%A3%8B%E7%B6%93&action=raw
 *
 * 用法：
 *   curl -sL "<上列網址>" -o lingqi.txt
 *   node scripts/build-lingqi-oracles.mjs lingqi.txt
 *
 * 原文每卦的版式固定為：
 *   ==<卦目>==            例：==一上一中一下==（數量為零的一才略去不寫）
 *   <卦名> <象>           例：大通卦 升騰之象
 *   <斷> <方位>           例：純陽得令 乾天西北     ← 純陰饅一卦無此行
 *   象曰：<四言數句>
 *   詩曰：<七言數句>
 *
 * 原文標記有異體，解析時一併認得，但字句本身逐字照收、不代為更正：
 *   - 標記後的標點「：；，。．」都出現過，斷句符另有「、？！」
 *   - 「四上一中三下」的詩以「許曰：」起首（原文如此）
 *   - 維基頁面有三處 OCR 把「一」認成破折號 U+2014，逐條列在 OCR_FIXES
 *     並在此更正——它不是異體字而是轉錄缺陷，留著會在畫面上印出破折號
 *
 * 吉凶等級原文沒有，因此也不生成——不替原典補寫它沒有的東西。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const NUMERALS = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4 };
const XIANG = /象曰[：；，。．]/;
/** 全書僅「二上四中」一卦在象曰之後另有一段「又曰：」，收進 xiangAlt */
const XIANG_ALT = /^又曰[：；，。．]/m;
const SHI = /[詩許]曰[：；，。．]/;
/** 41 卦在詩曰之後另附一首「又：」，同屬原典內容，收進 shiAlt */
const ALT = /^又[：；，。．]/m;

/**
 * 維基來源的 OCR 缺陷更正。逐條列出而不用通則取代，是為了讓「動了原文哪裡」
 * 可被逐字核對——每加一條都要先確認它是轉錄錯誤，而非原典本來的異體。
 */
const OCR_FIXES = [
  // 破折號 U+2014 是「一」的誤認
  ['賜藥—丸', '賜藥一丸'],
  ['名香—炷', '名香一炷'],
  ['—牛兩尾', '一牛兩尾'],
  // 衍字：鄰近字句竄入詩行。判準是七言絕句的句長——去掉衍出的字後，
  // 該首四句各自回到七字，且衍出的字都是相鄰句子的重複，不是另有出處的異文。
  ['東風吹動九挈闕卻卻衢開', '東風吹動九衢開'], // 挈闕卻卻 為衍字
  ['彩賒鸞銜詔下天涯', '彩鸞銜詔下天涯'], // 賒 自上句「驛路賒」重複
  ['仕進功 民名世垃名世所誇', '仕進功名世所誇'], // 民名世垃 為衍字
  // 來源本身就以 XX 代表轉錄不出的字。改標成缺字符□，不臆補內容——
  // 使用者看到的是「這裡原文有闕」，而不是我們編出來的兩個字。
  ['遷居每致XX', '遷居每致□□'],
];

/** 卦目（如「二上一中」）→ 三才數量。原文省略數量為零的一才。 */
function parseNotation(notation) {
  if (notation === '純陰饅') return { upper: 0, middle: 0, lower: 0 };
  const slot = { 上: 'upper', 中: 'middle', 下: 'lower' };
  const counts = { upper: 0, middle: 0, lower: 0 };
  const pairs = notation.match(/([零一二三四])([上中下])/g) ?? [];
  if (pairs.join('') !== notation) throw new Error(`卦目無法解析：${notation}`);
  for (const pair of pairs) counts[slot[pair[1]]] = NUMERALS[pair[0]];
  return counts;
}

/**
 * 取某個標記之後、下一個標記之前的句子；原文以全形標點斷句。
 * `until` 給多個候選時取最早出現的那個——象曰之後可能接「又曰」也可能直接接「詩曰」。
 */
function section(body, notation, from, until = []) {
  const start = body.match(from);
  if (!start) throw new Error(`${notation} 缺少 ${from}`);
  const after = body.slice(start.index + start[0].length);
  const ends = until.map(marker => after.match(marker)).filter(Boolean).map(m => m.index);
  const end = ends.length ? Math.min(...ends) : after.length;
  return after
    .slice(0, end)
    .split(/[，。．.、；：！？\n]/)
    .map(line => line.trim())
    .filter(Boolean);
}

// 先去掉維基模板（頁尾的 {{footer}}、{{PD-old}} 等），否則會被當成末卦的詩句收進去
let raw = readFileSync(process.argv[2], 'utf8').replace(/\{\{[^}]*\}\}/g, '');
for (const [wrong, right] of OCR_FIXES) {
  if (!raw.includes(wrong)) throw new Error(`OCR 更正落空，來源已變動：${wrong}`);
  raw = raw.replaceAll(wrong, right);
}
if (raw.includes('—')) throw new Error('尚有未列入 OCR_FIXES 的破折號');
const sections = raw.split(/^==([^=]+)==[ \t]*$/m).slice(1);
const entries = [];

for (let i = 0; i < sections.length; i += 2) {
  const notation = sections[i].trim();
  const lines = sections[i + 1].split('\n').map(line => line.trim()).filter(Boolean);
  const { upper, middle, lower } = parseNotation(notation);

  const [name, image] = lines[0].split(/\s+/);
  // 純陰饅無「斷 方位」行，其第二行已是象曰
  const hasStance = !XIANG.test(lines[1]);
  // 斷與方位通常以空白分隔，「三上二中四下」一卦原文用頓號
  const [stance, direction] = hasStance ? lines[1].split(/[\s、]+/) : ['', ''];

  const body = lines.slice(hasStance ? 2 : 1).join('\n');
  entries.push({
    key: `${upper}-${middle}-${lower}`,
    notation,
    name,
    image,
    stance: stance ?? '',
    direction: direction ?? '',
    xiang: section(body, notation, XIANG, [XIANG_ALT, SHI]),
    xiangAlt: XIANG_ALT.test(body) ? section(body, notation, XIANG_ALT, [SHI]) : [],
    shi: section(body, notation, SHI, [ALT]),
    shiAlt: ALT.test(body) ? section(body, notation, ALT) : [],
  });
}

// 一次收齊所有異常再拋，否則來源有多處毛病時得一輪一輪撞
const problems = [];
if (entries.length !== 125) problems.push(`應有 125 卦，實得 ${entries.length}`);
if (new Set(entries.map(e => e.key)).size !== 125) problems.push('卦目鍵值重複');
for (const e of entries) {
  if (!e.name || !e.image || !e.xiang.length || !e.shi.length) problems.push(`${e.notation} 欄位不全`);
  if (/[曰]/.test(e.xiang.concat(e.xiangAlt, e.shi, e.shiAlt).join(''))) problems.push(`${e.notation} 有標記漏進內容`);
  // 純陰饅之外都該有斷與方位
  if ((!e.stance || !e.direction) && e.notation !== '純陰饅') problems.push(`${e.notation} 缺斷／方位`);
  // 象曰四言、詩曰五或七言，另有「兮」體的兩字短句（如「慎兮」）。
  // 上限抓寬到 9 是為了擋解析越界——真正吃到下一段時句長會遠超過這個數。
  for (const line of [...e.xiang, ...e.xiangAlt, ...e.shi, ...e.shiAlt]) {
    if (line.length < 2 || line.length > 9) problems.push(`${e.notation} 句長異常：${line}`);
  }
}
if (problems.length) throw new Error(`來源異常 ${problems.length} 處：\n  ${problems.join('\n  ')}`);

/** 原文不含單引號，直接以單引號包字串即可；仍留一道檢查免得來源日後變動 */
const quote = value => {
  if (value.includes("'") || value.includes('\\')) throw new Error(`字串含需跳脫的字元：${value}`);
  return `'${value}'`;
};
const list = values => `[${values.map(quote).join(', ')}]`;

const rows = entries
  .map(e => `  { key: ${quote(e.key)}, notation: ${quote(e.notation)}, name: ${quote(e.name)}, image: ${quote(e.image)},`
    + ` stance: ${quote(e.stance)}, direction: ${quote(e.direction)},`
    + ` xiang: ${list(e.xiang)}, xiangAlt: ${list(e.xiangAlt)},`
    + ` shi: ${list(e.shi)}, shiAlt: ${list(e.shiAlt)} },`)
  .join('\n');

writeFileSync(
  'src/data/lingqiOracles.ts',
  `/**
 * 《靈棋經》125 卦目。**本檔由 scripts/build-lingqi-oracles.mjs 產生，請勿手改。**
 *
 * 原文取自維基文庫「靈棋經」（公有領域，頁面標記 PD-old）：
 * https://zh.wikisource.org/wiki/%E9%9D%88%E6%A3%8B%E7%B6%93
 *
 * 逐字保留原典，不增不刪。與棋子漢字、六十四卦卦名同屬命理資料值，
 * 三語介面一律顯示漢字原文不翻譯（理由見 services/lingqi.ts）。
 *
 * 原文未載吉凶等級，故本檔沒有 level 欄位——不替原典補寫它沒有的東西。
 * 靈棋記錄因此不進入「吉凶分佈」與「依等級應驗率」，邊界釘在 lingqi.test.ts。
 */
export interface LingqiOracle {
  /** 三才數量鍵值 \`上-中-下\`，對應 lingqiKey() */
  key: string;
  /** 原典卦目，數量為零的一才略去不寫（全零者作「純陰饅」） */
  notation: string;
  /** 卦名，如「大通卦」 */
  name: string;
  /** 象，如「升騰之象」 */
  image: string;
  /** 斷，如「純陽得令」；純陰饅一卦原文從缺 */
  stance: string;
  /** 方位，如「乾天西北」；純陰饅一卦原文從缺 */
  direction: string;
  /** 象曰，四言 */
  xiang: string[];
  /** 「又曰」——象曰之後的第二段，全書僅「二上四中」一卦有，其餘為空陣列 */
  xiangAlt: string[];
  /** 詩曰，七言或五言 */
  shi: string[];
  /** 「又」——原文在詩曰之後另附的第二首，41 卦有，其餘為空陣列 */
  shiAlt: string[];
}

export const LINGQI_ORACLES: LingqiOracle[] = [
${rows}
];
`,
  'utf8',
);

console.log('寫入 125 卦目 → src/data/lingqiOracles.ts');
