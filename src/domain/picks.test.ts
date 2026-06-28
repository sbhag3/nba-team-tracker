import { describe, it, expect } from 'vitest';
import { generatePickGrid } from './picks';

describe('generatePickGrid', () => {
  const START = 2025;
  const YEARS = 10;
  const picks = generatePickGrid(START, YEARS);

  it('produces 30 × years × 2 picks', () => {
    expect(picks).toHaveLength(30 * YEARS * 2);
  });

  it('has unique ids', () => {
    const ids = picks.map(p => p.id);
    expect(new Set(ids).size).toBe(picks.length);
  });

  it('ids are well-formed (TEAM-YEAR-R1 or R2)', () => {
    for (const pick of picks) {
      expect(pick.id).toMatch(/^[A-Z]{2,3}-\d{4}-R[12]$/);
    }
  });

  it('originTeam matches the id prefix', () => {
    for (const pick of picks) {
      const prefix = pick.id.split('-')[0];
      expect(pick.originTeam).toBe(prefix);
    }
  });
});
