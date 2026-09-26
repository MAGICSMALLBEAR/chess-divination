// 命理術語詞典 — 六爻納甲盤上印著的漢字術語
//
// 收錄標準（與 divinationProse 的保留術語清單同一條線）：**該詞在盤面或斷語
// 裡真的印出來**，才有資格進詞典。詞典是給看不懂盤面的人查的，不是命理百科；
// 收了盤面上找不到的詞，使用者查到也對不起來。
//
// 每一條分兩段，刻意分開寫：
//   plain — 這個詞在命理裡是什麼意思（一般說法，不因本 App 而異）
//   inApp — 本 App 在盤面上怎麼取、怎麼用（可能比傳統取法簡單，會明說）
// 第二段是這份詞典比一般術語表多出來的價值：它必須與程式行為一致，
// 所以 glossary.test.ts 會對回 useGod／najja 等真相來源，而不是只檢查有沒有寫。
//
// 三語放在同一筆條目裡（而不是像籤詩那樣另開翻譯檔）：詞典的每一條都是
// 「一個詞、兩段話」的整體，增減條目時三語同進同出，缺一個語言在型別上就過不了。
// 術語本身一律保留漢字、不翻譯（見 translations/divination.ts 的原則）——
// 盤上印著「妻財」，詞典就必須查得到「妻財」；en 另附 gloss 供首見對照。
//
// 刻意不寫數字（加減幾分、幾級）：那些常數在 wenwang.ts／liuyao.ts 裡，
// 詞典裡再抄一份就是第二個真相來源。要看分數，盤面的斷語會逐條列出。

import type { Lang } from '@/services/i18n';

export type GlossaryGroupId =
  | 'hexagram' | 'chart' | 'relative' | 'useGod' | 'moving' | 'strength';

/** 分組的顯示順序：由「看得到的卦」到「怎麼算」，新手由上往下讀得通 */
export const GLOSSARY_GROUPS: readonly GlossaryGroupId[] = [
  'hexagram', 'chart', 'relative', 'useGod', 'moving', 'strength',
];

type Text3 = Record<Lang, string>;

export interface GlossaryEntry {
  /** 穩定識別（不隨語言變動），供 testID 與測試指名 */
  key: string;
  /**
   * 盤面上印的漢字。兩個緊密成對的詞用「／」併成一條（如「世爻／應爻」），
   * 守門測試會逐段對回原始碼，所以每一段都必須是真的有人印出來的詞。
   */
  term: string;
  /**
   * 顯示用的術語名稱，本身並不逐字印在盤面上時，補上「盤面上實際印的字」。
   * 例如「八宮」，盤面上印的是「乾宮屬金」與「遊魂」「歸魂」。
   * 守門測試拿它（沒有寫就拿 term 的每一段）去原始碼字串裡找，找不到就是
   * 詞典收了一個盤面上根本沒有的詞。
   */
  printedAs?: readonly string[];
  group: GlossaryGroupId;
  /** 英文首見對照；zh-TW 與 ja 不顯示（日文讀者看得懂漢字） */
  gloss: string;
  plain: Text3;
  inApp: Text3;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  // ── 三卦與動爻 ──────────────────────────────────────────
  {
    key: 'primary', term: '本卦', group: 'hexagram', gloss: 'Primary hexagram',
    plain: {
      'zh-TW': '起卦直接得到的那一卦，代表你目前所處的局面。',
      en: 'The hexagram you get straight from the cast; it stands for the situation you are in now.',
      ja: '起卦でそのまま得られる卦で、いま置かれている状況を表します。',
    },
    inApp: {
      'zh-TW': '盤面最左邊的一卦。納甲盤與動爻的爻辭，都是依本卦排出來的。',
      en: 'The leftmost hexagram on the chart. The Na Jia chart and the moving-line text are both built from it.',
      ja: '盤面いちばん左の卦です。納甲盤と動爻の爻辞は、どちらも本卦から導かれます。',
    },
  },
  {
    key: 'nuclear', term: '互卦', group: 'hexagram', gloss: 'Nuclear hexagram',
    plain: {
      'zh-TW': '取本卦二、三、四爻為下卦，三、四、五爻為上卦，重新組成的卦。象徵事情進行中，表面之下的因素。',
      en: 'Built from lines 2–4 (lower) and 3–5 (upper) of the primary hexagram. It stands for what lies beneath the surface as things unfold.',
      ja: '本卦の二・三・四爻を下卦、三・四・五爻を上卦として組み直した卦。物事の進行中、表面の下にある要因を表します。',
    },
    inApp: {
      'zh-TW': '盤面中間的一卦，標為「隱藏因素」。它不進入用神斷語的計分，只在深度解讀的文字裡被提到。',
      en: 'The middle hexagram, labelled as hidden factors. It does not enter the use-god score; it is only mentioned in the in-depth reading text.',
      ja: '盤面中央の卦で「隠れた要因」と表示されます。用神の断の採点には入らず、詳しい解読の文章で触れられるだけです。',
    },
  },
  {
    key: 'changed', term: '變卦', group: 'hexagram', gloss: 'Resulting hexagram',
    plain: {
      'zh-TW': '把動爻的陰陽反轉後得到的卦，象徵事情發展到最後的結果。',
      en: 'The hexagram you get by flipping the moving line; it stands for where the matter ends up.',
      ja: '動爻の陰陽を反転して得られる卦で、物事が行き着く結果を表します。',
    },
    inApp: {
      'zh-TW': '盤面右邊的一卦。用神自己發動時，會拿變卦同一爻的五行來看回頭生剋與進退神。',
      en: 'The rightmost hexagram. When the use-god itself moves, the same line in this hexagram is checked for returning support or restraint and for advancing or retreating.',
      ja: '盤面右の卦です。用神自身が動いたとき、変卦の同じ爻の五行から回頭生剋や進神・退神を見ます。',
    },
  },
  {
    key: 'opposite', term: '錯卦', group: 'hexagram', gloss: 'Opposite hexagram',
    plain: {
      'zh-TW': '把一卦六爻的陰陽全部反過來得到的卦，如乾與坤、坎與離互為錯卦。象徵同一件事對立的一面。',
      en: 'The hexagram you get by flipping every line of a hexagram, as Qian and Kun, or Kan and Li, are to each other. It stands for the opposite side of the same matter.',
      ja: 'ある卦の六爻の陰陽をすべて反転して得られる卦で、乾と坤、坎と離がそれぞれ錯卦の関係です。同じ物事の対になる面を表します。',
    },
    inApp: {
      'zh-TW': '只在圖鑑的「卦典」分頁列出，可點過去讀那一卦。它不在揭曉頁的盤面上，也不進入任何斷語。',
      en: 'Listed only in the Hexagrams tab of the library, where you can tap through to it. It is not on the reveal chart and does not enter any judgement.',
      ja: '図鑑の「卦典」タブにだけ載っており、タップしてその卦を読めます。結果ページの盤面にはなく、どの断にも入りません。',
    },
  },
  {
    key: 'reversed', term: '綜卦', group: 'hexagram', gloss: 'Inverted hexagram',
    plain: {
      'zh-TW': '把一卦六爻上下顛倒（初爻變上爻）得到的卦，如屯與蒙互為綜卦。象徵換到對方的立場看同一件事。乾、坤、坎、離等八卦顛倒後不變，綜卦就是自己。',
      en: 'The hexagram you get by turning a hexagram upside down (the first line becomes the top line), as Zhun and Meng are to each other. It stands for seeing the same matter from the other side. Eight hexagrams, such as Qian, Kun, Kan and Li, look the same upside down, so they are their own inverse.',
      ja: 'ある卦の六爻を上下逆さに（初爻が上爻に）して得られる卦で、屯と蒙が綜卦の関係です。相手の立場から同じ物事を見ることを表します。乾・坤・坎・離など八つの卦は逆さにしても変わらず、綜卦は自分自身です。',
    },
    inApp: {
      'zh-TW': '與錯卦一樣，只在圖鑑的「卦典」分頁列出，不在盤面上、也不進入斷語。',
      en: 'Like the opposite hexagram, it is listed only in the Hexagrams tab of the library; it is not on the chart and does not enter any judgement.',
      ja: '錯卦と同じく、図鑑の「卦典」タブにだけ載っており、盤面にはなく、断にも入りません。',
    },
  },
  {
    key: 'movingLine', term: '動爻', group: 'hexagram', gloss: 'Moving line',
    plain: {
      'zh-TW': '本卦裡發生變化的那一爻，是整件事變化的關鍵。它的位置決定誰是體、誰是用，也決定讀哪一條爻辭。',
      en: 'The line in the primary hexagram that changes; the pivot of the whole matter. Its position decides which trigram is body and which is use, and which line text you read.',
      ja: '本卦の中で変化する爻で、物事の変化の要です。その位置が体と用を決め、どの爻辞を読むかも決めます。',
    },
    inApp: {
      'zh-TW': '本 App 一次起卦只有一條動爻。盤面上「動爻專讀」那一區，引的就是這一爻的《周易》爻辭。',
      en: 'Each cast here has exactly one moving line. The “moving-line reading” block quotes the Zhouyi text for that line.',
      ja: 'このアプリでは一回の起卦につき動爻は一本だけです。「動爻の読み」欄には、その爻の『周易』爻辞が引かれます。',
    },
  },
  {
    key: 'bodyUse', term: '體用', group: 'hexagram', gloss: 'Body & Use',
    plain: {
      'zh-TW': '動爻所在的那一卦為「用」，代表外在與所問之事；另一卦為「體」，代表你自己。再看兩者五行的生剋。',
      en: 'The trigram holding the moving line is “use” (the outside world and the matter asked); the other is “body” (yourself). Then compare how their elements generate or overcome each other.',
      ja: '動爻のある卦が「用」（外のこと・問うた事柄）、もう一方が「体」（自分）です。両者の五行の生剋を見ます。',
    },
    inApp: {
      'zh-TW': '盤面下方「體…（我）· 用…（事）」那一列就是它。用生體、體用比和、體生用等關係先給出基本的吉凶，再依月令旺衰調整。',
      en: 'The “Body … (self) · Use … (matter)” row near the bottom. The relation (use feeds body, harmony, body feeds use…) gives the base verdict, which is then adjusted for the season.',
      ja: '盤面下の「体…（我）· 用…（事）」の行がこれです。用生体・比和・体生用などの関係でまず吉凶が決まり、その後に月令の旺衰で調整されます。',
    },
  },

  // ── 納甲盤的構成 ────────────────────────────────────────
  {
    key: 'najia', term: '納甲', group: 'chart', gloss: 'Na Jia',
    plain: {
      'zh-TW': '把天干地支依卦與爻位配到每一爻上（例如「壬午」），讓每一爻都有了五行，才能論生剋。地支決定五行：子亥屬水、寅卯屬木、巳午屬火、申酉屬金、辰戌丑未屬土。',
      en: 'Assigning a heavenly stem and earthly branch (for example 壬午) to every line according to its trigram and position, so each line gets an element and can be judged by generation and overcoming. The branch fixes the element: 子亥 water, 寅卯 wood, 巳午 fire, 申酉 metal, 辰戌丑未 earth.',
      ja: '卦と爻位に従って各爻に天干地支（例：壬午）を割り当てること。各爻が五行を持つので、生剋を論じられます。支が五行を決めます：子亥は水、寅卯は木、巳午は火、申酉は金、辰戌丑未は土。',
    },
    inApp: {
      'zh-TW': '「納甲六親」區塊的每一列都是這樣排出的，每一爻標的是「干支＋五行」，如「壬午 火」。同一個卦的配法固定不變；會隨時間變的是日辰與月建。',
      en: 'Every row of the “Na Jia & Six Relatives” block is laid out this way, showing stem-branch plus element, such as 壬午 fire. A given hexagram always gets the same assignment; what changes with time is the day and month.',
      ja: '「納甲・六親」欄の各行はこうして並べられ、各爻には「干支＋五行」（例：壬午 火）が示されます。同じ卦の配当は常に同じで、時間で変わるのは日辰と月建です。',
    },
  },
  {
    key: 'wuxing', term: '五行', group: 'chart', gloss: 'Five Phases',
    plain: {
      'zh-TW': '金、木、水、火、土。相生：金生水、水生木、木生火、火生土、土生金。相剋：金剋木、木剋土、土剋水、水剋火、火剋金。',
      en: 'Metal, wood, water, fire, earth. Generating: metal→water→wood→fire→earth→metal. Overcoming: metal→wood→earth→water→fire→metal.',
      ja: '金・木・水・火・土。相生：金生水、水生木、木生火、火生土、土生金。相剋：金剋木、木剋土、土剋水、水剋火、火剋金。',
    },
    inApp: {
      'zh-TW': '爻的五行由它的地支決定。六親、旺衰與用神斷語，全都建立在這組生剋關係上。',
      en: 'A line’s element comes from its branch. Six relatives, strength states and the use-god judgment all rest on these relations.',
      ja: '爻の五行は支から決まります。六親・旺衰・用神の断は、すべてこの生剋関係の上に成り立っています。',
    },
  },
  {
    key: 'palace', term: '八宮', printedAs: ['宮屬', '遊魂', '歸魂'],
    group: 'chart', gloss: 'Eight Palaces',
    plain: {
      'zh-TW': '六十四卦分屬八個宮，每宮有一個本宮卦和七個由它變出來的卦，依序稱本宮、一世、二世、三世、四世、五世、遊魂、歸魂。宮的五行就是這一卦的五行。',
      en: 'The 64 hexagrams belong to eight palaces. Each has a pure hexagram and seven derived from it, named in order: palace, 1st to 5th generation, wandering soul, returning soul. The palace’s element is the hexagram’s element.',
      ja: '六十四卦は八つの宮に分かれ、各宮には本宮卦とそこから変じた七卦があり、本宮・一世から五世・遊魂・帰魂と呼びます。宮の五行がその卦の五行です。',
    },
    inApp: {
      'zh-TW': '納甲盤標題列的「乾宮屬金 · 三世」就是這個。世次決定世爻落在哪一爻，宮的五行則是排六親的基準。',
      en: 'The “Qian palace, metal · 3rd generation” in the Na Jia header. The generation decides where the world line falls; the palace element is the base for assigning six relatives.',
      ja: '納甲盤の見出しにある「乾宮・金 · 三世」がこれです。世次が世爻の位置を決め、宮の五行が六親を割り当てる基準になります。',
    },
  },
  {
    key: 'worldResponding', term: '世爻／應爻', printedAs: ['世爻', "'應'"],
    group: 'chart', gloss: 'World line / Responding line',
    plain: {
      'zh-TW': '世爻代表你自己，應爻代表對方或外界，兩者永遠相隔兩爻。世爻落在哪一爻，由這一卦的世次決定。',
      en: 'The world line stands for yourself; the responding line for the other party or the outside. They always sit two lines apart. Which line is “world” depends on the hexagram’s generation.',
      ja: '世爻は自分、応爻は相手や外界を表し、常に二爻を隔てています。どの爻が世になるかは、その卦の世次で決まります。',
    },
    inApp: {
      'zh-TW': '盤面在對應那一列的右側標「世」「應」。問身命、疾病、出行這類自占的事時，直接以世爻為用神。',
      en: 'Marked “W” and “R” on the right of the matching row. For questions about yourself, such as health or travel, the world line is taken as the use-god.',
      ja: '該当する行の右に「世」「応」が付きます。健康や旅行のように自分自身に関する問いでは、世爻をそのまま用神とします。',
    },
  },
  {
    key: 'sixSpirits', term: '六神',
    group: 'chart', gloss: 'Six Spirits',
    plain: {
      'zh-TW': '青龍、朱雀、勾陳、螣蛇、白虎、玄武六位，依起卦當日的天干從初爻起排、向上輪轉。傳統上各有象徵（例如青龍主喜慶、白虎主凶險），用來補充事情的性質。',
      en: 'Azure Dragon, Vermilion Bird, Hook Serpent, Soaring Snake, White Tiger and Black Tortoise, assigned from the first line upward according to the day’s stem. Traditionally each carries a flavour (Dragon for celebration, Tiger for danger).',
      ja: '青龍・朱雀・勾陳・螣蛇・白虎・玄武の六神で、起卦日の天干に従って初爻から上へ順に配されます。伝統的にそれぞれ象意があります（青龍は慶事、白虎は凶事など）。',
    },
    inApp: {
      'zh-TW': '本 App 只把六神標在盤面上供你對照，不計入用神斷語的分數。',
      en: 'The app only shows the six spirits on the chart for reference; they are not part of the use-god score.',
      ja: 'このアプリでは六神は盤面に表示するだけで、用神の断の採点には含めません。',
    },
  },
  {
    key: 'monthBranch', term: '月建', group: 'chart', gloss: 'Month branch',
    plain: {
      'zh-TW': '起卦當月的地支，例如「午月」，代表當月的時令之氣，是衡量各爻旺衰的基準。月份以節氣（立春、驚蟄……）交接為界，不是國曆每月一號。',
      en: 'The earthly branch of the month of the cast, such as the Horse month. It carries the season’s energy and is the baseline for judging each line’s strength. Months change at solar terms (Start of Spring, Awakening of Insects…), not on the 1st.',
      ja: '起卦した月の地支（例：午月）で、その月の時令の気を表し、各爻の旺衰を測る基準になります。月の変わり目は節気（立春・啓蟄…）の交代で、毎月一日ではありません。',
    },
    inApp: {
      'zh-TW': '盤面標題列的「…月」，以及旺衰區塊的「…後」，指的就是這個交節。以起卦時刻計算。',
      en: 'The “… month” in the Na Jia header and the “after …” in the strength block refer to this. It is computed from the moment of the cast.',
      ja: '納甲盤の見出しの「…月」や、旺衰欄の「…後」がこれを指します。起卦の時刻から計算されます。',
    },
  },
  {
    key: 'dayBranch', term: '日辰', group: 'chart', gloss: 'Day branch',
    plain: {
      'zh-TW': '起卦當天的干支，例如「甲子日」，其地支又稱日建。日辰是當天的主宰：它會生、剋、沖、合各爻，也決定旬空與六神。',
      en: 'The stem-branch of the day of the cast, such as 甲子, whose branch is also called the day builder. It rules the day: it can generate, overcome, clash with or combine with each line, and it fixes the void branches and six spirits.',
      ja: '起卦当日の干支（例：甲子日）で、その支は日建とも呼びます。日辰はその日の主で、各爻を生じ・剋し・沖じ・合じ、旬空や六神も決めます。',
    },
    inApp: {
      'zh-TW': '用神斷語會逐條列出日辰對用神是生、剋、比和、沖或合。地支相沖或相合時，先於五行生剋判定（相合指子丑、寅亥、卯戌、辰酉、巳申、午未）。',
      en: 'The use-god judgment lists whether the day generates, overcomes, matches, clashes with or combines with the use-god. Clash and combination are decided first, before the elements (combinations: 子丑, 寅亥, 卯戌, 辰酉, 巳申, 午未).',
      ja: '用神の断では、日辰が用神を生・剋・比和・沖・合のどれで作用するかを列挙します。沖と合は五行の生剋より先に判定します（合：子丑・寅亥・卯戌・辰酉・巳申・午未）。',
    },
  },
  {
    key: 'void', term: '旬空／空亡', group: 'chart', gloss: 'Void (empty branches)',
    plain: {
      'zh-TW': '干支六十組每十組為一旬，十天只用去十二地支中的十個，剩下兩支就是旬空，也叫空亡（例如甲子旬的空亡是戌、亥）。落在旬空的爻，傳統上視為力量落空。',
      en: 'The sixty stem-branch pairs run in groups of ten (a xun). Ten days use only ten of the twelve branches; the two left over are void (for the 甲子 xun: 戌 and 亥). A line on a void branch is traditionally seen as having its strength emptied.',
      ja: '六十干支は十組ごとに一旬とし、十日で十二支のうち十しか使わないため、残る二支が旬空（空亡）です（甲子旬なら戌・亥）。旬空に落ちた爻は力が空になると伝統的に見ます。',
    },
    inApp: {
      'zh-TW': '納甲盤標題列顯示當日的旬與空亡，落空的爻在右側標「空」。用神落空亡會在斷語裡扣分；本 App 取法較簡，不區分傳統上「旺空」「動空」等例外。',
      en: 'The Na Jia header shows the day’s xun and void branches, and a void line is marked “V”. A void use-god lowers the score; the app keeps this simple and does not distinguish traditional exceptions such as strong-void or moving-void.',
      ja: '納甲盤の見出しにその日の旬と空亡が表示され、空になった爻には「空」が付きます。用神が空亡なら採点を下げます。取り方は簡略で、旺空・動空などの伝統上の例外までは見分けません。',
    },
  },
  {
    key: 'clash', term: '相沖', group: 'chart', gloss: 'Clash',
    plain: {
      'zh-TW': '地支中正對的兩支互相沖擊：子午、丑未、寅申、卯酉、辰戌、巳亥。',
      en: 'Two branches directly opposite each other clash: 子午, 丑未, 寅申, 卯酉, 辰戌, 巳亥.',
      ja: '向かい合う二つの支が互いに衝突すること：子午・丑未・寅申・卯酉・辰戌・巳亥。',
    },
    inApp: {
      'zh-TW': '爻與月建相沖稱月破，爻與日辰相沖稱日沖，盤面分別標「破」「沖」。',
      en: 'A line clashing with the month branch is a month break; clashing with the day branch is a day clash. The chart marks them “M” and “D”.',
      ja: '爻が月建と沖なら月破、日辰と沖なら日沖で、盤面にはそれぞれ「破」「沖」が付きます。',
    },
  },
  {
    key: 'monthBroken', term: '月破', group: 'chart', gloss: 'Month break',
    plain: {
      'zh-TW': '爻的地支與月建相沖。爻被當月之氣沖散，傳統上視為根基受損。',
      en: 'A line whose branch clashes with the month branch. Scattered by the month’s energy, it is traditionally seen as having a damaged foundation.',
      ja: '爻の支が月建と沖していること。当月の気に散らされ、根が傷ついたと伝統的に見ます。',
    },
    inApp: {
      'zh-TW': '盤面標「破」。用神逢月破，斷語會扣分。',
      en: 'Marked “M” on the chart. A use-god hit by a month break lowers the judgment score.',
      ja: '盤面に「破」が付きます。用神が月破なら断の採点を下げます。',
    },
  },
  {
    key: 'dayClash', term: '日沖', group: 'chart', gloss: 'Day clash',
    plain: {
      'zh-TW': '爻的地支與日辰相沖。日沖不等於日破：還要看那一爻旺不旺、有沒有發動。',
      en: 'A line whose branch clashes with the day branch. A day clash is not automatically a day break; how strong the line is, and whether it moves, still matter.',
      ja: '爻の支が日辰と沖していること。日沖がそのまま日破とは限らず、その爻の旺衰や動静も併せて見ます。',
    },
    inApp: {
      'zh-TW': '盤面標「沖」。靜爻旺相而逢日沖稱為暗動（有力）；用神被日辰沖，斷語會扣分。',
      en: 'Marked “D” on the chart. A still line that is strong and hit by a day clash counts as hidden movement (it has force); a use-god clashed by the day lowers the score.',
      ja: '盤面に「沖」が付きます。静爻が旺相で日沖を受けると暗動（力あり）と数え、用神が日辰に沖されると採点を下げます。',
    },
  },

  // ── 六親 ────────────────────────────────────────────────
  {
    key: 'sixRelatives', term: '六親', group: 'relative', gloss: 'Six Relatives',
    plain: {
      'zh-TW': '以「宮的五行」為基準，看每一爻的五行與它的關係，分成五種身分：同我者為兄弟、我生者為子孫、我剋者為妻財、剋我者為官鬼、生我者為父母。',
      en: 'Measured against the palace’s element, each line falls into one of five roles: same as me is Sibling (兄弟), what I generate is Offspring (子孫), what I overcome is Wealth (妻財), what overcomes me is Officer (官鬼), what generates me is Parent (父母).',
      ja: '宮の五行を基準に、各爻の五行との関係で五つの身分に分けます：同じなら兄弟、我が生ずるなら子孫、我が剋するなら妻財、我を剋するなら官鬼、我を生ずるなら父母。',
    },
    inApp: {
      'zh-TW': '盤面每一列的「兄弟／子孫／妻財／官鬼／父母」就是六親。問哪一類的事，就去找代表那件事的六親，那就是用神。',
      en: 'The label on each row is its relative. Whatever you ask about maps to one of them, and that one is the use-god.',
      ja: '盤面の各行に付く「兄弟／子孫／妻財／官鬼／父母」が六親です。問う事柄に対応する六親が用神になります。',
    },
  },
  {
    key: 'parent', term: '父母', group: 'relative', gloss: 'Parent',
    plain: {
      'zh-TW': '生我者。代表長輩、文書、證件、房屋車子與考試，也就是「保護與憑據」。',
      en: 'What generates me. It stands for elders, documents, certificates, property and vehicles, and exams: shelter and credentials.',
      ja: '我を生ずるもの。年長者・書類・証書・家屋や乗り物・試験など、保護と拠り所を表します。',
    },
    inApp: {
      'zh-TW': '學業問事以父母為用神；事業、官司、出行問事中，它是有利的喜神。',
      en: 'For study questions it is the use-god; for career, lawsuit and travel questions it is the favorable spirit.',
      ja: '学業の問いでは用神、仕事・訴訟・旅行の問いでは有利な喜神になります。',
    },
  },
  {
    key: 'sibling', term: '兄弟', group: 'relative', gloss: 'Sibling',
    plain: {
      'zh-TW': '同我者。代表同輩、朋友、競爭者，也代表分財、劫財之象。',
      en: 'What is the same as me. It stands for peers, friends and rivals, and for splitting or seizing wealth.',
      ja: '我と同じもの。同輩・友人・競争相手を表し、財を分け奪う象でもあります。',
    },
    inApp: {
      'zh-TW': '財運、失物、出行與男占感情問事中，兄弟是忌神。',
      en: 'It is the taboo spirit for wealth, lost-item and travel questions, and for love questions asked by men.',
      ja: '金運・失せ物・旅行と、男性の恋愛の問いでは忌神になります。',
    },
  },
  {
    key: 'offspring', term: '子孫', group: 'relative', gloss: 'Offspring',
    plain: {
      'zh-TW': '我生者。代表晚輩、福德、醫藥與輕鬆愉快之事；它能生財，也能剋制官鬼。',
      en: 'What I generate. It stands for the young, good fortune, medicine and ease; it feeds wealth and holds the officer in check.',
      ja: '我が生ずるもの。年少者・福徳・医薬・楽しい事を表し、財を生み、官鬼を抑えます。',
    },
    inApp: {
      'zh-TW': '財運、失物與男占感情問事以它為喜神；健康問事中是醫藥解神；事業、官司與女占感情問事中則是忌神，因為它剋官鬼。',
      en: 'Favorable for wealth, lost-item and men’s love questions; the remedy for health questions; taboo for career, lawsuit and women’s love questions, because it overcomes the officer.',
      ja: '金運・失せ物・男性の恋愛の問いでは喜神、健康の問いでは医薬の解神、仕事・訴訟・女性の恋愛の問いでは官鬼を剋すため忌神になります。',
    },
  },
  {
    key: 'wealth', term: '妻財', group: 'relative', gloss: 'Wealth',
    plain: {
      'zh-TW': '我剋者。代表錢財與財物，男占時也代表妻子或女友。',
      en: 'What I overcome. It stands for money and goods, and for a wife or girlfriend when a man asks.',
      ja: '我が剋するもの。金銭や財物を表し、男性が占うときは妻や恋人も表します。',
    },
    inApp: {
      'zh-TW': '財運與失物問事以妻財為用神；感情問事男占取妻財；女占感情時它是喜神；學業問事中它剋父母，是忌神。',
      en: 'The use-god for wealth and lost-item questions, and for love questions asked by men; favorable for women’s love questions; taboo for study questions because it overcomes the parent.',
      ja: '金運と失せ物の問い、および男性の恋愛の問いでは用神。女性の恋愛では喜神。学業の問いでは父母を剋すため忌神です。',
    },
  },
  {
    key: 'officer', term: '官鬼', group: 'relative', gloss: 'Officer',
    plain: {
      'zh-TW': '剋我者。代表功名、職位與規範，也代表官非、災病與壓力；女占時也代表丈夫或男友。',
      en: 'What overcomes me. It stands for rank, position and rules, also for legal trouble, illness and pressure, and for a husband or boyfriend when a woman asks.',
      ja: '我を剋するもの。功名・地位・規範を表し、官非・病災・重圧も表します。女性が占うときは夫や恋人も表します。',
    },
    inApp: {
      'zh-TW': '事業與官司問事，以及女占感情問事，以官鬼為用神；健康問事中它是病症之象（忌神）；學業問事中它生父母，是喜神。',
      en: 'The use-god for career and lawsuit questions and for love questions asked by women; the sign of illness (taboo) for health questions; favorable for study questions because it generates the parent.',
      ja: '仕事・訴訟の問いと、女性の恋愛の問いでは用神。健康の問いでは病の象（忌神）。学業の問いでは父母を生ずるため喜神です。',
    },
  },

  // ── 用神與斷語 ──────────────────────────────────────────
  {
    key: 'useGod', term: '用神', group: 'useGod', gloss: 'Use-god',
    plain: {
      'zh-TW': '盤面上代表「你所問之事」的那一爻。問錢看妻財、問功名看官鬼、問自己（疾病、出行）看世爻。斷語主要就是看用神的處境。',
      en: 'The line that stands for what you asked about: Wealth for money, Officer for rank, the world line for yourself (health, travel). The judgment is mostly about how it fares.',
      ja: '盤面で問うた事柄を代表する爻。金は妻財、功名は官鬼、自分自身（病気・旅行）は世爻を見ます。断は主にその用神の状況を見るものです。',
    },
    inApp: {
      'zh-TW': '只有取法明確的問事類別才取用神。感情問事要先在設定指定占者性別，否則不出用神斷語——取反了比不斷更誤導。盤面以「用」標出；卦中不見時改看伏神。',
      en: 'A use-god is only chosen for question types with a clear rule. For love questions you must set the diviner’s gender in Settings, otherwise no judgment is shown — a reversed use-god misleads more than none. It is marked “U” on the chart; if absent, the hidden spirit is used.',
      ja: '取り方がはっきりした問いの種類にだけ用神を立てます。恋愛の問いは設定で占者の性別を指定しないと断を出しません（逆に取るより出さない方がまし）。盤面に「用」が付き、卦に無いときは伏神を見ます。',
    },
  },
  {
    key: 'favorableTaboo', term: '喜神／忌神', group: 'useGod', gloss: 'Favorable / Taboo spirit',
    plain: {
      'zh-TW': '喜神是對所問之事有幫助的六親，忌神是有妨礙的六親。它們發動或持世時，會影響事情的走向。',
      en: 'The favorable spirit is the relative that helps the matter; the taboo spirit is the one that hinders it. When either moves or holds the world line, it bends the outcome.',
      ja: '喜神は問う事柄に助けとなる六親、忌神は妨げとなる六親です。発動したり世に就いたりすると、成り行きに影響します。',
    },
    inApp: {
      'zh-TW': '各類問事的喜忌就寫在盤面用神說明裡（如「忌兄弟劫財，喜子孫生財」）。喜忌之神發動會在斷語裡加分或扣分；自占（世爻為用）時，則看是誰持世。',
      en: 'The favorable and taboo relatives for each question type are stated in the use-god note on the chart. When they move, the judgment score goes up or down; for self-questions (world line as use-god), it depends on who holds the world line.',
      ja: '問いの種類ごとの喜神・忌神は、盤面の用神の説明に書かれています。発動すると断の採点が上下し、自占（世爻が用神）のときは誰が世に就くかを見ます。',
    },
  },
  {
    key: 'hidden', term: '伏神／飛神', printedAs: ['伏神', '飛來生伏', '飛來剋伏', '伏去生飛', '伏去剋飛', '飛伏比和'],
    group: 'useGod', gloss: 'Hidden / Flying spirit',
    plain: {
      'zh-TW': '用神在卦中沒有出現時，就從本宮首卦（八純卦）同一爻位找出它，稱為伏神，藏在卦中該爻（稱飛神）之下。',
      en: 'When the use-god is absent from the hexagram, it is taken from the same line of the palace’s pure hexagram. That is the hidden spirit, sitting beneath the line that shows (the flying spirit).',
      ja: '用神が卦に現れないとき、本宮の首卦（八純卦）の同じ爻位から取ったものが伏神で、卦に現れた爻（飛神）の下に隠れています。',
    },
    inApp: {
      'zh-TW': '「伏神」區塊逐條列出。飛神剋伏神、或伏神生飛神時稱「難出」，用神伏而難出，斷語扣分較重。',
      en: 'Listed one by one in the “Hidden Spirits” block. When the flying spirit overcomes the hidden one, or the hidden one feeds the flying one, it “cannot emerge”, and the judgment is lowered more.',
      ja: '「伏神」欄に一つずつ列挙されます。飛神が伏神を剋す、または伏神が飛神を生ずるときは「出にくい」とし、断の採点をより大きく下げます。',
    },
  },
  {
    key: 'verdict', term: '用神斷語', group: 'useGod', gloss: 'Use-god judgment',
    plain: {
      'zh-TW': '把用神在這張盤裡的處境——月令旺衰、日辰生剋、空亡、月破、動爻的影響等——逐項計分，加總後落在大吉、吉、平、小凶、凶五級之一。',
      en: 'Every factor bearing on the use-god — seasonal strength, the day’s effect, void, month break, the moving line’s influence — is scored, and the total falls into one of five levels: great fortune, fortune, neutral, minor misfortune, misfortune.',
      ja: '用神の置かれた状況（月令の旺衰・日辰の作用・空亡・月破・動爻の影響など）を項目ごとに採点し、合計で大吉・吉・平・小凶・凶の五段階のいずれかになります。',
    },
    inApp: {
      'zh-TW': '這是規則式加權，不是傳統斷語的定論：採計了哪些條件、各加減多少分，都逐條列在盤面上，你可以自己檢查。應期（何時應驗）與親屬關係，因前提不足而刻意不做。',
      en: 'It is a rule-based weighting, not a traditional final verdict: every condition counted and its points are listed on the chart for you to check. Timing of the outcome and kinship are deliberately left out, because the premises are missing.',
      ja: 'これはルールに基づく加重で、伝統的な断定ではありません。採用した条件と加減点はすべて盤面に列挙され、自分で確認できます。応期（いつ現れるか）と親族関係は、前提が足りないため意図的に取り上げません。',
    },
  },

  // ── 動爻的變化 ──────────────────────────────────────────
  {
    key: 'transform', term: '動爻化變', group: 'moving', gloss: 'Moving-line transformation',
    plain: {
      'zh-TW': '動爻變成另一爻的過程。比較本卦這一爻與變卦同一位置的爻，看五行的生剋方向，共五種：比和、變爻生本爻、變爻剋本爻、本爻生變爻、本爻剋變爻。',
      en: 'How the moving line turns into another. Compare the line in the primary hexagram with the same position in the resulting one and read the direction of generation: matching, changed feeds primary, changed overcomes primary, primary feeds changed, primary overcomes changed.',
      ja: '動爻が別の爻に変わる過程。本卦のその爻と変卦の同じ位置の爻を比べ、五行の生剋の向きを見ます。比和・変爻生本爻・変爻剋本爻・本爻生変爻・本爻剋変爻の五通りです。',
    },
    inApp: {
      'zh-TW': '「動爻化變」區塊只描述生剋的方向，不直接換算吉凶；用神自己發動時，才會另外進入斷語計分（見回頭生／回頭剋）。',
      en: 'The “Moving-line transformation” block only describes the direction, without turning it into a verdict; the score is affected only when the use-god itself moves (see returning support / restraint).',
      ja: '「動爻の変化」欄は生剋の向きを示すだけで、吉凶には換算しません。用神自身が動いたときに限り、別途断の採点に入ります（回頭生・回頭剋を参照）。',
    },
  },
  {
    key: 'returning', term: '回頭生／回頭剋', group: 'moving', gloss: 'Returning support / restraint',
    plain: {
      'zh-TW': '用神自己發動，化出的變爻五行反過來生它，稱回頭生（得助）；反過來剋它，稱回頭剋（受制）。',
      en: 'When the use-god itself moves and the line it turns into generates it, that is returning support; when it overcomes it, returning restraint.',
      ja: '用神自身が動き、変じた爻の五行が用神を生ずるなら回頭生（助けを得る）、剋するなら回頭剋（抑えられる）です。',
    },
    inApp: {
      'zh-TW': '只有用神本身是動爻時才判斷，判到就列進斷語並加減分。',
      en: 'Only checked when the use-god is itself the moving line; when it applies it is listed in the judgment and scored.',
      ja: '用神自身が動爻のときだけ判定し、該当すれば断に列挙して採点します。',
    },
  },
  {
    key: 'advanceRetreat', term: '進神／退神', group: 'moving', gloss: 'Advancing / Retreating spirit',
    plain: {
      'zh-TW': '動爻化出同五行的地支：順著寅→卯、巳→午、申→酉、亥→子、丑→辰→未→戌→丑的方向為進神（力道增強），反方向為退神（力道減退）。',
      en: 'When the moving line turns into another branch of the same element: forward along 寅→卯, 巳→午, 申→酉, 亥→子, 丑→辰→未→戌→丑 is advancing (gaining strength); backward is retreating (losing it).',
      ja: '動爻が同じ五行の別の支に変じるとき、寅→卯・巳→午・申→酉・亥→子・丑→辰→未→戌→丑の向きなら進神（勢いが増す）、逆向きなら退神（勢いが減る）です。',
    },
    inApp: {
      'zh-TW': '只在用神發動時判斷。丑與未、辰與戌是相沖而不是進退，不算。',
      en: 'Only checked when the use-god moves. 丑 and 未, or 辰 and 戌, are clashes rather than advance or retreat, and do not count.',
      ja: '用神が動いたときだけ判定します。丑と未、辰と戌は沖であって進退ではないため数えません。',
    },
  },
  {
    key: 'darkMoving', term: '暗動', group: 'moving', gloss: 'Hidden movement',
    plain: {
      'zh-TW': '靜爻本身旺相，又逢日辰相沖，看似被沖，反而是暗中發動、有力。',
      en: 'A still line that is strong and struck by the day clash: it looks hit, but is actually stirred into hidden action and has force.',
      ja: '静爻が旺相で、しかも日辰に沖されるもの。沖されたように見えて、実は暗に発動して力があります。',
    },
    inApp: {
      'zh-TW': '與日沖的差別只在旺衰；已經月破的爻不算暗動。暗動的爻若生或剋用神，斷語會加分或扣分。',
      en: 'It differs from a plain day clash only in strength; a line already month-broken never counts. A hidden-moving line that feeds or overcomes the use-god raises or lowers the score.',
      ja: '日沖との違いは旺衰だけで、すでに月破の爻は暗動に数えません。暗動の爻が用神を生じる・剋する場合は採点が上下します。',
    },
  },
  {
    key: 'triad', term: '三合局', printedAs: ['局生用神', '用神入局'],
    group: 'moving', gloss: 'Triad',
    plain: {
      'zh-TW': '三支地支合成一個五行：申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金。合成之後那個五行的力量集中而強大。',
      en: 'Three branches combine into one element: 申子辰 water, 亥卯未 wood, 寅午戌 fire, 巳酉丑 metal. Once formed, that element gathers strength.',
      ja: '三つの支が一つの五行に合すること：申子辰は水、亥卯未は木、寅午戌は火、巳酉丑は金。成立するとその五行の力が集まります。',
    },
    inApp: {
      'zh-TW': '必須有動爻才成局（無動不成局），動爻的地支要屬於這一組，另兩支在卦中；缺的那一支只允許由日辰補足一支。成局後依它對用神是入局、生、剋或洩，加減分。',
      en: 'A moving line is required (no movement, no triad); its branch must belong to the group and the other two must be in the hexagram, with at most one supplied by the day branch. The triad’s effect on the use-god (joined, feeding, overcoming or draining) is then scored.',
      ja: '動爻がなければ成局しません（無動不成局）。動爻の支がその組の一支で、他の二支が卦にあること。足りない一支は日辰で補えます。成局後は用神への作用（入局・生・剋・洩）で採点します。',
    },
  },

  // ── 旺衰 ────────────────────────────────────────────────
  {
    key: 'strength', term: '旺相休囚死', printedAs: ["'旺'", "'相'", "'休'", "'囚'", "'死'"],
    group: 'strength', gloss: 'Strength states',
    plain: {
      'zh-TW': '以當令的五行為準，衡量其他五行此刻的力量：與當令相同者旺，當令所生者相，生當令者休，剋當令者囚，被當令所剋者死。旺相為得時，囚死為失時。例如春天木當令：木旺、火相、水休、金囚、土死。',
      en: 'Measured against the ruling element: the same is prosperous (旺), what it generates is ascending (相), what generates it is resting (休), what overcomes it is confined (囚), what it overcomes is dead (死). Prosperous and ascending are in season; confined and dead are out of season. In spring, wood rules: wood 旺, fire 相, water 休, metal 囚, earth 死.',
      ja: '当令の五行を基準に、他の五行の今の力を測ります：同じなら旺、当令が生ずるなら相、当令を生ずるなら休、当令を剋するなら囚、当令に剋されるなら死。旺相は時を得、囚死は時を失います。春は木が当令で、木旺・火相・水休・金囚・土死。',
    },
    inApp: {
      'zh-TW': '用在三處：體卦的月令旺衰（會微調體用斷語的吉凶）、用神的月建旺衰（進用神斷語計分），以及判斷靜爻算不算暗動。',
      en: 'Used in three places: the body trigram’s seasonal strength (which nudges the body-use verdict), the use-god’s strength in the month (scored in the judgment), and deciding whether a still line counts as hidden movement.',
      ja: '三か所で使います：体卦の月令の旺衰（体用の吉凶を微調整）、用神の月建での旺衰（用神の断で採点）、そして静爻が暗動になるかの判定です。',
    },
  },
  {
    key: 'ruling', term: '當令', group: 'strength', gloss: 'Ruling element',
    plain: {
      'zh-TW': '當月由哪一個五行主事：寅卯月屬春、木當令；巳午月屬夏、火當令；申酉月屬秋、金當令；亥子月屬冬、水當令；辰未戌丑月為四季之末，土當令。',
      en: 'Which element rules the month: 寅卯 spring, wood; 巳午 summer, fire; 申酉 autumn, metal; 亥子 winter, water; 辰未戌丑 are the season-ends, earth.',
      ja: 'その月にどの五行が主となるか：寅卯月は春で木、巳午月は夏で火、申酉月は秋で金、亥子月は冬で水、辰未戌丑月は四季の末で土が当令です。',
    },
    inApp: {
      'zh-TW': '旺衰區塊的「…令木當權」就是這個；它由月建換算而來。',
      en: 'The “… wood rules” in the strength block is this, converted from the month branch.',
      ja: '旺衰欄の「…令木当権」がこれで、月建から換算されます。',
    },
  },
];
