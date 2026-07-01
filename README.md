# ⚽ Copa do Mundo 2026 — Simulator

> A full-featured FIFA World Cup 2026 simulator. Predict group-stage results, navigate the knockout bracket, explore team squads with pitch formations, and track top scorers — all in a dark, responsive UI.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white&style=flat-square)

---

## Features

- **🏆 Group Stage** — 48 teams across 12 groups. Predict scores, see real-time standings, and track qualifying spots (top 2 + 8 best third-place teams).
- **📅 Match Schedule** — Full fixture list with live scores via ESPN, kickoff times, and CazéTV broadcast links.
- **🥅 Knockout Bracket** — Interactive R32 → Final bracket. Simulate scores for unplayed matches and see the projected champion update live.
- **⚽ Top Scorers** — Real-time artilheiros leaderboard powered by API-Football with goals and assists.
- **👕 Team Squads** — Click any team to see its full squad, coach, and an auto-generated pitch formation (4-3-3, 4-4-2, etc.) with player portraits.
- **📺 Live Banner** — Sticky header banner showing in-progress matches with live clock and score.
- **📱 Fully Responsive** — Mobile-first layout with adapted navigation and touch-friendly interactions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Data fetching | TanStack React Query |
| Icons | Lucide React |
| Flags | country-flag-icons |
| Match data | [OpenFootball](https://github.com/openfootball/worldcup) |
| Player data | [API-Football](https://www.api-football.com/) |
| Live scores | [ESPN API](https://site.api.espn.com/) (CORS-enabled, no key) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [API-Football](https://www.api-football.com/) key (free tier: 100 req/day)

### Installation

```bash
git clone https://github.com/your-username/wc2026-simulator.git
cd wc2026-simulator
npm install
```

### Environment

```bash
cp .env.example .env
# Edit .env and add your API-Football key
```

```env
VITE_AF_KEY=your_api_key_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Production Build

```bash
npm run build
npm run preview
```

---

## Data Strategy

The app uses a three-tier data strategy to minimize API calls:

```
1. Static JSON  →  /public/data/*.json  (pre-fetched, committed, zero API calls)
2. localStorage →  7-day TTL cache per team
3. Live API     →  API-Football fallback (only when static data is absent or null)
```

To refresh the static files after the tournament starts:

```bash
node scripts/fetchData.mjs
```

This populates `public/data/squads.json`, `coaches.json`, `lineups.json`, and `teams.json`.

---

## Project Structure

```
src/
├── components/
│   ├── Bracket.tsx       # SVG knockout bracket (R32 → Final)
│   ├── GroupCard.tsx      # Group standings + match rows
│   ├── LiveBanner.tsx     # Sticky live-match header strip
│   ├── MatchesTab.tsx     # Full match schedule (live / upcoming / finished)
│   ├── MatchRow.tsx       # Single match row with score and goals
│   ├── ScoreInput.tsx     # Inline score prediction input
│   ├── TeamModal.tsx      # Squad viewer with pitch formation
│   ├── TopScorers.tsx     # Top scorers leaderboard
│   ├── Flag.tsx           # Country flag SVG wrapper
│   └── WCTrophy.tsx       # Trophy graphic
├── data/
│   ├── api.ts             # OpenFootball — groups and matches
│   ├── apiFootball.ts     # API-Football — squads, coaches, top scorers
│   ├── apiFootballTypes.ts
│   ├── espnApi.ts         # ESPN — live scores
│   ├── squads.ts
│   ├── teamFlags.ts       # ISO code mapping for flag component
│   └── teamNames.ts       # Portuguese team name translations
├── store/
│   ├── knockout.ts        # Bracket winner resolution logic
│   ├── standings.ts       # Group standings calculator
│   └── usePredictions.ts  # Prediction state (localStorage)
├── App.tsx                # Root layout, tab navigation, data orchestration
├── types.ts               # Shared TypeScript interfaces
└── index.css              # Global styles and keyframe animations
```

---

## API Reference

### API-Football (requires key)

| Endpoint | Used for |
|---|---|
| `/players/squads?team={id}` | Team squad |
| `/coachs?team={id}` | Head coach |
| `/fixtures/lineups?fixture={id}` | Last match lineup |
| `/players/topscorers?league=1&season=2026` | Top scorers leaderboard |
| `/teams?league=1&season=2026` | Team ID resolution |

World Cup 2026 league ID: **1**

### OpenFootball

Fetches from `https://raw.githubusercontent.com/openfootball/worldcup/master/2026/worldcup.json`. No API key needed.

### ESPN

Fetches from `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`. No API key needed, CORS-enabled.

---

## Contributing

1. Fork the repo and create your branch: `git checkout -b feature/my-feature`
2. Commit your changes: `git commit -m 'Add my feature'`
3. Push and open a pull request

---

## License

MIT
