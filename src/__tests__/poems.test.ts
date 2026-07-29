import { ALL_POEMS, getPoemById, getPoemsByLevel, POEM_LEVELS } from '../data/poems';

describe('Poems', () => {
  test('should have exactly 64 poems', () => {
    expect(ALL_POEMS).toHaveLength(64);
  });

  test('each poem should have complete data', () => {
    ALL_POEMS.forEach(poem => {
      expect(poem.id).toBeGreaterThanOrEqual(1);
      expect(poem.id).toBeLessThanOrEqual(64);
      expect(poem.number).toBeGreaterThanOrEqual(1);
      expect(poem.hexagramName).toBeTruthy();
      expect(poem.hexagramNumber).toBeGreaterThanOrEqual(1);
      expect(poem.level).toBeTruthy();
      expect(POEM_LEVELS).toContain(poem.level);
      expect(poem.title).toBeTruthy();
      expect(poem.content).toBeTruthy();
      // 七言絕句: 4 lines
      expect(poem.content.split('\n').length).toBe(4);
      // Each line should be ~7 chars
      poem.content.split('\n').forEach(line => {
        expect(line.length).toBeGreaterThanOrEqual(5);
        expect(line.length).toBeLessThanOrEqual(10);
      });
      expect(poem.vernacular).toBeTruthy();
      expect(poem.story).toBeTruthy();
      expect(poem.jieYue.marriage).toBeTruthy();
      expect(poem.jieYue.wealth).toBeTruthy();
      expect(poem.jieYue.career).toBeTruthy();
      expect(poem.jieYue.health).toBeTruthy();
      expect(poem.jieYue.study).toBeTruthy();
      expect(poem.jieYue.travel).toBeTruthy();
      expect(poem.jieYue.general).toBeTruthy();
    });
  });

  test('getPoemById should return correct poem', () => {
    const poem = getPoemById(1);
    expect(poem.id).toBe(1);
    expect(poem.hexagramName).toBe('乾為天');
  });

  test('getPoemById with invalid id should return poem #1', () => {
    const poem = getPoemById(999);
    expect(poem.id).toBe(1);
  });

  test('each hexagram should appear exactly once', () => {
    const hexNames = ALL_POEMS.map(p => p.hexagramName);
    const unique = new Set(hexNames);
    expect(unique.size).toBe(64);
  });
});
