import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import { calculateFinalFourScore, calculateNationalChampScore, calculateSurvivorScore } from '@/lib/scoring';

/**
 * POST /api/admin/score-final-four
 *
 * Body:
 *   - finalFourTeams: string[]   – teams that have advanced to the Final Four (up to 4)
 *   - champion: string | null    – the National Champion team name (or null if not yet known)
 *
 * For each entry, awards:
 *   - 5 + team.regionalSeed  for each Final Four pick that advanced
 *   - 10 + team.nationalSeed for the National Champion pick
 *
 * The total is stored as `finalFourPoints` on the entry and added to `totalPoints`.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { finalFourTeams, champion } = await request.json() as {
      finalFourTeams?: string[];
      champion?: string | null;
    };

    // Build a name → seed lookup from the teams collection
    const teamsSnap = await db.collection('teams').get();
    const teamSeedMap = new Map<string, { regionalSeed: number; nationalSeed: number }>();
    teamsSnap.docs.forEach((d) => {
      const t = d.data();
      if (t.name) {
        teamSeedMap.set(t.name, {
          regionalSeed: t.regionalSeed ?? 0,
          nationalSeed: t.nationalSeed ?? 0,
        });
      }
    });

    const finalFourSet = new Set<string>(finalFourTeams ?? []);

    const entriesSnap = await db.collection('entries').get();
    const batch = db.batch();

    let updatedCount = 0;
    for (const entryDoc of entriesSnap.docs) {
      const data = entryDoc.data();
      const picks = data.finalFourPicks as Record<string, string> | undefined;
      if (!picks) continue;

      let finalFourPts = 0;

      // Score each Final Four slot
      for (const slot of ['f1', 'f2', 'f3', 'f4'] as const) {
        const pickedTeam = picks[slot];
        if (!pickedTeam || !finalFourSet.has(pickedTeam)) continue;
        const seeds = teamSeedMap.get(pickedTeam);
        if (seeds && seeds.regionalSeed > 0) {
          finalFourPts += calculateFinalFourScore(seeds.regionalSeed);
        }
      }

      // Score the champion pick
      if (champion && picks.champ === champion) {
        const seeds = teamSeedMap.get(champion);
        if (seeds && seeds.nationalSeed > 0) {
          finalFourPts += calculateNationalChampScore(seeds.nationalSeed);
        }
      }

      // Atomically rebuild totalPoints = survivorPoints + finalFourPoints
      let survivorPts = 0;
      for (const pick of data.survivorPicks ?? []) {
        survivorPts += calculateSurvivorScore(pick.seed ?? 0, pick.round ?? '');
      }

      batch.update(entryDoc.ref, {
        finalFourPoints: finalFourPts,
        totalPoints: parseFloat((survivorPts + finalFourPts).toFixed(1)),
      });
      updatedCount++;
    }

    await batch.commit();

    return NextResponse.json({ success: true, updatedEntries: updatedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
