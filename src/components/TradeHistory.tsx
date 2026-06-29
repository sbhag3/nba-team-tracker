import type { Trade } from '../domain/nba-trade-tracker-schema';
import { playerMap } from '../domain/seed';
import { TeamChip } from './TeamChip';

interface Props {
  trades: Trade[];
  onDelete: (id: string) => void;
  onNewTrade: () => void;
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

export function TradeHistory({ trades, onDelete, onNewTrade }: Props) {
  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Trade History</h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1.5">
            {trades.length} trade{trades.length !== 1 ? 's' : ''} logged
          </p>
        </div>
        <button
          type="button"
          onClick={onNewTrade}
          className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
        >
          + New Trade
        </button>
      </div>

      {/* Trade list */}
      {sorted.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">🔄</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">No trades logged yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map(trade => (
            <li
              key={trade.id}
              className={`rounded-2xl p-5 border transition-colors ${
                trade.historical
                  ? 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/40'
                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Meta */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(trade.date)}</span>
                    {trade.teams.map(t => (
                      <TeamChip key={t} team={t} />
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
                          <TeamChip team={m.from} />
                          <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <TeamChip team={m.to} />
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
