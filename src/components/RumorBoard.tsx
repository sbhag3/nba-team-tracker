import { useState } from 'react';
import { teams } from '../data/teams';
import type { Rumor } from '../lib/storage';

interface Props {
  rumors: Rumor[];
  onAdd: (rumor: Omit<Rumor, 'id'>) => void;
  onDelete: (id: string) => void;
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RumorBoard({ rumors, onAdd, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = [...rumors]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter(r => {
      if (teamFilter && !r.teams.includes(teamFilter)) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          r.content.toLowerCase().includes(q) ||
          (r.source ?? '').toLowerCase().includes(q) ||
          r.teams.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    });

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Bulletin Board</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">
            {rumors.length} rumor{rumors.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
          >
            + Add Rumor
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <AddRumorForm
          onSubmit={data => { onAdd(data); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search rumors…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          />
        </div>
        <select
          value={teamFilter}
          onChange={e => setTeamFilter(e.target.value)}
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
        >
          <option value="">All teams</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.id} – {t.name}</option>
          ))}
        </select>
      </div>

      {/* Rumor cards */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {query || teamFilter ? 'No matching rumors.' : 'No rumors yet. Add one above.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(r => (
            <RumorCard key={r.id} rumor={r} onDelete={() => onDelete(r.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Rumor card ---

function RumorCard({ rumor, onDelete }: { rumor: Rumor; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = rumor.content.length > 200;
  const displayText = isLong && !expanded
    ? rumor.content.slice(0, 200).trimEnd() + '…'
    : rumor.content;

  return (
    <li className="animate-fade-up group bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-200">
      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{formatDate(rumor.createdAt)}</span>
        {rumor.source && (
          <>
            <span className="text-slate-200 dark:text-slate-700 text-xs select-none">·</span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
              {rumor.source}
            </span>
          </>
        )}
        {rumor.teams.map(t => (
          <span
            key={t}
            className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-semibold"
          >
            {t}
          </span>
        ))}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Remove this rumor?')) onDelete();
          }}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-base"
          title="Delete rumor"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{displayText}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-2 text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 font-medium transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </li>
  );
}

// --- Add rumor form ---

interface AddRumorFormProps {
  onSubmit: (data: Omit<Rumor, 'id'>) => void;
  onCancel: () => void;
}

function AddRumorForm({ onSubmit, onCancel }: AddRumorFormProps) {
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState(localToday);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [error, setError] = useState('');

  function addTeam(id: string) {
    if (!selectedTeams.includes(id)) setSelectedTeams(prev => [...prev, id]);
  }

  function removeTeam(id: string) {
    setSelectedTeams(prev => prev.filter(t => t !== id));
  }

  function submit() {
    if (!content.trim()) { setError('Rumor content is required.'); return; }
    onSubmit({
      createdAt: date,
      content: content.trim(),
      source: source.trim() || undefined,
      teams: selectedTeams,
    });
  }

  const inputCls = 'w-full text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all';

  return (
    <div className="animate-scale-in mb-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">New Rumor</p>

      {/* Content */}
      <div>
        <textarea
          autoFocus
          value={content}
          onChange={e => { setContent(e.target.value); setError(''); }}
          rows={4}
          placeholder="What's the rumor? e.g. 'League sources say BOS is shopping a starter for cap relief…'"
          className={`${inputCls} resize-none`}
        />
        {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Source */}
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Source (optional)</label>
          <input
            type="text"
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="Woj, Shams, @reporter…"
            className={inputCls}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={inputCls}
            style={{ width: 'auto' }}
          />
        </div>
      </div>

      {/* Teams */}
      <div>
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 mb-2">Teams mentioned (optional)</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTeams.map(t => (
            <span key={t} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-semibold">
              {t}
              <button type="button" onClick={() => removeTeam(t)} className="hover:text-blue-900 dark:hover:text-blue-100 leading-none text-base -mr-0.5">×</button>
            </span>
          ))}
        </div>
        <select
          value=""
          onChange={e => { if (e.target.value) addTeam(e.target.value); }}
          className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        >
          <option value="">+ Add team…</option>
          {teams.filter(t => !selectedTeams.includes(t.id)).map(t => (
            <option key={t.id} value={t.id}>{t.id} – {t.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95"
        >
          Post
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
