'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase/clientApp';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  buildTeamsByRegionSeed,
  buildFirestoreGamesBracketKeyMap,
  buildProjectionModel,
  listFrameworkGamesByDay,
  getFramework,
  type FrameworkGame,
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
  frameworkGame: FrameworkGame;
  projection: GameProjection;
  userProjectionPick: string | null;
  allUsedTeams: string[];
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
    const canPick = !isLocked && !isUsed;
    return (
      <button
        onClick={() => canPick && onPickTeam(team.name, frameworkGame.id, frameworkGame.round, frameworkGame.region)}
        disabled={!canPick}
        className={`rounded-lg px-3 py-2.5 text-sm font-sans font-semibold transition-all text-left w-full ${
          isSelected
            ? 'bg-green-700/40 border border-green-500/60 text-green-300 cursor-pointer hover:bg-green-700/60'
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
        {isUsed && <span className="text-[10px] text-slate-600 mt-0.5 block">Used</span>}
        {isLocked && !isSelected && !isUsed && (
          <span className="text-[10px] text-slate-600 mt-0.5 block">Locked</span>
        )}
      </button>
    );
  }

  return (
    <div className={`bg-slate-800/40 border rounded-xl p-3 mb-2 transition-all ${isLocked ? 'border-slate-700/50 opacity-70' : 'border-slate-700'}`}>...
  );
}

export default function MyPicksPage() {
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [allEntries, setAllEntries] = useState<any[]>([]);
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
          const [entrySnap, gamesSnap, entriesSnap, teamsSnap] = await Promise.all([
            getDoc(doc(db, 'entries', user.uid)),
            getDocs(collection(db, 'games')),
            getDocs(collection(db, 'entries')),
            getDocs(collection(db, 'teams')),
          ]);
          if (entrySnap.exists()) setUserEntry(entrySnap.data());
          setGames(gamesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setAllEntries(entriesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setFirestoreTeams(teamsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<TeamData, 'id'>) })));
          // Build projection model
          const fw = getFramework();
          const teamsByRegionSeed = buildTeamsByRegionSeed(fw);
          const allGames = gamesSnap.docs.map(d => ({ id: d.id, ...d.data() as { region: string; homeSeed: number; awaySeed: number; winner: string | null; isComplete: boolean; isSkeletonGame?: boolean } }));
          // Only map R64 games (real seeded games, not skeleton) to bracket keys
          const r64Games = allGames.filter(g => !g.isSkeletonGame && g.homeSeed && g.awaySeed);
          const bracketKeyMap = buildFirestoreGamesBracketKeyMap(r64Games);
          setProjectionModel(buildProjectionModel(bracketKeyMap, teamsByRegionSeed));
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

  // Build pick distribution map: gameId -> { home: count, away: count }
  const pickDistribution = new Map<string, { home: number; away: number }>();
  for (const entry of allEntries) {
    for (const pick of entry.survivorPicks ?? []) {
      if (!pick.gameId || !pick.team) continue;
      const game = games.find((g: any) => g.id === pick.gameId);
      if (!game) continue;
      const current = pickDistribution.get(pick.gameId) ?? { home: 0, away: 0 };
      if (pick.team === game.homeTeam) current.home++;
      else if (pick.team === game.awayTeam) current.away++;
      pickDistribution.set(pick.gameId, current);
    }
  }

  ...
}