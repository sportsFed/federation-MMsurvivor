import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminApp';

export async function POST(request: Request) {
  try {
    const { email, pin, displayName, uid } = await request.json();

    if (!email || !pin || !displayName || !uid) {
      return NextResponse.json({ error: 'Missing registration data' }, { status: 400 });
    }

    // Save entrant to Firestore with the 4-digit PIN visible for the Admin Portal
    await db.collection('entries').doc(uid).set({
      email,
      displayName,
      pin, 
      isEliminated: false,
      totalPoints: 0,
      isAdmin: email === 'thesportsfederation@gmail.com',
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
