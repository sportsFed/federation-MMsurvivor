import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { getAuth } from 'firebase-admin/auth';

/**
 * POST /api/picks/submit
 *
 * Validates and commits a survivor pick server-side.
 * Requires a valid Firebase ID token in the Authorization header.
 *
 * Body:
 *   - team: string          – team name being picked
 *   - gameId: string        – Firestore game document ID
 *   - round: string         – round name (e.g. "Round of 32")
 *   - region: string | null – region name or null
 *   - dateKey: string       – Eastern date key (e.g. "__sat__")
 *   - isProjectionPick: boolean
 *   - frameworkGameId?: string – for projection picks
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate via Firebase ID token
    const authHeader = request.headers.get('authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json() as {
      team: string;
      gameId: string;
      round: string;
      region: string | null;
      dateKey: string;
      isProjectionPick: boolean;
      frameworkGameId?: string;
    };

    const { team, gameId, round, region, dateKey, isProjectionPick, frameworkGameId } = body;

    if (!team || !gameId || !round || !dateKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Read the entry with the Admin SDK (bypasses client security rules)
    const entryRef = db.collection('entries').doc(uid);
    const entrySnap = await entryRef.get();

    if (!entrySnap.exists) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const entry = entrySnap.data() as any;

    if (entry.isEliminated) {
      return NextResponse.json({ error: 'Your entry has been eliminated' }, { status: 409 });
    }

    const existingPicks: any[] = entry.survivorPicks ?? [];

    // 3. Duplicate team check — team must not appear in ANY existing pick
    const effectiveGameId = isProjectionPick ? (frameworkGameId ?? gameId) : gameId;
    const duplicatePick = existingPicks.find(
      (p: any) =>
        p.team === team &&
        // Not a duplicate when same dateKey and same pick type (updating own pick),
        // or when confirming a projection pick with a real confirmed pick
        !(p.dateKey === dateKey && (p.isProjectionPick || !isProjectionPick))
    );

    if (duplicatePick) {
      return NextResponse.json(
        { error: `You have already used ${team} in a previous pick. Each team can only be picked once.` },
        { status: 409 }
      );
    }

    // 4. Build the updated picks array
    const newPickEntry: any = {
      team,
      round,
      region,
      gameId: effectiveGameId,
      dateKey,
      isProjectionPick: isProjectionPick ?? false,
      pickedAt: new Date().toISOString(),
    };

    let updatedPicks: any[];
    let action: string;
    let previousTeam: string | null = null;

    if (isProjectionPick) {
      // Projection pick: replace any existing projection pick for the same dateKey
      const hasPickForThisDate = existingPicks.some(
        (p: any) => p.dateKey === dateKey && p.isProjectionPick
      );
      if (hasPickForThisDate) {
        previousTeam = existingPicks.find(
          (p: any) => p.dateKey === dateKey && p.isProjectionPick
        )?.team ?? null;
        updatedPicks = existingPicks.map((p: any) =>
          p.dateKey === dateKey && p.isProjectionPick ? newPickEntry : p
        );
        action = 'changed';
      } else {
        updatedPicks = [...existingPicks, newPickEntry];
        action = 'submitted';
      }
    } else {
      // Standard (confirmed) pick: replace any existing pick for the same dateKey,
      // including a projection pick that is being upgraded to a confirmed pick
      const existingConfirmedForDate = existingPicks.find(
        (p: any) => p.dateKey === dateKey && !p.isProjectionPick
      );
      const existingProjectionForDate = existingPicks.find(
        (p: any) => p.dateKey === dateKey && p.isProjectionPick
      );
      if (existingConfirmedForDate) {
        previousTeam = existingConfirmedForDate.team ?? null;
        updatedPicks = existingPicks.map((p: any) =>
          p.dateKey === dateKey && !p.isProjectionPick ? newPickEntry : p
        );
        action = 'changed';
      } else if (existingProjectionForDate) {
        // Replace the projection pick in-place with the confirmed pick
        previousTeam = existingProjectionForDate.team ?? null;
        updatedPicks = existingPicks.map((p: any) =>
          p.dateKey === dateKey && p.isProjectionPick ? newPickEntry : p
        );
        action = 'changed';
      } else {
        updatedPicks = [...existingPicks, newPickEntry];
        action = 'submitted';
      }
    }

    // 5. Atomic write
    const batch = db.batch();
    batch.update(entryRef, {
      survivorPicks: updatedPicks,
      currentPick: team,
    });

    // 6. Audit log
    const logRef = db.collection('pickLog').doc();
    batch.set(logRef, {
      userId: uid,
      displayName: entry.displayName ?? '',
      team,
      round,
      region,
      gameId: effectiveGameId,
      dateKey,
      action,
      previousTeam,
      isProjectionPick: isProjectionPick ?? false,
      timestamp: new Date().toISOString(),
    });

    await batch.commit();

    return NextResponse.json({ success: true, action });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}