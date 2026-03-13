import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 transition-colors">
      <div className="mb-8">
        <img src="/Fed-Logo-Full.png" alt="The Federation" className="max-w-md w-full h-auto" />
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 border-4 border-fedBlack dark:border-slate-800 p-8 shadow-[12px_12px_0px_0px_#FF0000]">
        <h2 className="font-bebas text-4xl mb-6 text-center tracking-tight dark:text-white">
          March Madness Survivor
        </h2>
        
        <div className="flex flex-col gap-4">
          <Link href="/login" className="bg-fedRed text-white text-center py-4 font-bebas text-2xl tracking-widest hover:bg-red-700 transition">
            Enter Tournament
          </Link>
          <Link href="/standings" className="border-2 border-fedBlack dark:border-slate-500 text-center py-3 font-bebas text-xl tracking-wide dark:text-slate-300">
            Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
