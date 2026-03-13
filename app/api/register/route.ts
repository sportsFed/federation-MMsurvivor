import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/clientApp';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { uid, email, displayName } = await request.json();

    if (!uid) return NextResponse.json({ error: 'No UID provided' }, { status: 400 });

    const userRef = doc(db, 'entries', uid);
    const userSnap = await getDoc(userRef);

    // Only create a new entry if they don't exist yet
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: displayName,
        email: email,
        isEliminated: false,
        totalPoints: 0,
        survivorPicks: [],
        finalFourPicks: { f1: '', f2: '', f3: '', f4: '', champ: '' },
        isAdmin: email === 'thesportsfederation@gmail.com'
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}
