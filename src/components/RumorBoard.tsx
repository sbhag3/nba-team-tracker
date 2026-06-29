import { useState } from 'react';
import { teams } from '../data/teams';
import type { Rumor, FlaggedPlayer } from '../lib/storage';
import type { PlayerFlag } from '../data/playerFlags';
import { ALL_FLAGS, FLAG_META } from '../data/playerFlags';
import { TeamChip } from './TeamChip';
import { FlagBadge } from './FlagBadge';

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  rumors: Rumor[];
  onAdd: (rumor: Omit<Rumor, 'id'>) => void;
  onDelete: (id: string) => void;
  flaggedPlayers: FlaggedPlayer[];
  onSavePlayerFlags: (playerId: string, playerName: string, team: string, flags: PlayerFlag[], notes: string) => void;
}

type BoardTab = 'watchlist' | 'rumors';

export function RumorBoard({ rumors, onAdd, onDelete, flaggedPlayers, onSavePlayerFlags }: Props) {
  const [boardTab, setBoardTab] = useState<BoardTab>('watchlist');
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Bulletin Board</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">
            {flaggedPlayers.length} player{flaggedPlayers.length !== 1 ? 's' : ''} flagged &middot; {rumors.length} rumor{rumors.length !== 1 ? 's' : ''}
          </p>
        </div>
        {boardTab === 'rumors' && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
          >
            + Add Rumor
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5 mb-7 self-start w-fit">
        {([
          { id: 'watchlist', label: 'Watch List', count: flaggedPlayers.length },
          { id: 'rumors',    label: 'Rumors',     count: rumors.length },
        ] as { id: BoardTab; label: string; count: number }[]).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setBoardTab(t.id)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              boardTab === t.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 font-normal ${boardTab === t.id ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Watch List tab */}
      {boardTab === 'watchlist' && (
        <WatchList flaggedPlayers={flaggedPlayers} onSavePlayerFlags={onSavePlayerFlags} />
      )}

      {/* Rumors tab */}
      {boardTab === 'rumors' && (
        <>
          {showForm && (
            <AddRumorForm
              onSubmit={data => { onAdd(data); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          )}

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
        </>
      )}
    </div>
  );
}

// --- Watch List ---

function WatchList({
  flaggedPlayers,
  onSavePlayerFlags,
}: {
  flaggedPlayers: FlaggedPlayer[];
  onSavePlayerFlags: (playerId: string, playerName: string, team: string, flags: PlayerFlag[], notes: string) => void;
}) {
  if (flaggedPlayers.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl mb-3">⚑</p>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No players flagged yet. Use the ⚑ icon on any roster row to flag a player.
        </p>
      </div>
    );
  }

  const sorted = [...flaggedPlayers].sort((a, b) =>
    a.team.localeCompare(b.team) || a.playerName.localeCompare(b.playerName),
  );

  return (
    <ul className="space-y-2.5">
      {sorted.map(fp => (
        <WatchCard
          key={fp.id}
          fp={fp}
          onSave={(flags, notes) => onSavePlayerFlags(fp.playerId, fp.playerName, fp.team, flags, notes)}
          onDelete={() => onSavePlayerFlags(fp.playerId, fp.playerName, fp.team, [], '')}
        />
      ))}
    </ul>
  );
}

function WatchCard({
  fp,
  onSave,
  onDelete,
}: {
  fp: FlaggedPlayer;
  onSave: (flags: PlayerFlag[], notes: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localFlags, setLocalFlags] = useState<PlayerFlag[]>([]);
  const [localNotes, setLocalNotes] = useState('');

  function startEdit() {
    setLocalFlags(fp.flags);
    setLocalNotes(fp.notes ?? '');
    setEditing(true);
  }

  return (
    <li className="animate-fade-up bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm">
      <div className="flex items-start gap-3 p-4 group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{fp.playerName}</span>
            {fp.team && <TeamChip team={fp.team} />}
            {fp.flags.map(f => <FlagBadge key={f} flag={f} />)}
            {fp.faId && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">
                FA synced
              </span>
            )}
          </div>
          {fp.notes && !editing && (
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{fp.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={startEdit}
            className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg transition-colors text-xs"
            title="Edit flags"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => { if (window.confirm(`Remove all flags for ${fp.playerName}?`)) onDelete(); }}
            className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {editing && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 pb-4 pt-3 space-y-3 animate-fade-up">
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
            placeholder="Notes…"
            className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-colors"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { onSave(localFlags, localNotes); setEditing(false); }}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 font-medium"
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
          </div>
        </div>
      )}
    </li>
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
          <TeamChip key={t} team={t} />
        ))}
        <button
          type="button"
          onClick={() => { if (window.confirm('Remove this rumor?')) onDelete(); }}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-base"
          title="Delete rumor"
        >
          ×
        </button>
      </div>

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
