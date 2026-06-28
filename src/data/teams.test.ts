import { describe, it, expect } from 'vitest';
import { teams } from './teams';

describe('teams', () => {
  it('has exactly 30 teams', () => {
    expect(teams).toHaveLength(30);
  });

  it('has unique ids', () => {
    const ids = teams.map(t => t.id);
    expect(new Set(ids).size).toBe(30);
  });
});
