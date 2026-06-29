import { useState, useMemo, useEffect, useRef } from 'react';
import type { Trade } from './domain/nba-trade-tracker-schema';
import { project } from './domain/nba-trade-tracker-schema';
import { buildSeed } from './domain/seed';
import { playerMap } from './domain/seed';
import { TeamSidebar } from './components/TeamSidebar';
import { TeamDashboard } from './components/TeamDashboard';
import { RumorBoard } from './components/RumorBoard';
import { FreeAgentBoard } from './components/FreeAgentBoard';
import { TradeBuilder } from './components/TradeBuilder';
import { TradeHistory } from './components/TradeHistory';
import { PlayerSearch } from './components/PlayerSearch';
import {
  loadTrades, saveTrades, exportTrades, readImportFile,
  loadSalaryEdits, saveSalaryEdits,
  loadRemoved, saveRemoved,
  loadAddedPlayers, saveAddedPlayers,
  loadRumors, saveRumors,
  loadFreeAgents, saveFreeAgents,
} from './lib/storage';
import type { SalaryEdits, AddedPlayer, Rumor, FreeAgent } from './lib/storage';

const seed = buildSeed();

// Hydrate playerMap from persisted custom players so names are available on first render.
(function hydrateCustomData() {
  for (const p of loadAddedPlayers()) {
    (playerMap as Record<string, string>)[p.id] = p.fullName;
  }
})();

export default function App() {
  const [selectedTeam, setSelectedTeam] = useState('BOS');
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades());
  const [salaryEdits, setSalaryEdits] = useState<SalaryEdits>(() => loadSalaryEdits());
  const [removedPlayers, setRemovedPlayers] = useState<Set<string>>(
    () => new Set(loadRemoved().players),
  );
  const [addedPlayers, setAddedPlayers] = useState<AddedPlayer[]>(() => loadAddedPlayers());
  const [rumors, setRumors] = useState<Rumor[]>(() => loadRumors());
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>(() => loadFreeAgents());
  const [view, setView] = useState<'roster' | 'rumors' | 'freeagents'>('roster');
  const [showBuilder, setShowBuilder] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => { saveTrades(trades); }, [trades]);
  useEffect(() => { saveSalaryEdits(salaryEdits); }, [salaryEdits]);
  useEffect(() => {
    saveRemoved({ players: [...removedPlayers], picks: [] });
  }, [removedPlayers]);
  useEffect(() => { saveAddedPlayers(addedPlayers); }, [addedPlayers]);
  useEffect(() => { saveRumors(rumors); }, [rumors]);
  useEffect(() => { saveFreeAgents(freeAgents); }, [freeAgents]);

  const dynamicSeed = useMemo(() => {
    if (addedPlayers.length === 0) return seed;
    const rosters: Record<string, string[]> = Object.fromEntries(
      Object.entries(seed.rosters).map(([t, ids]) => [t, [...ids]]),
    );
    for (const p of addedPlayers) {
      if (!rosters[p.team]) rosters[p.team] = [];
      if (!rosters[p.team].includes(p.id)) rosters[p.team].push(p.id);
    }
    return { ...seed, rosters };
  }, [addedPlayers]);

  const activeTrades = useMemo(
    () => asOfDate ? trades.filter(t => t.date <= asOfDate) : trades,
    [trades, asOfDate],
  );

  const state = useMemo(() => project(dynamicSeed, activeTrades), [dynamicSeed, activeTrades]);

  const addedPlayerIds = useMemo(() => new Set(addedPlayers.map(p => p.id)), [addedPlayers]);

  function handleTrade(trade: Trade) {
    setTrades(prev => [...prev, trade]);
    setShowBuilder(false);
  }

  function handleDeleteTrade(id: string) {
    setTrades(prev => prev.filter(t => t.id !== id));
  }

  function handleRemovePlayer(id: string) {
    setRemovedPlayers(prev => { const next = new Set(prev); next.add(id); return next; });
  }

  function handleAddPlayer(fullName: string, team: string) {
    const id = `custom-p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    (playerMap as Record<string, string>)[id] = fullName;
    setAddedPlayers(prev => [...prev, { id, fullName, team }]);
  }

  function handleDeleteAddedPlayer(id: string) {
    delete (playerMap as Record<string, string>)[id];
    setAddedPlayers(prev => prev.filter(p => p.id !== id));
    setRemovedPlayers(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  function handleSalaryEdit(playerId: string, salary: number | null) {
    setSalaryEdits(prev => {
      const next = { ...prev };
      if (salary == null) {
        delete next[playerId];
      } else {
        next[playerId] = salary;
      }
      return next;
    });
  }

  function handleAddRumor(data: Omit<Rumor, 'id'>) {
    const rumor: Rumor = { id: `rumor-${Date.now()}`, ...data };
    setRumors(prev => [...prev, rumor].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  function handleDeleteRumor(id: string) {
    setRumors(prev => prev.filter(r => r.id !== id));
  }

  function handleAddFreeAgent(data: Omit<FreeAgent, 'id'>) {
    setFreeAgents(prev => [...prev, { ...data, id: `fa-${Date.now()}` }]);
  }

  function handleSignFreeAgent(
    id: string,
    data: { team: string; years?: number; aav?: number; signedAt: string },
  ) {
    const fa = freeAgents.find(f => f.id === id);
    if (!fa) return;
    // Add the player to the signed team's roster immediately
    handleAddPlayer(fa.name, data.team);
    setFreeAgents(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, status: 'signed' as const, signedTeam: data.team, contractYears: data.years, contractAav: data.aav, signedAt: data.signedAt }
          : f,
      ),
    );
  }

  function handleUnsignFreeAgent(id: string) {
    const fa = freeAgents.find(f => f.id === id);
    if (!fa) return;
    // Remove from roster: find the custom player entry that was added when signing
    const addedEntry = addedPlayers.find(
      p => p.fullName === fa.name && p.team === fa.signedTeam,
    );
    if (addedEntry) handleDeleteAddedPlayer(addedEntry.id);
    setFreeAgents(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, status: 'unsigned' as const, signedTeam: undefined, contractYears: undefined, contractAav: undefined, signedAt: undefined }
          : f,
      ),
    );
  }

  function handleDeleteFreeAgent(id: string) {
    const fa = freeAgents.find(f => f.id === id);
    if (fa?.status === 'signed') {
      const addedEntry = addedPlayers.find(
        p => p.fullName === fa.name && p.team === fa.signedTeam,
      );
      if (addedEntry) handleDeleteAddedPlayer(addedEntry.id);
    }
    setFreeAgents(prev => prev.filter(f => f.id !== id));
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      setTrades(await readImportFile(file));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  }

  const timeTravelling = asOfDate !== '';
  const hiddenTradeCount = trades.length - activeTrades.length;

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TeamSidebar
        selected={selectedTeam}
        view={view}
        onSelect={id => { setSelectedTeam(id); setView('roster'); }}
        onPageSelect={page => setView(page)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-6 h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
          {/* Time travel */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <label htmlFor="asof" className="text-xs text-slate-400 dark:text-slate-500 shrink-0">As of</label>
            <input
              id="asof"
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
            />
            {timeTravelling && (
              <button
                type="button"
                onClick={() => setAsOfDate('')}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5">
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(v => !v)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              {darkMode ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSearch(true)}
              title="Search players"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <div className="w-px h-5 bg-slate-200" />

            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-95"
            >
              History
              {trades.length > 0 && <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">({trades.length})</span>}
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

            <button
              type="button"
              onClick={() => exportTrades(trades)}
              disabled={trades.length === 0}
              className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-95"
            >
              Import
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

            <button
              type="button"
              onClick={() => setShowBuilder(true)}
              className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
            >
              + New Trade
            </button>
          </div>
        </header>

        {/* Time-travel banner */}
        {timeTravelling && (
          <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-900/15 border-b border-amber-100 dark:border-amber-900/40 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            Viewing state as of <strong>{asOfDate}</strong> — {activeTrades.length} of {trades.length} trade{trades.length !== 1 ? 's' : ''} applied
            {hiddenTradeCount > 0 && `, ${hiddenTradeCount} hidden`}.
          </div>
        )}

        {importError && (
          <div className="mx-6 mt-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl text-sm text-red-700 dark:text-red-400">
            Import error: {importError}
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          {view === 'rumors' ? (
            <RumorBoard
              rumors={rumors}
              onAdd={handleAddRumor}
              onDelete={handleDeleteRumor}
            />
          ) : view === 'freeagents' ? (
            <FreeAgentBoard
              freeAgents={freeAgents}
              onAdd={handleAddFreeAgent}
              onSign={handleSignFreeAgent}
              onUnsign={handleUnsignFreeAgent}
              onDelete={handleDeleteFreeAgent}
            />
          ) : (
            <TeamDashboard
              state={state}
              team={selectedTeam}
              trades={activeTrades}
              salaryEdits={salaryEdits}
              onSalaryEdit={handleSalaryEdit}
              removedPlayers={removedPlayers}
              onRemovePlayer={handleRemovePlayer}
              addedPlayerIds={addedPlayerIds}
              onAddPlayer={handleAddPlayer}
              onDeleteAddedPlayer={handleDeleteAddedPlayer}
            />
          )}
        </main>
      </div>

      {showBuilder && (
        <TradeBuilder state={state} onSubmit={handleTrade} onCancel={() => setShowBuilder(false)} />
      )}
      {showHistory && (
        <TradeHistory trades={trades} onDelete={handleDeleteTrade} onClose={() => setShowHistory(false)} />
      )}
      {showSearch && (
        <PlayerSearch state={state} onClose={() => setShowSearch(false)} />
      )}
    </div>
  );
}
