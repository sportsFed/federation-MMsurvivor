export const ROUND_MULTIPLIERS: Record<string, number> = {
  "Round of 64": 1.0,
  "Round of 32": 1.5,
  "Sweet Sixteen": 2.0,
  "Sweet 16": 2.0,
  "Elite Eight": 2.5,
  "Final Four": 3.5,
  "Championship": 5.0,
  "National Championship": 5.0,
};

export function calculateSurvivorScore(seed: number, roundName: string): number {
  const multiplier = ROUND_MULTIPLIERS[roundName] || 0;
  const score = seed * multiplier;
  return parseFloat(score.toFixed(1));
}

export function calculateConsolationScore(seed: number): number {
  return parseFloat((seed / 100).toFixed(2));
}

/**
 * Points awarded when a picked team reaches the Final Four.
 * @param regionalSeed - Team's regional seed (1–16)
 * @returns 5 + regionalSeed
 */
export function calculateFinalFourScore(regionalSeed: number): number {
  const seed = Math.max(1, Math.min(16, Math.round(regionalSeed)));
  return 5 + seed;
}

/**
 * Points awarded when a picked team wins the National Championship.
 * @param nationalSeed - Team's national seed (1–68)
 * @returns 10 + nationalSeed
 */
export function calculateNationalChampScore(nationalSeed: number): number {
  const seed = Math.max(1, Math.min(68, Math.round(nationalSeed)));
  return 10 + seed;
}
