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

export function TradeHistory({ trades, onDelete, onClose }: Props) {
  const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Trade History
            <span className="ml-2 text-sm font-normal text-gray-400">({trades.length})</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {sorted.length === 0 && (
            <p className="text-sm text-gray-400 italic">No trades yet.</p>
          )}
          {sorted.map(trade => (
            <div key={trade.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs text-gray-400 font-mono">{trade.date}</span>
                    {trade.teams.map(t => (
                      <span key={t} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">{t}</span>
                    ))}
                  </div>
                  {trade.description && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{trade.description}</p>
                  )}
                  <ul className="space-y-0.5">
                    {trade.movements.map((m, i) => (
                      <li key={i} className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{m.from}</span>
                        {' → '}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{m.to}</span>
                        {': '}
                        {assetLabel(m.asset)}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete this trade?\n\n"${trade.description ?? trade.id}"\n\nThis will revert all affected dashboards.`)) {
                      onDelete(trade.id);
                    }
                  }}
                  className="shrink-0 text-xs px-2 py-1 text-red-500 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
