import * as admin from 'firebase-admin';

const formatPrivateKey = (key: string | undefined) => {
  if (!key) return undefined;
  
  // 1. Remove any surrounding quotes that might have been pasted in
  let formattedKey = key.replace(/^['"]|['"]$/g, '');
  
  // 2. Replace escaped \n strings with actual newline characters
  formattedKey = formattedKey.replace(/\\n/g, '\n');
  
  // 3. Ensure the header and footer are on their own lines
  if (!formattedKey.includes('\n')) {
     formattedKey = formattedKey
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }

  return formattedKey;
};

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
};

if (!admin.apps.length && firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseAdminConfig),
    });
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
