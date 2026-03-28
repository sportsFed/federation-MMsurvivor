import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import type { QuerySnapshot } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase/adminApp';
import { validateAdminSession } from '@/lib/adminAuth';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;

interface FirestoreErrorLike {
  code?: number;
  message?: string;
}

interface Entry {
  id: string;
  displayName?: string;
  [key: string]: unknown;
}

function classifyError(err: unknown): { type: string; message: string; retryable: boolean } {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as FirestoreErrorLike)?.code ?? '';

  if (
    message.includes('requires an index') ||
    message.includes('composite index') ||
    message.includes('FAILED_PRECONDITION') ||
    code === 9
  ) {
    return { type: 'MISSING_INDEX', message: 'Firestore composite index missing. Visit the Firebase Console to create the required index.', retryable: false };
  }
  if (message.includes('PERMISSION_DENIED') || code === 7) {
    return { type: 'PERMISSION_DENIED', message: 'Service account lacks Firestore read permissions for the entries collection.', retryable: false };
  }
  if (message.includes('UNAUTHENTICATED') || code === 16) {
    return { type: 'UNAUTHENTICATED', message: 'Firebase Admin SDK credentials are invalid or not initialized.', retryable: false };
  }
  if (message.includes('UNAVAILABLE') || message.includes('DEADLINE_EXCEEDED') || code === 14 || code === 4) {
    return { type: 'TRANSIENT', message: 'Firestore temporarily unavailable. Retry in a moment.', retryable: true };
  }
  return { type: 'UNKNOWN', message, retryable: false };
}

async function fetchWithRetry(
  queryFn: () => Promise<QuerySnapshot>,
  attempt = 1
): Promise<QuerySnapshot> {
  try {
    return await queryFn();
  } catch (err) {
    const classified = classifyError(err);
    if (classified.retryable && attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[entries] Transient error on attempt ${attempt}, retrying in ${delay}ms:`, classified.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(queryFn, attempt + 1);
    }
    throw err;
  }
}

export async function GET(request: NextRequest) {
  if (!(await validateAdminSession(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Step 1: simple query first (no orderBy) — avoids composite index requirement
  let snapshot: QuerySnapshot;
  try {
    console.log('[entries] Fetching entries (simple query)');
    snapshot = await fetchWithRetry(() => db.collection('entries').get());
    console.log(`[entries] Fetched ${snapshot.size} entries`);
  } catch (simpleErr: unknown) {
    const classified = classifyError(simpleErr);
    console.error('[entries] Simple query failed:', classified.type, classified.message, simpleErr);
    return NextResponse.json(
      {
        error: classified.message,
        errorType: classified.type,
        diagnostic: 'Simple Firestore query (no orderBy) failed. Check Firebase Admin SDK initialization and IAM permissions.',
      },
      { status: 500 }
    );
  }

  // Step 2: sort client-side; if Firestore orderBy is available use it, but don't fail over it
  let entries: Entry[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  try {
    console.log('[entries] Attempting ordered query');
    const orderedSnapshot = await fetchWithRetry(() =>
      db.collection('entries').orderBy('displayName', 'asc').get()
    );
    entries = orderedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('[entries] Ordered query succeeded');
  } catch (orderErr: unknown) {
    const classified = classifyError(orderErr);
    console.warn('[entries] Ordered query failed, falling back to client-side sort:', classified.type, classified.message);
    // Fall back to client-side sort by displayName
    entries.sort((a, b) => {
      const nameA = (a.displayName ?? '').toLowerCase();
      const nameB = (b.displayName ?? '').toLowerCase();
      return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
    });
  }

  return NextResponse.json({ entries });
}
