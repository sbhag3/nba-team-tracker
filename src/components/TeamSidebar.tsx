import { teams } from '../data/teams';
import type { TeamId } from '../domain/nba-trade-tracker-schema';

interface Props {
  selected: TeamId;
  onSelect: (id: TeamId) => void;
}

export function TeamSidebar({ selected, onSelect }: Props) {
  return (
    <aside className="w-56 shrink-0 bg-slate-900 h-screen overflow-y-auto sticky top-0 flex flex-col">
      {/* Branding */}
      <div className="px-5 pt-6 pb-5">
        <p className="text-white font-bold text-xl tracking-tight leading-none">NBA</p>
        <p className="text-blue-400 font-semibold text-sm mt-0.5">Trade Tracker</p>
      </div>

      <div className="h-px bg-white/5 mx-4" />

      {/* Team list */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2 px-3">Teams</p>
        <ul className="space-y-px">
          {teams.map(t => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 flex items-center gap-2.5 active:scale-[0.98] ${
                  selected === t.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <span className={`font-mono text-[10px] font-bold tracking-wide w-8 shrink-0 ${
                  selected === t.id ? 'text-blue-200' : 'text-slate-600'
                }`}>
                  {t.id}
                </span>
                <span className="truncate">{t.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
