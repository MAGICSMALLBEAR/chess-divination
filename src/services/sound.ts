// 音效服務 - Web Audio API 程式化音效
// 無需外部音檔，即時生成

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

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  fadeOut = true,
) {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  if (fadeOut) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// 抽棋搖晃音效
export function playShakeSound() {
  const ctx = getCtx();
  if (!ctx) return;
  // 短促敲擊聲
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      playTone(200 + Math.random() * 100, 0.08, 'triangle', 0.1);
    }, i * 120);
  }
}

// 棋子抽出音效
export function playDrawPieceSound() {
  playTone(520, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(680, 0.2, 'sine', 0.1), 80);
}

// 棋子放置音效 (木頭敲擊)
export function playPlacePieceSound() {
  playTone(300, 0.1, 'triangle', 0.15, true);
  playTone(150, 0.08, 'triangle', 0.1, true);
}

// 籤詩揭示音效 (上升音階)
export function playRevealSound() {
  const notes = [330, 392, 440, 523, 660];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.3, 'sine', 0.08);
    }, i * 150);
  });
}

// 按鈕點擊音效
export function playClickSound() {
  playTone(800, 0.05, 'sine', 0.08, false);
}

// 收藏音效
export function playFavoriteSound() {
  playTone(660, 0.12, 'sine', 0.1);
  setTimeout(() => playTone(880, 0.18, 'sine', 0.08), 100);
}
