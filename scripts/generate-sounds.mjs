// 原生端音效檔產生器
//
// 為什麼要這支腳本：
// sound.ts 的六個音效是用 Web Audio API 即時合成的（振盪器＋雜訊＋濾波），
// 原生端沒有 Web Audio，expo-audio 又只播檔案。若在原生另寫一套音色，
// 兩個平台就會愈走愈遠；這裡改成「用同一組參數離線算成 WAV」，
// 音色一致、產物可重現、且不必把任何音訊函式庫帶進 App。
//
// 重跑：
//   node scripts/generate-sounds.mjs
//
// 產物：assets/sounds/*.wav（16-bit PCM、單聲道、44.1kHz）

import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(process.cwd(), 'assets', 'sounds');

// ── 基礎工具 ──

/** 依樣本數建立靜音緩衝 */
const buffer = (seconds) => new Float32Array(Math.ceil(seconds * SAMPLE_RATE));

/** Web Audio 的 exponentialRampToValueAtTime：在 [t0,t1] 之間以等比變化 */
function expRamp(from, to, ratio) {
  return from * Math.pow(to / from, ratio);
}

/** 把 src 疊加進 dst，起點為 atSeconds */
function mix(dst, src, atSeconds) {
  const offset = Math.round(atSeconds * SAMPLE_RATE);
  for (let i = 0; i < src.length; i++) {
    const j = offset + i;
    if (j >= 0 && j < dst.length) dst[j] += src[i];
  }
}

/**
 * 決定性偽隨機（0–1）。
 * 原本的搖棋音效用 Math.random 做抖動；產出檔案必須可重現，
 * 否則每次重跑腳本都得到不同的檔案，diff 永遠是髒的。
 */
function rand(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ── 音色 ──

/**
 * 木頭敲擊：三角波基頻做「先揚後落」的滑音，模擬木質共鳴。
 * 對應 sound.ts 的 playWoodKnock 振盪器部分。
 */
function woodTone(baseFreq, duration, volume) {
  const out = buffer(duration);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE;
    const r = t / duration;
    // 0 → 30%：base → base*1.5；30% → 100%：base*1.5 → base*0.3
    const freq = r < 0.3
      ? expRamp(baseFreq, baseFreq * 1.5, r / 0.3)
      : expRamp(baseFreq * 1.5, baseFreq * 0.3, (r - 0.3) / 0.7);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    // 三角波
    const tri = (2 / Math.PI) * Math.asin(Math.sin(phase));
    out[i] = tri * expRamp(volume, 0.001, r);
  }
  return out;
}

/** RBJ bandpass，對應 Web Audio 的 BiquadFilter type='bandpass' */
function bandpass(input, freq, q) {
  const w0 = (2 * Math.PI * freq) / SAMPLE_RATE;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha, b1 = 0, b2 = -alpha;
  const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2
             - (a1 / a0) * y1 - (a2 / a0) * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

/** 撞擊瞬態：白雜訊經 decay² 塑形後過帶通，對應 playNoiseBurst */
function noiseBurst(duration, volume, seed) {
  const n = Math.ceil(duration * SAMPLE_RATE);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const decay = 1 - i / n;
    raw[i] = (rand(seed + i) * 2 - 1) * decay * decay;
  }
  const filtered = bandpass(raw, 800, 0.8);
  for (let i = 0; i < n; i++) {
    filtered[i] *= expRamp(volume, 0.001, i / n);
  }
  return filtered;
}

/** 完整的木頭敲擊＝基頻＋瞬態（瞬態延後 5% duration，同 sound.ts） */
function woodKnock(baseFreq, duration, volume, seed) {
  const total = buffer(duration + 0.08);
  mix(total, woodTone(baseFreq, duration, volume), 0);
  mix(total, noiseBurst(0.06, volume * 0.5, seed), duration * 0.05);
  return total;
}

/** 單一正弦音，對應 playMelody 的每個音 */
function sineNote(freq, duration, volume) {
  const out = buffer(duration);
  for (let i = 0; i < out.length; i++) {
    const r = i / out.length;
    out[i] = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * expRamp(volume, 0.001, r);
  }
  return out;
}

/** 由 1000Hz 滑到 600Hz 的短促點擊音，對應 playClickSound */
function clickTone(duration, volume) {
  const out = buffer(duration);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const r = i / out.length;
    const freq = expRamp(1000, 600, r);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    out[i] = Math.sin(phase) * expRamp(volume, 0.001, r);
  }
  return out;
}

// ── 六個音效 ──

const SOUNDS = {
  /** 搖棋：八下木頭碰撞，頻率與間隔皆帶抖動 */
  shake() {
    const out = buffer(1.1);
    for (let i = 0; i < 8; i++) {
      const freq = 300 + rand(i) * 200;
      const at = (i * 100 + rand(i + 100) * 30) / 1000;
      mix(out, woodKnock(freq, 0.06, 0.12, i * 977), at);
    }
    return out;
  },

  /** 抽棋：清脆的一高一低 */
  drawPiece() {
    const out = buffer(0.35);
    mix(out, woodKnock(600, 0.12, 0.16, 11), 0);
    mix(out, woodKnock(420, 0.10, 0.10, 23), 0.07);
    return out;
  },

  /** 落子：木頭碰觸棋盤，比抽棋低沉 */
  placePiece() {
    const out = buffer(0.35);
    mix(out, woodKnock(280, 0.14, 0.20, 31), 0);
    mix(out, woodKnock(160, 0.10, 0.12, 43), 0.05);
    return out;
  },

  /** 揭籤：五聲音階上行 + 鈴鐺泛音 */
  reveal() {
    const out = buffer(2.2);
    const notes = [262, 330, 392, 523, 660, 784];
    notes.forEach((f, i) => mix(out, sineNote(f, 0.4, 0.07), (i * 140) / 1000));
    const bells = [784, 1047, 1319];
    const bellStart = (notes.length * 140 + 200) / 1000;
    bells.forEach((f, i) => mix(out, sineNote(f, 0.5, 0.04), bellStart + (i * 120) / 1000));
    return out;
  },

  /** 點擊：極短的下滑音 */
  click() {
    const out = buffer(0.1);
    mix(out, clickTone(0.06, 0.06), 0);
    return out;
  },

  /** 收藏：悅耳雙音 */
  favorite() {
    const out = buffer(0.45);
    [660, 880].forEach((f, i) => mix(out, sineNote(f, 0.25, 0.10), i * 0.1));
    return out;
  },
};

// ── WAV 輸出 ──

function toWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);        // PCM chunk 大小
  buf.writeUInt16LE(1, 20);         // PCM
  buf.writeUInt16LE(1, 22);         // 單聲道
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);         // block align
  buf.writeUInt16LE(16, 34);        // 位元深度
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    // 疊加後可能超過 ±1，硬夾避免回捲成爆音
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let total = 0;
for (const [name, make] of Object.entries(SOUNDS)) {
  const wav = toWav(make());
  const file = path.join(OUT_DIR, `${name}.wav`);
  fs.writeFileSync(file, wav);
  total += wav.length;
  console.log(`  ${name}.wav  ${(wav.length / 1024).toFixed(1)} KB`);
}
console.log(`共 ${Object.keys(SOUNDS).length} 個檔案，${(total / 1024).toFixed(1)} KB → assets/sounds/`);
