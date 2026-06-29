import type { PlayerFlag } from '../data/playerFlags';
import { FLAG_META } from '../data/playerFlags';

export function FlagBadge({ flag }: { flag: PlayerFlag }) {
  const meta = FLAG_META[flag];
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${meta.className}`}>
      {meta.short}
    </span>
  );
}
