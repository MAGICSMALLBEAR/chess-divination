// 音效服務（原生版；Web 版見 sound.web.ts）
//
// 原生端沒有 Web Audio，expo-audio 也只播檔案，因此改播 assets/sounds/
// 下的五個 WAV。那些檔案是用 Web 版完全相同的合成參數離線算出來的
// （scripts/generate-sounds.mjs），兩個平台音色一致，不會各自演化。
//
// 在此之前原生端是全靜音的：getCtx() 直接回 null，設定頁的音效開關
// 卻照樣可以切換——開了等於沒開。
//
// 重新產生音檔：node scripts/generate-sounds.mjs

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let enabled = true;

/**
 * 五個音效各自對應一個 WAV。
 * 路徑用相對而非 @assets 別名：該別名只存在於 tsconfig，Metro 沒有對應
 * 設定會解析失敗（字型載入同樣用相對路徑）。require 亦須為字面量。
 */
const SOURCES = {
  shake: require('../../assets/sounds/shake.wav'),
  drawPiece: require('../../assets/sounds/drawPiece.wav'),
  placePiece: require('../../assets/sounds/placePiece.wav'),
  reveal: require('../../assets/sounds/reveal.wav'),
  favorite: require('../../assets/sounds/favorite.wav'),
} as const;

type SoundName = keyof typeof SOURCES;

/**
 * 播放器採延遲建立：五個一次全開會在啟動時多佔資源，
 * 而多數使用者一次只會聽到其中兩三種。
 */
const players = new Map<SoundName, AudioPlayer>();

/**
 * iOS 靜音鍵預設會讓 App 音效無聲。占卜音效屬於使用者主動觸發的回饋，
 * 且設定頁已有獨立開關可關閉，故明確要求在靜音模式下仍可播放。
 * 只做一次；失敗不影響播放本身（僅是靜音鍵行為不同）。
 */
let audioModeReady = false;
function ensureAudioMode(): void {
  if (audioModeReady) return;
  audioModeReady = true;
  setAudioModeAsync({ playsInSilentMode: true })
    .catch(e => console.warn('設定音訊模式失敗:', e));
}

function playerFor(name: SoundName): AudioPlayer | null {
  try {
    let player = players.get(name);
    if (!player) {
      player = createAudioPlayer(SOURCES[name]);
      players.set(name, player);
    }
    return player;
  } catch (e) {
    console.warn('建立音效播放器失敗:', e);
    return null;
  }
}

/**
 * 播放一個音效。
 *
 * 每次都先 seekTo(0)：同一個播放器連續觸發時（例如快速落子），
 * 若不倒帶就只會在第一次播完後停在結尾，之後的呼叫都沒有聲音。
 */
function play(name: SoundName): void {
  if (!enabled) return;
  ensureAudioMode();
  const player = playerFor(name);
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn('播放音效失敗:', e);
  }
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on) {
    // 關閉時立刻停掉正在播的，並釋放播放器——
    // 使用者關音效的當下最不希望還聽到殘響。
    for (const player of players.values()) {
      try { player.remove(); } catch { /* 已釋放則忽略 */ }
    }
    players.clear();
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

// ── 公開音效函式（與 Web 版保持相同介面）──

/** 抽棋搖晃音效：棋子碰撞的喀喀聲 */
export function playShakeSound() { play('shake'); }

/** 棋子抽出音效：清脆敲擊 */
export function playDrawPieceSound() { play('drawPiece'); }

/** 棋子放置音效：木頭碰觸棋盤 */
export function playPlacePieceSound() { play('placePiece'); }

/** 籤詩揭示音效：古箏風上升音階 */
export function playRevealSound() { play('reveal'); }

/** 收藏音效：悅耳雙音 */
export function playFavoriteSound() { play('favorite'); }
