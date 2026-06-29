import type { Trade } from '../domain/nba-trade-tracker-schema';
import { playerMap } from '../domain/seed';

interface Props {
  trades: Trade[];
  onDelete: (id: string) => void;
  onClose: () => void;
}

function assetLabel(asset: Trade['movements'][number]['asset']): string {
  switch (asset.kind) {
    case 'player': return playerMap[asset.playerId] ?? asset.playerId;
    case 'pick':   return asset.pickId;
    case 'cash':   return `$${asset.amount}M`;
    case 'other':  return asset.note;
    case 'swap':   return `swap ${asset.swapId}`;
  }
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TradeHistory({ trades, onDelete, onClose }: Props) {
  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end animate-fade-in"
      style={{ background: 'rgba(15, 23, 42, 0.35)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight">Trade History</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{trades.length} trade{trades.length !== 1 ? 's' : ''} logged</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-lg leading-none transition-all active:scale-95"
          >
            ×
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {sorted.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No trades yet.</p>
            </div>
          )}
          {sorted.map(trade => (
            <div
              key={trade.id}
              className={`rounded-2xl p-4 border transition-colors ${
                trade.historical
                  ? 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/40'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Meta */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(trade.date)}</span>
                    {trade.teams.map(t => (
                      <span key={t} className="text-[10px] font-bold px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-md">
                        {t}
                      </span>
                    ))}
                    {trade.historical && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-md">
                        pre-seeded
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {trade.description && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 leading-snug">{trade.description}</p>
                  )}

                  {/* Movements */}
                  {trade.movements.length > 0 && (
                    <ul className="space-y-0.5">
                      {trade.movements.map((m, i) => (
                        <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{m.from}</span>
                          <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{m.to}</span>
                          <span className="text-slate-400 dark:text-slate-600">·</span>
                          <span>{assetLabel(m.asset)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const warning = trade.historical
                      ? `Remove this historical record?\n\n"${trade.description ?? trade.id}"\n\nRosters won't change.`
                      : `Delete this trade?\n\n"${trade.description ?? trade.id}"\n\nThis will revert all affected rosters.`;
                    if (window.confirm(warning)) onDelete(trade.id);
                  }}
                  className="shrink-0 text-xs px-2.5 py-1.5 text-red-400 border border-red-100 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 transition-all active:scale-95"
                >
                  {trade.historical ? 'Remove' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
