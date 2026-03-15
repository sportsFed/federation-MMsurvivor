'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase/clientApp';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function MyBracketPage() {
  const router = useRouter();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'entries', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setEntry(docSnap.data());
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto animate-pulse">
        <div className="h-10 bg-slate-700/50 rounded w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-6 h-48 bg-slate-700/50" />
          <div className="glass-panel p-6 h-48 bg-slate-700/50" />
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400 font-bebas text-xl">No picks found. Go to <a href="/my-picks" className="text-fedRed hover:underline">My Picks</a> to start!</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-bebas text-4xl text-white tracking-widest italic mb-8 uppercase">My Federation Journey</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Survivor History */}
        <div className="glass-panel p-6">
          <h2 className="font-bebas text-2xl text-white mb-4 tracking-widest uppercase">Survivor History</h2>
          {entry.survivorPicks && entry.survivorPicks.length > 0 ? (
            <ul className="space-y-2">
              {entry.survivorPicks.map((pick: any, i: number) => (
                <li key={i} className="flex justify-between items-center border-b border-slate-700 pb-2">
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-widest">{pick.round}</span>
                    <p className="font-bebas text-lg text-white">{pick.team || pick.teamName}</p>
                  </div>
                  {pick.result === 'win' ? (
                    <span className="text-green-400 text-lg">✅</span>
                  ) : pick.result === 'loss' ? (
                    <span className="text-red-400 text-lg">❌</span>
                  ) : (
                    <span className="text-slate-500 text-xs">Pending</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 italic">No survivor picks yet — games will appear on the My Picks page once the bracket is set.</p>
          )}
        </div>

        {/* Pre-Tournament Picks */}
        <div className="glass-panel p-6">
          <h2 className="font-bebas text-2xl text-white mb-4 tracking-widest uppercase">Pre-Tournament Picks</h2>
          {entry.finalFourPicks ? (
            <div className="space-y-4">
              <div className="border-b border-slate-700 pb-3">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">National Champion 🏆</p>
                <p className="font-bebas text-xl text-fedRed">{entry.finalFourPicks.champ || 'Not Selected'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Final Four</p>
                <div className="space-y-1">
                  {[entry.finalFourPicks.f1, entry.finalFourPicks.f2, entry.finalFourPicks.f3, entry.finalFourPicks.f4]
                    .filter(Boolean)
                    .map((team: string, i: number) => (
                      <p key={i} className="font-bebas text-lg text-white">{team}</p>
                    ))}
                  {!entry.finalFourPicks.f1 && <p className="text-slate-500 italic text-sm">No Final Four picks yet.</p>}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic text-sm">No pre-tournament picks yet. Visit the <a href="/final-four" className="text-fedRed hover:underline">Final Four</a> page to lock in your predictions before tip-off!</p>
          )}
        </div>
      </div>
    </div>
  );
}
