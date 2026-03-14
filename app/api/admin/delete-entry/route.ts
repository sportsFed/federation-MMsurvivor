import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase/adminApp';

const COMMISSIONER_EMAIL = process.env.COMMISSIONER_EMAIL || 'thesportsfederation@gmail.com';

export async function DELETE(request: Request) {
  try {
    const { uid, idToken } = await request.json();

    if (!uid || !idToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the caller is the commissioner
    const decodedToken = await auth.verifyIdToken(idToken);
    if (decodedToken.email !== COMMISSIONER_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete from Firestore entries collection
    await db.collection('entries').doc(uid).delete();

    // Optionally delete from Firebase Auth
    try {
      await auth.deleteUser(uid);
    } catch {
      // Auth user deletion is best-effort; entry deletion already succeeded
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Deletion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
