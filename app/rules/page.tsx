export default function RulesPage() {
  const roundMultipliers = [
    { round: 'Round of 64', multiplier: '1.0×', example: '12 seed × 1.0 = 12.0 pts' },
    { round: 'Round of 32', multiplier: '1.5×', example: '8 seed × 1.5 = 12.0 pts' },
    { round: 'Sweet Sixteen', multiplier: '2.0×', example: '5 seed × 2.0 = 10.0 pts' },
    { round: 'Elite Eight', multiplier: '2.5×', example: '4 seed × 2.5 = 10.0 pts' },
    { round: 'Final Four', multiplier: '3.5×', example: '3 seed × 3.5 = 10.5 pts' },
    { round: 'Championship', multiplier: '5.0×', example: '1 seed × 5.0 = 5.0 pts' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-bebas text-5xl text-white tracking-widest italic mb-2 uppercase">The Rules</h1>
      <p className="text-slate-400 font-bebas text-lg tracking-widest uppercase mb-10">Federation March Madness Survivor 2026</p>

      {/* How Survivor Works */}
      <div className="glass-panel p-6 mb-6">
        <h2 className="font-bebas text-3xl text-white tracking-widest uppercase mb-4">🏀 How the Survivor Pool Works</h2>
        <ul className="space-y-3 text-slate-300 text-sm leading-relaxed">
          <li className="flex gap-3">
            <span className="text-fedRed font-bebas text-lg shrink-0">1.</span>
            <span>Each round, pick <strong className="text-white">one team</strong> you believe will win their game.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-fedRed font-bebas text-lg shrink-0">2.</span>
            <span>If your team <strong className="text-white">loses</strong>, you are <strong className="text-red-400">eliminated</strong> from the pool.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-fedRed font-bebas text-lg shrink-0">3.</span>
            <span>You <strong className="text-white">cannot pick the same team twice</strong> throughout the tournament — choose wisely!</span>
          </li>
          <li className="flex gap-3">
            <span className="text-fedRed font-bebas text-lg shrink-0">4.</span>
            <span>The last person standing (or the one with the <strong className="text-white">most points</strong> if multiple survive) wins.</span>
          </li>
        </ul>
      </div>

      {/* Scoring System */}
      <div className="glass-panel p-6 mb-6">
        <h2 className="font-bebas text-3xl text-white tracking-widest uppercase mb-2">📊 Scoring System</h2>
        <p className="text-slate-400 text-sm mb-4">
          Points = <span className="text-white font-bold">Team Seed × Round Multiplier</span>. Picking upsets earns more points!
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 pr-4 font-bebas text-slate-400 tracking-widest text-sm uppercase">Round</th>
                <th className="text-center py-2 pr-4 font-bebas text-slate-400 tracking-widest text-sm uppercase">Multiplier</th>
                <th className="text-left py-2 font-bebas text-slate-400 tracking-widest text-sm uppercase">Example</th>
              </tr>
            </thead>
            <tbody>
              {roundMultipliers.map(({ round, multiplier, example }) => (
                <tr key={round} className="border-b border-slate-800">
                  <td className="py-3 pr-4 font-bebas text-lg text-white">{round}</td>
                  <td className="py-3 pr-4 text-center font-bebas text-2xl text-fedRed">{multiplier}</td>
                  <td className="py-3 text-slate-400 text-sm font-mono">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* How Points Work */}
      <div className="glass-panel p-6 mb-6">
        <h2 className="font-bebas text-3xl text-white tracking-widest uppercase mb-4">🔢 How Points Work</h2>
        <div className="space-y-3 text-slate-300 text-sm">
          <p>The formula is simple: <span className="text-white font-bold font-mono">Points = Seed Number × Round Multiplier</span></p>
          <p>Higher seeds (underdogs) earn <strong className="text-white">more points</strong> because they are harder to predict winning.</p>
          <div className="bg-slate-900/50 rounded-lg p-4 mt-3 space-y-2">
            <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-2">Examples</p>
            <p>Picking <span className="text-white">#12 seed</span> in Round of 64 → <span className="text-fedRed font-bold">12 × 1.0 = 12.0 pts</span></p>
            <p>Picking <span className="text-white">#1 seed</span> in Round of 64 → <span className="text-green-400 font-bold">1 × 1.0 = 1.0 pt</span> (safe but low reward)</p>
            <p>Picking <span className="text-white">#10 seed</span> in Sweet Sixteen → <span className="text-fedRed font-bold">10 × 2.0 = 20.0 pts</span></p>
            <p>Picking <span className="text-white">#2 seed</span> in Championship → <span className="text-yellow-400 font-bold">2 × 5.0 = 10.0 pts</span></p>
          </div>
        </div>
      </div>

      {/* Final Four Bonus */}
      <div className="glass-panel p-6">
        <h2 className="font-bebas text-3xl text-white tracking-widest uppercase mb-4">🏆 Pre-Tournament Picks</h2>
        <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
          <p>Before the tournament begins, you make <strong className="text-white">four pre-tournament predictions</strong>:</p>
          <ul className="space-y-2 ml-4">
            <li>🏀 Your predicted <strong className="text-white">Final Four teams</strong></li>
            <li>🏆 Your predicted <strong className="text-white">National Champion</strong></li>
          </ul>
          <p className="text-slate-400">These picks are locked in before tip-off and are used for tracking purposes and potential tiebreaker scoring.</p>
        </div>
      </div>
    </div>
  );
}
