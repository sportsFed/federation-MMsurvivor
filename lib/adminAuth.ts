import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'admin_session';
export const SESSION_DURATION = 60 * 60 * 24; // 24 hours in seconds

async function getJwtSecret(): Promise<Uint8Array> {
  const secret = process.env.JWT_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('No JWT secret configured');
  return new TextEncoder().encode(secret);
}

export async function getAdminPassword(): Promise<string | null> {
  try {
    // Dynamically import to avoid loading Firebase Admin in client bundles
    const { db } = await import('./firebase/adminApp');
    const docSnap = await db.collection('config').doc('adminAuth').get();
    if (docSnap.exists && docSnap.data()?.password) {
      return docSnap.data()!.password as string;
    }
  } catch {
    // Firestore unavailable — fall back to env var
  }
  return process.env.ADMIN_PASSWORD ?? null;
}

export async function createSessionToken(): Promise<string> {
  const secret = await getJwtSecret();
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function validateAdminSession(request: NextRequest): Promise<boolean> {
  try {
    const cookie = request.cookies.get(SESSION_COOKIE);
    if (!cookie?.value) return false;
    const secret = await getJwtSecret();
    await jwtVerify(cookie.value, secret);
    return true;
  } catch {
    return false;
  }
}
