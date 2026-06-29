import { useState } from 'react';
import type { LeagueState, TeamId, Trade } from '../domain/nba-trade-tracker-schema';
import { teamRoster } from '../domain/nba-trade-tracker-schema';
import { playerMap, salaryMap } from '../domain/seed';
import { teamMap } from '../data/teams';
import type { SalaryEdits, FlaggedPlayer } from '../lib/storage';
import type { PlayerFlag } from '../data/playerFlags';
import { ALL_FLAGS, FLAG_META } from '../data/playerFlags';
import { FlagBadge } from './FlagBadge';

interface Props {
  state: LeagueState;
  team: TeamId;
  trades: Trade[];
  salaryEdits: SalaryEdits;
  onSalaryEdit: (playerId: string, salary: number | null) => void;
  removedPlayers: Set<string>;
  onRemovePlayer: (id: string) => void;
  addedPlayerIds: Set<string>;
  onAddPlayer: (name: string, team: string) => void;
  onDeleteAddedPlayer: (id: string) => void;
  flaggedPlayers: FlaggedPlayer[];
  onSavePlayerFlags: (playerId: string, playerName: string, team: string, flags: PlayerFlag[], notes: string) => void;
}

export function TeamDashboard({
  state, team, trades, salaryEdits, onSalaryEdit,
  removedPlayers, onRemovePlayer,
  addedPlayerIds, onAddPlayer, onDeleteAddedPlayer,
  flaggedPlayers, onSavePlayerFlags,
}: Props) {
  const [query, setQuery] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const teamInfo = teamMap[team];
  const allRosterIds = teamRoster(state, team);
  const activeIds = allRosterIds.filter(id => !removedPlayers.has(id));

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {teamInfo ? `${teamInfo.market} ${teamInfo.name}` : team}
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">
            As of {state.asOf}
            {trades.length > 0 && (
              <> &middot; {trades.length} trade{trades.length !== 1 ? 's' : ''} applied</>
            )}
          </p>
        </div>

        {hasSalary && (
          <div className="text-right shrink-0 ml-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Total Salary</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
              ${(totalSalary / 1_000_000).toFixed(1)}M
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{activeIds.length} players</p>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter players…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
        />
      </div>

      {/* Column headers */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 px-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300 dark:text-slate-600 w-6 text-right shrink-0">#</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300 dark:text-slate-600 flex-1">Player</span>
          {hasSalary && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300 dark:text-slate-600 w-16 text-right shrink-0">Salary</span>
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
            flagEntry={flaggedPlayers.find(fp => fp.playerId === id)}
            onSaveFlags={(flags, notes) => onSavePlayerFlags(id, playerMap[id] ?? id, team, flags, notes)}
          />
        ))}
        {filtered.length === 0 && (
          <li className="py-12 text-center text-sm text-slate-400 italic">
            {query ? 'No matches' : 'No players'}
          </li>
        )}
      </ul>

      {/* Add player */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        {!showAddPlayer ? (
          <button
            type="button"
            onClick={() => setShowAddPlayer(true)}
            className="text-sm text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
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
  flagEntry?: FlaggedPlayer;
  onSaveFlags: (flags: PlayerFlag[], notes: string) => void;
}

function PlayerRow({
  rank, id, isCustom, salary, maxSalary, hasOverride, hasSalaryColumn,
  onSalaryEdit, onRemove, onDelete,
  flagEntry, onSaveFlags,
}: PlayerRowProps) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [localFlags, setLocalFlags] = useState<PlayerFlag[]>([]);
  const [localNotes, setLocalNotes] = useState('');

  function startEdit() {
    setRaw(salary != null ? (salary / 1_000_000).toFixed(2).replace(/\.?0+$/, '') : '');
    setEditing(true);
  }

  function startFlag() {
    setLocalFlags(flagEntry?.flags ?? []);
    setLocalNotes(flagEntry?.notes ?? '');
    setFlagging(true);
  }

  function commit() {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) onSalaryEdit(Math.round(parsed * 1_000_000));
    setEditing(false);
  }

  const barPct = salary && maxSalary ? (salary / maxSalary) * 100 : 0;
  const activeFlags = flagEntry?.flags ?? [];

  return (
    <li className="group border-b border-slate-50 dark:border-slate-800/60 last:border-0">
      <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800/50 transition-colors duration-100">
        {/* Rank */}
        <span className="text-xs tabular-nums text-slate-300 dark:text-slate-600 w-6 text-right shrink-0 select-none">
          {rank}
        </span>

        {/* Name + flag badges */}
        <span className="text-sm font-medium flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
          <span className={`truncate ${isCustom ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
            {playerMap[id] ?? id}
            {isCustom && <span className="ml-1 text-xs text-emerald-400 dark:text-emerald-500">+</span>}
          </span>
          {activeFlags.map(f => <FlagBadge key={f} flag={f} />)}
        </span>

        {/* Salary area */}
        {hasSalaryColumn && !editing && (
          <div className="flex items-center gap-2.5 shrink-0">
            {salary != null && (
              <div className="w-20 hidden sm:block">
                <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      hasOverride ? 'bg-amber-400' : 'bg-blue-400 dark:bg-blue-500'
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            )}
            <span className={`text-sm tabular-nums w-16 text-right font-medium ${
              hasOverride
                ? 'text-amber-600 dark:text-amber-400'
                : salary != null
                ? 'text-slate-500 dark:text-slate-400'
                : 'text-slate-200 dark:text-slate-700'
            }`}>
              {salary != null ? `$${(salary / 1_000_000).toFixed(1)}M` : '—'}
            </span>
          </div>
        )}

        {/* Action buttons */}
        {!editing && !flagging && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={startFlag}
              title="Flag player"
              className={`p-1 rounded transition-colors text-xs ${
                activeFlags.length > 0
                  ? 'text-amber-400 dark:text-amber-500 opacity-100'
                  : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 dark:hover:text-amber-400'
              }`}
            >
              ⚑
            </button>
            <button
              type="button"
              onClick={startEdit}
              title="Edit salary"
              className="p-1 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 rounded transition-colors text-xs"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={isCustom ? onDelete : onRemove}
              title={isCustom ? 'Delete player' : 'Hide player'}
              className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors text-xs"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Inline salary editor */}
      {editing && (
        <div className="flex items-center gap-2 pb-2 pl-11 pr-2 animate-fade-up">
          <span className="text-xs text-slate-400 dark:text-slate-500">$</span>
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
            className="w-28 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          />
          <span className="text-xs text-slate-400 dark:text-slate-500">M</span>
          <button
            type="button"
            onClick={commit}
            className="text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 font-medium"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1 transition-colors"
          >
            Cancel
          </button>
          {hasOverride && (
            <button
              type="button"
              onClick={() => { onSalaryEdit(null); setEditing(false); }}
              className="text-xs text-red-400 hover:text-red-600 ml-auto transition-colors"
            >
              Clear override
            </button>
          )}
        </div>
      )}

      {/* Inline flag editor */}
      {flagging && (
        <div className="flex flex-col gap-3 pb-3 pl-11 pr-2 pt-1 animate-fade-up">
          <div className="flex flex-wrap gap-2">
            {ALL_FLAGS.map(flag => {
              const meta = FLAG_META[flag];
              const active = localFlags.includes(flag);
              return (
                <button
                  key={flag}
                  type="button"
                  onClick={() =>
                    setLocalFlags(prev =>
                      active ? prev.filter(f => f !== flag) : [...prev, flag],
                    )
                  }
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                    active
                      ? `${meta.className} border-current/20`
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={localNotes}
            onChange={e => setLocalNotes(e.target.value)}
            rows={2}
            placeholder="Notes (optional)…"
            className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-colors"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { onSaveFlags(localFlags, localNotes); setFlagging(false); }}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setFlagging(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1 transition-colors"
            >
              Cancel
            </button>
            {flagEntry && (
              <button
                type="button"
                onClick={() => { onSaveFlags([], ''); setFlagging(false); }}
                className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 ml-auto transition-colors"
              >
                Clear all flags
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

// --- Add player form ---

function AddPlayerForm({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  return (
    <div className="flex items-center gap-2 animate-fade-up">
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
        className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
      />
      <button
        type="button"
        onClick={() => { if (name.trim()) onSubmit(name.trim()); }}
        disabled={!name.trim()}
        className="text-sm px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-all active:scale-95 font-medium"
      >
        Add
      </button>
      <button type="button" onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1 transition-colors">
        Cancel
      </button>
    </div>
  );
}
