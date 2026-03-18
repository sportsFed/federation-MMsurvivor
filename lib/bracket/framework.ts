import frameworkData from '@/public/bracket-framework.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Region = 'East' | 'West' | 'South' | 'Midwest';
export type RoundName =
  | 'Round of 64'
  | 'Round of 32'
  | 'Sweet 16'
  | 'Elite Eight'
  | 'Final Four'
  | 'National Championship';
export type GameDay = 'thursday' | 'friday' | 'saturday' | 'sunday' | 'tbd';

export interface SeedParticipant {
  type: 'seed';
  region: Region;
  seed: number;
}

export interface WinnerOfParticipant {
  type: 'winnerOf';
  gameId: string;
}

export type ParticipantSource = SeedParticipant | WinnerOfParticipant;

export interface FrameworkGame {
  id: string;
  round: RoundName;
  region: Region | null; // null for FF and NC
  day: GameDay;
  scheduledTime: string | null;
  participants: [ParticipantSource, ParticipantSource];
}

export interface FrameworkTeam {
  name: string;
  seed: number;
  region: Region;
}

export interface BracketFramework {
  meta: { regions: Region[]; roundOrder: RoundName[] };
  teams: FrameworkTeam[];
  games: FrameworkGame[];
}

export interface ProjectedTeam {
  name: string;
  seed: number;
  region: Region;
}

export interface ProjectionSide {
  possibleTeams: ProjectedTeam[];
  isResolved: boolean; // true if upstream game has a winner
  resolvedTeam: ProjectedTeam | null;
}

export interface GameProjection {
  frameworkGame: FrameworkGame;
  homeSide: ProjectionSide;
  awaySide: ProjectionSide;
  allPossibleTeams: ProjectedTeam[];
}

export interface FirestoreGameSnapshot {
  bracketKey: string; // e.g. "E-R64-G1"
  winner: string | null;
  isComplete: boolean;
}

// ─── Framework singleton ──────────────────────────────────────────────────────

const framework = frameworkData as BracketFramework;

// ─── Basic getters ────────────────────────────────────────────────────────────

export function getFramework(): BracketFramework {
  return framework;
}

export function getFrameworkGame(gameId: string): FrameworkGame | undefined {
  return framework.games.find(g => g.id === gameId);
}

export function listFrameworkGamesByRound(round: RoundName): FrameworkGame[] {
  return framework.games.filter(g => g.round === round);
}

export function listFrameworkGamesByDay(day: GameDay): FrameworkGame[] {
  return framework.games.filter(g => g.day === day);
}

// ─── Firestore ↔ Framework mapping ───────────────────────────────────────────

/**
 * Maps a Firestore game to its framework bracket key by matching
 * (region, homeSeed, awaySeed) against Round of 64 seed matchups.
 *
 * Example: { region: 'East', homeSeed: 1, awaySeed: 16 } → 'E-R64-G1'
 */
export function mapFirestoreGameToBracketKey(firestoreGame: {
  region: string;
  homeSeed: number;
  awaySeed: number;
}): string | undefined {
  const r64Games = listFrameworkGamesByRound('Round of 64');
  for (const game of r64Games) {
    if (game.region !== firestoreGame.region) continue;
    const [p0, p1] = game.participants;
    if (p0.type !== 'seed' || p1.type !== 'seed') continue;
    // Match either orientation
    if (
      (p0.seed === firestoreGame.homeSeed && p1.seed === firestoreGame.awaySeed) ||
      (p0.seed === firestoreGame.awaySeed && p1.seed === firestoreGame.homeSeed)
    ) {
      return game.id;
    }
  }
  return undefined;
}

// ─── Team lookup helpers ──────────────────────────────────────────────────────

/**
 * Build a map from "${region}-${seed}" → ProjectedTeam for fast lookups.
 */
export function buildTeamsByRegionSeed(fw: BracketFramework): Map<string, ProjectedTeam> {
  const map = new Map<string, ProjectedTeam>();
  for (const team of fw.teams) {
    map.set(`${team.region}-${team.seed}`, team);
  }
  return map;
}

/**
 * Build a map from bracketKey → FirestoreGameSnapshot for fast lookups.
 * Only includes games that can be mapped to a R64 bracket key.
 */
export function buildFirestoreGamesBracketKeyMap(
  firestoreGames: Array<{
    id: string;
    region: string;
    homeSeed: number;
    awaySeed: number;
    winner: string | null;
    isComplete: boolean;
  }>
): Map<string, FirestoreGameSnapshot> {
  const map = new Map<string, FirestoreGameSnapshot>();
  for (const game of firestoreGames) {
    const bracketKey = mapFirestoreGameToBracketKey(game);
    if (bracketKey) {
      map.set(bracketKey, {
        bracketKey,
        winner: game.winner,
        isComplete: game.isComplete,
      });
    }
  }
  return map;
}

// ─── Projection resolver ──────────────────────────────────────────────────────

/**
 * Resolve the possible teams for one side of a projected game.
 *
 * - If participant is type 'seed': returns that single team as resolved.
 * - If participant is type 'winnerOf':
 *   - If upstream Firestore game exists with a winner → resolved to that winner.
 *   - Otherwise → recursively collect possible teams from upstream framework game.
 */
export function resolvePossibleTeamsForSide(
  participant: ParticipantSource,
  firestoreGamesByBracketKey: Map<string, FirestoreGameSnapshot>,
  teamsByRegionSeed: Map<string, ProjectedTeam>
): ProjectionSide {
  if (participant.type === 'seed') {
    const team = teamsByRegionSeed.get(`${participant.region}-${participant.seed}`);
    if (!team) {
      return { possibleTeams: [], isResolved: false, resolvedTeam: null };
    }
    return { possibleTeams: [team], isResolved: true, resolvedTeam: team };
  }

  // winnerOf
  const upstreamSnapshot = firestoreGamesByBracketKey.get(participant.gameId);
  if (upstreamSnapshot?.isComplete && upstreamSnapshot.winner) {
    // Find the winner team object
    const winnerTeam = findTeamByName(upstreamSnapshot.winner, teamsByRegionSeed);
    if (winnerTeam) {
      return { possibleTeams: [winnerTeam], isResolved: true, resolvedTeam: winnerTeam };
    }
  }

  // Not yet resolved — recursively collect possible teams from upstream framework game
  const upstreamGame = getFrameworkGame(participant.gameId);
  if (!upstreamGame) {
    return { possibleTeams: [], isResolved: false, resolvedTeam: null };
  }

  const side0 = resolvePossibleTeamsForSide(
    upstreamGame.participants[0],
    firestoreGamesByBracketKey,
    teamsByRegionSeed
  );
  const side1 = resolvePossibleTeamsForSide(
    upstreamGame.participants[1],
    firestoreGamesByBracketKey,
    teamsByRegionSeed
  );

  // Merge unique team names
  const seen = new Set<string>();
  const merged: ProjectedTeam[] = [];
  for (const t of [...side0.possibleTeams, ...side1.possibleTeams]) {
    if (!seen.has(t.name)) {
      seen.add(t.name);
      merged.push(t);
    }
  }

  return { possibleTeams: merged, isResolved: false, resolvedTeam: null };
}

function findTeamByName(
  name: string,
  teamsByRegionSeed: Map<string, ProjectedTeam>
): ProjectedTeam | undefined {
  for (const team of teamsByRegionSeed.values()) {
    if (team.name === name) return team;
  }
  return undefined;
}

// ─── Projection model builder ─────────────────────────────────────────────────

/**
 * Build the full projection model for every non-R64 game in the framework.
 * Returns a Map<gameId, GameProjection>.
 */
export function buildProjectionModel(
  firestoreGamesByBracketKey: Map<string, FirestoreGameSnapshot>,
  teamsByRegionSeed: Map<string, ProjectedTeam>
): Map<string, GameProjection> {
  const result = new Map<string, GameProjection>();

  const projectedGames = framework.games.filter(g => g.round !== 'Round of 64');

  for (const game of projectedGames) {
    const [p0, p1] = game.participants;
    const homeSide = resolvePossibleTeamsForSide(p0, firestoreGamesByBracketKey, teamsByRegionSeed);
    const awaySide = resolvePossibleTeamsForSide(p1, firestoreGamesByBracketKey, teamsByRegionSeed);

    const seen = new Set<string>();
    const allPossibleTeams: ProjectedTeam[] = [];
    for (const t of [...homeSide.possibleTeams, ...awaySide.possibleTeams]) {
      if (!seen.has(t.name)) {
        seen.add(t.name);
        allPossibleTeams.push(t);
      }
    }

    result.set(game.id, { frameworkGame: game, homeSide, awaySide, allPossibleTeams });
  }

  return result;
}
