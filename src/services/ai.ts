// AI 解籤服務
// 提供離線 fallback 解讀（基於籤詩內容自動生成）
// 可擴充 API 整合 (OpenAI / DeepSeek)

import type { Poem } from '@/data/poems';

interface AIResponse {
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

export async function getAIInterpretation(poem: Poem, questionText?: string): Promise<AIResponse> {
  // 嘗試呼叫遠端 API（可擴充）
  try {
    const response = await tryRemoteAPI(poem, questionText);
    if (response) return response;
  } catch {}

  // 離線 fallback
  return buildFallbackInterpretation(poem, questionText);
}

async function tryRemoteAPI(poem: Poem, questionText?: string): Promise<AIResponse | null> {
  // 此處可整合 OpenAI / DeepSeek API
  // 預設使用離線解讀
  return null;
}

function buildFallbackInterpretation(poem: Poem, questionText?: string): AIResponse {
  const guidance = LEVEL_GUIDANCE[poem.level] || LEVEL_GUIDANCE['中平'];

  let interpretation = `${guidance}\n\n`;

  if (questionText) {
    interpretation += `針對您問的「${questionText}」：\n\n`;
  }

  interpretation += `籤詩意境：${poem.vernacular}\n\n`;
  interpretation += `典故啟示：${poem.story}\n\n`;

  interpretation += `綜合來看，${poem.level === '大吉' || poem.level === '上吉' ? '這是一支好籤，建議您順勢而為，積極進取。' :
    poem.level === '下下' ? '雖然運勢較低，但危機即是轉機，保持耐心和信心最為重要。' :
    '建議您保持平常心，穩步前進，時機成熟時自有收穫。'}`;

  const actionPlan = [
    poem.jieYue.general,
    `建議：${poem.level === '大吉' || poem.level === '上吉' ? '把握時機，積極行動。' : '謹慎行事，耐心等待。'}`,
    `心態：保持${poem.level === '下下' ? '堅韌' : '從容'}，相信過程。`,
  ];

  return { interpretation, actionPlan };
}
