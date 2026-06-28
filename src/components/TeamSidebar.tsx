import { teams } from '../data/teams';
import type { TeamId } from '../domain/nba-trade-tracker-schema';

interface Props {
  selected: TeamId;
  onSelect: (id: TeamId) => void;
}

export function TeamSidebar({ selected, onSelect }: Props) {
  return (
    <aside className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-700 h-screen overflow-y-auto sticky top-0">
      <div className="px-3 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-2">Teams</p>
        <ul className="space-y-0.5">
          {teams.map(t => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                  selected === t.id
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="font-mono text-xs mr-2 opacity-60">{t.id}</span>
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
