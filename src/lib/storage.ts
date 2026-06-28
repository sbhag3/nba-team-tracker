import type { Trade, PickId, TeamId } from '../domain/nba-trade-tracker-schema';

export interface PickEdit {
  protections?: string;
  owner?: TeamId;
  slot?: number;
}
export type PickEdits = Record<PickId, PickEdit>;

const PICK_EDITS_KEY = 'nba-trade-tracker-pick-edits';

const TRADES_KEY = 'nba-trade-tracker-trades';

export function loadTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(TRADES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Trade[];
  } catch {
    return [];
  }
}

export function saveTrades(trades: Trade[]): void {
  localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
}

export function exportTrades(trades: Trade[]): void {
  const blob = new Blob([JSON.stringify(trades, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nba-trades-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadPickEdits(): PickEdits {
  try {
    const raw = localStorage.getItem(PICK_EDITS_KEY);
    return raw ? (JSON.parse(raw) as PickEdits) : {};
  } catch {
    return {};
  }
}

export function savePickEdits(edits: PickEdits): void {
  localStorage.setItem(PICK_EDITS_KEY, JSON.stringify(edits));
}

const REMOVED_KEY = 'nba-trade-tracker-removed';

export interface Removed {
  players: string[];
  picks: string[];
}

export function loadRemoved(): Removed {
  try {
    const raw = localStorage.getItem(REMOVED_KEY);
    if (!raw) return { players: [], picks: [] };
    return JSON.parse(raw) as Removed;
  } catch {
    return { players: [], picks: [] };
  }
}

export function saveRemoved(r: Removed): void {
  localStorage.setItem(REMOVED_KEY, JSON.stringify(r));
}

export interface AddedPlayer {
  id: string;
  fullName: string;
  team: string;
}

export interface AddedPick {
  id: string;
  originTeam: string;
  year: number;
  round: 1 | 2;
  owner: string;
}

const ADDED_PLAYERS_KEY = 'nba-trade-tracker-added-players';
const ADDED_PICKS_KEY = 'nba-trade-tracker-added-picks';

export function loadAddedPlayers(): AddedPlayer[] {
  try {
    const raw = localStorage.getItem(ADDED_PLAYERS_KEY);
    return raw ? (JSON.parse(raw) as AddedPlayer[]) : [];
  } catch { return []; }
}

export function saveAddedPlayers(p: AddedPlayer[]): void {
  localStorage.setItem(ADDED_PLAYERS_KEY, JSON.stringify(p));
}

export function loadAddedPicks(): AddedPick[] {
  try {
    const raw = localStorage.getItem(ADDED_PICKS_KEY);
    return raw ? (JSON.parse(raw) as AddedPick[]) : [];
  } catch { return []; }
}

export function saveAddedPicks(p: AddedPick[]): void {
  localStorage.setItem(ADDED_PICKS_KEY, JSON.stringify(p));
}

export type SalaryEdits = Record<string, number>; // playerId → salary in USD

const SALARY_EDITS_KEY = 'nba-trade-tracker-salary-edits';

export function loadSalaryEdits(): SalaryEdits {
  try {
    const raw = localStorage.getItem(SALARY_EDITS_KEY);
    return raw ? (JSON.parse(raw) as SalaryEdits) : {};
  } catch { return {}; }
}

export function saveSalaryEdits(edits: SalaryEdits): void {
  localStorage.setItem(SALARY_EDITS_KEY, JSON.stringify(edits));
}

export function readImportFile(file: File): Promise<Trade[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error('File must contain a JSON array of trades');
        resolve(parsed as Trade[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
