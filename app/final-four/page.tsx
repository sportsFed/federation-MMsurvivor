'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/clientApp';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const SLOT_REGIONS: Record<string, string> = {
  f1: 'East',
  f2: 'West',
  f3: 'South',
  f4: 'Midwest',
};

const FINAL_FOUR_DEADLINE = new Date('2026-03-19T16:15:00Z');

function formatCountdown(isoString: string, now: Date): string | null {
  const target = new Date(isoString);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 24) return null;
  if (hours > 0) return `${hours}h ${minutes}m`;
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function FinalFourPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [picks, setPicks] = useState({ f1: '', f2: '', f3: '', f4: '', champ: '' });
  const [user, setUser] = useState<any>(null);
  const [locked, setLocked] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isDeadlineLocked = now >= FINAL_FOUR_DEADLINE;
  const effectiveLocked = locked || isDeadlineLocked;
  const countdown = formatCountdown(FINAL_FOUR_DEADLINE.toISOString(), now);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const entrySnap = await getDoc(doc(db, 'entries', u.uid));
          if (entrySnap.exists()) {
            const data = entrySnap.data();
            if (data?.finalFourPicks) {
              setPicks((prev) => ({ ...prev, ...data.finalFourPicks }));
              if (data.finalFourPicks.locked) setLocked(true);
            }
          }
        } catch {
          // ignore load error
        }
      }
      setLoading(false);
    });

    const fetchTeams = async () => {
      const querySnapshot = await getDocs(collection(db, 'teams'));
      setTeams(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchTeams();

    return () => unsubscribe();
  }, []);

  const savePicks = async () => {
    if (!user || effectiveLocked) return;
    await setDoc(doc(db, 'entries', user.uid), { finalFourPicks: picks }, { merge: true });
    setSaveMessage('✅ Picks saved successfully!');
    setTimeout(() => setSaveMessage(''), 5000);
  };

  const teamsForRegion = (region: string) =>
    teams
      .filter((t) => t.region === region)
      .sort((a, b) => (a.regionalSeed ?? 99) - (b.regionalSeed ?? 99));

  const champTeams = [...teams].sort(
    (a, b) => (a.nationalSeed ?? 99) - (b.nationalSeed ?? 99)
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-pulse">
        <div className="h-12 bg-slate-700/50 rounded w-72 mb-4" />
        <div className="h-5 bg-slate-700/50 rounded w-96 mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-5 h-28 bg-slate-700/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="font-bebas text-5xl tracking-widest italic text-white uppercase mb-2">
        Pre-Tournament Picks
      </h1>
      <p className="text-slate-400 mb-8 text-sm font-sans">
        Select your Final Four teams and National Champion. These lock at <strong>12:15 PM ET on Thursday, March 19</strong>.
      </p>

      {effectiveLocked && (
        <div className="mb-6 p-3 rounded bg-amber-900/30 border border-amber-500/50 text-amber-400 text-sm font-sans">
          🔒 Your picks are locked and cannot be changed.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {(['f1', 'f2', 'f3', 'f4'] as const).map((slot) => {
          const region = SLOT_REGIONS[slot];
          const regionTeams = teamsForRegion(region);
          return (
            <div key={slot} className="glass-panel p-5 border border-slate-700">
              <label className="block font-sans font-semibold text-sm text-fedRed uppercase tracking-wider mb-3">
                {region} Region — Final Four Pick
              </label>
              <select
                value={picks[slot]}
                onChange={(e) => !effectiveLocked && setPicks({ ...picks, [slot]: e.target.value })}
                disabled={effectiveLocked}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 font-sans text-sm disabled:opacity-50"
              >
                <option value="">Select a Team...</option>
                {regionTeams.map((t) => (
                  <option key={t.id} value={t.name}>
                    #{t.regionalSeed} {t.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-6 border border-slate-700 mb-8">
        <h2 className="font-bebas text-2xl tracking-widest text-white uppercase mb-4 text-center">
          National Champion
        </h2>
        <select
          value={picks.champ}
          onChange={(e) => !effectiveLocked && setPicks({ ...picks, champ: e.target.value })}
          disabled={effectiveLocked}
          className="w-full bg-slate-900 border border-slate-700 text-white rounded p-2 font-sans text-sm disabled:opacity-50"
        >
          <option value="">Select Champion...</option>
          {champTeams.map((t) => (
            <option key={t.id} value={t.name}>
              #{t.nationalSeed} {t.name}
            </option>
          ))}
        </select>
      </div>

      {saveMessage && (
        <div className="mb-4 p-3 rounded bg-green-900/40 border border-green-500/50 text-green-400 text-sm font-sans">
          {saveMessage}
        </div>
      )}

      {!effectiveLocked && countdown && (
        <div className="mb-4 text-center text-amber-400 text-sm font-mono font-semibold">
          ⏱ Locks in {countdown}
        </div>
      )}

      <div className="text-center">
        <button
          onClick={savePicks}
          disabled={effectiveLocked}
          className="bg-fedRed hover:bg-red-700 text-white font-sans font-semibold tracking-wide text-base px-10 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase"
        >
          Save All Picks
        </button>
      </div>
    </div>
  );
}
