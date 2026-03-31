import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

// Sunday March 29 2026 11:59 PM ET = Monday March 30 2026 03:59 UTC
const E8_WINDOW_END = new Date('2026-03-30T04:00:00Z');

interface E8EliminationEntry {
  id: string;
  displayName: string;
  e8PickCount: number;
}

async function finalizeE8Eliminations(dryRun: boolean) {
  const now = new Date();
  if (now <= E8_WINDOW_END) {
    throw new Error('E8 window has not yet closed. Both E8 dates must have passed before finalizing.');
  }

  const entriesSnap = await db.collection('entries')
    .where('isEliminated', '==', false)
    .get();

  const batch = db.batch();
  let eliminated = 0;
  const entries: E8EliminationEntry[] = [];

  for (const entryDoc of entriesSnap.docs) {
    const data = entryDoc.data() as Record<string, unknown>;
    const survivorPicks = (data.survivorPicks as Array<Record<string, unknown>> | undefined) ?? [];

    const e8PickCount = survivorPicks.filter(
      (p) => p.round === 'Elite Eight' && p.isProjectionPick !== true
    ).length;

    if (e8PickCount < 2) {
      entries.push({
        id: entryDoc.id,
        displayName: typeof data.displayName === 'string' ? data.displayName : entryDoc.id,
        e8PickCount,
      });

      if (!dryRun) {
        batch.update(entryDoc.ref, {
          isEliminated: true,
          eliminationReason: 'incomplete_e8_picks',
          eliminationDate: '3/29/2026',
        });

        // Write a pickLog entry for the elimination
        const logRef = db.collection('pickLog').doc();
        batch.set(logRef, {
          entryId: entryDoc.id,
          displayName: typeof data.displayName === 'string' ? data.displayName : entryDoc.id,
          action: 'auto_eliminate',
          reason: 'incomplete_e8_picks',
          e8PickCount,
          eliminationDate: '3/29/2026',
          createdAt: new Date().toISOString(),
        });
      }

      eliminated++;
    }
  }

  if (!dryRun) {
    await batch.commit();
  }

  return { eliminated, dryRun, entries };
}

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';

    const result = await finalizeE8Eliminations(dryRun);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
