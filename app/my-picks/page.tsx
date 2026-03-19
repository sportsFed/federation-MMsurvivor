'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, getIdToken } from 'firebase/auth';
import {
  buildTeamsByRegionSeed,
  buildFirestoreGamesBracketKeyMap,
  buildProjectionModel,
  listFrameworkGamesByDay,
  getFramework,
  deriveDayFromGameTime,
  type GameProjection,
  type ProjectedTeam,
} from '@/lib/bracket/framework';
import { calculateFinalFourScore, calculateNationalChampScore } from '@/lib/scoring';

interface TeamData {
  id: string;
  name: string;
  regionalSeed?: number;
  nationalSeed?: number;
}

/** Shape of a Firestore skeleton game document (R32 placeholder created by create-r32-skeleton). */
interface SkeletonGameDoc {
  id: string;
  round: string;
  region: string | null;
  day: string;
  gameTime: string | null;
  isSkeletonGame: true;
}

function formatEasternTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getEasternGameDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatEasternTabLabel(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getEasternDateKey(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

const ELITE_EIGHT_REQUIRED_PICKS = 2;
const FINAL_FOUR_DEADLINE = new Date('2026-03-19T16:15:00Z');
const SAT_ISO = '2026-03-21T12:00:00-04:00';
const SUN_ISO = '2026-03-22T12:00:00-04:00';

function formatCountdown(isoString: string, now: Date): string | null {
  const target = new Date(isoString);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 24) return null;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

interface ProjectionPickCardProps {
  frameworkGame: { id: string; round: string; region: string | null };
  projection: GameProjection;
  userProjectionPick: string | null;
  allUsedTeams: string[];
  eliminatedTeams: string[];
  isLocked: boolean;
  gameTime?: string | null;
  now?: Date;
  onPickTeam: (team: string, frameworkGameId: string, round: string, region: string | null) => void;
}

function ProjectionPickCard({
  frameworkGame,
  projection,
  userProjectionPick,
  allUsedTeams,
  eliminatedTeams,
  isLocked,
  gameTime,
  now,
  onPickTeam,
}: ProjectionPickCardProps) {
  const { homeSide, awaySide } = projection;
  const easternTime = gameTime ? formatEasternTime(gameTime) : null;
  const countdown = (!isLocked && gameTime && now) ? formatCountdown(gameTime, now) : null;

  function TeamChip({ team }: { team: ProjectedTeam }) {
    const isSelected = userProjectionPick === team.name;
    const isUsed = allUsedTeams.includes(team.name) && !isSelected;
    const isEliminated = eliminatedTeams.includes(team.name);
    const canPick = !isLocked && !isUsed && !isEliminated;
    return (
      <button
        onClick={() => canPick && onPickTeam(team.name, frameworkGame.id, frameworkGame.round, frameworkGame.region)}
        disabled={!canPick}
        className={`rounded-lg px-3 py-2.5 text-sm font-sans font-semibold transition-all text-left w-full ${
          isSelected
            ? 'bg-green-700/40 border border-green-500/60 text-green-300 cursor-pointer hover:bg-green-700/60'
            : isEliminated
            ? 'bg-slate-800/40 border border-slate-700/30 text-slate-600 cursor-not-allowed line-through'
            : isUsed
            ? 'bg-slate-800 border border-slate-700/50 text-slate-600 cursor-not-allowed'
            : isLocked
            ? 'bg-slate-800/60 border border-slate-700/40 text-slate-500 cursor-default'
            : 'bg-slate-700/60 hover:bg-red-700/50 hover:border-red-500/50 border border-slate-600 text-white cursor-pointer'
        }`}
      >
        <span className="text-[10px] text-slate-500 block mb-0.5">#{team.seed}</span>
        <span className="block leading-tight text-xs">{team.name}</span>
        {isSelected && <span className="text-[10px] text-green-400 mt-0.5 block">✓ Your Pick</span>}
        {isEliminated && <span className="text-[10px] text-slate-600 mt-0.5 block">Eliminated</span>}
        {isUsed && !isEliminated && <span className="text-[10px] text-slate-600 mt-0.5 block">Used</span>}
        {isLocked && !isSelected && !isUsed && !isEliminated && (
          <span className="text-[10px] text-slate-600 mt-0.5 block">Locked</span>
        )}
      </button>
    );
  }

  return (
    <div className={`bg-slate-800/40 border rounded-xl p-3 mb-2 transition-all ${isLocked ? 'border-slate-700/50 opacity-70' : 'border-slate-700'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-500 uppercase tracking-widest font-sans">
          {frameworkGame.region} · {frameworkGame.round}
        </span>
        {isLocked ? (
          <span className="text-[11px] text-slate-500">🔒 {easternTime ? `${easternTime} ET` : 'Tip time TBD'}</span>
        ) : easternTime ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-sans">{easternTime} ET</span>
            {countdown && <span className="text-[11px] text-amber-400 font-mono font-semibold">⏱ {countdown}</span>}
          </div>
        ) : (
          <span className="text-[11px] text-amber-400/70 font-sans">Tip time TBD</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          {homeSide.possibleTeams.map(team => (
            <TeamChip key={team.name} team={team} />
          ))}
          {homeSide.possibleTeams.length === 0 && (
            <div className="rounded-lg px-3 py-2.5 bg-slate-800/60 border border-slate-700/40 text-slate-500 text-xs">TBD</div>
          )}
        </div>
        <div className="space-y-1">
          {awaySide.possibleTeams.map(team => (
            <TeamChip key={team.name} team={team} />
          ))}
          {awaySide.possibleTeams.length === 0 && (
            <div className="rounded-lg px-3 py-2.5 bg-slate-800/60 border border-slate-700/40 text-slate-500 text-xs">TBD</div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-slate-600 italic mt-2 font-sans">Conditional pick — valid if team advances</p>
    </div>
  );
}

export default function MyPicksPage() {
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [userEntry, setUserEntry] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickMessage, setPickMessage] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [confirmPick, setConfirmPick] = useState<{ team: string; seed: number; game: any } | null>(null);
  const [confirmProjectionPick, setConfirmProjectionPick] = useState<{ team: string; seed: number; frameworkGameId: string; round: string; region: string | null } | null>(null);
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);
  const [projectionModel, setProjectionModel] = useState<Map<string, GameProjection>>(new Map());
  const [firestoreTeams, setFirestoreTeams] = useState<TeamData[]>([]);

  const showMessage = (msg: string, ms = 5000) => {
    setPickMessage(msg);
    setTimeout(() => setPickMessage(''), ms);
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const [entrySnap, gamesSnap, teamsSnap] = await Promise.all([
            getDoc(doc(db, 'entries', user.uid)),
            getDocs(collection(db, 'games')),
            getDocs(collection(db, 'teams')),
          ]);

          if (entrySnap.exists()) setUserEntry(entrySnap.data());
          setGames(gamesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setFirestoreTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeamData)));
          // Build projection model
          const fw = getFramework();
          const teamsByRegionSeed = buildTeamsByRegionSeed(fw);
          const allGames = gamesSnap.docs.map(d => ({ id: d.id, ...d.data() as { region: string; homeSeed: number; awaySeed: number; winner: string | null; isComplete: boolean; isSkeletonGame?: boolean } }));
          // Only map R64 games (real seeded games, not skeleton) to bracket keys
          const r64Games = allGames.filter(g => !g.isSkeletonGame && g.homeSeed && g.awaySeed);
          const bracketKeyMap = buildFirestoreGamesBracketKeyMap(r64Games);
          setProjectionModel(buildProjectionModel(bracketKeyMap, teamsByRegionSeed));
          // Load existing projection picks from entry
          if (entrySnap.exists()) {
            // projection picks are stored within survivorPicks (isProjectionPick: true) — already loaded via setUserEntry above
          }
        } catch (err: any) {
          showMessage(`Error loading data: ${err.message}`);
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Count teams from scored rounds + pending projection picks as "used"
  const scoredPickedTeams: string[] = (userEntry?.survivorPicks ?? [])
    .filter((p: any) => p.result === 'win' || p.result === 'loss')
    .map((p: any) => p.team);

  const pendingProjectionPickTeams: string[] = (userEntry?.survivorPicks ?? [])
    .filter((p: any) => p.isProjectionPick === true && p.result !== 'win' && p.result !== 'loss')
    .map((p: any) => p.team);

  // alreadyPickedTeams: used for "can't reuse" check — includes ALL picks across all rounds
  const alreadyPickedTeams: string[] = Array.from(
    new Set(
      ((userEntry?.survivorPicks ?? []) as any[])
        .map((p: any) => p.team as string)
        .filter((t: string) => Boolean(t))
    )
  );

  const eliminatedTeamNames: string[] = firestoreTeams
    .filter((t: any) => t.isEliminated === true)
    .map((t: any) => t.name as string);

  // Helper: derive effective dateKey for a pick (backward compat for picks without dateKey)
  const getEffectivePickDateKey = (pick: any): string | null => {
    if (pick.dateKey) return pick.dateKey;
    if (pick.gameId) {
      const g = games.find((g: any) => g.id === pick.gameId);
      if (g) {
        const gt = g.gameTime ?? g.tipoff ?? g.scheduledAt;
        return gt ? getEasternDateKey(gt) : null;
      }
    }
    return null;
  };

  const hasIncompleteFinalFourPicks = (entry: any) =>
    !entry?.finalFourPicks?.champ ||
    !entry?.finalFourPicks?.f1 ||
    !entry?.finalFourPicks?.f2 ||
    !entry?.finalFourPicks?.f3 ||
    !entry?.finalFourPicks?.f4;

  const handlePickTeam = async (team: string, game: any) => {
    if (!userId || !userEntry) {
      showMessage('You must be logged in to submit a pick.');
      return;
    }
    // Check game hasn't started
    const gameTime = game.gameTime ?? game.tipoff ?? game.scheduledAt;
    if (gameTime && new Date() >= new Date(gameTime)) {
      showMessage('This game has already started — pick is locked.');
      return;
    }
    if (alreadyPickedTeams.includes(team)) {
      showMessage(`You already used ${team} in a previous round.`, 4000);
      return;
    }

    const gameDateKey = getEasternDateKey(game.gameTime ?? game.tipoff ?? game.scheduledAt ?? new Date().toISOString());
    const isEliteEightGame = game.round === 'Elite Eight';

    try {
      const newPickEntry = {
        team,
        round: game.round,
        region: game.region,
        gameId: game.id,
        dateKey: gameDateKey,
        pickedAt: new Date().toISOString(),
      };

      const existingPicks: any[] = userEntry?.survivorPicks ?? [];
      let updatedPicks: any[];
      let action: string;
      let previousTeam: string | null;

      if (isEliteEightGame) {
        // Elite Eight: key by gameId, allow up to 2 total EE picks across the weekend
        const hasPickForThisGame = existingPicks.some((p: any) => p.gameId === game.id);
        const existingEEPicks = existingPicks.filter((p: any) => p.round === 'Elite Eight');
        if (hasPickForThisGame) {
          previousTeam = existingPicks.find((p: any) => p.gameId === game.id)?.team ?? null;
          updatedPicks = existingPicks.map((p: any) => p.gameId === game.id ? newPickEntry : p);
          action = 'changed';
        } else if (existingEEPicks.length >= ELITE_EIGHT_REQUIRED_PICKS) {
          showMessage('You already have 2 Elite Eight picks. Change one of your existing picks instead.');
          return;
        } else {
          updatedPicks = [...existingPicks, newPickEntry];
          previousTeam = null;
          action = 'submitted';
        }
      } else {
        // Standard round: one pick per calendar day, keyed by dateKey
        // Backward compat: also resolve picks without dateKey via gameId lookup
        const existingForDay = existingPicks.find(
          (p: any) => getEffectivePickDateKey(p) === gameDateKey && p.round !== 'Elite Eight'
        );
        if (existingForDay) {
          previousTeam = existingForDay.team ?? null;
          updatedPicks = existingPicks.map((p: any) =>
            getEffectivePickDateKey(p) === gameDateKey && p.round !== 'Elite Eight' ? newPickEntry : p
          );
          action = 'changed';
        } else {
          updatedPicks = [...existingPicks, newPickEntry];
          previousTeam = null;
          action = 'submitted';
        }
      }

      const idToken = await getIdToken(auth.currentUser!);
      const res = await fetch('/api/picks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          team,
          gameId: game.id,
          round: game.round,
          region: game.region,
          dateKey: gameDateKey,
          isProjectionPick: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showMessage(data.error ?? 'Failed to submit pick.', 5000);
        return;
      }
      setUserEntry((prev: any) => ({
        ...prev,
        survivorPicks: updatedPicks,
        currentPick: team,
      }));
      showMessage(`✅ Pick updated: ${team}`);
    } catch (err: any) {
      showMessage(`Error: ${err.message}`);
    }
  };

  const handleProjectionPick = async (
    team: string,
    frameworkGameId: string,
    round: string,
    region: string | null
  ) => {
    if (!userId || !userEntry) {
      showMessage('You must be logged in to submit a pick.');
      return;
    }
    // Check game lock for R32 skeleton game
    const skeletonGame = games.find((g: any) => g.id === frameworkGameId);
    const projGameTime = skeletonGame?.gameTime ?? null;
    if (projGameTime && new Date() >= new Date(projGameTime)) {
      showMessage('This game has already started — pick is locked.');
      return;
    }
    if (alreadyPickedTeams.includes(team)) {
      showMessage(`You already used ${team} in a pick.`, 4000);
      return;
    }

    // Derive dateKey from the Firestore skeleton game doc — it has the authoritative day field
    // set by the admin create-r32-skeleton API (not the static framework JSON).
    const skDay: string = skeletonGame?.day ?? 'tbd';
    const day = (skDay === 'tbd' && projGameTime)
      ? deriveDayFromGameTime(projGameTime)
      : skDay;
    const dateKey = day === 'saturday' ? '__sat__' : day === 'sunday' ? '__sun__' : '__proj__';

    try {
      const newPickEntry = {
        team,
        round,
        region,
        gameId: frameworkGameId,
        dateKey,
        isProjectionPick: true,
        pickedAt: new Date().toISOString(),
      };

      const existingPicks: any[] = userEntry?.survivorPicks ?? [];
      // Replace existing pick for this framework game, or append
      const hasPickForThisGame = existingPicks.some((p: any) => p.gameId === frameworkGameId && p.isProjectionPick);
      let updatedPicks: any[];
      let action: string;
      let previousTeam: string | null;

      if (hasPickForThisGame) {
        previousTeam = existingPicks.find((p: any) => p.gameId === frameworkGameId && p.isProjectionPick)?.team ?? null;
        updatedPicks = existingPicks.map((p: any) =>
          p.gameId === frameworkGameId && p.isProjectionPick ? newPickEntry : p
        );
        action = 'changed';
      } else {
        updatedPicks = [...existingPicks, newPickEntry];
        previousTeam = null;
        action = 'submitted';
      }

      const idToken = await getIdToken(auth.currentUser!);
      const res = await fetch('/api/picks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          team,
          gameId: frameworkGameId,
          round,
          region,
          dateKey,
          isProjectionPick: true,
          frameworkGameId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showMessage(data.error ?? 'Failed to submit pick.', 5000);
        return;
      }
      setUserEntry((prev: any) => ({
        ...prev,
        survivorPicks: updatedPicks,
      }));
      showMessage(`✅ Conditional pick: ${team}`);
    } catch (err: any) {
      showMessage(`Error: ${err.message}`);
    }
  };

  // Sort games chronologically
  const sortedGames = [...games].sort((a, b) => {
    const aTime = new Date(a.gameTime ?? a.tipoff ?? 0).getTime();
    const bTime = new Date(b.gameTime ?? b.tipoff ?? 0).getTime();
    return aTime - bTime;
  });

  // Exclude skeleton R32 games — they are handled by the dedicated __sat__/__sun__ tabs
  const nonSkeletonGames = sortedGames.filter((g: any) => !g.isSkeletonGame);

  // Build lookup map: framework game ID → skeleton Firestore game doc
  // Skeleton docs are created with their Firestore doc ID = framework game ID (e.g. "E-R32-G1"),
  // and also store that same ID in the `bracketKey` field.  We key by both to handle any doc
  // that might have been created with a different ID than its bracketKey.
  const skeletonByBracketKey = new Map<string, any>();
  for (const g of games) {
    if (!(g as any).isSkeletonGame) continue;
    skeletonByBracketKey.set((g as any).id, g);
    if ((g as any).bracketKey && (g as any).bracketKey !== (g as any).id) {
      skeletonByBracketKey.set((g as any).bracketKey, g);
    }
  }

  // Group by calendar date (in Eastern Time)
  const gamesByDay = nonSkeletonGames.reduce((acc: Record<string, any[]>, game) => {
    const gameTime = game.gameTime ?? game.tipoff ?? game.scheduledAt;
    const dateKey = gameTime ? getEasternDateKey(gameTime) : 'Unknown';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(game);
    return acc;
  }, {});

  // Pending picks (not yet scored), sorted chronologically by game time
  const gamesById = new Map(games.map((g: any) => [g.id, g]));
  const pendingPicks = (userEntry?.survivorPicks ?? [])
    .filter((p: any) => p.result !== 'win' && p.result !== 'loss' && !p.isProjectionPick)
    .sort((a: any, b: any) => {
      const gameA = gamesById.get(a.gameId);
      const gameB = gamesById.get(b.gameId);
      const tA = new Date(gameA?.gameTime ?? gameA?.tipoff ?? gameA?.scheduledAt ?? 0).getTime();
      const tB = new Date(gameB?.gameTime ?? gameB?.tipoff ?? gameB?.scheduledAt ?? 0).getTime();
      return tA - tB;
    });

  // Projection picks that are not yet scored, for top-of-page banners
  const pendingProjectionPicks = (userEntry?.survivorPicks ?? [])
    .filter((p: any) => p.isProjectionPick === true && p.result !== 'win' && p.result !== 'loss');

  // Merge regular pending picks + projection picks, sorted chronologically
  const SAT_EPOCH = new Date(SAT_ISO).getTime();
  const SUN_EPOCH = new Date(SUN_ISO).getTime();
  const allPendingPicksSorted = [
    ...pendingPicks.map((p: any) => {
      const g = gamesById.get(p.gameId);
      const t = new Date(g?.gameTime ?? g?.tipoff ?? g?.scheduledAt ?? 0).getTime();
      return { ...p, _sortEpoch: t };
    }),
    ...pendingProjectionPicks.map((p: any) => {
      const epoch = p.dateKey === '__sat__' ? SAT_EPOCH : p.dateKey === '__sun__' ? SUN_EPOCH : SAT_EPOCH;
      return { ...p, _sortEpoch: epoch };
    }),
  ].sort((a: any, b: any) => a._sortEpoch - b._sortEpoch);

  // Elite Eight picks (all, including scored and pending)
  const eliteEightPicks = (userEntry?.survivorPicks ?? []).filter(
    (p: any) => p.round === 'Elite Eight'
  );

  // Build day tabs
  interface DayTab {
    dateKey: string;
    label: string;
    isEliteEight: boolean;
    hasUnlockedGames: boolean;
    pickStatus: 'has-pick' | 'missing-pick' | 'complete' | 'voided-pick'; // voided-pick = pick on eliminated team
  }

  const dayTabs: DayTab[] = Object.entries(gamesByDay).map(([dateKey, dayGames]) => {
    const typedDayGames = dayGames as any[];
    const isEliteEight = typedDayGames.some((g: any) => g.round === 'Elite Eight');
    const firstGame = typedDayGames[0];
    const gameTimeStr = firstGame.gameTime ?? firstGame.tipoff ?? '';
    const label = isEliteEight ? 'Elite 8' : (gameTimeStr ? formatEasternTabLabel(gameTimeStr) : dateKey);
    const hasUnlockedGames = typedDayGames.some((g: any) => {
      const gt = g.gameTime ?? g.tipoff ?? g.scheduledAt;
      return gt && now < new Date(gt);
    });
    const allComplete = typedDayGames.every((g: any) => g.isComplete);

    let pickStatus: DayTab['pickStatus'] = 'complete';
    if (!allComplete) {
      if (isEliteEight) {
        pickStatus = eliteEightPicks.length >= ELITE_EIGHT_REQUIRED_PICKS ? 'has-pick' : 'missing-pick';
      } else {
        const hasPick = pendingPicks.some((p: any) => getEffectivePickDateKey(p) === dateKey);
        pickStatus = hasPick ? 'has-pick' : 'missing-pick';
      }
    }

    return { dateKey, label, isEliteEight, hasUnlockedGames, pickStatus };
  });

  // Add Saturday, Sunday, Projections tabs (always shown after Firestore tabs)
  const satProjectionPick = (userEntry?.survivorPicks ?? []).find(
    (p: any) => p.isProjectionPick && p.dateKey === '__sat__' && !p.result
  );
  const sunProjectionPick = (userEntry?.survivorPicks ?? []).find(
    (p: any) => p.isProjectionPick && p.dateKey === '__sun__' && !p.result
  );

  // Detect voided sat/sun picks (team no longer in allPossibleTeams for that game)
  const satPickVoided = satProjectionPick ? (() => {
    const proj = projectionModel.get(satProjectionPick.gameId);
    return proj !== undefined && !proj.allPossibleTeams.some((t: any) => t.name === satProjectionPick.team);
  })() : false;
  const sunPickVoided = sunProjectionPick ? (() => {
    const proj = projectionModel.get(sunProjectionPick.gameId);
    return proj !== undefined && !proj.allPossibleTeams.some((t: any) => t.name === sunProjectionPick.team);
  })() : false;

  // Helper: determine whether the Sat/Sun tab should be shown as having unlocked games.
  // De-duplicates the map values (each doc can be keyed twice) using a Set, then filters
  // to docs that belong to the given day, and returns true if any game hasn't tipped yet.
  // When no skeleton docs exist for that day yet, returns true so the tab still renders
  // with an informative placeholder rather than being hidden entirely.
  const skeletonHasUnlockedForDay = (targetDay: 'saturday' | 'sunday'): boolean => {
    const seen = new Set<object>();
    const dayDocs = [...skeletonByBracketKey.values()].filter(doc => {
      if (seen.has(doc)) return false;
      seen.add(doc);
      if (doc.day === targetDay) return true;
      if (doc.day === 'tbd' && doc.gameTime) return deriveDayFromGameTime(doc.gameTime) === targetDay;
      return false;
    });
    if (dayDocs.length === 0) return true;
    return dayDocs.some(doc => !doc.gameTime || now < new Date(doc.gameTime));
  };

  const extraTabs: DayTab[] = [
    {
      dateKey: '__sat__',
      label: formatEasternTabLabel(SAT_ISO),
      isEliteEight: false,
      hasUnlockedGames: skeletonHasUnlockedForDay('saturday'),
      pickStatus: satPickVoided ? 'voided-pick' : satProjectionPick ? 'has-pick' : 'missing-pick',
    },
    {
      dateKey: '__sun__',
      label: formatEasternTabLabel(SUN_ISO),
      isEliteEight: false,
      hasUnlockedGames: skeletonHasUnlockedForDay('sunday'),
      pickStatus: sunPickVoided ? 'voided-pick' : sunProjectionPick ? 'has-pick' : 'missing-pick',
    },
    {
      dateKey: '__proj__',
      label: 'Projections',
      isEliteEight: false,
      hasUnlockedGames: false,
      pickStatus: 'complete',
    },
  ];
  const allTabs = [...dayTabs, ...extraTabs];

  // Initialize active tab: first day with unlocked games, else first day
  const initialTabKey = (() => {
    const firstUnlocked = allTabs.find(t => t.hasUnlockedGames);
    return firstUnlocked?.dateKey ?? allTabs[0]?.dateKey ?? null;
  })();

  const effectiveActiveTab = activeTabKey ?? initialTabKey;

  // Per-day missing pick alerts for upcoming unlocked days (non-Elite Eight)
  const missingPickDayAlerts = dayTabs.filter(
    t => !t.isEliteEight && t.hasUnlockedGames && t.pickStatus === 'missing-pick'
  );

  // Elite Eight alert: need 2 total picks across Sat/Sun window
  const upcomingEliteEightGames = nonSkeletonGames.filter((g: any) => {
    const gt = g.gameTime ?? g.tipoff ?? g.scheduledAt;
    return g.round === 'Elite Eight' && gt && now < new Date(gt);
  });
  const showEliteEightAlert = upcomingEliteEightGames.length > 0 && eliteEightPicks.length < ELITE_EIGHT_REQUIRED_PICKS;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pb-20 animate-pulse">
        <div className="h-24 bg-slate-800/50 rounded-xl mb-4" />
        <div className="h-12 bg-slate-800/50 rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20">
      {/* Identity Card */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-sans mb-0.5">Your Entry</p>
          <p className="text-white font-bold text-lg font-sans">{userEntry?.displayName ?? '—'}</p>
          <p className="text-xs text-slate-400 font-sans">The Federation · March Madness Survivor 2026</p>
        </div>
        <div className="text-right">
          <span className={`inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            userEntry?.isEliminated
              ? 'bg-red-900/50 text-red-400 border border-red-500/40'
              : 'bg-green-900/50 text-green-400 border border-green-500/40'
          }`}>
            {userEntry?.isEliminated ? '❌ Eliminated' : '✅ Active'}
          </span>
          <p className="text-xs text-slate-500 mt-1">{alreadyPickedTeams.length} pick{alreadyPickedTeams.length !== 1 ? 's' : ''} used</p>
        </div>
      </div>

      {/* Pick feedback message */}
      {pickMessage && (
        <div className="mb-4 p-3 rounded-lg bg-green-900/40 border border-green-500/50 text-green-400 text-sm font-sans">
          {pickMessage}
        </div>
      )}

      {/* Pre-Tournament Picks incomplete alert */}
      {userEntry && hasIncompleteFinalFourPicks(userEntry) && (() => {
        const isDeadlinePassed = now >= FINAL_FOUR_DEADLINE;
        const countdown = formatCountdown(FINAL_FOUR_DEADLINE.toISOString(), now);
        if (!isDeadlinePassed && countdown) {
          return (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-sm font-sans flex items-center justify-between gap-2">
              <span className="font-semibold">❗ F4 + Natty Picks due ASAP &nbsp;<span className="font-mono text-xs text-amber-400">⏱ {countdown}</span></span>
              <a href="/final-four" className="text-red-400 underline hover:text-red-300 text-xs font-semibold whitespace-nowrap">Complete Now →</a>
            </div>
          );
        }
        return (
          <div className="mb-4 p-3 rounded-lg bg-amber-900/20 border border-amber-600/40 text-amber-300 text-sm font-sans flex items-center justify-between">
            <span>⚠️ Pre-Tournament Picks not complete</span>
            <a href="/final-four" className="text-red-400 underline hover:text-red-300 text-xs font-semibold">Complete Now →</a>
          </div>
        );
      })()}

      {/* Missing pick alerts for upcoming days — clicking switches to that tab */}
      {missingPickDayAlerts.map(({ dateKey, label }) => (
        <div key={dateKey} className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-600/40 text-blue-300 text-sm font-sans flex items-center justify-between">
          <span>🗓️ No pick yet for <strong>{label}</strong></span>
          <button
            onClick={() => setActiveTabKey(dateKey)}
            className="text-blue-400 underline hover:text-blue-300 text-xs font-semibold bg-transparent border-0 cursor-pointer"
          >
            See Games →
          </button>
        </div>
      ))}

      {/* Elite Eight alert: need 2 total picks */}
      {showEliteEightAlert && (() => {
        const eeTab = dayTabs.find(t => t.isEliteEight);
        return (
          <div className="mb-4 p-3 rounded-lg bg-purple-900/20 border border-purple-600/40 text-purple-300 text-sm font-sans flex items-center justify-between">
            <span>🏀 Elite Eight requires {ELITE_EIGHT_REQUIRED_PICKS} picks — {eliteEightPicks.length} of {ELITE_EIGHT_REQUIRED_PICKS} submitted</span>
            {eeTab && (
              <button
                onClick={() => setActiveTabKey(eeTab.dateKey)}
                className="text-purple-400 underline hover:text-purple-300 text-xs font-semibold bg-transparent border-0 cursor-pointer"
              >
                See Elite Eight →
              </button>
            )}
          </div>
        );
      })()}

      {/* Current Pick Status — one banner per pending pick */}
      {allPendingPicksSorted.length > 0 && (
        <div className="mb-4 space-y-1">
          {allPendingPicksSorted.map((pick: any, i: number) => {
            let dayLabel: string;
            if (pick.isProjectionPick) {
              dayLabel = pick.dateKey === '__sat__' ? formatEasternTabLabel(SAT_ISO) : formatEasternTabLabel(SUN_ISO);
            } else {
              const pickGame = games.find((g: any) => g.id === pick.gameId);
              const gt = pickGame?.gameTime ?? pickGame?.tipoff ?? pickGame?.scheduledAt ?? '';
              dayLabel = gt ? getEasternGameDate(gt) : pick.round;
            }
            return (
              <div key={i} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm font-sans flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span className="text-slate-300">{dayLabel}: <strong className="text-white">{pick.team}</strong></span>
                <span className="text-slate-500 text-xs ml-auto">
                  {pick.isProjectionPick ? 'Conditional pick' : 'Change before tip-off'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Previously Picked (scored rounds only) */}
      {scoredPickedTeams.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-sans mb-2">Used Picks</p>
          <div className="flex flex-wrap gap-1.5">
            {scoredPickedTeams.map((team: string) => (
              <span key={team} className="text-xs px-2.5 py-1 rounded-full border border-red-500/30 text-red-400 bg-red-900/20 font-sans">
                {team}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conditional Picks (pending projection picks) */}
      {pendingProjectionPickTeams.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-sans mb-2">Conditional Picks</p>
          <div className="flex flex-wrap gap-1.5">
            {pendingProjectionPickTeams.map((team: string) => (
              <span key={team} className="text-xs px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-400/70 bg-amber-900/10 font-sans">
                {team} <span className="text-slate-600 text-[10px]">conditional</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Games List */}
      {games.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-10 text-center">
          <div className="text-5xl mb-4">🏀</div>
          <h3 className="font-bebas text-3xl text-white tracking-widest mb-2">You&apos;re Registered!</h3>
          <p className="text-slate-400 text-sm font-sans mb-3">
            The bracket hasn&apos;t been set yet. Once the tournament field is announced and the bracket is seeded, your matchups and pick options will appear here automatically.
          </p>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-sans font-bold">Check back after Selection Sunday!</p>
        </div>
      ) : (
        <>
          {/* Sticky Day Tab Bar */}
          {dayTabs.length > 0 && (
            <div className="sticky top-0 z-10 bg-[#0b1120]/95 backdrop-blur-sm border-b border-slate-800 mb-4 -mx-4 px-4 pb-2 pt-1">
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                {allTabs.map((tab) => {
                  const isActive = tab.dateKey === effectiveActiveTab;
                  const allComplete = tab.pickStatus === 'complete';
                  return (
                    <button
                      key={tab.dateKey}
                      onClick={() => setActiveTabKey(tab.dateKey)}
                      className={`relative flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-fedRed text-white'
                          : allComplete
                          ? 'bg-slate-800/40 text-slate-600 hover:text-slate-400'
                          : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60'
                      }`}
                    >
                      {tab.label}
                      {/* Status dot */}
                      {!allComplete && (
                        <span
                          className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0b1120] ${
                            tab.pickStatus === 'voided-pick' ? 'bg-red-500' :
                            tab.pickStatus === 'has-pick' ? 'bg-green-400' : 'bg-amber-400'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Saturday / Sunday Projection Pick tabs */}
          {(effectiveActiveTab === '__sat__' || effectiveActiveTab === '__sun__') && (() => {
            const dayKey = effectiveActiveTab === '__sat__' ? 'saturday' : 'sunday';
            // Use Firestore skeleton docs as the source of truth for R32 Saturday/Sunday grouping.
            // The admin create-r32-skeleton API sets the authoritative day/gameTime on each skeleton
            // doc; we don't rely on the static framework JSON for this assignment.
            // Sort deterministically by region then id so the order matches Admin Manage Games.
            const r32SkeletonGames = (games as SkeletonGameDoc[])
              .filter((g) => g.isSkeletonGame === true && g.round === 'Round of 32')
              .filter((g) => {
                if (g.day === dayKey) return true;
                if (g.day === 'tbd' && g.gameTime) return deriveDayFromGameTime(g.gameTime) === dayKey;
                return false;
              })
              .sort((a, b) => {
                if (a.region !== b.region) return (a.region ?? '').localeCompare(b.region ?? '');
                return a.id.localeCompare(b.id);
              });
            return (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-sans mb-3">
                  Round of 32 — {effectiveActiveTab === '__sat__' ? getEasternGameDate(SAT_ISO) : getEasternGameDate(SUN_ISO)}
                </p>
                {r32SkeletonGames.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    Round of 32 games will appear here once the schedule is set. Check back after Round of 64 games are complete.
                  </p>
                ) : (
                  r32SkeletonGames.map((sk) => {
                    const proj = projectionModel.get(sk.id);
                    // gameTime comes directly from the skeleton doc
                    const r32GameTime = sk.gameTime ?? null;
                    const isR32Locked = r32GameTime ? now >= new Date(r32GameTime) : false;

                    if (!proj) {
                      // Projection model not populated yet — show a placeholder
                      return (
                        <div key={sk.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 mb-2 opacity-60">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] text-slate-500 uppercase tracking-widest font-sans">
                              {sk.region} · Round of 32
                            </span>
                            {r32GameTime && (
                              <span className="text-[11px] text-slate-500 font-sans">
                                {formatEasternTime(r32GameTime)} ET
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 italic font-sans">
                            Teams TBD — awaiting Round of 64 results
                          </p>
                        </div>
                      );
                    }

                    const userPick = (userEntry?.survivorPicks ?? []).find(
                      (p: any) => p.gameId === sk.id && p.isProjectionPick
                    )?.team ?? null;
                    return (
                      <ProjectionPickCard
                        key={sk.id}
                        frameworkGame={sk}
                        projection={proj}
                        userProjectionPick={userPick}
                        allUsedTeams={alreadyPickedTeams}
                        eliminatedTeams={eliminatedTeamNames}
                        isLocked={isR32Locked}
                        gameTime={r32GameTime}
                        now={now}
                        onPickTeam={(team, fgId, round, region) => {
                          const teamSeed = proj.allPossibleTeams.find(t => t.name === team)?.seed ?? 0;
                          setConfirmProjectionPick({ team, seed: teamSeed, frameworkGameId: fgId, round, region });
                        }}
                      />
                    );
                  })
                )}
              </div>
            );
          })()}

          {/* Projections tab — Sweet 16 + Elite Eight view-only */}
          {effectiveActiveTab === '__proj__' && (() => {
            const s16Games = listFrameworkGamesByDay('tbd').filter(g => g.round === 'Sweet 16' || g.round === 'Elite Eight');
            return (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-sans mb-3">
                  Projected Matchups — View Only
                </p>
                {['Sweet 16', 'Elite Eight'].map(roundName => {
                  const games = s16Games.filter(g => g.round === roundName);
                  if (games.length === 0) return null;
                  return (
                    <div key={roundName} className="mb-6">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 font-sans">{roundName}</p>
                      {games.map(game => {
                        const proj = projectionModel.get(game.id);
                        if (!proj) return null;
                        return (
                          <div key={game.id} className="bg-slate-800/20 border border-slate-700/40 rounded-xl p-3 mb-2 opacity-70">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] text-slate-500 uppercase tracking-widest font-sans">
                                {game.region} · {game.round}
                              </span>
                              <span className="text-[10px] text-slate-600 italic font-sans">Projection — no picks</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                {proj.homeSide.possibleTeams.map(t => (
                                  <div key={t.name} className="rounded-lg px-3 py-2 bg-slate-800/60 border border-slate-700/40 text-slate-400 text-xs">
                                    <span className="text-[10px] text-slate-600 block">#{t.seed}</span>
                                    {t.name}
                                  </div>
                                ))}
                                {proj.homeSide.possibleTeams.length === 0 && (
                                  <div className="rounded-lg px-3 py-2 bg-slate-800/60 border border-slate-700/40 text-slate-500 text-xs">TBD</div>
                                )}
                              </div>
                              <div className="space-y-1">
                                {proj.awaySide.possibleTeams.map(t => (
                                  <div key={t.name} className="rounded-lg px-3 py-2 bg-slate-800/60 border border-slate-700/40 text-slate-400 text-xs">
                                    <span className="text-[10px] text-slate-600 block">#{t.seed}</span>
                                    {t.name}
                                  </div>
                                ))}
                                {proj.awaySide.possibleTeams.length === 0 && (
                                  <div className="rounded-lg px-3 py-2 bg-slate-800/60 border border-slate-700/40 text-slate-500 text-xs">TBD</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Active Tab Games */}
          {effectiveActiveTab && gamesByDay[effectiveActiveTab] && (() => {
            const tabGames = gamesByDay[effectiveActiveTab] as any[];
            const isEliteEightDay = tabGames.some((g: any) => g.round === 'Elite Eight');

            // Sort: incomplete/upcoming first, completed at bottom
            const sortedTabGames = [...tabGames].sort((a, b) => {
              if (a.isComplete && !b.isComplete) return 1;
              if (!a.isComplete && b.isComplete) return -1;
              const aTime = new Date(a.gameTime ?? a.tipoff ?? 0).getTime();
              const bTime = new Date(b.gameTime ?? b.tipoff ?? 0).getTime();
              return aTime - bTime;
            });

            return (
              <div>
                {sortedTabGames.map((game: any) => {
                  const gameTime = game.gameTime ?? game.tipoff ?? game.scheduledAt;
                  const isLocked = gameTime ? now >= new Date(gameTime) : game.isComplete;
                  const easternTime = gameTime ? formatEasternTime(gameTime) : null;
                  const countdown = (!isLocked && gameTime) ? formatCountdown(gameTime, now) : null;
                  const gamePickEntry = (userEntry?.survivorPicks ?? []).find((p: any) => p.gameId === game.id);
                  const thisGamePickTeam = gamePickEntry?.team;

                  // Compact collapsed card for completed games
                  if (game.isComplete && game.winner) {
                    const userPickedWinner = thisGamePickTeam === game.winner;
                    const userPickedLoser = thisGamePickTeam && thisGamePickTeam !== game.winner;
                    const winnerSeed = game.winner === game.homeTeam ? game.homeSeed : game.awaySeed;
                    const loserTeam = game.winner === game.homeTeam ? game.awayTeam : game.homeTeam;
                    const loserSeed = game.winner === game.homeTeam ? game.awaySeed : game.homeSeed;

                    return (
                      <div
                        key={game.id}
                        className="bg-slate-800/20 border border-slate-700/40 rounded-lg px-3 py-2 mb-1.5 opacity-75"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-slate-600 uppercase tracking-widest font-sans shrink-0">
                              {game.region} · {game.round || 'R64'}
                            </span>
                          </div>
                          {easternTime && (
                            <span className="text-[10px] text-slate-600 font-sans shrink-0">{easternTime} ET</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-green-400 text-[11px]">✓</span>
                            <span className="text-xs font-sans font-semibold text-slate-200">
                              #{winnerSeed} {game.winner}
                            </span>
                            <span className="text-[10px] text-slate-600 font-sans line-through">
                              #{loserSeed} {loserTeam}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {thisGamePickTeam && (
                              <span className={`text-[10px] font-sans font-medium ${userPickedWinner ? 'text-green-400' : 'text-red-400'}`}>
                                {userPickedWinner ? '✅' : '❌'} {thisGamePickTeam}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Standard card for active/upcoming games
                  return (
                    <div
                      key={game.id}
                      className={`bg-slate-800/40 border rounded-xl p-3 mb-2 transition-all ${
                        isLocked ? 'border-slate-700/50 opacity-70' : 'border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-slate-500 uppercase tracking-widest font-sans">
                          {game.region} · {game.round || 'Round of 64'}
                        </span>
                        <div className="flex items-center gap-2">
                          {game.network && (
                            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-sans">{game.network}</span>
                          )}
                          {easternTime && (
                            <span className="text-[11px] text-slate-400 font-sans">{easternTime} ET</span>
                          )}
                          {isLocked ? (
                            game.isComplete && game.winner ? null : <span className="text-[11px] text-slate-500">🔒</span>
                          ) : countdown ? (
                            <span className="text-[11px] text-amber-400 font-mono font-semibold">⏱ {countdown}</span>
                          ) : null}
                        </div>
                      </div>
                      {isEliteEightDay && (
                        <div className="mb-2 text-[10px] text-purple-400 font-sans">
                          Elite Eight — pick {ELITE_EIGHT_REQUIRED_PICKS} teams this weekend · {eliteEightPicks.length} of {ELITE_EIGHT_REQUIRED_PICKS} submitted
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { team: game.homeTeam, seed: game.homeSeed },
                          { team: game.awayTeam, seed: game.awaySeed },
                        ].map(({ team, seed }) => {
                          const isThisRoundPick = thisGamePickTeam === team;
                          const isUsedInPrevRound = alreadyPickedTeams.includes(team);
                          const isTeamEliminated = firestoreTeams.some((t: any) => t.name === team && t.isEliminated);
                          const canPick = !isLocked && !game.isComplete && !isUsedInPrevRound && !isTeamEliminated;
                          return (
                            <button
                              key={team}
                              onClick={() => canPick && setConfirmPick({ team, seed, game })}
                              disabled={!canPick}
                              className={`rounded-lg px-3 py-2.5 text-sm font-sans font-semibold transition-all text-left ${
                                isThisRoundPick
                                  ? 'bg-green-700/40 border border-green-500/60 text-green-300 cursor-pointer hover:bg-green-700/60'
                                  : isUsedInPrevRound
                                  ? 'bg-slate-800 border border-slate-700/50 text-slate-600 cursor-not-allowed'
                                  : isTeamEliminated
                                  ? 'bg-slate-800 border border-slate-700/50 text-slate-600 cursor-not-allowed'
                                  : isLocked || game.isComplete
                                  ? 'bg-slate-800/60 border border-slate-700/40 text-slate-500 cursor-default'
                                  : 'bg-slate-700/60 hover:bg-red-700/50 hover:border-red-500/50 border border-slate-600 text-white cursor-pointer'
                              }`}
                            >
                              <span className="text-[10px] text-slate-500 block mb-0.5">#{seed}</span>
                              <span className={`block leading-tight text-xs${isTeamEliminated ? ' line-through' : ''}`}>{team}</span>
                              {isThisRoundPick && <span className="text-[10px] text-green-400 mt-0.5 block">✓ Your Pick</span>}
                              {isUsedInPrevRound && <span className="text-[10px] text-slate-600 mt-0.5 block">Used</span>}
                              {isTeamEliminated && !isUsedInPrevRound && <span className="text-[10px] text-red-700 mt-0.5 block">Eliminated</span>}
                              {isLocked && !isThisRoundPick && !isUsedInPrevRound && !isTeamEliminated && (
                                <span className="text-[10px] text-slate-600 mt-0.5 block">Locked</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}

      {/* Summary Section */}
      <div className="mt-6 border-t border-slate-700 pt-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 font-sans">My Summary</h3>

        {/* Survivor Pick History */}
        {userEntry?.survivorPicks?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-sans">Survivor Pick History</p>
            <div className="space-y-1">
              {[...(userEntry.survivorPicks as any[])].sort((a, b) =>
                new Date(b.pickedAt ?? 0).getTime() - new Date(a.pickedAt ?? 0).getTime()
              ).map((pick: any, i: number) => {
                const pickGame = games.find((g: any) => g.id === pick.gameId);
                const gt = pickGame?.gameTime ?? pickGame?.tipoff ?? pickGame?.scheduledAt ?? '';
                let dayLabel: string;
                if (gt) {
                  dayLabel = getEasternGameDate(gt);
                } else if (pick.dateKey === '__sat__') {
                  dayLabel = getEasternGameDate(SAT_ISO);
                } else if (pick.dateKey === '__sun__') {
                  dayLabel = getEasternGameDate(SUN_ISO);
                } else {
                  dayLabel = pick.dateKey ?? pick.round;
                }

                // Check if this projection pick's team has been eliminated
                const isPickVoided = pick.isProjectionPick && !pick.result && (() => {
                  const fwGame = getFramework().games.find((g: any) => g.id === pick.gameId);
                  const proj = fwGame ? projectionModel.get(fwGame.id) : undefined;
                  return proj !== undefined && !proj.allPossibleTeams.some((t: any) => t.name === pick.team);
                })();

                return (
                  <div key={i} className="flex items-center justify-between bg-slate-800/30 rounded px-3 py-1.5 text-sm font-sans">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs">{pick.round} · {pick.region}</span>
                      <span className="text-slate-500 text-[10px]">{dayLabel}</span>
                    </div>
                    <span className={`font-medium ${isPickVoided ? 'text-red-400' : 'text-white'}`}>
                      {isPickVoided ? '⚠️ ' : ''}{pick.team}
                      {isPickVoided && <span className="ml-1 text-[10px] text-red-500 font-normal">Team eliminated</span>}
                    </span>
                    <span>
                      {pick.result === 'win' ? '✅' : pick.result === 'loss' ? '❌' : <span className="text-slate-600 text-xs">Pending</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Final Four Summary */}
        {userEntry?.finalFourPicks && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-sans">Pre-Tournament Picks</p>
            <div className="grid grid-cols-2 gap-2">
              {(['f1', 'f2', 'f3', 'f4'] as const).map((slot, i) => {
                const regions = ['East', 'West', 'South', 'Midwest'];
                const teamName = userEntry.finalFourPicks[slot];
                const teamData = firestoreTeams.find((t) => t.name === teamName);
                const pts = teamData?.regionalSeed ? calculateFinalFourScore(teamData.regionalSeed) : null;
                return (
                  <div key={slot} className="bg-slate-800/30 rounded px-3 py-2 text-xs font-sans">
                    <span className="text-slate-500 block">{regions[i]} Final Four</span>
                    <span className="text-white font-medium">{teamName || '—'}</span>
                    {teamName && pts !== null && (
                      <span className="text-slate-400 ml-1">(+{pts} pts)</span>
                    )}
                  </div>
                );
              })}
              <div className="col-span-2 bg-slate-800/30 rounded px-3 py-2 text-xs font-sans border border-red-500/20">
                <span className="text-slate-500 block">National Champion 🏆</span>
                {(() => {
                  const champName = userEntry.finalFourPicks.champ;
                  const champTeam = firestoreTeams.find((t) => t.name === champName);
                  const pts = champTeam?.nationalSeed ? calculateNationalChampScore(champTeam.nationalSeed) : null;
                  return (
                    <>
                      <span className="text-red-400 font-bold">{champName || '—'}</span>
                      {champName && pts !== null && (
                        <span className="text-slate-400 ml-1">(+{pts} pts)</span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* CTA if picks incomplete */}
        {(!userEntry?.finalFourPicks || hasIncompleteFinalFourPicks(userEntry)) && (
          <a href="/final-four" className="mt-3 block text-center text-xs text-red-400 underline font-sans">
            Complete Pre-Tournament Picks →
          </a>
        )}
      </div>

      {/* Pick Confirmation Modal */}
      {confirmPick && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="text-4xl mb-3">🏀</div>
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-1">Confirm Your Pick</h3>
            <p className="text-slate-400 text-sm mb-1 font-sans">{confirmPick.game.region} · {confirmPick.game.round}</p>
            <div className="my-4 py-3 px-4 bg-slate-800 rounded-xl border border-slate-600">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-sans">You are picking</p>
              <p className="font-bebas text-3xl text-white tracking-wide">#{confirmPick.seed} {confirmPick.team}</p>
            </div>
            <p className="text-xs text-slate-500 font-sans mb-5">Once confirmed, you can change this pick until tip-off.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmPick(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 font-sans text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const pick = confirmPick;
                  setConfirmPick(null);
                  await handlePickTeam(pick.team, pick.game);
                }}
                className="flex-1 py-2.5 rounded-xl bg-fedRed hover:bg-red-700 text-white font-sans text-sm font-semibold transition"
              >
                Confirm Pick
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projection Pick Confirmation Modal */}
      {confirmProjectionPick && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="text-4xl mb-3">🏀</div>
            <h3 className="font-bebas text-2xl text-white tracking-widest mb-1">Confirm Conditional Pick</h3>
            <p className="text-slate-400 text-sm mb-1 font-sans">{confirmProjectionPick.region} · {confirmProjectionPick.round}</p>
            <div className="my-4 py-3 px-4 bg-slate-800 rounded-xl border border-slate-600">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-sans">You are picking</p>
              <p className="font-bebas text-3xl text-white tracking-wide">#{confirmProjectionPick.seed} {confirmProjectionPick.team}</p>
            </div>
            <p className="text-xs text-slate-500 font-sans mb-2">This is a conditional pick. It is only valid if this team advances from the Round of 64.</p>
            <p className="text-xs text-amber-400/70 font-sans mb-5">Once confirmed, you can change this pick until the game tips off.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmProjectionPick(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 font-sans text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const pick = confirmProjectionPick;
                  setConfirmProjectionPick(null);
                  await handleProjectionPick(pick.team, pick.frameworkGameId, pick.round, pick.region);
                }}
                className="flex-1 py-2.5 rounded-xl bg-fedRed hover:bg-red-700 text-white font-sans text-sm font-semibold transition"
              >
                Confirm Pick
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
