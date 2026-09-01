// AI 深度解讀客戶端
//
// 呼叫 `src/app/api/interpret+api.ts` 這個 Expo Router API Route。
// 金鑰只存在於伺服器端環境變數，前端只負責送出卦象資料與顯示結果。
//
// 啟用需要兩個前提，缺一則此功能會回報「尚未啟用」並保留規則式解讀：
//   1. app.json 的 web.output 設為 "server"
//      （目前是 "static"，API Route 不會被匯出）
//   2. 後端設定 DEEPSEEK_API_KEY 環境變數
//
// 設計上刻意不拋錯：AI 解讀是加值內容，任何失敗都應退回既有的
// 規則式深度解讀，而不是讓籤詩頁壞掉。

import { Platform } from 'react-native';
import { t } from './i18n';

// Web 端與部署同源，相對路徑即可；原生 fetch 不吃相對 URL，
// 必須用絕對網址——預設值若維持 '/api/interpret'，原生 build 的
// AI 解讀必掛，且 catch 只會把它歸類成永遠重試不了的網路錯誤。
// 與 cloudSync.ts 的 SYNC_URL 同一套做法。
const ENDPOINT = process.env.EXPO_PUBLIC_AI_INTERPRET_URL
  || (Platform.OS === 'web'
    ? '/api/interpret'
    : 'https://chess-divination-app.vercel.app/api/interpret');

/** 呼叫結果。用可辨識聯集而非拋錯，讓呼叫端能分別處理三種情況 */
export type AiInterpretationResult =
  | { status: 'ok'; interpretation: string }
  /** 後端未配置（未設金鑰，或 API Route 根本沒被部署） */
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

export interface AiInterpretationInput {
  poem: {
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
    seasonalStrength?: string;
  };
  /** 棋盤佈局；欄位意義見 aiPrompt.ts 的 InterpretRequestBody */
  board?: {
    spreadName?: string;
    pieces?: string;
    brief?: string;
  };
}

// 函式而非常數：常數會在模組載入時就把譯文定死在當時的語言
const unavailableMessage = () => t('ai.unavailable');

/** 逾時毫秒數。模型回應偏慢，但不該讓使用者無限等待 */
const TIMEOUT_MS = 30_000;

export async function fetchAiInterpretation(
  input: AiInterpretationInput,
): Promise<AiInterpretationResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    // 501：後端明確表示未設定金鑰
    if (response.status === 501) {
      return { status: 'unavailable', message: unavailableMessage() };
    }

    // 404：API Route 未部署（web.output 仍是 static 時就是這種情況）
    if (response.status === 404) {
      return { status: 'unavailable', message: unavailableMessage() };
    }

    if (!response.ok) {
      return { status: 'error', message: t('ai.badResponse', { status: response.status }) };
    }

    const data = await response.json();

    // 靜態站台上 /api/interpret 可能被導回 index.html，
    // 這時 response.ok 為真但內容不是預期的 JSON 結構。
    if (!data || typeof data.interpretation !== 'string' || !data.interpretation.trim()) {
      return { status: 'unavailable', message: unavailableMessage() };
    }

    return { status: 'ok', interpretation: data.interpretation };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return {
      status: 'error',
      message: t(aborted ? 'ai.timeout' : 'ai.offline'),
    };
  } finally {
    clearTimeout(timer);
  }
}
