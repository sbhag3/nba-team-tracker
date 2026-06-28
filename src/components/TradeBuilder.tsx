import { useState } from 'react';
import type { LeagueState, Trade, TeamId, Asset, AssetMovement } from '../domain/nba-trade-tracker-schema';
import { applyTrade, teamRoster, teamPicks } from '../domain/nba-trade-tracker-schema';
import { teams } from '../data/teams';
import { playerMap } from '../domain/seed';
import { pickRegistry } from '../domain/picks';

interface Props {
  state: LeagueState;
  onSubmit: (trade: Trade) => void;
  onCancel: () => void;
}

type AssetKind = 'player' | 'pick' | 'cash' | 'other';

interface MovementDraft {
  id: string;
  kind: AssetKind;
  value: string;
  from: TeamId;
  to: TeamId;
}

const today = new Date().toISOString().slice(0, 10);
let _id = 0;
const nextId = () => `m-${++_id}`;

function makeMovement(teams: TeamId[]): MovementDraft {
  return { id: nextId(), kind: 'player', value: '', from: teams[0] ?? '', to: teams[1] ?? '' };
}

function autoDescription(movements: AssetMovement[]): string {
  return movements.map(m => {
    const label =
      m.asset.kind === 'player' ? (playerMap[m.asset.playerId] ?? m.asset.playerId) :
      m.asset.kind === 'pick'   ? m.asset.pickId :
      m.asset.kind === 'cash'   ? `$${m.asset.amount}M` :
      m.asset.kind === 'other'  ? m.asset.note : '';
    return `${m.from} → ${m.to}: ${label}`;
  }).join('; ');
}

function draftToMovement(d: MovementDraft): AssetMovement | null {
  if (!d.from || !d.to || !d.value) return null;
  let asset: Asset;
  switch (d.kind) {
    case 'player': asset = { kind: 'player', playerId: d.value }; break;
    case 'pick':   asset = { kind: 'pick',   pickId:   d.value }; break;
    case 'cash':   asset = { kind: 'cash',   amount:   parseFloat(d.value) || 0 }; break;
    case 'other':  asset = { kind: 'other',  note:     d.value }; break;
  }
  return { asset, from: d.from, to: d.to };
}

export function TradeBuilder({ state, onSubmit, onCancel }: Props) {
  const [tradeTeams, setTradeTeams] = useState<TeamId[]>([]);
  const [movements, setMovements] = useState<MovementDraft[]>([]);
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  function addTeam(id: TeamId) {
    if (tradeTeams.includes(id)) return;
    const next = [...tradeTeams, id];
    setTradeTeams(next);
    if (next.length >= 2 && movements.length === 0) {
      setMovements([makeMovement(next)]);
    }
  }

  function removeTeam(id: TeamId) {
    const next = tradeTeams.filter(t => t !== id);
    setTradeTeams(next);
    setMovements(ms =>
      ms
        .filter(m => m.from !== id && m.to !== id)
        .map(m => ({ ...m })),
    );
  }

  function updateMovement(id: string, patch: Partial<MovementDraft>) {
    setMovements(ms =>
      ms.map(m => {
        if (m.id !== id) return m;
        const next = { ...m, ...patch };
        // Reset value when kind or from changes
        if (patch.kind !== undefined || patch.from !== undefined) next.value = '';
        return next;
      }),
    );
  }

  function submit() {
    setErrors([]);
    const converted = movements.map(draftToMovement);
    if (converted.some(m => m === null)) {
      setErrors(['Every movement needs an asset, a sender, and a receiver.']);
      return;
    }
    const validMovements = converted as AssetMovement[];
    const id = `trade-${Date.now()}`;
    const desc = description.trim() || autoDescription(validMovements);
    const trade: Trade = {
      id,
      date,
      teams: tradeTeams,
      movements: validMovements,
      description: desc,
    };
    const result = applyTrade(state, trade);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSubmit(trade);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Trade</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Teams */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Teams Involved
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tradeTeams.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded">
                  {t}
                  <button onClick={() => removeTeam(t)} className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-100 text-xs leading-none ml-0.5">×</button>
                </span>
              ))}
            </div>
            <select
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
              value=""
              onChange={e => { if (e.target.value) addTeam(e.target.value as TeamId); }}
            >
              <option value="">+ Add team…</option>
              {teams.filter(t => !tradeTeams.includes(t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.id} – {t.market} {t.name}</option>
              ))}
            </select>
          </div>

          {/* Movements */}
          {tradeTeams.length >= 2 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Asset Movements
              </label>
              <div className="space-y-2">
                {movements.map(m => (
                  <MovementRow
                    key={m.id}
                    draft={m}
                    tradeTeams={tradeTeams}
                    state={state}
                    onChange={patch => updateMovement(m.id, patch)}
                    onRemove={() => setMovements(ms => ms.filter(x => x.id !== m.id))}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMovements(ms => [...ms, makeMovement(tradeTeams)])}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                + Add movement
              </button>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Trade Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Description <span className="normal-case font-normal text-gray-300">(auto-generated if blank)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. BOS sends Tatum to ATL for picks"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 resize-none"
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Trade rejected:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i} className="text-sm text-red-600 dark:text-red-400">{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={tradeTeams.length < 2 || movements.length === 0}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Trade
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Movement row ---

interface RowProps {
  draft: MovementDraft;
  tradeTeams: TeamId[];
  state: LeagueState;
  onChange: (patch: Partial<MovementDraft>) => void;
  onRemove: () => void;
}

function MovementRow({ draft, tradeTeams, state, onChange, onRemove }: RowProps) {
  const fromRoster = teamRoster(state, draft.from);
  const fromPicks  = teamPicks(state, draft.from);

  return (
    <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
      {/* From */}
      <select
        value={draft.from}
        onChange={e => onChange({ from: e.target.value as TeamId })}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
      >
        {tradeTeams.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <span className="text-gray-400 text-xs">sends</span>

      {/* Asset kind */}
      <select
        value={draft.kind}
        onChange={e => onChange({ kind: e.target.value as AssetKind })}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
      >
        <option value="player">Player</option>
        <option value="pick">Pick</option>
        <option value="cash">Cash</option>
        <option value="other">Other</option>
      </select>

      {/* Asset value */}
      {draft.kind === 'player' && (
        <select
          value={draft.value}
          onChange={e => onChange({ value: e.target.value })}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 min-w-32"
        >
          <option value="">Select player…</option>
          {fromRoster.map(id => (
            <option key={id} value={id}>{playerMap[id] ?? id}</option>
          ))}
        </select>
      )}
      {draft.kind === 'pick' && (
        <select
          value={draft.value}
          onChange={e => onChange({ value: e.target.value })}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 min-w-40"
        >
          <option value="">Select pick…</option>
          {fromPicks.sort().map(id => {
            const p = pickRegistry[id];
            return (
              <option key={id} value={id}>
                {p ? `${p.year} R${p.round}${p.originTeam !== draft.from ? ` (via ${p.originTeam})` : ''}` : id}
              </option>
            );
          })}
        </select>
      )}
      {(draft.kind === 'cash' || draft.kind === 'other') && (
        <input
          type="text"
          value={draft.value}
          onChange={e => onChange({ value: e.target.value })}
          placeholder={draft.kind === 'cash' ? 'Amount (M)' : 'Note…'}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 w-32"
        />
      )}

      <span className="text-gray-400 text-xs">to</span>

      {/* To */}
      <select
        value={draft.to}
        onChange={e => onChange({ to: e.target.value as TeamId })}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
      >
        {tradeTeams.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
