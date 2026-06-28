// One-off script: fetches current NBA rosters from ESPN's public API and writes
// src/data/seed-rosters.json. Run with: npm run fetch-rosters
// Never imported by the app — the output JSON is the artifact.

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const CORE_BASE = 'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba';
const DELAY_MS = 300;

// ESPN abbreviation → our tricode (they differ for a few teams)
const ESPN_TO_TRICODE: Record<string, string> = {
  GS:   'GSW',
  NO:   'NOP',
  NY:   'NYK',
  PHO:  'PHX',
  SA:   'SAS',
  UTAH: 'UTA',
  WSH:  'WAS',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface ESPNTeam { id: string; abbreviation: string; displayName: string; }
interface ESPNAthlete { id: string; fullName: string; displayName: string; }
interface ESPNAthleteDetail {
  contract?: { salary?: number; years?: number };
  contracts?: Array<{ salary?: number }>;
}

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nba-trade-tracker/1.0)' },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

async function main() {
  console.log('Fetching ESPN team list...');
  const teamsData = await apiFetch<{ sports: [{ leagues: [{ teams: [{ team: ESPNTeam }] }] }] }>(
    `${BASE}/teams?limit=100`,
  );
  const espnTeams = teamsData.sports[0].leagues[0].teams.map(t => t.team);
  console.log(`Got ${espnTeams.length} teams\n`);

  const rosters: Record<string, Array<{ id: string; fullName: string; salary: number | null }>> = {};

  for (const team of espnTeams) {
    await sleep(DELAY_MS);
    const abbr = ESPN_TO_TRICODE[team.abbreviation] ?? team.abbreviation;

    const rosterData = await apiFetch<{ athletes: ESPNAthlete[] }>(
      `${BASE}/teams/${team.id}/roster`,
    );

    const players: Array<{ id: string; fullName: string; salary: number | null }> = [];
    for (const p of rosterData.athletes) {
      await sleep(DELAY_MS);
      let salary: number | null = null;
      try {
        const detail = await apiFetch<ESPNAthleteDetail>(`${CORE_BASE}/athletes/${p.id}?lang=en&region=us`);
        salary = detail.contract?.salary ?? detail.contracts?.[0]?.salary ?? null;
      } catch {
        // athlete detail unavailable — salary stays null
      }
      players.push({ id: p.id, fullName: p.fullName ?? p.displayName, salary });
    }

    rosters[abbr] = players;
    const withSalary = players.filter(p => p.salary != null).length;
    console.log(`  ${abbr}: ${players.length} players, ${withSalary} with salary`);
  }

  const teamCount = Object.keys(rosters).length;
  if (teamCount < 30) console.warn(`\nWARN: only ${teamCount}/30 teams — check ESPN data`);

  const asOf = new Date().toISOString().slice(0, 10);
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outPath = join(__dirname, '../src/data/seed-rosters.json');
  writeFileSync(outPath, JSON.stringify({ asOf, rosters }, null, 2));
  console.log(`\nDone. Written to ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
