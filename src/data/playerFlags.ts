export type PlayerFlag = 'trade-candidate' | 'rfa' | 'ufa';

export const ALL_FLAGS: PlayerFlag[] = ['trade-candidate', 'rfa', 'ufa'];

export const FLAG_META: Record<PlayerFlag, { label: string; short: string; className: string }> = {
  'trade-candidate': {
    label: 'Trade Candidate',
    short: 'TC',
    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  rfa: {
    label: 'Restricted FA',
    short: 'RFA',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
  ufa: {
    label: 'Unrestricted FA',
    short: 'UFA',
    className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  },
};
