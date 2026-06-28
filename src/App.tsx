import { useState, useMemo, useEffect, useRef } from 'react';
import type { Trade } from './domain/nba-trade-tracker-schema';
import { project } from './domain/nba-trade-tracker-schema';
import { buildSeed } from './domain/seed';
import { playerMap } from './domain/seed';
import { TeamSidebar } from './components/TeamSidebar';
import { TeamDashboard } from './components/TeamDashboard';
import { TradeBuilder } from './components/TradeBuilder';
import { TradeHistory } from './components/TradeHistory';
import { PlayerSearch } from './components/PlayerSearch';
import {
  loadTrades, saveTrades, exportTrades, readImportFile,
  loadSalaryEdits, saveSalaryEdits,
  loadRemoved, saveRemoved,
  loadAddedPlayers, saveAddedPlayers,
} from './lib/storage';
import type { SalaryEdits, AddedPlayer } from './lib/storage';

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
  const [showBuilder, setShowBuilder] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveTrades(trades); }, [trades]);
  useEffect(() => { saveSalaryEdits(salaryEdits); }, [salaryEdits]);
  useEffect(() => {
    saveRemoved({ players: [...removedPlayers], picks: [] });
  }, [removedPlayers]);
  useEffect(() => { saveAddedPlayers(addedPlayers); }, [addedPlayers]);

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

  function handleRestorePlayer(id: string) {
    setRemovedPlayers(prev => { const next = new Set(prev); next.delete(id); return next; });
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
    <div className="flex min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <TeamSidebar selected={selectedTeam} onSelect={setSelectedTeam} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 gap-3">
          <h1 className="text-base font-semibold text-gray-700 dark:text-gray-200 tracking-tight shrink-0">
            NBA Trade Tracker
          </h1>

          {/* Time travel */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <label htmlFor="asof" className="shrink-0">As of</label>
            <input
              id="asof"
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            />
            {timeTravelling && (
              <button
                type="button"
                onClick={() => setAsOfDate('')}
                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 underline shrink-0"
              >
                clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Search players"
            >
              🔍
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              History {trades.length > 0 && <span className="ml-1 text-xs text-gray-400">({trades.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => exportTrades(trades)}
              disabled={trades.length === 0}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Import
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button
              type="button"
              onClick={() => setShowBuilder(true)}
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Trade
            </button>
          </div>
        </header>

        {/* Time-travel banner */}
        {timeTravelling && (
          <div className="px-6 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
            Viewing state as of <strong>{asOfDate}</strong> — {activeTrades.length} of {trades.length} trade{trades.length !== 1 ? 's' : ''} applied
            {hiddenTradeCount > 0 && `, ${hiddenTradeCount} hidden`}.
          </div>
        )}

        {importError && (
          <div className="mx-6 mt-3 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            Import error: {importError}
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <TeamDashboard
            state={state}
            team={selectedTeam}
            trades={activeTrades}
            salaryEdits={salaryEdits}
            onSalaryEdit={handleSalaryEdit}
            removedPlayers={removedPlayers}
            onRemovePlayer={handleRemovePlayer}
            onRestorePlayer={handleRestorePlayer}
            addedPlayerIds={addedPlayerIds}
            onAddPlayer={handleAddPlayer}
            onDeleteAddedPlayer={handleDeleteAddedPlayer}
          />
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
