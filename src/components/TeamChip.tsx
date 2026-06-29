import { teamColors } from '../data/teamColors';

interface Props {
  team: string;
  className?: string;
}

export function TeamChip({ team, className = '' }: Props) {
  const color = teamColors[team];
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
        color ? 'text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
      } ${className}`}
      style={color ? { backgroundColor: color } : undefined}
    >
      {team}
    </span>
  );
}
