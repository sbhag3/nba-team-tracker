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

  // Build player → current team map from the live projected state
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
    return Object.entries(playerMap)
      .filter(([, name]) => name.toLowerCase().includes(q))
      .map(([id, name]) => ({ id, name, team: playerTeam[id] ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);
  }, [query, playerTeam]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-400">🔍</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search players…"
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No players found</p>
          )}
          {results.map(({ id, name, team }) => {
            const teamInfo = team ? teamMap[team] : null;
            return (
              <div key={id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-sm text-gray-800 dark:text-gray-200">{name}</span>
                {teamInfo ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-mono mr-1">{team}</span>
                    {teamInfo.market} {teamInfo.name}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-600 italic">no team</span>
                )}
              </div>
            );
          })}
          {!query && (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">Type a player name</p>
          )}
        </div>
      </div>
    </div>
  );
}
