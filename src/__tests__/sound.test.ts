import fs from 'fs';
import path from 'path';
import {
  setSoundEnabled,
  isSoundEnabled,
  playShakeSound,
  playDrawPieceSound,
  playPlacePieceSound,
  playRevealSound,
  playFavoriteSound,
} from '../services/sound.web';

// 明確指向 .web：jest-expo 的預設平台是 ios，寫 '../services/sound'
// 會解析到原生版（expo-audio）。這支測的是 Web Audio 那一份。

/**
 * Web Audio API 的最小可用替身。
 * 只記錄「建立了哪些節點、start/stop 幾次」，不模擬聲音本身——
 * 測試要驗的是「音效關掉時不該碰音訊裝置」與「不該因缺少 API 而崩潰」，
 * 而不是波形是否悅耳。
 */
function createFakeAudio() {
  const oscillators: FakeOscillator[] = [];
  const bufferSources: FakeNode[] = [];
  const closed = jest.fn();

  interface FakeNode {
    connect: jest.Mock;
    start: jest.Mock;
    stop: jest.Mock;
  }
  interface FakeOscillator extends FakeNode {
    type: string;
    frequency: { setValueAtTime: jest.Mock; exponentialRampToValueAtTime: jest.Mock };
  }

  const makeParam = () => ({
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  });

  const ctx = {
    currentTime: 0,
    sampleRate: 44100,
    destination: { id: 'destination' },
    close: closed,
    createOscillator: jest.fn(() => {
      const osc: FakeOscillator = {
        type: 'sine',
        frequency: makeParam(),
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      };
      oscillators.push(osc);
      return osc;
    }),
    createGain: jest.fn(() => ({ gain: makeParam(), connect: jest.fn() })),
    createBuffer: jest.fn((_ch: number, length: number) => ({
      getChannelData: jest.fn(() => new Float32Array(length)),
    })),
    createBufferSource: jest.fn(() => {
      const node: FakeNode = { connect: jest.fn(), start: jest.fn(), stop: jest.fn() };
      bufferSources.push(node);
      return node;
    }),
    createBiquadFilter: jest.fn(() => ({
      type: 'lowpass',
      frequency: makeParam(),
      Q: makeParam(),
      connect: jest.fn(),
    })),
  };

  return { ctx, oscillators, bufferSources, closed };
}

let fake: ReturnType<typeof createFakeAudio>;
let constructorCalls: number;

beforeEach(() => {
  jest.useFakeTimers();
  fake = createFakeAudio();
  constructorCalls = 0;

  (globalThis as { window?: unknown }).window = {
    AudioContext: function AudioContextStub() {
      constructorCalls++;
      return fake.ctx;
    },
  };

  // sound.ts 的 context 與開關是模組層級單例，需在每個測試前復位
  setSoundEnabled(false);
  setSoundEnabled(true);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

/** 所有對外音效函式，用於「關閉時全部靜默」這類全面性斷言 */
const ALL_SOUNDS: [string, () => void][] = [
  ['playShakeSound', playShakeSound],
  ['playDrawPieceSound', playDrawPieceSound],
  ['playPlacePieceSound', playPlacePieceSound],
  ['playRevealSound', playRevealSound],
  ['playFavoriteSound', playFavoriteSound],
];

describe('音效開關', () => {
  test('預設為開啟', () => {
    expect(isSoundEnabled()).toBe(true);
  });

  test('setSoundEnabled 改變狀態', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  test('關閉時釋放既有的 AudioContext', () => {
    playFavoriteSound();
    expect(constructorCalls).toBe(1);

    setSoundEnabled(false);
    expect(fake.closed).toHaveBeenCalledTimes(1);
  });

  test('重複關閉不會重複釋放', () => {
    playFavoriteSound();
    setSoundEnabled(false);
    setSoundEnabled(false);
    expect(fake.closed).toHaveBeenCalledTimes(1);
  });

  test('關閉後再開啟會重新建立 AudioContext', () => {
    playFavoriteSound();
    setSoundEnabled(false);
    setSoundEnabled(true);
    playFavoriteSound();
    expect(constructorCalls).toBe(2);
  });
});

describe('關閉音效後完全靜默', () => {
  test.each(ALL_SOUNDS)('%s 在關閉狀態下不建立任何音訊節點', (_name, play) => {
    setSoundEnabled(false);
    play();
    jest.runAllTimers();

    expect(fake.ctx.createOscillator).not.toHaveBeenCalled();
    expect(fake.ctx.createBufferSource).not.toHaveBeenCalled();
  });

  /** 使用者在音效播到一半關掉，排程中的後續音符不該再發聲 */
  test('播放途中關閉，排程中的後續音符不再發聲', () => {
    playRevealSound();
    const before = fake.ctx.createOscillator.mock.calls.length;

    setSoundEnabled(false);
    jest.runAllTimers();

    expect(fake.ctx.createOscillator.mock.calls.length).toBe(before);
  });
});

describe('AudioContext 取得失敗時的容錯', () => {
  test.each(ALL_SOUNDS)('%s 在沒有 window 時不拋錯（原生端情境）', (_name, play) => {
    delete (globalThis as { window?: unknown }).window;
    setSoundEnabled(false);
    setSoundEnabled(true);

    expect(() => { play(); jest.runAllTimers(); }).not.toThrow();
  });

  test.each(ALL_SOUNDS)('%s 在建構子拋錯時不拋錯', (_name, play) => {
    (globalThis as { window?: unknown }).window = {
      AudioContext: function Broken() { throw new Error('AudioContext blocked'); },
    };
    setSoundEnabled(false);
    setSoundEnabled(true);

    expect(() => { play(); jest.runAllTimers(); }).not.toThrow();
  });

  test('支援 webkit 前綴的舊瀏覽器', () => {
    (globalThis as { window?: unknown }).window = {
      AudioContext: undefined,
      webkitAudioContext: function Webkit() { constructorCalls++; return fake.ctx; },
    };
    setSoundEnabled(false);
    setSoundEnabled(true);

    playFavoriteSound();
    expect(constructorCalls).toBe(1);
  });
});

describe('AudioContext 重用', () => {
  test('多次播放共用同一個 AudioContext', () => {
    playFavoriteSound();
    playFavoriteSound();
    playDrawPieceSound();
    jest.runAllTimers();

    expect(constructorCalls).toBe(1);
  });
});

describe('各音效實際產生聲音', () => {
  test('playFavoriteSound 為雙音，建立兩個振盪器且各自排定起訖', () => {
    playFavoriteSound();

    expect(fake.oscillators).toHaveLength(2);
    for (const osc of fake.oscillators) {
      expect(osc.start).toHaveBeenCalledTimes(1);
      expect(osc.stop).toHaveBeenCalledTimes(1);
    }
  });

  test('playDrawPieceSound 含木擊與雜訊瞬態', () => {
    playDrawPieceSound();
    jest.runAllTimers();

    expect(fake.oscillators.length).toBeGreaterThanOrEqual(2);
    expect(fake.bufferSources.length).toBeGreaterThanOrEqual(2);
  });

  test('playPlacePieceSound 建立兩段木擊', () => {
    playPlacePieceSound();
    jest.runAllTimers();
    expect(fake.oscillators.length).toBeGreaterThanOrEqual(2);
  });

  test('playShakeSound 排程多次碰撞聲', () => {
    playShakeSound();
    expect(fake.oscillators).toHaveLength(0); // 全部延後觸發

    jest.runAllTimers();
    expect(fake.oscillators).toHaveLength(8);
  });

  test('playRevealSound 依序奏出五聲音階與泛音', () => {
    playRevealSound();
    jest.runAllTimers();

    // 六個音階音 + 三個泛音
    expect(fake.oscillators).toHaveLength(9);
  });

  test('每個振盪器都有連接到輸出，且 start 必配對 stop', () => {
    for (const [, play] of ALL_SOUNDS) play();
    jest.runAllTimers();

    expect(fake.oscillators.length).toBeGreaterThan(0);
    for (const osc of fake.oscillators) {
      expect(osc.connect).toHaveBeenCalled();
      expect(osc.start).toHaveBeenCalledTimes(1);
      expect(osc.stop).toHaveBeenCalledTimes(1);
    }
  });

  test('雜訊緩衝區的取樣數不超過上限（避免大量配置）', () => {
    playPlacePieceSound();
    jest.runAllTimers();

    for (const call of fake.ctx.createBuffer.mock.calls) {
      expect(call[1]).toBeLessThanOrEqual(4096);
      expect(call[1]).toBeGreaterThan(0);
    }
  });
});

/**
 * 守門：每一種占卜都該聽得到自己的音效。
 *
 * 音效服務本身一直是對的，缺的是畫面那一頭的呼叫——抽棋有 drawPiece、
 * 棋盤有 placePiece、揭曉頁有 reveal，唯獨靈棋自成一頁，從上線起
 * 一聲不響：設定頁的音效開關對只擲靈棋的使用者等於沒有作用。
 * 這條線只有掃來源才守得住（服務層的單元測試永遠是綠的）。
 */
describe('占卜動作與音效的接線', () => {
  function readCode(...segments: string[]): string {
    return fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(/\r?\n/)
      .map(line => line.replace(/\/\/.*$/, ''))
      .join('\n');
  }

  test.each([
    ['抽棋', ['app', 'draw.tsx'], 'playDrawPieceSound('],
    ['棋盤落子', ['hooks', 'useBoardDivination.ts'], 'playPlacePieceSound('],
    ['揭曉頁', ['app', 'reveal.tsx'], 'playRevealSound('],
    ['靈棋擲卦', ['app', 'lingqi.tsx'], 'playShakeSound('],
  ])('%s 有音效', (_name, segments, call) => {
    expect(readCode(...(segments as string[]))).toContain(call as string);
  });

  /**
   * 反向守門：不准有沒人播的音效。
   *
   * `playClickSound` 就是這樣活了整整半年——實作、WAV、單元測試一應俱全，
   * 只是全 App 沒有一顆按鈕呼叫它。單元測試對「有沒有人用」是無感的，
   * 它自己就是那個使用者（同 S36 的翻譯鍵反向覆蓋守門）。
   * 掃描範圍刻意排除 `__tests__`：測試檔提到某個函式是在討論它，不是在用它。
   */
  test('每個音效都有畫面在播，沒有孤兒', () => {
    const SRC = path.join(__dirname, '..');
    const files: string[] = [];
    (function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__') walk(full);
        } else if (/\.tsx?$/.test(entry.name) && !/^sound(\.web)?\.ts$/.test(entry.name)) {
          files.push(full);
        }
      }
    })(SRC);

    // 反空轉自我檢查：掃不到東西的守門永遠是綠的
    expect(files.length).toBeGreaterThan(50);

    const callers = files
      .map(f => fs.readFileSync(f, 'utf-8'))
      .join('\n');
    const exported = [...readCode('services', 'sound.web.ts')
      .matchAll(/export function (play\w+)/g)].map(m => m[1]);
    expect(exported.length).toBeGreaterThan(0);

    const orphans = exported.filter(name => !callers.includes(`${name}(`));
    expect(orphans).toEqual([]);
  });
});

