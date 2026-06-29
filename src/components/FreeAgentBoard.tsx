import { useState, type ReactNode } from 'react';
import { teams, teamMap } from '../data/teams';
import type { FreeAgent } from '../lib/storage';
import { TeamChip } from './TeamChip';

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

const FA_TYPE = {
  rfa: { label: 'RFA', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  ufa: { label: 'UFA', className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
} as const;

interface SignData {
  team: string;
  years?: number;
  aav?: number;
  signedAt: string;
}

interface Props {
  freeAgents: FreeAgent[];
  onAdd: (data: Omit<FreeAgent, 'id'>) => void;
  onUpdate: (id: string, data: Partial<FreeAgent>) => void;
  onSign: (id: string, data: SignData) => void;
  onUnsign: (id: string) => void;
  onDelete: (id: string) => void;
}

type FilterTab = 'unsigned' | 'signed';

export function FreeAgentBoard({ freeAgents, onAdd, onUpdate, onSign, onUnsign, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<FilterTab>('unsigned');
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

  const showUnsigned = tab === 'unsigned';
  const showSigned   = tab === 'signed';

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
          {(['unsigned', 'signed'] as FilterTab[]).map(t => (
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
              <TeamGroup key={teamId} label={label}>
                {players.map(fa => (
                  <UnsignedCard
                    key={fa.id}
                    fa={fa}
                    onUpdate={data => onUpdate(fa.id, data)}
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
              <TeamGroup key={teamId} label={label}>
                {players.map(fa => (
                  <SignedCard
                    key={fa.id}
                    fa={fa}
                    onUpdate={data => onUpdate(fa.id, data)}
                    onUnsign={() => onUnsign(fa.id)}
                    onDelete={() => onDelete(fa.id)}
                  />
                ))}
              </TeamGroup>
            ))}
          </div>
        </div>
      )}

      {freeAgents.length > 0 && (
        (tab === 'unsigned' && filterFa(unsigned).length === 0) ||
        (tab === 'signed'   && filterFa(signed).length   === 0)
      ) && (
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

// --- FA type badge ---

function FaTypeBadge({ type }: { type: 'rfa' | 'ufa' }) {
  const meta = FA_TYPE[type];
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${meta.className}`}>
      {meta.label}
    </span>
  );
}

// --- Unsigned card ---

function UnsignedCard({
  fa,
  onUpdate,
  onSign,
  onDelete,
}: {
  fa: FreeAgent;
  onUpdate: (data: Partial<FreeAgent>) => void;
  onSign: (data: SignData) => void;
  onDelete: () => void;
}) {
  const [panel, setPanel] = useState<'sign' | 'edit' | null>(null);
  const toggle = (p: 'sign' | 'edit') => setPanel(prev => prev === p ? null : p);

  return (
    <li className="animate-fade-up bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-4 group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fa.name}</span>
            {fa.previousTeam && <TeamChip team={fa.previousTeam} />}
            {fa.faType && <FaTypeBadge type={fa.faType} />}
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
            onClick={() => toggle('edit')}
            title="Edit player"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              panel === 'edit'
                ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400'
            }`}
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => toggle('sign')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
              panel === 'sign'
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {panel === 'sign' ? 'Cancel' : 'Sign'}
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

      {panel === 'edit' && (
        <EditFaForm fa={fa} onSave={data => { onUpdate(data); setPanel(null); }} onCancel={() => setPanel(null)} />
      )}
      {panel === 'sign' && (
        <SignForm playerName={fa.name} onSubmit={data => { onSign(data); setPanel(null); }} onCancel={() => setPanel(null)} />
      )}
    </li>
  );
}

// --- Signed card ---

function SignedCard({
  fa,
  onUpdate,
  onUnsign,
  onDelete,
}: {
  fa: FreeAgent;
  onUpdate: (data: Partial<FreeAgent>) => void;
  onUnsign: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const contract = fmtContract(fa);

  return (
    <li className="animate-fade-up bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl shadow-sm group overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fa.name}</span>
            {fa.faType && <FaTypeBadge type={fa.faType} />}
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 rounded-full uppercase tracking-wide">
              Signed
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {fa.previousTeam && (
              <>
                <TeamChip team={fa.previousTeam} />
                <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
            {fa.signedTeam && <TeamChip team={fa.signedTeam} />}
          </div>

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
            onClick={() => setEditing(v => !v)}
            title="Edit player"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              editing
                ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400'
            }`}
          >
            ✎
          </button>
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

      {editing && (
        <EditFaForm fa={fa} onSave={data => { onUpdate(data); setEditing(false); }} onCancel={() => setEditing(false)} />
      )}
    </li>
  );
}

// --- Edit free agent form ---

function EditFaForm({
  fa,
  onSave,
  onCancel,
}: {
  fa: FreeAgent;
  onSave: (data: Partial<FreeAgent>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(fa.name);
  const [previousTeam, setPreviousTeam] = useState(fa.previousTeam ?? '');
  const [faType, setFaType] = useState<'' | 'rfa' | 'ufa'>(fa.faType ?? '');
  const [notes, setNotes] = useState(fa.notes ?? '');
  const [signedTeam, setSignedTeam] = useState(fa.signedTeam ?? '');
  const [years, setYears] = useState(fa.contractYears?.toString() ?? '');
  const [aav, setAav] = useState(fa.contractAav?.toString() ?? '');
  const [signedAt, setSignedAt] = useState(fa.signedAt ?? localToday());

  const inputCls = 'w-full text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all';

  function save() {
    const data: Partial<FreeAgent> = {
      name: name.trim() || fa.name,
      previousTeam: previousTeam || undefined,
      faType: faType || undefined,
      notes: notes.trim() || undefined,
    };
    if (fa.status === 'signed') {
      data.signedTeam = signedTeam || undefined;
      data.contractYears = years ? parseInt(years) : undefined;
      data.contractAav = aav ? parseFloat(aav) : undefined;
      data.signedAt = signedAt || undefined;
    }
    onSave(data);
  }

  return (
    <div className="border-t border-slate-100 dark:border-slate-700 px-4 pb-4 pt-4 space-y-4 animate-fade-up bg-slate-50/50 dark:bg-slate-900/30">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Edit Player</p>

      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Name</label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}
            className={inputCls}
          />
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Previous Team</label>
          <select value={previousTeam} onChange={e => setPreviousTeam(e.target.value)} className={inputCls}>
            <option value="">None / Unknown</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.id} – {t.market} {t.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">FA Type</label>
        <div className="flex gap-2">
          {(['', 'rfa', 'ufa'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setFaType(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                faType === v
                  ? v === 'rfa'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                    : v === 'ufa'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                  : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {v === '' ? 'None' : v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {fa.status === 'signed' && (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Signed Team</label>
            <select value={signedTeam} onChange={e => setSignedTeam(e.target.value)} className={inputCls}>
              <option value="">Select team…</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.id} – {t.market} {t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Years</label>
              <input type="number" min={1} max={5} value={years} onChange={e => setYears(e.target.value)} placeholder="e.g. 3" className={`${inputCls} w-24`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">AAV ($M)</label>
              <input type="number" min={0} step={0.1} value={aav} onChange={e => setAav(e.target.value)} placeholder="e.g. 35" className={`${inputCls} w-28`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Signed Date</label>
              <input type="date" value={signedAt} onChange={e => setSignedAt(e.target.value)} className={inputCls} style={{ width: 'auto' }} />
            </div>
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" className={`${inputCls} resize-none`} />
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={save} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95">
          Save
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
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

      <div>
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Team</label>
        <select value={team} onChange={e => { setTeam(e.target.value); setError(''); }} className={inputCls} autoFocus>
          <option value="">Select team…</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.id} – {t.market} {t.name}</option>)}
        </select>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Years</label>
          <input type="number" min={1} max={5} value={years} onChange={e => setYears(e.target.value)} placeholder="e.g. 3" className={`${inputCls} w-24`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">AAV ($M)</label>
          <input type="number" min={0} step={0.1} value={aav} onChange={e => setAav(e.target.value)} placeholder="e.g. 35" className={`${inputCls} w-28`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={submit} className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-95">
          Confirm Signing
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
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
  const [faType, setFaType] = useState<'' | 'rfa' | 'ufa'>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const inputCls = 'w-full text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all';

  function submit() {
    if (!name.trim()) { setError('Player name is required.'); return; }
    onSubmit({
      name: name.trim(),
      previousTeam: previousTeam || undefined,
      faType: faType || undefined,
      status: 'unsigned',
      addedAt: localToday(),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="animate-scale-in mb-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">New Free Agent</p>

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

      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Previous Team (optional)</label>
          <select value={previousTeam} onChange={e => setPreviousTeam(e.target.value)} className={inputCls}>
            <option value="">None / Unknown</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.id} – {t.market} {t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">FA Type</label>
          <div className="flex gap-2">
            {(['', 'rfa', 'ufa'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setFaType(v)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                  faType === v
                    ? v === 'rfa'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                      : v === 'ufa'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                {v === '' ? 'None' : v.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

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
        <button type="button" onClick={submit} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95">
          Add
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
