import { db } from '@/lib/firebase/adminApp';

/**
 * Deletes all documents in a Firestore collection using batched deletes.
 * Use this before bulk imports to ensure idempotent operations.
 */
export async function clearCollection(collectionName: string): Promise<void> {
  const snap = await db.collection(collectionName).get();
  const batchSize = 500;
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = db.batch();
    snap.docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}
