import admin from 'firebase-admin';

const serviceAccount = require('../path-to-your-service-account-file.json');

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
