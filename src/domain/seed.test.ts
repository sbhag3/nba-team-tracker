import { describe, it, expect } from 'vitest';
import { buildSeed } from './seed';
import { project } from './nba-trade-tracker-schema';
import { teams } from '../data/teams';

describe('buildSeed', () => {
  const seed = buildSeed();

  it('every team has a non-empty roster', () => {
    for (const team of teams) {
      expect(seed.rosters[team.id]?.length, `${team.id} has no players`).toBeGreaterThan(0);
    }
  });

  it('project(seed, []) runs without throwing', () => {
    expect(() => project(seed, [])).not.toThrow();
  });

  it('project(seed, []) returns the seed unchanged', () => {
    expect(project(seed, [])).toBe(seed);
  });
});
