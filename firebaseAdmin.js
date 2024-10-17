// firebaseAdmin.js
console.log('Service Account:', process.env.FIREBASE_SERVICE_ACCOUNT);
const admin = require('firebase-admin');

// Ensure the admin SDK is initialized only once
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://retail-sight.firebaseio.com',
  });
}

// Export the Firestore instance and any other services you need
const db = admin.firestore();
const auth = admin.auth(); // Example if you need Firebase Auth later

module.exports = { db, admin };
