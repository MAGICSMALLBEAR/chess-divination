/**
 * 由維基文庫《周易》產生 src/data/zhouyiTexts.ts（六十四卦的卦辭與大象傳）。
 *
 * 來源（皆維基文庫，公有領域）：
 *   周易 索引頁   https://zh.wikisource.org/w/index.php?title=周易&action=raw
 *   周易 逐卦頁   …?title=周易/屯&action=raw            ← 卦辭取這裡（與既有 384 條爻辭同一頁）
 *   周易 大象頁   …?title=周易/大象&action=raw          ← 大象取這裡（標點體例一致）
 *   周易正義      …?title=周易正義/01屯&action=raw      ← 十三經注疏本，只拿來對照
 *
 * 來源固定在 SOURCE_AS_OF 那一刻的修訂版（維基 API 取「該時間點之前最新的一版」），不抓現行版：
 * 維基文庫會被編修——2026-09-27 就有一批逐卦頁被改成另一個版本（艮「列其夤，厲薰心」→「裂其夤，厲閽心」、
 * 萃拿掉起首的「亨」、革「巳日」→「已日」），而那是 S81 查核之後的事。固定版本才能重現，
 * 已查核過的經文也才不會跟著來源悄悄變。要換成較新的版本時，改 SOURCE_AS_OF 並重新查核。
 *
 * 用法：
 *   node scripts/build-zhouyi-texts.mjs [快取目錄]
 * 給了快取目錄就先讀目錄裡的檔案、沒有才上網抓並存進去（共 130 頁），重跑不必再抓。
 *
 * 逐卦頁的版式：
 *   [[周易]]　第三卦                                   ← 文王卦序
 *   **<span …>'''屯'''：元亨，利貞。…</span>           ← 卦辭（後半部的頁面沒有 span）
 *   *#<span …>初九：磐桓，…</span>                     ← 爻辭（乾坤另有用九／用六，一併收進 allMoving）
 *   *'''彖曰：''' … *'''象曰：''' …                    ← 傳，爻辭段到此為止
 *
 * 三道查核，任一不過就不寫檔：
 *   1. 逐卦頁解析出的爻辭，逐字出現在 yaoReading.ts 已校對的 384 條裡——證明解析抓對了行、
 *      取的是同一個版本。已知逐卦頁有兩卦的爻辭帶轉錄瑕疵（否的爻名後用逗號、
 *      豐的「觌」是簡體），384 條當初已更正；這兩卦列在 YAO_KNOWN_DEFECTS，不算失敗。
 *   2. 大象頁與逐卦頁的大象，去掉標點並對過異體字後一字不差；唯一例外列在 IMAGE_OVERRIDES。
 *   3. 卦辭、大象與用九／用六，去掉標點並對過異體字後，字序原樣出現在《周易正義》的經文裡——
 *      跨版本印證；正義本身的轉錄瑕疵列在 ZHENGYI_KNOWN_DEFECTS。
 *   4. 已經在 zhouyiTexts.ts 裡的卦辭與大象，重產後一字不差——改了腳本或 SOURCE_AS_OF 卻動到已查核的
 *      經文，就是出錯了（要改經文得先刪掉那一卦、明白地重新查核）。
 *   另外斷言用九／用六只出現在乾、坤兩卦，各一條——多或少都代表解析抓錯了行。
 *
 * 異體字表 VARIANTS 只用在查核的比對，**不改寫收進來的字**：畫面上印的是來源原字。
 * 字句逐字照收；只拿掉維基標記（-{无}- 的繁簡轉換保護、span、粗體）與多餘空白。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'zhouyiTexts.ts');
const YAO_SOURCE = readFileSync(join(ROOT, 'src', 'services', 'yaoReading.ts'), 'utf8');
const cacheDir = process.argv[2];

/**
 * 版本之間的異體／通假字，查核比對時視為同一字。
 * 每一組都是在本次比對中實際遇到、且為通行的版本異文，不是轉錄錯誤。
 */
const VARIANTS = {
  无: '無', 于: '於', 恆: '恒', 衆: '眾', 荐: '薦', 甯: '寧', 辯: '辨',
  鄉: '嚮', 遁: '遯', 曆: '歷', 脩: '修',
  // 乾用九「見羣龍无首」：逐卦頁作羣、周易正義作群（同一版本的渙卦逐卦頁作群）
  羣: '群',
  // 革卦「巳日乃孚」：正義的經文作「己日」，但同頁王弼注與孔疏都引作「巳日」，
  // 逐卦頁的卦辭與彖傳也作「巳日」。己／巳是《易》學上著名的異文，兩說並存
  己: '巳',
};

/** 逐卦頁爻辭的已知轉錄瑕疵：384 條當初已逐條更正，這裡不重複報錯 */
const YAO_KNOWN_DEFECTS = {
  12: '爻名後用逗號而非冒號（「初六，拔茅茹…」）',
  55: '上六「三歲不觌」的觌是簡體，應作覿',
};

/**
 * 大象取大象頁，但逐卦頁與大象頁用字不同、且大象頁可疑時在此改取。目前只有剝：
 * 逐卦頁作「山附地上」，大象頁與《周易正義》經文都作「山附於地」，正義孔疏亦云
 * 「山附於地剝」。兩個來源一致，取「山附於地」，也就是大象頁原樣——這一條登記的是
 * 「逐卦頁與大象頁不一致、已裁定」，不是改字。
 */
const IMAGE_OVERRIDES = {
  23: '逐卦頁作「山附地上」；大象頁與周易正義皆作「山附於地」，從後者',
};

/** 《周易正義》維基轉錄的瑕疵：比對時認得、不算失敗 */
const ZHENGYI_KNOWN_DEFECTS = {
  48: '卦辭：王弼注「巳來至而未出井也」混進經文、沒有包進注的標記',
};

/** 來源版本：取這個時間點之前最新的修訂版（S81 查核時的版本；隔天就有一批逐卦頁被改寫） */
const SOURCE_AS_OF = '2026-09-27T00:00:00Z';

const revisionUrl = title =>
  'https://zh.wikisource.org/w/api.php?action=query&format=json&formatversion=2&prop=revisions'
  + `&titles=${encodeURIComponent(title)}&rvlimit=1&rvdir=older&rvstart=${SOURCE_AS_OF}`
  + '&rvprop=content|ids|timestamp&rvslots=main';

// 維基媒體要求腳本帶可識別的 User-Agent，預設的會被限流（429）
const USER_AGENT = 'chess-divination-build/1.0 (https://github.com/MAGICSMALLBEAR/chess-divination)';

async function fetchRaw(title) {
  const cacheFile = cacheDir && join(cacheDir, `${title.replace(/\//g, '_')}.txt`);
  if (cacheFile && existsSync(cacheFile)) return readFileSync(cacheFile, 'utf8');
  await new Promise(r => setTimeout(r, 500));
  const res = await fetch(revisionUrl(title), { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`抓取失敗 ${res.status}：${title}`);
  const rev = (await res.json()).query?.pages?.[0]?.revisions?.[0];
  if (!rev) throw new Error(`${title}：${SOURCE_AS_OF} 之前沒有修訂版`);
  const text = rev.slots.main.content;
  if (cacheFile) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cacheFile, text);
  }
  return text;
}

/** 拿掉維基標記與多餘空白，只留經文與標點 */
function clean(s) {
  return s
    .replace(/-\{([^}]*)\}-/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/'''/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** 只留漢字、異體歸一，供跨版本比對字序 */
function comparable(s) {
  return [...s.replace(/[^㐀-鿿豈-﫿]/g, '')].map(c => VARIANTS[c] ?? c).join('');
}

/** 《周易正義》某卦頁的經文：去掉 [疏] 段落、{{*|王弼注}}、頁首模板，拆開 {{+|…}}（乾卦頁用它包經文） */
function zhengyiText(raw) {
  return comparable(
    raw.split('\n')
      .filter(l => !/^\s*\[疏\]/.test(l) && !/^:?\{\{批\|/.test(l) && !/^[|}]/.test(l) && !/^\{\{header/i.test(l))
      .join('')
      .replace(/\{\{\*\|[^}]*\}\}/g, '')
      .replace(/\{\{\+\|([^}]*)\}\}/g, '$1')
      .replace(/-\{(?:A\|)?([^}]*)\}-/g, '$1')
      .replace(/\[\[[^\]]*\]\]/g, ''),
  );
}

const DIGITS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
/** 「三」「十四」「六十四」→ 數字 */
function parseOrder(s) {
  let n = 0;
  let current = 0;
  for (const ch of s) {
    if (ch === '十') { n += (current || 1) * 10; current = 0; } else { current = DIGITS[ch]; }
  }
  return n + current;
}

function parsePage(title, raw) {
  const orderMatch = raw.match(/第([一二三四五六七八九十]+)卦/);
  if (!orderMatch) throw new Error(`${title}：找不到卦序`);
  const order = parseOrder(orderMatch[1]);

  const lines = raw.split('\n');
  // 卦辭以粗體卦名起首。多數寫作「屯：元亨…」，但履、否、同人、艮等卦的卦名
  // 就是句子的一部分（「履虎尾，不咥人，亨。」），沒有冒號——所以整句照收、
  // 不拆掉卦名；粗體只拿來認卦名
  const judgmentAt = lines.findIndex(l => /^\*\*(<span[^>]*>)?'''[^']+'''/.test(l));
  if (judgmentAt < 0) throw new Error(`${title}：找不到卦辭`);
  const judgmentLine = lines[judgmentAt];
  const name = clean(judgmentLine.match(/'''([^']+)'''/)[1]);
  const judgment = clean(judgmentLine.slice(2));

  // 爻辭只取「易經」那一段：小象的每一行也以 *# 起首，取到下一個 *'''…''' 段落標題為止
  const sectionEnd = lines.findIndex((l, i) => i > judgmentAt && /^\*'''/.test(l));
  const yao = lines.slice(judgmentAt + 1, sectionEnd < 0 ? undefined : sectionEnd)
    .filter(l => l.startsWith('*#'))
    .map(l => clean(l.slice(2)));

  const xiangAt = lines.findIndex(l => /^\*'''象曰：'''/.test(l));
  if (xiangAt < 0) throw new Error(`${title}：找不到象曰`);
  const xiangLine = lines.slice(xiangAt + 1).find(l => /^\*\*[^*#]/.test(l));
  if (!xiangLine) throw new Error(`${title}：象曰之後沒有大象`);
  const pageImage = clean(xiangLine.slice(2));

  // 用九／用六：六爻皆變時讀的辭，只有乾坤有。與六爻同在爻辭段
  const allMoving = yao.filter(y => /^用[九六]：/.test(y));

  return { order, name, judgment, pageImage, yao, allMoving };
}

async function main() {
  const index = await fetchRaw('周易');
  const table = index.slice(index.indexOf('== 六十四卦速查表'));
  const titles = [...new Set([...table.matchAll(/\[\[\/([^|\]]+)\|/g)].map(m => m[1]))];
  if (titles.length !== 64) throw new Error(`速查表應有 64 卦，實得 ${titles.length}`);

  const pages = [];
  for (const title of titles) pages.push(parsePage(title, await fetchRaw(`周易/${title}`)));
  pages.sort((a, b) => a.order - b.order);
  const orders = pages.map(p => p.order).join(',');
  if (orders !== Array.from({ length: 64 }, (_, i) => i + 1).join(',')) {
    throw new Error(`卦序不是 1–64 各一：${orders}`);
  }

  // 大象頁依文王卦序逐行排列；卦名寫法與逐卦頁不盡相同（坎／習坎），故以順序對，不以卦名對
  const daxiang = (await fetchRaw('周易/大象')).split('\n')
    .filter(l => l.startsWith('#'))
    .map(l => clean(l.slice(1)).replace(/^[^：]+：/, ''));
  if (daxiang.length !== 64) throw new Error(`大象頁應有 64 行，實得 ${daxiang.length}`);
  for (const p of pages) p.image = daxiang[p.order - 1];

  const problems = [];
  const used = { yao: new Set(), image: new Set(), zhengyi: new Set() };

  // 查核一：爻辭逐字出現在已校對的 384 條裡（用九／用六不在 384 條之內，略過）
  for (const p of pages) {
    const six = p.yao.filter(y => !/^用[九六]：/.test(y));
    if (six.length !== 6) problems.push(`#${p.order} ${p.name}：爻辭 ${six.length} 條`);
    const bad = six.filter(y => !YAO_SOURCE.includes(`'${y}'`));
    if (bad.length && YAO_KNOWN_DEFECTS[p.order]) used.yao.add(p.order);
    else for (const y of bad) problems.push(`#${p.order} ${p.name}：爻辭對不上既有校對「${y}」`);
  }

  // 用九／用六只屬乾坤，各一條，而且乾是用九、坤是用六
  for (const p of pages) {
    const want = p.order === 1 ? '用九：' : p.order === 2 ? '用六：' : null;
    const ok = want ? p.allMoving.length === 1 && p.allMoving[0].startsWith(want) : p.allMoving.length === 0;
    if (!ok) problems.push(`#${p.order} ${p.name}：用九／用六應為 ${want ?? '無'}，實得 ${JSON.stringify(p.allMoving)}`);
  }

  // 查核二：大象頁與逐卦頁一致（去標點、異體歸一）
  for (const p of pages) {
    if (comparable(p.image) === comparable(p.pageImage)) continue;
    if (IMAGE_OVERRIDES[p.order]) used.image.add(p.order);
    else problems.push(`#${p.order} ${p.name}：大象兩頁用字不同「${p.image}」／「${p.pageImage}」`);
  }

  // 查核三：卦辭與大象的字序出現在《周易正義》經文裡
  const zyIndex = await fetchRaw('周易正義');
  const zyTitles = [...zyIndex.matchAll(/\[\[\/(0[1-6][^|\]]+)/g)].map(m => m[1]);
  if (zyTitles.length !== 64) throw new Error(`周易正義應有 64 卦頁，實得 ${zyTitles.length}`);
  for (const p of pages) {
    const zy = zhengyiText(await fetchRaw(`周易正義/${zyTitles[p.order - 1]}`));
    const texts = [['卦辭', p.judgment], ['大象', p.image], ...p.allMoving.map(y => ['用九用六', y])];
    for (const [label, text] of texts) {
      if (zy.includes(comparable(text))) continue;
      if (ZHENGYI_KNOWN_DEFECTS[p.order]?.startsWith(label)) used.zhengyi.add(p.order);
      else problems.push(`#${p.order} ${p.name}：${label}在周易正義找不到「${text}」`);
    }
  }

  // 例外清單只該列真的用到的——資料更正了、例外卻還留著，下次就會掩護到別的問題
  for (const [label, list, hit] of [
    ['YAO_KNOWN_DEFECTS', YAO_KNOWN_DEFECTS, used.yao],
    ['IMAGE_OVERRIDES', IMAGE_OVERRIDES, used.image],
    ['ZHENGYI_KNOWN_DEFECTS', ZHENGYI_KNOWN_DEFECTS, used.zhengyi],
  ]) {
    for (const order of Object.keys(list)) {
      if (!hit.has(Number(order))) problems.push(`${label} 的 #${order} 沒有用到，請刪除`);
    }
  }

  // 查核四：已提交的卦辭與大象一字不差
  if (existsSync(OUT)) {
    const committed = new Map([...readFileSync(OUT, 'utf8')
      .matchAll(/^ {2}(\d+): \{ name: '([^']*)', judgment: '([^']*)', image: '([^']*)'/gm)]
      .map(m => [Number(m[1]), m.slice(2, 5).join('|')]));
    if (committed.size !== 64) problems.push(`讀已提交版本：應有 64 卦，實得 ${committed.size}`);
    for (const p of pages) {
      const now = [p.name, p.judgment, p.image].join('|');
      if (committed.has(p.order) && committed.get(p.order) !== now) {
        problems.push(`#${p.order} ${p.name}：與已提交版本不同「${committed.get(p.order)}」→「${now}」`);
      }
    }
  }

  if (problems.length) {
    console.error(problems.join('\n'));
    throw new Error(`查核未過 ${problems.length} 處，不寫檔`);
  }

  const entries = pages.map(p =>
    `  ${p.order}: { name: '${p.name}', judgment: '${p.judgment}', image: '${p.image}'${
      p.allMoving.length ? `, allMoving: '${p.allMoving[0]}'` : ''} },`);
  writeFileSync(OUT, `// 由 scripts/build-zhouyi-texts.mjs 自維基文庫《周易》產生，請勿手改——改腳本後重跑。
//
// 六十四卦的卦辭（文王）與大象傳（《象》解全卦的那一句）。Key 為文王卦序。
// 卦辭取逐卦頁（與 yaoReading.ts 的 384 條爻辭同一頁、同一版本）；大象取「周易/大象」頁。
// 乾坤另收用九／用六（逐卦頁）。來源固定在腳本的 SOURCE_AS_OF 修訂版。
// 產生時已查核：兩頁大象互相一致，卦辭、大象與用九／用六逐字對過《周易正義》（十三經注疏本），
// 版本異文與已裁定的例外列在腳本裡。經文三語皆印原文，不翻譯。

export interface ZhouyiText {
  /** 卦名，逐卦頁卦辭起首的寫法（如「屯」「大有」「習坎」） */
  name: string;
  /** 卦辭，整句照原文、含卦名（「屯：元亨…」「履虎尾，不咥人，亨。」） */
  judgment: string;
  /** 大象傳 */
  image: string;
  /**
   * 用九／用六（只有乾、坤有）：六爻皆變時讀的辭，整句照原文、含「用九：」。
   * 本 App 起卦只有單一動爻，揭曉頁不會遇到六爻皆變——這一句只在卦典裡讀得到
   */
  allMoving?: string;
}

export const ZHOUYI_TEXTS: Readonly<Record<number, ZhouyiText>> = {
${entries.join('\n')}
};
`);
  console.log(`已寫出 ${OUT}（64 卦；${pages[0].allMoving[0]}／${pages[1].allMoving[0]}）`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
