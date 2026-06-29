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

const inputCls = 'text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all';

export function TradeBuilder({ state, onSubmit, onCancel }: Props) {
  const [tradeTeams, setTradeTeams] = useState<TeamId[]>([]);
  const [movements, setMovements] = useState<MovementDraft[]>([]);
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [historical, setHistorical] = useState(false);

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
        if (patch.kind !== undefined || patch.from !== undefined) next.value = '';
        return next;
      }),
    );
  }

  function submit() {
    setErrors([]);

    if (historical) {
      if (!description.trim()) {
        setErrors(['A description is required for historical trades.']);
        return;
      }
      onSubmit({
        id: `trade-${Date.now()}`,
        date,
        teams: tradeTeams,
        movements: [],
        description: description.trim(),
        historical: true,
      });
      return;
    }

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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 animate-fade-in"
      style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              {historical ? 'Log Historical Trade' : 'New Trade'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {historical ? "Record-only — won't modify rosters" : 'Apply a trade to current rosters'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-lg leading-none transition-all active:scale-95"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Historical toggle */}
          <label className="flex items-start gap-3 cursor-pointer select-none p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
            <input
              type="checkbox"
              checked={historical}
              onChange={e => setHistorical(e.target.checked)}
              className="mt-0.5 shrink-0 accent-blue-600 w-4 h-4"
            />
            <div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Already reflected in roster</span>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Logs this trade for reference only — won't modify any roster.
              </p>
            </div>
          </label>

          {/* Teams */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Teams Involved
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tradeTeams.map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm font-semibold rounded-xl">
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTeam(t)}
                    className="text-blue-400 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-100 text-base leading-none transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <select
              className={inputCls}
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
          {!historical && tradeTeams.length >= 2 && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
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
                className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                + Add movement
              </button>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Trade Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Description{' '}
              {historical
                ? <span className="normal-case font-normal text-red-400 tracking-normal">(required)</span>
                : <span className="normal-case font-normal text-slate-300 dark:text-slate-600 tracking-normal">— auto-generated if blank</span>
              }
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder={historical
                ? 'e.g. BOS sends Jayson Tatum to OKC for Shai Gilgeous-Alexander and picks'
                : 'e.g. BOS sends Tatum to ATL for picks'
              }
              className={`${inputCls} w-full resize-none`}
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-4 animate-fade-up">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1.5">Trade rejected</p>
              <ul className="space-y-0.5">
                {errors.map((e, i) => (
                  <li key={i} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">·</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={historical
              ? tradeTeams.length < 2
              : tradeTeams.length < 2 || movements.length === 0
            }
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
          >
            {historical ? 'Log Trade' : 'Submit Trade'}
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

const selectCls = 'text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all';

function MovementRow({ draft, tradeTeams, state, onChange, onRemove }: RowProps) {
  const fromRoster = teamRoster(state, draft.from);
  const fromPicks  = teamPicks(state, draft.from);

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5 animate-fade-up">
      <select
        value={draft.from}
        onChange={e => onChange({ from: e.target.value as TeamId })}
        className={selectCls}
      >
        {tradeTeams.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">sends</span>

      <select
        value={draft.kind}
        onChange={e => onChange({ kind: e.target.value as AssetKind })}
        className={selectCls}
      >
        <option value="player">Player</option>
        <option value="pick">Pick</option>
        <option value="cash">Cash</option>
        <option value="other">Other</option>
      </select>

      {draft.kind === 'player' && (
        <select
          value={draft.value}
          onChange={e => onChange({ value: e.target.value })}
          className={`${selectCls} min-w-36`}
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
          className={`${selectCls} min-w-44`}
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
          className={`${selectCls} w-32`}
        />
      )}

      <span className="text-slate-400 dark:text-slate-500 text-xs font-medium">to</span>

      <select
        value={draft.to}
        onChange={e => onChange({ to: e.target.value as TeamId })}
        className={selectCls}
      >
        {tradeTeams.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-lg leading-none transition-all"
      >
        ×
      </button>
    </div>
  );
}
