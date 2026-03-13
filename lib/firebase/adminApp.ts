import * as admin from 'firebase-admin';

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // This ensures the private key is handled correctly even if it contains literal \n
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Only initialize if the app hasn't been initialized and we have the required fields
if (!admin.apps.length && firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseAdminConfig),
  });
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth };
