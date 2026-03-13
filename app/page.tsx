import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Script Style Logo Header */}
      <div className="text-center mb-10">
        <h1 className="text-6xl md:text-8xl font-brand font-black text-fedRed drop-shadow-md mb-2">
          The Federation
        </h1>
        <p className="text-fedBlack dark:text-slate-400 font-bold tracking-widest uppercase text-sm">
          Established 2015
        </p>
      </div>

      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 border-4 border-fedBlack dark:border-slate-700 p-8 shadow-[10px_10px_0px_0px_rgba(255,0,0,1)]">
        <h2 className="text-2xl font-bold mb-4 uppercase italic">March Madness Survivor</h2>
        <p className="mb-6 leading-relaxed">
          Welcome to the next leg of the Fed. Test your sports dorkdom with our 
          $Seed \times Multiplier$ scoring system.
        </p>
        
        <div className="flex flex-col gap-4">
          <Link href="/login" className="bg-fedRed text-white text-center py-4 font-black uppercase tracking-widest hover:bg-red-700 transition">
            Enter Tournament
          </Link>
          <Link href="/standings" className="border-2 border-fedBlack dark:border-slate-400 text-center py-3 font-bold uppercase text-sm">
            View Leaderboard
          </Link>
        </div>
      </div>

      <p className="mt-12 text-xs font-bold text-slate-400 uppercase">
        CFB • NFL • MLB • NHL • PGA • CWS • NBA
      </p>
    </div>
  );
}
