// NBA Offseason Tracker — core data model (MVP, "reflection" mode)
// Scope: encode trades that already happened, then project each team's
// current roster + pick ownership. Pick protections are free text and
// maintained by hand for now (structured rules come later, if ever).

// ---------------------------------------------------------------------------
// Reference entities (mostly static)
// ---------------------------------------------------------------------------

export type TeamId = string; // tricode: 'BKN', 'HOU', 'MIN', ...

export interface Team {
  id: TeamId;
  market: string; // 'Brooklyn'
  name: string;   // 'Nets'
}

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  fullName: string;
  // Add only if you later move toward CBA validation:
  // salary?: number; contractYearsRemaining?: number;
}

export type Round = 1 | 2;

// A pick's identity is (originTeam, year, round) — "the Nets' 2027 first".
// originTeam never changes (it sets how good the slot is); ownership does.
export type PickId = string; // convention: `${originTeam}-${year}-R${round}` => 'BKN-2027-R1'

export interface DraftPick {
  id: PickId;
  originTeam: TeamId;
  year: number;
  round: Round;
  // Free text for MVP, e.g. 'Top-4 protected 2028; if not conveyed -> two 2nd-rounders'.
  // Promote to a structured rules object only if the app must reason about it.
  protections?: string;
}

// Swap rights are a SEPARATE asset from the picks they reference. Free text for MVP.
export interface SwapRight {
  id: string;
  year: number;
  round: Round;
  terms: string; // 'MIN may swap its 2029 1st for the more favorable of BKN/HOU'
}

// ---------------------------------------------------------------------------
// Movable assets
// ---------------------------------------------------------------------------

export type Asset =
  | { kind: 'player'; playerId: PlayerId }
  | { kind: 'pick'; pickId: PickId }
  | { kind: 'swap'; swapId: string }
  | { kind: 'cash'; amount: number }
  | { kind: 'other'; note: string }; // draft rights, trade exceptions, etc. (placeholder)

// ---------------------------------------------------------------------------
// The trade event (immutable)
// A trade is a SET OF ASSET MOVEMENTS, not a two-team swap.
// This shape handles 2-team and N-team trades identically.
// ---------------------------------------------------------------------------

export interface AssetMovement {
  asset: Asset;
  from: TeamId;
  to: TeamId;
}

export interface Trade {
  id: string;
  date: string;        // ISO date the trade was completed
  teams: TeamId[];     // every team involved
  movements: AssetMovement[];
  description?: string; // human-readable summary
  // When true, trade is logged for reference only — not applied to state.
  // Use this for trades whose effects are already baked into the seed roster.
  historical?: boolean;
}

// ---------------------------------------------------------------------------
// League state
// The seed is the league "as of" a chosen date.
// Current state = seed folded over every trade (event sourcing).
// ---------------------------------------------------------------------------

export interface LeagueState {
  asOf: string;
  rosters: Record<TeamId, PlayerId[]>;
  pickOwnership: Record<PickId, TeamId>; // every pick -> current owner
  swapOwnership: Record<string, TeamId>; // swapId -> owner
}

// ---------------------------------------------------------------------------
// Applying a trade (the core reducer)
// Pure function: (state, trade) -> new state. Validates referentially first.
// ---------------------------------------------------------------------------

export interface ApplyResult {
  ok: boolean;
  errors: string[];
  state: LeagueState; // returned unchanged when !ok
}

export function applyTrade(state: LeagueState, trade: Trade): ApplyResult {
  const errors: string[] = [];

  // 1. Referential validation: each `from` team must currently own what it sends.
  for (const m of trade.movements) {
    if (!trade.teams.includes(m.from)) errors.push(`${m.from} not listed in trade.teams`);
    if (!trade.teams.includes(m.to)) errors.push(`${m.to} not listed in trade.teams`);

    switch (m.asset.kind) {
      case 'player':
        if (!state.rosters[m.from]?.includes(m.asset.playerId))
          errors.push(`${m.from} does not have player ${m.asset.playerId}`);
        break;
      case 'pick':
        if (state.pickOwnership[m.asset.pickId] !== m.from)
          errors.push(`${m.from} does not own pick ${m.asset.pickId}`);
        break;
      case 'swap':
        if (state.swapOwnership[m.asset.swapId] !== m.from)
          errors.push(`${m.from} does not own swap ${m.asset.swapId}`);
        break;
      // cash / other: nothing to validate at MVP
    }
  }

  if (errors.length) return { ok: false, errors, state };

  // 2. Apply movements immutably.
  const next: LeagueState = {
    asOf: trade.date,
    rosters: Object.fromEntries(
      Object.entries(state.rosters).map(([t, p]) => [t, [...p]]),
    ),
    pickOwnership: { ...state.pickOwnership },
    swapOwnership: { ...state.swapOwnership },
  };

  for (const m of trade.movements) {
    const asset = m.asset;
    switch (asset.kind) {
      case 'player': {
        const { playerId } = asset;
        next.rosters[m.from] = next.rosters[m.from].filter(id => id !== playerId);
        next.rosters[m.to].push(playerId);
        break;
      }
      case 'pick':
        next.pickOwnership[asset.pickId] = m.to;
        break;
      case 'swap':
        next.swapOwnership[asset.swapId] = m.to;
        break;
      // cash / other: no state change at MVP
    }
  }

  return { ok: true, errors: [], state: next };
}

// Rebuild current state from the seed + full trade log (the event-sourcing fold).
// Sorting by date means you can insert a forgotten older trade and just replay.
export function project(seed: LeagueState, trades: Trade[]): LeagueState {
  return [...trades]
    .filter(t => !t.historical)
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((state, t) => {
      const r = applyTrade(state, t);
      if (!r.ok) throw new Error(`Trade ${t.id} invalid: ${r.errors.join('; ')}`);
      return r.state;
    }, seed);
}

// ---------------------------------------------------------------------------
// Dashboard helpers
// ---------------------------------------------------------------------------

export function teamRoster(state: LeagueState, team: TeamId): PlayerId[] {
  return state.rosters[team] ?? [];
}

// All picks this team currently controls (its own un-traded ones + any acquired).
export function teamPicks(state: LeagueState, team: TeamId): PickId[] {
  return Object.keys(state.pickOwnership).filter(id => state.pickOwnership[id] === team);
}