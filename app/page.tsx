import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <img src="/Fed-Logo.png" alt="The Federation" className="w-32 h-32 mb-8" />
      <h1 className="font-bebas text-6xl text-white italic mb-4">The Federation</h1>
      <p className="font-bebas text-xl text-red-600 tracking-widest mb-10 uppercase">MM Survivor 2026</p>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/login" className="bg-red-600 hover:bg-red-700 text-white font-bebas text-2xl py-4 rounded-xl transition-all uppercase shadow-lg shadow-red-900/40">
          Enter Tournament
        </Link>
        <Link href="/standings" className="border border-slate-700 text-slate-400 font-bebas text-xl py-3 rounded-xl hover:bg-slate-800 transition">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
