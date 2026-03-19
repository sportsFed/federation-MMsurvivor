import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';
import { deriveDayFromGameTime } from '@/lib/bracket/framework';

export async function POST(request: NextRequest) {
  try {
    if (!(await validateAdminSession(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { gameId, gameTime } = await request.json();
    if (!gameId || !gameTime) {
      return NextResponse.json({ error: 'Missing gameId or gameTime' }, { status: 400 });
    }
    const day = deriveDayFromGameTime(gameTime);
    await db.collection('games').doc(gameId).update({ gameTime, day });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
