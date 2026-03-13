export default function Navbar() {
  return (
    <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/Fed-Logo.png" alt="Logo" className="w-10 h-10" />
          <div>
            <h1 className="text-white font-bold leading-none uppercase">MM Survivor</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">The Federation</p>
          </div>
        </div>

        <div className="flex gap-8 h-full items-center">
          <button className="h-full border-b-2 border-red-600 text-red-500 font-bold uppercase text-xs tracking-tighter">My Picks</button>
          <button className="text-slate-400 hover:text-white font-bold uppercase text-xs tracking-tighter">Standings</button>
          <button className="text-slate-400 hover:text-white font-bold uppercase text-xs tracking-tighter">Live Grid</button>
        </div>

        <button className="border border-slate-700 px-4 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800 transition">
          Sign Out
        </button>
      </div>
    </nav>
  );
}
