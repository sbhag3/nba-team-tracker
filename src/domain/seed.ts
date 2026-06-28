import type { LeagueState, PlayerId } from './nba-trade-tracker-schema';
import { generatePickGrid } from './picks';
import seedRosters from '../data/seed-rosters.json';

const PICK_START_YEAR = 2025;
const PICK_YEARS = 10;

// Flat map of every player id → fullName, built once from the seed JSON.
export const playerMap: Record<PlayerId, string> = {};
// Flat map of every player id → annual salary (USD), built once from the seed JSON.
export const salaryMap: Record<PlayerId, number> = {};
for (const players of Object.values(seedRosters.rosters)) {
  for (const p of players) {
    playerMap[p.id] = p.fullName;
    const s = (p as { salary?: number | null }).salary;
    if (s != null && s > 0) {
      salaryMap[p.id] = s;
    }
  }
}

export function buildSeed(): LeagueState {
  const picks = generatePickGrid(PICK_START_YEAR, PICK_YEARS);

  const rosters: Record<string, PlayerId[]> = {};
  for (const [team, players] of Object.entries(seedRosters.rosters)) {
    rosters[team] = players.map(p => p.id);
  }

  const pickOwnership: Record<string, string> = {};
  for (const pick of picks) {
    pickOwnership[pick.id] = pick.originTeam;
  }

  return {
    asOf: seedRosters.asOf,
    rosters,
    pickOwnership,
    swapOwnership: {},
  };
}
