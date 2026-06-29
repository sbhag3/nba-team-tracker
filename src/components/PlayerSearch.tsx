import { useState, useMemo } from 'react';
import type { LeagueState } from '../domain/nba-trade-tracker-schema';
import { playerMap } from '../domain/seed';
import { teamMap } from '../data/teams';

interface Props {
  state: LeagueState;
  onClose: () => void;
}

export function PlayerSearch({ state, onClose }: Props) {
  const [query, setQuery] = useState('');

  const playerTeam = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [teamId, playerIds] of Object.entries(state.rosters)) {
      for (const pid of playerIds) map[pid] = teamId;
    }
    return map;
  }, [state]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // Deduplicate by name — when there are two entries for the same player
    // (seed ID + custom ID from a signing/manual add), prefer the one with a current team.
    const byName = new Map<string, { id: string; name: string; team: string | null }>();
    for (const [id, name] of Object.entries(playerMap)) {
      if (!name.toLowerCase().includes(q)) continue;
      const key = name.toLowerCase();
      const team = playerTeam[id] ?? null;
      const existing = byName.get(key);
      if (!existing || (team !== null && existing.team === null)) {
        byName.set(key, { id, name, team });
      }
    }

    return Array.from(byName.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);
  }, [query, playerTeam]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 animate-fade-in"
      style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
            placeholder="Search all players…"
            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600"
          />
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-lg leading-none transition-all"
          >
            ×
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query && results.length === 0 && (
            <p className="px-4 py-8 text-sm text-slate-400 dark:text-slate-500 text-center">No players found</p>
          )}
          {results.map(({ id, name, team }) => {
            const teamInfo = team ? teamMap[team] : null;
            return (
              <div
                key={id}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{name}</span>
                {teamInfo ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-400 dark:text-slate-500">{team}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    {teamInfo.market} {teamInfo.name}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300 dark:text-slate-600 italic">no team</span>
                )}
              </div>
            );
          })}
          {!query && (
            <p className="px-4 py-8 text-sm text-slate-400 dark:text-slate-500 text-center">Type a player name</p>
          )}
        </div>
      </div>
    </div>
  );
}
