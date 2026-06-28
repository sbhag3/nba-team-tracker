# NBA Trade Tracker — Staged Build Plan (for agentic / "vibe" coding)

A running dashboard of every NBA team's current roster and available draft picks,
where you enter trades that already happened and the dashboard updates.

This document is meant to be **fed to a coding agent one stage at a time**. Each stage
is small, self-contained, and has explicit acceptance criteria so you (and the agent)
can confirm it works before moving on.

---

## 0. Scope & ground rules (give this to the agent first, every session)

**What we're building:** a single-user web app. You input real, completed trades; the app
projects each team's current roster and pick ownership and shows them on a dashboard.

**In scope**
- Current rosters for all 30 teams
- Draft pick ownership (who controls which future pick), with free-text protections
- Trade entry that moves players/picks between any number of teams
- A dashboard per team; a trade history; undo

**Explicitly NOT in scope (do not build these)**
- CBA / salary-matching / apron legality checks — trades are assumed already-valid
- Live API calls at runtime — roster data is fetched **once** into a static JSON file
- Auth, multiple users, real-time sync, a server database (MVP is client-side)
- Structured pick-protection logic — protections are free text, maintained by hand

**The contract:** the file `nba-trade-tracker-schema.ts` is the canonical domain model.
Hand it to the agent and tell it not to change the core types without flagging why.
Everything below builds on `Trade`, `LeagueState`, `applyTrade`, and `project` from that file.

---

## Tech stack (decided — don't let the agent re-litigate)

- **React + Vite + TypeScript** — fast, no framework ceremony
- **Tailwind CSS** — quick styling for a data-dense dashboard
- **Vitest** — unit tests for the domain logic (this is what makes the app trustworthy)
- **State:** plain React state + a single `LeagueState` projection in memory
- **Persistence:** `localStorage` for the seed + trade log; plus JSON export/import for backup
- **No backend** for the MVP. Everything runs in the browser off a static seed JSON.

Rationale for client-side-only: the whole app is `project(seed, trades)`. There's nothing
a server needs to do yet, and removing it removes the biggest source of vibe-coding friction.

---

## How to drive the agent (read this once)

1. **One stage per prompt.** Paste the stage's goal + tasks + acceptance criteria. Don't
   paste the whole document and say "build it" — agents lose the thread on big specs.
2. **Demand the acceptance check before moving on.** Make the agent run the app or the tests
   and show you it passing. If a stage has tests, it isn't done until they're green.
3. **Commit after every green stage.** `git commit -m "stage N: ..."`. This gives you a
   clean rollback point when a later prompt makes a mess.
4. **Keep the schema file as the source of truth.** If the agent wants to change `Trade` or
   `LeagueState`, make it explain why first — those types are the spine of the app.
5. **When something breaks, give the agent the exact error,** not "it's broken."

---

## Stage 0 — Scaffold + domain model + tests

**Goal:** a running project with the domain logic in place and proven by tests, before any UI.

**Tasks**
- Scaffold Vite + React + TypeScript; add Tailwind; add Vitest.
- Add `nba-trade-tracker-schema.ts` to `src/domain/`.
- Write unit tests for the domain logic:
  - applying the Randle/Claxton example trade moves the right assets both directions;
  - a trade where the sending team doesn't own the asset is rejected with an error;
  - `project(seed, [])` returns the seed unchanged;
  - `project` replays an out-of-order trade log correctly (sort by date).

**Acceptance criteria**
- `npm run dev` serves a blank page with no console errors.
- `npm run test` passes, including a referential-failure test that asserts `ok === false`.

---

## Stage 1 — Static team data

**Goal:** all 30 teams as typed reference data.

**Tasks**
- Create `src/data/teams.ts` exporting all 30 `Team` records (tricode `id`, `market`, `name`).
- Tricodes are the keys used everywhere else, so get them right (BKN, BOS, ... , WAS).

**Acceptance criteria**
- A test asserts exactly 30 teams and unique ids.

---

## Stage 2 — Pick-grid generator

**Goal:** generate the future-pick universe instead of typing 400+ rows.

**Tasks**
- Write `generatePickGrid(startYear, years)` that produces, for every team, a `DraftPick`
  for each of the next `years` draft years × rounds 1 and 2, with `originTeam` = that team
  and `id` = `` `${team}-${year}-R${round}` ``.
- Default ownership: each pick is owned by its `originTeam` (set this when you build the seed).

**Acceptance criteria**
- A test asserts the grid has `30 × years × 2` picks, every id is unique and well-formed,
  and each pick's `originTeam` matches its id prefix.

---

## Stage 3 — Seed builder (roster data sourcing)

**Goal:** produce the starting `LeagueState` (rosters + pick ownership) as of a chosen date.

**Tasks**
- Write a **one-off Node script** (run outside the app) that fetches current rosters and
  writes `src/data/seed-rosters.json`. Fetch from a roster source — BALLDONTLIE (free tier)
  is the easiest; the NBA's undocumented stats endpoints also work. Tell the agent to read
  the provider's live docs rather than guess endpoint shapes, and to hit the API from the
  Node script, **not the browser** (browser calls will hit CORS/rate-limit walls).
- The script output is a static file. The app never calls the API at runtime.
- Write `buildSeed(asOf)` that combines `seed-rosters.json` + `generatePickGrid(...)` into a
  `LeagueState` (each pick owned by its origin team to start).

**Acceptance criteria**
- `seed-rosters.json` exists and every one of the 30 teams has a non-empty roster.
- `buildSeed()` returns a valid `LeagueState` and `project(seed, [])` runs without throwing.

**Note:** future-pick *trades* that already happened are NOT in this seed — you'll enter
those through the normal trade-entry UI (Stage 5), same as any other trade.

---

## Stage 4 — Read-only dashboard

**Goal:** see the projected league state — the "running dashboard."

**Tasks**
- Compute `state = project(buildSeed(asOf), trades)` once and pass it down.
- Team selector (list or dropdown of all 30).
- For the selected team show: roster (player names) and picks from `teamPicks(state, team)`,
  grouped as **own** vs **acquired** (compare `pick.originTeam` to the team), each showing
  year/round and any protection text.
- Show the `asOf` date and a count of trades applied.

**Acceptance criteria**
- With an empty trade log, every team shows its seed roster and exactly its own picks.

---

## Stage 5 — Trade entry (the core feature)

**Goal:** enter a completed trade and watch the dashboard update.

**Tasks**
- A trade builder: pick the teams involved, then add movements, each being
  `{ asset, from, to }` where asset is a player, a pick, or a "cash/other" note.
  Let users choose `from`/`to` only among the teams added to the trade.
- On submit: run `applyTrade(currentState, trade)`.
  - If `!ok`, show the `errors` list and don't change anything.
  - If `ok`, append the `Trade` to the trade log and re-`project`.
- Auto-generate a readable `description` if the user doesn't type one.

**Acceptance criteria**
- Entering the Randle/Claxton trade updates MIN, BKN, and CHI dashboards correctly.
- Entering a trade where a team sends an asset it doesn't own is rejected with a clear
  message and leaves the dashboard unchanged.

---

## Stage 6 — Persistence

**Goal:** state survives a page refresh, and you can back it up.

**Tasks**
- Persist the seed reference and the trade log to `localStorage`; rehydrate on load.
- Add **Export** (download trade log as JSON) and **Import** (load a trade log JSON).
- Keep the trade log as the source of truth — never persist the projected state; recompute it.

**Acceptance criteria**
- Enter a few trades, refresh, and they're still applied.
- Export then re-import reproduces the identical dashboard.

---

## Stage 7 — History, undo, and manual pick maintenance

**Goal:** the payoffs of event sourcing, plus the hand-maintenance you wanted.

**Tasks**
- Trade history view (newest first) with each trade's description and date.
- Delete or edit a trade, then re-`project` from the seed — this is "undo" for free.
- A simple editor to maintain pick data by hand: set/clear a pick's `protections` text and
  (optionally) reassign a pick's owner directly, for fixing up future-pick obligations
  without inventing a fake trade.

**Acceptance criteria**
- Deleting a trade reverts every affected team's dashboard.
- Editing a pick's protection text shows up on that team's dashboard immediately.

---

## Stage 8 — Polish & stretch (optional, after MVP works)

- Store actual draft-slot numbers for current-year picks (e.g. "No. 28") for display.
- Search/filter players and picks; show a player's current team globally.
- "As of date" view: project only trades up to a chosen date (time travel).
- Keep it local: run with `npm run dev`, or `npm run build` and open the static output in your browser. No hosting or deployment needed.
- *Far future:* a CBA-validation layer. Big, separate project. Out of scope here.

---

## Suggested order of operations, condensed

0 scaffold + tests → 1 teams → 2 pick grid → 3 seed/rosters → 4 dashboard →
5 trade entry → 6 persistence → 7 history/undo/pick-editing → 8 polish.

Stages 0–5 are the MVP. If you only get that far, you have a working trade tracker.
