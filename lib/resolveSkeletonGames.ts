import { db } from '@/lib/firebase/adminApp';
import { getFrameworkGame } from '@/lib/bracket/framework';

export interface ResolveSkeletonResult {
  resolved: number;
  skipped: number;
  errors: string[];
}

/**
 * Look up a Firestore R64 game document by querying region + homeSeed + awaySeed
 * derived from the framework JSON for the given R64 game ID (e.g. "E-R64-G1").
 * Returns the document data if found, or null if the game cannot be found.
 */
async function lookupR64GameDoc(
  participantGameId: string,
): Promise<FirebaseFirestore.DocumentData | null> {
  const fwGame = getFrameworkGame(participantGameId);
  if (!fwGame) return null;

  const [p0, p1] = fwGame.participants;
  if (p0.type !== 'seed' || p1.type !== 'seed') return null;
  if (p0.region !== p1.region) return null;

  const region = p0.region;
  const homeSeed = p0.seed;
  const awaySeed = p1.seed;

  // Try primary orientation; fall back to reversed if not found (sequential to
  // avoid an unnecessary second round-trip in the common case)
  let q = await db
    .collection('games')
    .where('region', '==', region)
    .where('homeSeed', '==', homeSeed)
    .where('awaySeed', '==', awaySeed)
    .limit(1)
    .get();

  // Fall back to reversed orientation
  if (q.empty) {
    q = await db
      .collection('games')
      .where('region', '==', region)
      .where('homeSeed', '==', awaySeed)
      .where('awaySeed', '==', homeSeed)
      .limit(1)
      .get();
  }

  if (q.empty) return null;
  return q.docs[0].data();
}

/**
 * For each skeleton game (isSkeletonGame === true) in the games collection:
 * - Use its `bracketKey` field (e.g. "W-R32-G1") to look up the framework JSON
 * - Identify the two upstream participant game IDs (participants[0].gameId and participants[1].gameId)
 * - Look up those two upstream R64 Firestore game documents by querying region + homeSeed + awaySeed
 * - If both upstream games are complete and have winners, write homeTeam/homeSeed/awayTeam/awaySeed to the skeleton doc,
 *   and set isSkeletonGame: false
 * - If only one or neither upstream game is complete, skip (increment skipped)
 * - Return { resolved, skipped, errors }
 */
export async function resolveSkeletonGames(): Promise<ResolveSkeletonResult> {
  let resolved = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    // Load all skeleton games from Firestore
    const skeletonSnap = await db.collection('games').where('isSkeletonGame', '==', true).get();

    for (const skeletonDoc of skeletonSnap.docs) {
      try {
        const data = skeletonDoc.data();
        const bracketKey: string = data.bracketKey ?? skeletonDoc.id;

        // Look up the framework game to get participant game IDs
        const fwGame = getFrameworkGame(bracketKey);
        if (!fwGame) {
          // Not an R32 skeleton we understand
          skipped++;
          continue;
        }

        const [p0, p1] = fwGame.participants;
        if (p0.type !== 'winnerOf' || p1.type !== 'winnerOf') {
          // Only handle games where both sides are determined by R64 winners
          skipped++;
          continue;
        }

        const upstream0Id = p0.gameId; // e.g. "E-R64-G1"
        const upstream1Id = p1.gameId; // e.g. "E-R64-G2"

        // Look up both upstream R64 game docs via region+seed composite query
        const [d0, d1] = await Promise.all([
          lookupR64GameDoc(upstream0Id),
          lookupR64GameDoc(upstream1Id),
        ]);

        if (!d0 || !d1) {
          skipped++;
          continue;
        }

        if (!d0.isComplete || !d0.winner || !d1.isComplete || !d1.winner) {
          // Upstream games not yet complete
          skipped++;
          continue;
        }

        // Determine seeds for each winner
        const homeTeam: string = d0.winner;
        const homeSeed: number = d0.homeTeam === d0.winner ? (d0.homeSeed ?? 0) : (d0.awaySeed ?? 0);
        const awayTeam: string = d1.winner;
        const awaySeed: number = d1.homeTeam === d1.winner ? (d1.homeSeed ?? 0) : (d1.awaySeed ?? 0);

        await db.collection('games').doc(skeletonDoc.id).update({
          homeTeam,
          homeSeed,
          awayTeam,
          awaySeed,
          isSkeletonGame: false,
        });

        resolved++;
      } catch (innerErr: unknown) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        errors.push(`${skeletonDoc.id}: ${msg}`);
      }
    }
  } catch (outerErr: unknown) {
    const msg = outerErr instanceof Error ? outerErr.message : String(outerErr);
    errors.push(`outer: ${msg}`);
  }

  return { resolved, skipped, errors };
}
