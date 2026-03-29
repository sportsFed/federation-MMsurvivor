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

    const entriesSnap = await db.collection('entries').get();
    const batch = db.batch();
    let updated = 0;
    const entries: RecalcEntry[] = [];

    for (const entryDoc of entriesSnap.docs) {
      const data = entryDoc.data() as Record<string, unknown>;

      const survivorPicks = (data.survivorPicks as Array<Record<string, unknown>> | undefined) ?? [];

      // Survivor points: derive from picks where result === 'win'
      let survivorPts = 0;
      for (const pick of survivorPicks) {
        if (pick.result === 'win') {
          survivorPts += calculateSurvivorScore(
            typeof pick.seed === 'number' ? pick.seed : 0,
            typeof pick.round === 'string' ? pick.round : '',
          );
        }
      }

      // Consolation points: derive from picks where result === 'loss'
      // Do NOT rely on stored consolationPoints field — derive from picks directly
      let consolationPts = 0;
      for (const pick of survivorPicks) {
        if (pick.result === 'loss') {
          consolationPts += calculateConsolationScore(
            typeof pick.seed === 'number' ? pick.seed : 0,
          );
        }
      }
      consolationPts = parseFloat(consolationPts.toFixed(2));

      // Final Four: read stored field only (cannot be re-derived without team seed lookup)
      const finalFourPts = typeof data.finalFourPoints === 'number' ? data.finalFourPoints : 0;

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
