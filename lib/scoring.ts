export const ROUND_MULTIPLIERS: Record<string, number> = {
  "Round of 64": 1.0,
  "Round of 32": 1.5,
  "Sweet Sixteen": 2.0,
  "Elite Eight": 2.5,
  "Final Four": 3.5,
  "Championship": 5.0,
};

export function calculateSurvivorScore(seed: number, roundName: string): number {
  const multiplier = ROUND_MULTIPLIERS[roundName] || 0;
  const score = seed * multiplier;
  return parseFloat(score.toFixed(1));
}
