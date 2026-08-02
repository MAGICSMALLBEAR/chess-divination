// 音效服務 — Web Audio API 程式化音效 v2
// 升級版：使用雜訊＋共振合成模擬更真實的象棋落子／搖筒音效。
// 無需外部音檔，即時生成。

let audioContext: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
  } catch {
    return null;
  }
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on && audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** 播放帶有雜訊成分的木頭敲擊聲 */
function playWoodKnock(
  baseFreq: number,
  duration: number = 0.12,
  volume: number = 0.18,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // 基頻：模擬木頭共鳴
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + duration * 0.3);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);

  // 雜訊：模擬撞擊瞬間的瞬態
  playNoiseBurst(0.06, volume * 0.5, t + duration * 0.05);
}

/** 播放雜訊脈衝（撞擊瞬態） */
function playNoiseBurst(duration: number, volume: number, startTime?: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = startTime ?? ctx.currentTime;

  const bufferSize = Math.min(ctx.sampleRate * duration, 4096);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const decay = 1 - i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * decay * decay;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, t);
  filter.Q.setValueAtTime(0.8, t);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(t);
  source.stop(t + duration);
}

/** 播放音階旋律 */
function playMelody(notes: number[], spacing: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  notes.forEach((freq, i) => {
    setTimeout(() => {
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    }, i * spacing);
  });
}

// ── 公開音效函式 ──

/** 抽棋搖晃音效：棋子碰撞的喀喀聲 */
export function playShakeSound() {
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      playWoodKnock(300 + Math.random() * 200, 0.06, 0.12);
    }, i * 100 + Math.random() * 30);
  }
}

/** 棋子抽出音效：清脆敲擊 */
export function playDrawPieceSound() {
  playWoodKnock(600, 0.12, 0.16);
  setTimeout(() => playWoodKnock(420, 0.1, 0.1), 70);
}

/** 棋子放置音效：木頭碰觸棋盤 */
export function playPlacePieceSound() {
  playWoodKnock(280, 0.14, 0.2);
  setTimeout(() => playWoodKnock(160, 0.1, 0.12), 50);
}

/** 籤詩揭示音效：古箏風上升音階 */
export function playRevealSound() {
  // 五聲音階：宮商角徵羽
  const notes = [262, 330, 392, 523, 660, 784];
  playMelody(notes, 140, 0.4, 0.07, 'sine');
  // 加入鈴鐺泛音
  setTimeout(() => playMelody([784, 1047, 1319], 120, 0.5, 0.04, 'sine'), notes.length * 140 + 200);
}

/** 按鈕點擊音效 */
export function playClickSound() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.06);
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

/** 收藏音效：悅耳雙音 */
export function playFavoriteSound() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  [660, 880].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t + i * 0.1);
    gain.gain.setValueAtTime(0.1, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.25);
  });
}

