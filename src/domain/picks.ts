import type { DraftPick, PickId, Round } from './nba-trade-tracker-schema';
import { teams } from '../data/teams';

export function generatePickGrid(startYear: number, years: number): DraftPick[] {
  const picks: DraftPick[] = [];
  for (const team of teams) {
    for (let y = 0; y < years; y++) {
      for (const round of [1, 2] as Round[]) {
        const year = startYear + y;
        picks.push({
          id: `${team.id}-${year}-R${round}`,
          originTeam: team.id,
          year,
          round,
        });
      }
    }
  }
  return picks;
}

// Static registry of all picks — needed to look up year/round/protections from a PickId.
const _grid = generatePickGrid(2025, 10);
export const pickRegistry: Record<PickId, DraftPick> = Object.fromEntries(
  _grid.map(p => [p.id, p]),
);
