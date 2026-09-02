// 原生端音效測試（Web 版見 sound.test.ts）
//
// 在此之前原生端是全靜音的：Web Audio 的 getCtx() 直接回 null，
// 而設定頁的音效開關照樣可以切換——使用者開了等於沒開。
// 這支守住「原生真的會播」與「關掉就真的不碰音訊裝置」。

const mockPlayers: MockPlayer[] = [];
let mockCreateShouldThrow = false;

interface MockPlayer {
  source: unknown;
  plays: number;
  seeks: number[];
  removed: boolean;
  seekTo(pos: number): void;
  play(): void;
  remove(): void;
}

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn((source: unknown) => {
    if (mockCreateShouldThrow) throw new Error('無法建立播放器');
    const player: MockPlayer = {
      source,
      plays: 0,
      seeks: [],
      removed: false,
      seekTo(pos: number) { this.seeks.push(pos); },
      play() { this.plays += 1; },
      remove() { this.removed = true; },
    };
    mockPlayers.push(player);
    return player;
  }),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

import fs from 'fs';
import path from 'path';

/**
 * 每個測試都重新載入模組。
 *
 * sound.ts 的播放器快取與「音訊模式已設定」旗標都是模組層狀態，
 * 不重置的話前一個測試建立的播放器會被下一個測試沿用，
 * 「延遲建立」「只設定一次」這類斷言就永遠測不到第一次。
 */
let sound: typeof import('../services/sound');
// mock 也必須在 resetModules 之後重新取得：舊的參照指向已被丟棄的
// 模組實例，呼叫次數永遠對不上。
let audio: typeof import('expo-audio');

beforeEach(() => {
  mockPlayers.length = 0;
  mockCreateShouldThrow = false;
  jest.clearAllMocks();
  jest.resetModules();
  sound = require('../services/sound');
  audio = require('expo-audio');
});

const allSounds = () => [
  sound.playShakeSound, sound.playDrawPieceSound, sound.playPlacePieceSound,
  sound.playRevealSound, sound.playFavoriteSound,
];

describe('原生音效播放', () => {
  test('預設為開啟', () => {
    expect(sound.isSoundEnabled()).toBe(true);
  });

  test.each(['shake', 'drawPiece', 'placePiece', 'reveal', 'favorite'] as const)(
    '%s 音效會實際播放', (name) => {
    const fnByName = {
      shake: () => sound.playShakeSound(), drawPiece: () => sound.playDrawPieceSound(),
      placePiece: () => sound.playPlacePieceSound(), reveal: () => sound.playRevealSound(),
      favorite: () => sound.playFavoriteSound(),
    };
    fnByName[name]();
    expect(mockPlayers).toHaveLength(1);
    expect(mockPlayers[0].plays).toBe(1);
  });

  test('五種音效各自建立自己的播放器', () => {
    for (const fn of allSounds()) fn();
    expect(mockPlayers).toHaveLength(5);
    expect(mockPlayers.every(p => p.plays === 1)).toBe(true);
  });

  /**
   * 音檔對應改用靜態檢查：jest 的資產轉換讓所有 .wav 的 require 回傳
   * 同一個 stub，執行期分辨不出誰是誰。這裡真正要擋的是複製貼上導致
   * 兩個音效指向同一個檔——那在原始碼層面看得一清二楚。
   */
  test('五個音效對應五個不同的 .wav，且檔案都存在', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'sound.ts'), 'utf-8');
    const paths = [...src.matchAll(/require\('([^']+\.wav)'\)/g)].map(m => m[1]);

    expect(paths).toHaveLength(5);
    expect(new Set(paths).size).toBe(5);

    for (const rel of paths) {
      const file = path.resolve(__dirname, '..', 'services', rel);
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  /** 快速落子會連續觸發同一個音效，不倒帶就只有第一次有聲音 */
  test('重複播放同一音效前會先倒帶', () => {
    sound.playPlacePieceSound();
    sound.playPlacePieceSound();
    sound.playPlacePieceSound();

    expect(mockPlayers).toHaveLength(1);           // 播放器重用
    expect(mockPlayers[0].plays).toBe(3);
    expect(mockPlayers[0].seeks).toEqual([0, 0, 0]);
  });

  test('播放器延遲建立且重複使用，不會每次都新建', () => {
    sound.playFavoriteSound();
    sound.playFavoriteSound();
    expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
  });

  /** iOS 靜音鍵預設會讓 App 靜音；占卜音效是使用者主動觸發的回饋 */
  test('首次播放會設定為靜音鍵下仍可播放，且只設定一次', () => {
    sound.playFavoriteSound();
    sound.playRevealSound();

    expect(audio.setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(audio.setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: true });
  });
});

describe('關閉音效', () => {
  test('關閉後不再播放，也不建立任何播放器', () => {
    sound.setSoundEnabled(false);
    for (const fn of allSounds()) fn();

    expect(audio.createAudioPlayer).not.toHaveBeenCalled();
    expect(mockPlayers).toHaveLength(0);
  });

  test('關閉時釋放既有播放器，避免殘響', () => {
    sound.playRevealSound();
    const player = mockPlayers[0];
    expect(player.removed).toBe(false);

    sound.setSoundEnabled(false);
    expect(player.removed).toBe(true);
  });

  test('關閉後再開啟可正常播放', () => {
    sound.playFavoriteSound();
    sound.setSoundEnabled(false);
    sound.setSoundEnabled(true);
    sound.playFavoriteSound();

    expect(mockPlayers[mockPlayers.length - 1].plays).toBe(1);
  });

  test('重複關閉不會拋錯', () => {
    sound.playFavoriteSound();
    sound.setSoundEnabled(false);
    expect(() => sound.setSoundEnabled(false)).not.toThrow();
  });
});

describe('播放失敗時的容錯', () => {
  /** 音效壞掉不該讓占卜流程中斷——它只是回饋，不是主線 */
  test('建立播放器失敗時靜默略過，不拋錯', () => {
    mockCreateShouldThrow = true;
    expect(() => sound.playPlacePieceSound()).not.toThrow();
  });

  test('play 拋錯時不影響呼叫端', () => {
    sound.playFavoriteSound();
    mockPlayers[0].play = () => { throw new Error('裝置忙碌'); };
    expect(() => sound.playFavoriteSound()).not.toThrow();
  });
});
