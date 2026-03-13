import * as admin from 'firebase-admin';

// This function forces the string into a valid PEM format
const formatKey = (key: string | undefined) => {
  if (!key) return undefined;
  return key
    .replace(/^['"]|['"]$/g, '') // Remove accidental exterior quotes
    .replace(/\\n/g, '\n');      // Convert literal \n strings into real newlines
};

const adminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: formatKey(process.env.FIREBASE_PRIVATE_KEY),
};

if (!admin.apps.length && adminConfig.projectId && adminConfig.clientEmail && adminConfig.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(adminConfig),
    });
    console.log("Firebase Admin SDK Initialized");
  } catch (error) {
    console.error("Firebase Admin Init Error:", error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
