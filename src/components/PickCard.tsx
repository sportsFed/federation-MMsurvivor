export default function PickCard({ round, team, spread, winProb }: any) {
  return (
    <div className="glass-panel p-5 flex items-center justify-between mb-4 border-l-4 border-l-red-600 group hover:bg-slate-800/40 transition-all">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{round}</span>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white uppercase">{team}</span>
          <span className="text-green-500 font-bold text-sm">{spread}</span>
          <span className="text-green-500 text-xs">✓</span>
        </div>
      </div>

      <div className="flex flex-col items-end w-48">
        <div className="w-full bg-slate-900 h-1.5 rounded-full mb-1.5 overflow-hidden">
          <div className="bg-red-600 h-full rounded-full" style={{ width: `${winProb}%` }}></div>
        </div>
        <div className="flex justify-between w-full text-[10px] font-bold uppercase">
          <span className="text-slate-500">Opponent</span>
          <span className="text-slate-300">{winProb}% Picked {team}</span>
        </div>
      </div>
    </div>
  );
}
