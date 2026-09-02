// 深度解讀服務
//
// 說明：本服務為**規則式**解讀，依籤詩等級、卦例推演與所問類別組合文字，
// 不呼叫任何語言模型。舊版將其標示為「AI 智慧解讀」但 tryRemoteAPI() 永遠
// 回傳 null，實際跑的是模板拼接，屬於過度承諾，故正名為「深度解讀」。
//
// 若日後要接真正的模型解讀，金鑰必須放在伺服器端（Expo Router API Route
// + EAS 環境變數），絕不可進前端 bundle。

import type { Poem } from '@/data/poems';
import type { LiuYaoReading } from './liuyao';
import { trigramLabel } from './liuyao';
import { questionCategoryDomain } from './questionCategories';

export interface Interpretation {
  interpretation: string;
  actionPlan: string[];
}

const LEVEL_GUIDANCE: Record<string, string> = {
  '大吉': '此籤大吉，運勢正旺。現在是展開行動、把握機會的最佳時機。保持信心與積極態度，成功指日可待。',
  '上吉': '此籤上吉，前景光明。雖然仍需努力，但方向正確。穩步前進，好事將近。',
  '中吉': '此籤中吉，平穩向上。需要耐心與堅持，不宜急於求成。腳踏實地，自有收穫。',
  '中平': '此籤中平，宜守不宜攻。當前局勢平穩，變動未必有利。保持現狀，靜待時機。',
  '下下': '此籤下下，運勢低迷。但否極泰來，逆境也是成長的養分。韜光養晦，等待轉機。',
};

/** 依所問類別取出籤詩對應面向的詳解 */
const CATEGORY_FIELDS: Record<string, { label: string; key: keyof Poem['jieYue'] }> = {
  marriage: { label: '感情', key: 'marriage' },
  wealth: { label: '財運', key: 'wealth' },
  career: { label: '事業', key: 'career' },
  health: { label: '健康', key: 'health' },
  study: { label: '學業', key: 'study' },
  travel: { label: '出行', key: 'travel' },
  general: { label: '綜合', key: 'general' },
};

/** 體用關係 → 行動基調 */
const BODY_USE_ACTION: Record<string, string> = {
  '用生體': '外力正在幫你，此時應主動承接機會，不必客氣推辭。',
  '體剋用': '主導權在你手上，訂好步調按計畫推進，不必被外界節奏牽著走。',
  '體用比和': '內外一致，維持現行做法即可，不必大幅調整。',
  '體生用': '你正在單向付出，先設定停損點與界線，再決定要投入多少。',
  '用剋體': '外部壓力大於自身條件，先守住現有的，不要在此時擴張。',
};

/** 體卦旺衰 → 節奏建議。生剋定方向，旺衰定該用幾分力 */
const STRENGTH_ACTION: Record<string, string> = {
  '旺': '本月時令站在你這邊，該推的事趁現在推，力道可以放足。',
  '相': '氣勢正在往上走，適合佈局與鋪路，成果會在後面顯現。',
  '休': '時令不助也不阻，維持既有節奏即可，別勉強加碼。',
  '囚': '本月時令與你相逆，凡事預留比平常更多的時間與備案。',
  '死': '本月最無力，把目標降到「不出錯」而非「求突破」。',
};

export interface InterpretationInput {
  poem: Poem;
  questionText?: string;
  questionCategory?: string;
  reading?: LiuYaoReading | null;
}

export function buildInterpretation(input: InterpretationInput): Interpretation {
  const { poem, questionText, questionCategory, reading } = input;

  const parts: string[] = [];

  parts.push(LEVEL_GUIDANCE[poem.level] || LEVEL_GUIDANCE['中平']);

  if (questionText) {
    parts.push(`針對您問的「${questionText}」：`);
  }

  parts.push(`籤詩意境：${poem.vernacular}`);

  // 卦例推演
  if (reading) {
    const { primary, nuclear, changed, movingLineName, bodyUse } = reading;
    parts.push(
      `卦象推演：本卦${primary.name}為當前處境，動爻在${movingLineName}；` +
      `其下潛藏${nuclear.name}之互卦，為過程中尚未浮上檯面的因素；` +
      `終將變為${changed.name}，是事情發展後的結果。`,
    );
    parts.push(
      `體用而論，體卦${trigramLabel(bodyUse.body)}屬${bodyUse.bodyElement}為己身，` +
      `用卦${trigramLabel(bodyUse.use)}屬${bodyUse.useElement}為所問之事。${bodyUse.text}`,
    );
    parts.push(`時令而論，${reading.strength.text}`);
  }

  // 所問類別的針對性解讀
  const category = CATEGORY_FIELDS[questionCategoryDomain(questionCategory)] || CATEGORY_FIELDS.general;
  if (category.key !== 'general') {
    parts.push(`${category.label}方面：${poem.jieYue[category.key]}`);
  }

  parts.push(`典故啟示：${poem.story}`);

  return {
    interpretation: parts.join('\n\n'),
    actionPlan: buildActionPlan(poem, reading, category.label),
  };
}

function buildActionPlan(
  poem: Poem,
  reading: LiuYaoReading | null | undefined,
  categoryLabel: string,
): string[] {
  const plan: string[] = [];

  plan.push(`${categoryLabel}方向：${poem.jieYue.general}`);

  if (reading) {
    plan.push(BODY_USE_ACTION[reading.bodyUse.relation]);
    plan.push(STRENGTH_ACTION[reading.strength.state]);
    plan.push(
      `留意${reading.changed.name}的走向——${reading.movingLineName}是這件事的轉折點，` +
      `變化多半由此發生。`,
    );
  } else {
    plan.push(
      poem.level === '大吉' || poem.level === '上吉'
        ? '把握時機，積極行動。'
        : '謹慎行事，耐心等待。',
    );
  }

  plan.push(`心態：保持${poem.level === '下下' ? '堅韌' : '從容'}，相信過程。`);

  return plan;
}
