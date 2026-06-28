import { useState } from 'react';
import type { LeagueState, TeamId, Trade } from '../domain/nba-trade-tracker-schema';
import { teamRoster } from '../domain/nba-trade-tracker-schema';
import { playerMap, salaryMap } from '../domain/seed';
import { teamMap } from '../data/teams';
import type { SalaryEdits } from '../lib/storage';

interface Props {
  state: LeagueState;
  team: TeamId;
  trades: Trade[];
  salaryEdits: SalaryEdits;
  onSalaryEdit: (playerId: string, salary: number | null) => void;
  removedPlayers: Set<string>;
  onRemovePlayer: (id: string) => void;
  onRestorePlayer: (id: string) => void;
  addedPlayerIds: Set<string>;
  onAddPlayer: (name: string, team: string) => void;
  onDeleteAddedPlayer: (id: string) => void;
}

export function TeamDashboard({
  state, team, trades, salaryEdits, onSalaryEdit,
  removedPlayers, onRemovePlayer, onRestorePlayer,
  addedPlayerIds, onAddPlayer, onDeleteAddedPlayer,
}: Props) {
  const [query, setQuery] = useState('');
  const [showRemoved, setShowRemoved] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const teamInfo = teamMap[team];
  const allRosterIds = teamRoster(state, team);
  const activeIds = allRosterIds.filter(id => !removedPlayers.has(id));
  const removedIds = allRosterIds.filter(id => removedPlayers.has(id));

  const resolvedSalary = (id: string): number | null =>
    salaryEdits[id] ?? salaryMap[id] ?? null;

  const filtered = (query
    ? activeIds.filter(id =>
        (playerMap[id] ?? id).toLowerCase().includes(query.toLowerCase()),
      )
    : activeIds
  ).slice().sort((a, b) => {
    const sa = resolvedSalary(a) ?? -1;
    const sb = resolvedSalary(b) ?? -1;
    return sb - sa;
  });

  const totalSalary = activeIds.reduce((sum, id) => sum + (resolvedSalary(id) ?? 0), 0);
  const maxSalary = filtered.reduce((m, id) => Math.max(m, resolvedSalary(id) ?? 0), 0);
  const hasSalary = activeIds.some(id => resolvedSalary(id) != null);

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Team header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {teamInfo ? `${teamInfo.market} ${teamInfo.name}` : team}
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">
            As of {state.asOf}
            {trades.length > 0 && (
              <> &middot; {trades.length} trade{trades.length !== 1 ? 's' : ''} applied</>
            )}
          </p>
        </div>
        {hasSalary && (
          <div className="text-right shrink-0 ml-6">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-0.5">Total Salary</p>
            <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
              ${(totalSalary / 1_000_000).toFixed(1)}M
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{activeIds.length} players</p>
          </div>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Filter players…"
        className="w-full mb-5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
      />

      {/* Column headers */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 px-1 pb-2 mb-1 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs uppercase tracking-widest text-gray-300 dark:text-gray-600 w-6 shrink-0 text-right">#</span>
          <span className="text-xs uppercase tracking-widest text-gray-300 dark:text-gray-600 flex-1">Player</span>
          {hasSalary && (
            <span className="text-xs uppercase tracking-widest text-gray-300 dark:text-gray-600 w-16 text-right shrink-0">Salary</span>
          )}
        </div>
      )}

      {/* Player list */}
      <ul>
        {filtered.map((id, i) => (
          <PlayerRow
            key={id}
            rank={i + 1}
            id={id}
            isCustom={addedPlayerIds.has(id)}
            salary={resolvedSalary(id)}
            maxSalary={maxSalary}
            hasOverride={salaryEdits[id] != null}
            hasSalaryColumn={hasSalary}
            onSalaryEdit={salary => onSalaryEdit(id, salary)}
            onRemove={() => onRemovePlayer(id)}
            onDelete={() => onDeleteAddedPlayer(id)}
          />
        ))}
        {filtered.length === 0 && (
          <li className="py-8 text-center text-sm text-gray-400 italic">
            {query ? 'No matches' : 'No players'}
          </li>
        )}
      </ul>

      {/* Add player */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        {!showAddPlayer ? (
          <button
            type="button"
            onClick={() => setShowAddPlayer(true)}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            + Add player
          </button>
        ) : (
          <AddPlayerForm
            onSubmit={name => { onAddPlayer(name, team); setShowAddPlayer(false); }}
            onCancel={() => setShowAddPlayer(false)}
          />
        )}
      </div>

      {/* Removed players */}
      {removedIds.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowRemoved(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 underline transition-colors"
          >
            {showRemoved ? 'Hide' : 'Show'} removed ({removedIds.length})
          </button>
          {showRemoved && (
            <ul className="mt-2 space-y-1">
              {removedIds.map(id => (
                <li key={id} className="flex items-center gap-2 group py-1">
                  <span className="text-sm text-gray-300 dark:text-gray-600 line-through flex-1">
                    {playerMap[id] ?? id}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRestorePlayer(id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-400 hover:text-blue-600"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// --- Player row ---

interface PlayerRowProps {
  rank: number;
  id: string;
  isCustom: boolean;
  salary: number | null;
  maxSalary: number;
  hasOverride: boolean;
  hasSalaryColumn: boolean;
  onSalaryEdit: (salary: number | null) => void;
  onRemove: () => void;
  onDelete: () => void;
}

function PlayerRow({
  rank, id, isCustom, salary, maxSalary, hasOverride, hasSalaryColumn,
  onSalaryEdit, onRemove, onDelete,
}: PlayerRowProps) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');

  function startEdit() {
    setRaw(salary != null ? (salary / 1_000_000).toFixed(2).replace(/\.?0+$/, '') : '');
    setEditing(true);
  }

  function commit() {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) {
      onSalaryEdit(Math.round(parsed * 1_000_000));
    }
    setEditing(false);
  }

  const barPct = salary && maxSalary ? (salary / maxSalary) * 100 : 0;

  return (
    <li className="group border-b border-gray-50 dark:border-gray-800/60 last:border-0">
      <div className="flex items-center gap-3 py-2.5 px-1">
        {/* Rank */}
        <span className="text-xs tabular-nums text-gray-300 dark:text-gray-600 w-6 text-right shrink-0 select-none">
          {rank}
        </span>

        {/* Name */}
        <span className={`text-sm font-medium flex-1 min-w-0 truncate ${
          isCustom ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'
        }`}>
          {playerMap[id] ?? id}
          {isCustom && <span className="ml-1 text-xs text-green-500 dark:text-green-600">+</span>}
        </span>

        {/* Salary area */}
        {hasSalaryColumn && !editing && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Salary bar */}
            {salary != null && (
              <div className="w-20 hidden sm:block">
                <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      hasOverride ? 'bg-amber-400' : 'bg-blue-300 dark:bg-blue-600'
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Salary label */}
            <span className={`text-sm tabular-nums w-16 text-right ${
              hasOverride
                ? 'text-amber-600 dark:text-amber-400'
                : salary != null
                ? 'text-gray-500 dark:text-gray-400'
                : 'text-gray-200 dark:text-gray-700'
            }`}>
              {salary != null ? `$${(salary / 1_000_000).toFixed(1)}M` : '—'}
            </span>
          </div>
        )}

        {/* Action buttons (hover) */}
        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={startEdit}
              title="Edit salary"
              className="p-1 text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 text-xs rounded"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={isCustom ? onDelete : onRemove}
              title={isCustom ? 'Delete player' : 'Hide player'}
              className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 text-xs rounded"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Inline salary editor */}
      {editing && (
        <div className="flex items-center gap-2 pb-2.5 pl-9 pr-1">
          <span className="text-xs text-gray-400">$</span>
          <input
            autoFocus
            type="number"
            min={0}
            step={0.1}
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder="e.g. 12.5"
            className="w-28 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400"
          />
          <span className="text-xs text-gray-400">M</span>
          <button
            type="button"
            onClick={commit}
            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-gray-400 hover:text-gray-600 px-1"
          >
            Cancel
          </button>
          {hasOverride && (
            <button
              type="button"
              onClick={() => { onSalaryEdit(null); setEditing(false); }}
              className="text-xs text-red-400 hover:text-red-600 ml-auto"
            >
              Clear override
            </button>
          )}
        </div>
      )}
    </li>
  );
}

// --- Add player form ---

function AddPlayerForm({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && name.trim()) onSubmit(name.trim());
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Player name…"
        className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-400"
      />
      <button
        type="button"
        onClick={() => { if (name.trim()) onSubmit(name.trim()); }}
        disabled={!name.trim()}
        className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
      >
        Add
      </button>
      <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 px-1">
        Cancel
      </button>
    </div>
  );
}
