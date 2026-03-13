import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/adminApp'; // Ensure you use Admin SDK for server-side
import { auth } from '@/lib/firebase/adminApp';

export async function POST(request: Request) {
  try {
    const { email, pin, displayName, uid } = await request.json();

    // 1. Verify basic data exists
    if (!email || !pin || !displayName) {
      return NextResponse.json({ error: 'Missing registration data' }, { status: 400 });
    }

    // 2. Save the entrant to Firestore
    // We store the 'pin' as a plain string so you can see it in your Admin Portal
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
    console.error('Registration Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
