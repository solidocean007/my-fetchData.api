// firebaseAdmin.js
const admin = require('firebase-admin');

// Log all environment variables (for debugging purposes)
console.error('Available ENV Variables:', process.env);

// Check if FIREBASE_SERVICE_ACCOUNT is available
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccount) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not set.');
  throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing.');
}

let parsedServiceAccount;
try {
  parsedServiceAccount = JSON.parse(serviceAccount);
} catch (error) {
  console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', error);
  throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT format.');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(parsedServiceAccount),
    databaseURL: 'https://retail-sight.firebaseio.com',
  });
}

const db = admin.firestore();

module.exports = { db, admin };

