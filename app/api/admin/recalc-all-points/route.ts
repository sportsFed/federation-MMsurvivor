import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import { calculateSurvivorScore } from '@/lib/scoring';

interface RecalcEntry {
  displayName: string;
  old: number;
  new: number;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entriesSnap = await db.collection('entries').get();
    const batch = db.batch();
    let updated = 0;
    const entries: RecalcEntry[] = [];

    for (const entryDoc of entriesSnap.docs) {
      const data = entryDoc.data() as Record<string, unknown>;

      // Survivor points: sum wins only
      let survivorPts = 0;
      const survivorPicks = (data.survivorPicks as Array<Record<string, unknown>> | undefined) ?? [];
      for (const pick of survivorPicks) {
        if (pick.result === 'win') {
          survivorPts += calculateSurvivorScore(
            typeof pick.seed === 'number' ? pick.seed : 0,
            typeof pick.round === 'string' ? pick.round : '',
          );
        }
      }

      // Consolation: read stored field only
      const consolationPts = typeof data.consolationPoints === 'number' ? data.consolationPoints : 0;

      // Final Four: read stored field only
      const finalFourPts = typeof data.finalFourPoints === 'number' ? data.finalFourPoints : 0;

      const newTotal = parseFloat((survivorPts + consolationPts + finalFourPts).toFixed(1));
      const oldTotal = typeof data.totalPoints === 'number' ? data.totalPoints : 0;

      if (Math.abs(newTotal - oldTotal) >= 0.001) {
        batch.update(entryDoc.ref, { totalPoints: newTotal });
        updated++;
        entries.push({
          displayName: typeof data.displayName === 'string' ? data.displayName : entryDoc.id,
          old: oldTotal,
          new: newTotal,
        });
      }
    }

    await batch.commit();

    return NextResponse.json({ updated, entries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
