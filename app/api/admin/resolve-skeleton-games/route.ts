import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { resolveSkeletonGames } from '@/lib/resolveSkeletonGames';

/**
 * POST /api/admin/resolve-skeleton-games
 *
 * Scans all skeleton R32 game docs, populates homeTeam/homeSeed/awayTeam/awaySeed
 * from upstream R64 Firestore winners, and sets isSkeletonGame: false for each resolved doc.
 *
 * Returns: { resolved: number, skipped: number, errors: string[] }
 */
export async function POST(request: NextRequest) {
  if (!(await validateAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await resolveSkeletonGames();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
