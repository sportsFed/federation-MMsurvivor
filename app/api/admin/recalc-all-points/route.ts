import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import { calculateSurvivorScore, calculateConsolationScore } from '@/lib/scoring';

interface RecalcEntry {
  id: string;
  displayName: string;
  oldTotal: number;
  newTotal: number;
  survivorPts: number;
  consolationPts: number;
  finalFourPts: number;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default to dry run — must explicitly pass dryRun: false to write
    let dryRun = true;
    try {
      const body = await request.json() as { dryRun?: boolean };
      if (body.dryRun === false) dryRun = false;
    } catch {
      // no body or parse error — stay in dry run
    }

    // Build a team-name → seed lookup from the teams collection.
    // picks do NOT store seed on the pick object — only result, team, round, gameId.
    const teamsSnap = await db.collection('teams').get();
    const teamSeedMap = new Map<string, number>();
    for (const teamDoc of teamsSnap.docs) {
      const teamData = teamDoc.data() as Record<string, unknown>;
      if (typeof teamData.name === 'string' && typeof teamData.seed === 'number') {
        teamSeedMap.set(teamData.name, teamData.seed);
      }
    }

    const entriesSnap = await db.collection('entries').get();
    const batch = db.batch();
    let updated = 0;
    const entries: RecalcEntry[] = [];

    for (const entryDoc of entriesSnap.docs) {
      const data = entryDoc.data() as Record<string, unknown>;

      const survivorPicks = (data.survivorPicks as Array<Record<string, unknown>> | undefined) ?? [];

      // Score all picks in a single pass — seed is NOT stored on the pick object itself,
      // so look it up from the teams collection via pick.team.
      let survivorPts = 0;
      let consolationPts = 0;
      for (const pick of survivorPicks) {
        const seed = teamSeedMap.get(typeof pick.team === 'string' ? pick.team : '') ?? 0;
        if (pick.result === 'win') {
          survivorPts += calculateSurvivorScore(
            seed,
            typeof pick.round === 'string' ? pick.round : '',
          );
        } else if (pick.result === 'loss') {
          consolationPts += calculateConsolationScore(seed);
        }
      }
      consolationPts = parseFloat(consolationPts.toFixed(2));

      // Final Four: re-derive from finalFourResults (written by set-game-winner auto-score)
      // Do NOT rely on stored finalFourPoints — it may be missing for entries scored via set-game-winner
      const finalFourResults = data.finalFourResults as Record<string, { points: number; scored: boolean }> | undefined;
      let finalFourPts = 0;
      if (finalFourResults) {
        for (const slot of ['f1', 'f2', 'f3', 'f4', 'champ']) {
          const slotData = finalFourResults[slot];
          if (slotData?.scored === true && typeof slotData.points === 'number') {
            finalFourPts += slotData.points;
          }
        }
      }
      finalFourPts = parseFloat(finalFourPts.toFixed(1));

      const newTotal = parseFloat((survivorPts + consolationPts + finalFourPts).toFixed(1));
      const oldTotal = typeof data.totalPoints === 'number' ? data.totalPoints : 0;

      entries.push({
        id: entryDoc.id,
        displayName: typeof data.displayName === 'string' ? data.displayName : entryDoc.id,
        oldTotal,
        newTotal,
        survivorPts,
        consolationPts,
        finalFourPts,
      });

      if (!dryRun) {
        // Store backup before overwriting, then write corrected values
        batch.update(entryDoc.ref, {
          totalPointsBackup: oldTotal,
          totalPoints: newTotal,
          consolationPoints: consolationPts,
          finalFourPoints: finalFourPts,
        });
      }

      if (Math.abs(newTotal - oldTotal) >= 0.001) {
        updated++;
      }
    }

    if (!dryRun) {
      await batch.commit();
    }

    return NextResponse.json({ dryRun, updated, entries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
