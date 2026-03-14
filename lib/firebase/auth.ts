import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './clientApp';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export async function registerUser(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    await setDoc(doc(db, 'players', user.uid), {
      id: user.uid,
      email,
      displayName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      totalScore: 0,
      isActive: true,
      createdAt: serverTimestamp(),
    });

    return { success: true, user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return { success: false, error: message };
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: credential.user };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return { success: false, error: message };
  }
}

export async function logoutUser(): Promise<AuthResult> {
  try {
    await signOut(auth);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Logout failed';
    return { success: false, error: message };
  }
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
