import { describe, it, expect } from 'vitest';
import {
  applyTrade,
  project,
} from './nba-trade-tracker-schema';
import type { LeagueState, Trade } from './nba-trade-tracker-schema';

// Minimal seed: MIN, BKN, CHI with two players and one pick each
const seed: LeagueState = {
  asOf: '2025-01-01',
  rosters: {
    MIN: ['randle'],
    BKN: ['claxton'],
    CHI: ['drummond'],
  },
  pickOwnership: {
    'MIN-2027-R1': 'MIN',
    'BKN-2027-R1': 'BKN',
    'CHI-2027-R1': 'CHI',
  },
  swapOwnership: {},
};

// Mirrors the Randle/Claxton three-team trade shape used throughout the plan.
// MIN sends Randle to BKN; BKN sends Claxton to CHI; CHI sends Drummond to MIN.
const randleClaxton: Trade = {
  id: 'trade-1',
  date: '2025-02-01',
  teams: ['MIN', 'BKN', 'CHI'],
  movements: [
    { asset: { kind: 'player', playerId: 'randle' },   from: 'MIN', to: 'BKN' },
    { asset: { kind: 'player', playerId: 'claxton' },  from: 'BKN', to: 'CHI' },
    { asset: { kind: 'player', playerId: 'drummond' }, from: 'CHI', to: 'MIN' },
  ],
};

describe('applyTrade', () => {
  it('moves assets correctly between teams', () => {
    const { ok, state } = applyTrade(seed, randleClaxton);
    expect(ok).toBe(true);
    expect(state.rosters['MIN']).toContain('drummond');
    expect(state.rosters['MIN']).not.toContain('randle');
    expect(state.rosters['BKN']).toContain('randle');
    expect(state.rosters['BKN']).not.toContain('claxton');
    expect(state.rosters['CHI']).toContain('claxton');
    expect(state.rosters['CHI']).not.toContain('drummond');
  });

  it('rejects a trade where the sending team does not own the asset', () => {
    const badTrade: Trade = {
      id: 'trade-bad',
      date: '2025-02-01',
      teams: ['MIN', 'BKN'],
      movements: [
        // BKN trying to send a pick it doesn't own
        { asset: { kind: 'pick', pickId: 'MIN-2027-R1' }, from: 'BKN', to: 'MIN' },
      ],
    };
    const result = applyTrade(seed, badTrade);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // State must be returned unchanged
    expect(result.state).toBe(seed);
  });
});

describe('project', () => {
  it('returns the seed unchanged with an empty trade log', () => {
    const result = project(seed, []);
    expect(result).toBe(seed);
  });

  it('replays an out-of-order trade log correctly by sorting on date', () => {
    // A second trade (later date) that moves drummond from CHI to BKN.
    // Insert it BEFORE the first trade in the array to test date-sort replay.
    // After trade-1: MIN has drummond, BKN has randle, CHI has claxton.
    // trade-2 moves drummond from MIN to BKN.
    const secondTrade: Trade = {
      id: 'trade-2',
      date: '2025-03-01', // later than randleClaxton
      teams: ['MIN', 'BKN'],
      movements: [
        { asset: { kind: 'player', playerId: 'drummond' }, from: 'MIN', to: 'BKN' },
      ],
    };

    // Pass second trade first in the array to verify date-sort replay
    const state = project(seed, [secondTrade, randleClaxton]);

    // After replay in date order:
    //   trade-1 (2025-02-01): randle MIN→BKN, claxton BKN→CHI, drummond CHI→MIN
    //   trade-2 (2025-03-01): drummond MIN→BKN
    expect(state.rosters['MIN']).not.toContain('drummond');
    expect(state.rosters['BKN']).toContain('drummond');
    expect(state.rosters['BKN']).toContain('randle');
    expect(state.rosters['CHI']).toContain('claxton');
  });
});
