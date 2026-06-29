import { useState, type ReactNode } from 'react';
import { teams, teamMap } from '../data/teams';
import type { FreeAgent } from '../lib/storage';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtContract(fa: FreeAgent): string {
  const parts: string[] = [];
  if (fa.contractYears) parts.push(`${fa.contractYears} yr`);
  if (fa.contractAav) {
    const total = fa.contractYears ? fa.contractAav * fa.contractYears : null;
    if (total) parts.push(`$${total % 1 === 0 ? total : total.toFixed(1)}M`);
    parts.push(`$${fa.contractAav % 1 === 0 ? fa.contractAav : fa.contractAav.toFixed(1)}M AAV`);
  }
  return parts.join(' · ');
}

function groupByTeam(list: FreeAgent[]): Array<{ teamId: string; label: string; players: FreeAgent[] }> {
  const map = new Map<string, FreeAgent[]>();
  for (const fa of list) {
    const key = fa.previousTeam ?? '__none';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(fa);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === '__none') return 1;
      if (b === '__none') return -1;
      return a.localeCompare(b);
    })
    .map(([teamId, players]) => {
      if (teamId === '__none') return { teamId, label: 'Unknown / Other', players };
      const info = teamMap[teamId];
      const label = info ? `${teamId} · ${info.market} ${info.name}` : teamId;
      return { teamId, label, players };
    });
}

interface SignData {
  team: string;
  years?: number;
  aav?: number;
  signedAt: string;
}

interface Props {
  freeAgents: FreeAgent[];
  onAdd: (data: Omit<FreeAgent, 'id'>) => void;
  onSign: (id: string, data: SignData) => void;
  onUnsign: (id: string) => void;
  onDelete: (id: string) => void;
}

type FilterTab = 'all' | 'unsigned' | 'signed';

export function FreeAgentBoard({ freeAgents, onAdd, onSign, onUnsign, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');

  const unsigned = freeAgents.filter(fa => fa.status === 'unsigned');
  const signed   = freeAgents.filter(fa => fa.status === 'signed');

  const filterFa = (list: FreeAgent[]) =>
    query
      ? list.filter(fa =>
          fa.name.toLowerCase().includes(query.toLowerCase()) ||
          (fa.previousTeam ?? '').toLowerCase().includes(query.toLowerCase()) ||
          (fa.signedTeam ?? '').toLowerCase().includes(query.toLowerCase()),
        )
      : list;

  const showUnsigned = tab !== 'signed';
  const showSigned   = tab !== 'unsigned';

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Free Agents</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">
            {unsigned.length} unsigned &middot; {signed.length} signed
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
          >
            + Add Player
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <AddFreeAgentForm
          onSubmit={data => { onAdd(data); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Search + tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search players…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          />
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
          {(['all', 'unsigned', 'signed'] as FilterTab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                tab === t
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t}
              {t === 'unsigned' && unsigned.length > 0 && (
                <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal">{unsigned.length}</span>
              )}
              {t === 'signed' && signed.length > 0 && (
                <span className="ml-1.5 text-slate-400 dark:text-slate-500 font-normal">{signed.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {freeAgents.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">🏃</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">No free agents tracked yet. Add one above.</p>
        </div>
      )}

      {/* Unsigned section */}
      {showUnsigned && filterFa(unsigned).length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
            Unsigned ({filterFa(unsigned).length})
          </p>
          <div className="space-y-6">
            {groupByTeam(filterFa(unsigned)).map(({ teamId, label, players }) => (
              <TeamGroup key={teamId ?? '__none'} label={label}>
                {players.map(fa => (
                  <UnsignedCard
                    key={fa.id}
                    fa={fa}
                    onSign={data => onSign(fa.id, data)}
                    onDelete={() => onDelete(fa.id)}
                  />
                ))}
              </TeamGroup>
            ))}
          </div>
        </div>
      )}

      {/* Signed section */}
      {showSigned && filterFa(signed).length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
            Signed ({filterFa(signed).length})
          </p>
          <div className="space-y-6">
            {groupByTeam(filterFa(signed)).map(({ teamId, label, players }) => (
              <TeamGroup key={teamId ?? '__none'} label={label}>
                {players.map(fa => (
                  <SignedCard
                    key={fa.id}
                    fa={fa}
                    onUnsign={() => onUnsign(fa.id)}
                    onDelete={() => onDelete(fa.id)}
                  />
                ))}
              </TeamGroup>
            ))}
          </div>
        </div>
      )}

      {freeAgents.length > 0 && filterFa(unsigned).length === 0 && filterFa(signed).length === 0 && (
        <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">No matches</p>
      )}
    </div>
  );
}

// --- Team group ---

function TeamGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2.5">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">{label}</p>
        <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
      </div>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

// --- Unsigned card ---

function UnsignedCard({
  fa,
  onSign,
  onDelete,
}: {
  fa: FreeAgent;
  onSign: (data: SignData) => void;
  onDelete: () => void;
}) {
  const [signing, setSigning] = useState(false);

  return (
    <li className="animate-fade-up bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="flex items-start gap-3 p-4 group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fa.name}</span>
            {fa.previousTeam && (
              <span className="text-xs font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md">
                {fa.previousTeam}
              </span>
            )}
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800 rounded-full uppercase tracking-wide">
              Unsigned
            </span>
          </div>
          {fa.notes && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{fa.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={() => setSigning(v => !v)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
              signing
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {signing ? 'Cancel' : 'Sign'}
          </button>
          <button
            type="button"
            onClick={() => { if (window.confirm(`Remove ${fa.name}?`)) onDelete(); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-lg leading-none transition-all"
          >
            ×
          </button>
        </div>
      </div>

      {/* Inline sign form */}
      {signing && (
        <SignForm
          playerName={fa.name}
          onSubmit={data => { onSign(data); setSigning(false); }}
          onCancel={() => setSigning(false)}
        />
      )}
    </li>
  );
}

// --- Signed card ---

function SignedCard({
  fa,
  onUnsign,
  onDelete,
}: {
  fa: FreeAgent;
  onUnsign: () => void;
  onDelete: () => void;
}) {
  const contract = fmtContract(fa);

  return (
    <li className="animate-fade-up bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl shadow-sm group">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fa.name}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 rounded-full uppercase tracking-wide">
              Signed
            </span>
          </div>

          {/* Team flow */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {fa.previousTeam && (
              <>
                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md">
                  {fa.previousTeam}
                </span>
                <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            {fa.signedTeam && (
              <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md">
                {fa.signedTeam}
              </span>
            )}
          </div>

          {/* Contract */}
          {contract && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{contract}</p>
          )}
          {fa.signedAt && (
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">Signed {formatDate(fa.signedAt)}</p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={() => { if (window.confirm(`Mark ${fa.name} as unsigned again? This will also remove them from the ${fa.signedTeam} roster.`)) onUnsign(); }}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
          >
            Unsign
          </button>
          <button
            type="button"
            onClick={() => { if (window.confirm(`Remove ${fa.name}?`)) onDelete(); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-lg leading-none transition-all"
          >
            ×
          </button>
        </div>
      </div>
    </li>
  );
}

// --- Inline sign form ---

function SignForm({
  playerName,
  onSubmit,
  onCancel,
}: {
  playerName: string;
  onSubmit: (data: SignData) => void;
  onCancel: () => void;
}) {
  const [team, setTeam] = useState('');
  const [years, setYears] = useState('');
  const [aav, setAav] = useState('');
  const [date, setDate] = useState(localToday);
  const [error, setError] = useState('');

  const inputCls = 'text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all';

  function submit() {
    if (!team) { setError('Select a team.'); return; }
    onSubmit({
      team,
      years: years ? parseInt(years) : undefined,
      aav: aav ? parseFloat(aav) : undefined,
      signedAt: date,
    });
  }

  return (
    <div className="border-t border-slate-100 dark:border-slate-700 px-4 pb-4 pt-4 space-y-4 animate-fade-up bg-slate-50/50 dark:bg-slate-900/30">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        Signing {playerName}
      </p>

      {/* Team */}
      <div>
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Team</label>
        <select
          value={team}
          onChange={e => { setTeam(e.target.value); setError(''); }}
          className={inputCls}
          autoFocus
        >
          <option value="">Select team…</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.id} – {t.market} {t.name}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Contract */}
      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Years</label>
          <input
            type="number"
            min={1}
            max={5}
            value={years}
            onChange={e => setYears(e.target.value)}
            placeholder="e.g. 3"
            className={`${inputCls} w-24`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">AAV ($M)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={aav}
            onChange={e => setAav(e.target.value)}
            placeholder="e.g. 35"
            className={`${inputCls} w-28`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-95"
        >
          Confirm Signing
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- Add free agent form ---

function AddFreeAgentForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Omit<FreeAgent, 'id'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [previousTeam, setPreviousTeam] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const inputCls = 'w-full text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all';

  function submit() {
    if (!name.trim()) { setError('Player name is required.'); return; }
    onSubmit({
      name: name.trim(),
      previousTeam: previousTeam || undefined,
      status: 'unsigned',
      addedAt: localToday(),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="animate-scale-in mb-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">New Free Agent</p>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Player Name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
          placeholder="e.g. LeBron James"
          className={inputCls}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Previous team */}
      <div>
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Previous Team (optional)</label>
        <select
          value={previousTeam}
          onChange={e => setPreviousTeam(e.target.value)}
          className={inputCls}
        >
          <option value="">None / Unknown</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.id} – {t.market} {t.name}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. Top-10 caliber player, expected to command max deal…"
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
