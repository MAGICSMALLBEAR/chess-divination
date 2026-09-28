import { drawnMarks } from '../services/drawnMarks';
import type { DivinationRecord } from '../services/storage';

function rec(over: Partial<DivinationRecord>): DivinationRecord {
  return {
    id: over.id ?? 'r', poemId: 1, poemTitle: '', poemContent: '', poemLevel: '上上',
    drawnPieceTypes: [], drawnPieceColors: [], drawnPieceChars: [], mode: 'draw',
    timestamp: 1, isFavorited: false, engineVersion: 3, ...over,
  };
}

describe('圖鑑「我抽過」標記（路線圖 #29）', () => {
  test('同一首籤詩數次數，latest 取時間最新的一筆（不看陣列順序）', () => {
    const m = drawnMarks([
      rec({ id: 'mid', poemId: 5, timestamp: 50 }),
      rec({ id: 'new', poemId: 5, timestamp: 90 }),
      rec({ id: 'old', poemId: 5, timestamp: 10 }),
    ]);
    expect(m.poems.get(5)?.count).toBe(3);
    expect(m.poems.get(5)?.latest.id).toBe('new');
    expect(m.hexagrams.get(5)?.count).toBe(3);
  });

  test('v1 舊記錄標籤詩、不標卦典：它的 poemId 與卦象不符', () => {
    const m = drawnMarks([rec({ id: 'v1', poemId: 7, engineVersion: undefined })]);
    expect(m.poems.get(7)?.count).toBe(1);
    expect(m.hexagrams.has(7)).toBe(false);
  });

  test('靈棋記錄只進靈棋（poemId 恆為 0，不能拿去標籤詩 #1 或任何一卦）', () => {
    const m = drawnMarks([rec({ id: 'l', mode: 'lingqi', poemId: 0, lingqiKey: '1-2-3' })]);
    expect(m.lingqi.get('1-2-3')?.latest.id).toBe('l');
    expect(m.poems.size).toBe(0);
    expect(m.hexagrams.size).toBe(0);
  });

  test('損毀資料不收：越界 poemId、時間不是有限數字、靈棋缺鍵', () => {
    const m = drawnMarks([
      rec({ id: 'a', poemId: 0 }), rec({ id: 'b', poemId: 65 }), rec({ id: 'c', poemId: 2.5 }),
      rec({ id: 'd', poemId: 3, timestamp: NaN }),
      rec({ id: 'e', mode: 'lingqi', poemId: 0 }),
    ]);
    expect(m.poems.size + m.hexagrams.size + m.lingqi.size).toBe(0);
  });
});
