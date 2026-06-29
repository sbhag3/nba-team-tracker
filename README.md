# NBA Offseason Tracker

A personal dashboard for tracking NBA rosters, trades, free agency, and trade rumors — all stored locally in your browser with no backend required.

## Features

### Roster Management
- View current rosters for all 30 NBA teams, sorted by salary
- Player salaries seeded from the ESPN API (run once at build time)
- Manually override any player's salary
- Add custom players to any roster
- Remove players permanently from a roster

### Trade Engine
- Build and submit trades between 2+ teams — rosters update immediately
- Log historical trades that are already reflected in the rosters (record-only, no roster change)
- Time-travel: view roster state as of any past date
- Export and import trade history as JSON

### Free Agency
- Track unsigned free agents grouped by their former team
- Record signings with team, contract years, and AAV — the player is added to the new team's roster automatically
- Mark a player as unsigned again to revert the roster change
- Filter by unsigned / signed, or search by name or team

### Bulletin Board
- Log trade rumors with source, date, and teams mentioned
- Search and filter by team or keyword
- Expand long rumors inline

### Player Search
- Global search across all ~450 NBA players showing their current team

## Tech Stack

- **React + TypeScript** — component UI
- **Vite** — dev server and build
- **Tailwind CSS v4** — styling and dark mode
- **localStorage** — all data persisted client-side, no backend

## Getting Started

```bash
npm install
npm run dev
```

To refresh salary data from ESPN (requires Node):

```bash
npx tsx scripts/fetch-rosters.ts
```

This regenerates `src/data/seed-rosters.json` with current salary figures and rebuilds the seed state.
