import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
      <h1 className="text-5xl font-extrabold text-blue-900 mb-4">The Federation League</h1>
      <p className="text-xl text-slate-600 mb-8 italic">March Madness Survivor 2026</p>
      
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md">
        <h2 className="text-2xl font-bold mb-4">Tournament Central</h2>
        <p className="mb-6 text-slate-500">Log in to make your Survivor picks and select your Final Four teams.</p>
        <Link href="/login" className="block w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">
          Enter Tournament
        </Link>
      </div>
      
      <footer className="mt-12 text-slate-400 text-sm">
        $Seed \times Round Multiplier$ Scoring Active
      </footer>
    </div>
  );
}
