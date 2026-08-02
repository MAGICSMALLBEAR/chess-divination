// AI 深度解讀 API Route
// 提供 DeepSeek/OpenAI 相容的推理解讀端點。
// API 金鑰透過環境變數設定，絕不進前端 bundle。
//
// 環境變數（在 .env / EAS 設定）：
//   DEEPSEEK_API_KEY   DeepSeek API 金鑰
//   DEEPSEEK_BASE_URL  預設 https://api.deepseek.com/v1
//
// 若未設定金鑰，此端點會回傳 501 並指示後端尚未配置。

import type { Poem } from '@/data/poems';

interface RequestBody {
  poem?: {
    title: string;
    content: string;
    level: string;
    hexagramName: string;
    vernacular: string;
  };
  question?: string;
  questionCategory?: string;
  hexagram?: {
    primaryName: string;
    changedName?: string;
    movingLineName?: string;
    bodyUseRelation?: string;
  };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return Response.json({
      error: 'AI_NOT_CONFIGURED',
      message: '後端尚未設定 AI API 金鑰。請設定 DEEPSEEK_API_KEY 環境變數。',
      fallback: true,
    }, { status: 501 });
  }

  try {
    const body: RequestBody = await request.json();

    const systemPrompt = `你是一位精通易經與梅花易數的占卜解讀師。請根據以下籤詩與卦象資訊，為使用者提供深度解讀。
解讀風格：文言風雅但不艱澀，溫暖而有智慧，類似一位博學的長者在燈下為來者解惑。
每段回應約 150-250 字，包含：
1. 籤詩寓意簡析
2. 針對使用者所問事項的具體指引
3. 一句總結（如詩如聯）
請直接回覆解讀文字，不需要標題或前綴。`;

    const userMessage = buildPrompt(body);
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 600,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      return Response.json({ error: 'AI_API_ERROR', message: err }, { status: 502 });
    }

    const data = await aiResponse.json();
    const interpretation = data.choices?.[0]?.message?.content || '未能取得解讀，請稍後再試。';

    return Response.json({ interpretation });
  } catch (e: any) {
    return Response.json({
      error: 'AI_REQUEST_FAILED',
      message: e.message || '未知錯誤',
    }, { status: 500 });
  }
}

function buildPrompt(body: RequestBody): string {
  const parts: string[] = [];

  if (body.poem) {
    parts.push(`籤詩：${body.poem.title}`);
    parts.push(`卦名：${body.poem.hexagramName}`);
    parts.push(`等級：${body.poem.level}`);
    parts.push(`籤詩內容：${body.poem.content.replace(/\n/g, ' / ')}`);
    parts.push(`白話解釋：${body.poem.vernacular}`);
  }

  if (body.hexagram) {
    parts.push(`本卦：${body.hexagram.primaryName}`);
    if (body.hexagram.changedName) {
      parts.push(`變卦：${body.hexagram.changedName}（動爻：${body.hexagram.movingLineName}）`);
    }
    if (body.hexagram.bodyUseRelation) {
      parts.push(`體用關係：${body.hexagram.bodyUseRelation}`);
    }
  }

  if (body.question) {
    parts.push(`使用者問題：${body.question}`);
  }
  if (body.questionCategory && body.questionCategory !== 'general') {
    parts.push(`所問類別：${body.questionCategory}`);
  }

  return parts.join('\n');
}
