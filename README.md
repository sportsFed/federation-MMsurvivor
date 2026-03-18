This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Bracket Framework

### What is `public/bracket-framework.json`?

`public/bracket-framework.json` encodes the full 2026 NCAA Tournament bracket structure — all 64 teams across four regions (East, West, South, Midwest) and all games from the Round of 64 through the National Championship. It is used client-side to:

- Derive projected Round of 32 matchups from Round of 64 seed pairings
- Build "possible teams" for each projected game slot before the upstream games have been played
- Power the Saturday/Sunday/Projections tabs in the My Picks page without requiring any Firestore mutations

The framework is loaded at build time via a TypeScript import in `lib/bracket/framework.ts` and is fully static — it adds no server-side cost.

### Game ID Naming Convention

| Pattern | Round | Example |
|---|---|---|
| `{R}-R64-G1..G8` | Round of 64 | `E-R64-G1` (East, game 1: 1 vs 16) |
| `{R}-R32-G1..G4` | Round of 32 | `E-R32-G1` (East, winner G1 vs winner G2) |
| `{R}-S16-G1..G2` | Sweet 16 | `E-S16-G1` |
| `{R}-E8-G1` | Elite Eight | `E-E8-G1` |
| `FF-G1`, `FF-G2` | Final Four | `FF-G1` = East vs South winner |
| `NC-G1` | National Championship | — |

Region initials: `E` = East, `W` = West, `S` = South, `M` = Midwest.

Standard R64 seeding order (by game slot): G1=1v16, G2=8v9, G3=5v12, G4=4v13, G5=6v11, G6=3v14, G7=7v10, G8=2v15.

### Updating for a Future Tournament

1. Replace `public/bracket-framework.json` with the new year's bracket structure.
2. **IDs must remain stable within a tournament year** — do not change game IDs once users have made projection picks referencing them.
3. Update the team data in the `"teams"` array to reflect the new field.
4. The `lib/bracket/framework.ts` logic is year-agnostic and requires no code changes.

### Admin Workflow

1. **Seed the bracket** via `/api/admin/seed-bracket` (creates Round of 64 Firestore game docs from team data).
2. **Create R32 skeleton games** via the "Create Round of 32 Skeleton Games" button in Admin → Manage Games. This creates 16 placeholder Firestore documents (one per R32 framework game) that can then have tip times set via the existing Manage Games UI.
3. **Set tip times** for R32 games as they are announced by clicking "Set time" on each skeleton game card.

The `create-r32-skeleton` endpoint is fully **idempotent** — calling it multiple times is safe and will never overwrite existing documents.

### Conditional (Projection) Picks

When users make picks on the Saturday or Sunday tabs, those picks are stored in `survivorPicks` with `isProjectionPick: true`. These are **conditional picks** — they are valid only if the selected team advances from the Round of 64.

Key fields added to projection pick records:
- `isProjectionPick: true` — distinguishes from regular picks
- `gameId` — framework game ID (e.g. `E-R32-G1`), not a Firestore document ID
- `dateKey` — virtual key (`__sat__` or `__sun__`)

The "can't use a team twice" rule applies globally across both scored picks and pending projection picks.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
