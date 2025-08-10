// api/submitSignupRequest.js
const Cors = require('cors');
const { admin } = require('../firebaseAdmin'); // Firebase Admin init

// ---- CORS ----
const cors = Cors({
  methods: ['POST'],
  origin: '*', // TODO: tighten in production (e.g., https://displaygram.com)
});

// Helper to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) =>
      result instanceof Error ? reject(result) : resolve(result)
    );
  });
}

// Basic validators
const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').toLowerCase());
const isCompanyType = (v) => v === 'distributor' || v === 'supplier';

module.exports = async (req, res) => {
  try {
    await runMiddleware(req, res, cors);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const {
      firstName,
      lastName,
      email,
      companyName,
      phone,
      notes,
    } = req.body || {};

    // ---- Validate input ----
    if (
      !isNonEmpty(firstName) ||
      !isNonEmpty(lastName) ||
      !isEmail(email) ||
      !isNonEmpty(companyName) ||
      !isCompanyType(requestedCompanyType)
    ) {
      return res
        .status(400)
        .json({ code: 'BAD_INPUT', error: 'Missing or invalid fields.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCompany = String(companyName).trim();

    const db = admin.firestore();

    // ---- De-dupe: Auth user already exists? ----
    try {
      const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      if (userRecord && userRecord.uid) {
        return res.status(200).json({ code: 'ALREADY_USER', uid: userRecord.uid });
      }
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        console.error('auth lookup error', e);
        return res.status(500).json({ code: 'AUTH_LOOKUP_ERROR' });
      }
    }

    // ---- De-dupe: already pending? ----
    const pendingSnap = await db
      .collection('pendingUsers')
      .where('email', '==', normalizedEmail)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!pendingSnap.empty) {
      const existing = pendingSnap.docs[0];
      return res
        .status(200)
        .json({ code: 'ALREADY_PENDING', requestId: existing.id });
    }

    // ---- Create pending request ----
    const now = admin.firestore.FieldValue.serverTimestamp();
    const userAgent = req.headers['user-agent'] || null;
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.connection?.remoteAddress ||
      null;

    const payload = {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: normalizedEmail,
      companyName: normalizedCompany,
      phone: isNonEmpty(phone) ? String(phone).trim() : null,
      notes: isNonEmpty(notes) ? String(notes).trim() : null,
      status: 'pending',
      source: 'signup-request',
      createdAt: now,
      lastUpdated: now,
      meta: { ip, userAgent },
    };

    const docRef = await db.collection('pendingUsers').add(payload);

    // ---- Fetch company admins by companyId ----
let adminEmails = [];
const companySnap = await db
  .collection('companies')
  .where('companyName', '==', normalizedCompany)
  .limit(1)
  .get();

if (!companySnap.empty) {
  const companyDoc = companySnap.docs[0];
  const companyId = companyDoc.id;

  // Get all users in this company who are admins
  const adminsSnap = await db
    .collection('users')
    .where('companyId', '==', companyId)
    .where('role', '==', 'admin')
    .get();

  adminEmails = adminsSnap.docs
    .map((doc) => doc.data().email)
    .filter(isEmail);
}

// ---- Default to support email if no admins found ----
if (!adminEmails.length) {
  adminEmails = ['support@displaygram.com'];
}

// ---- Send email via Trigger Email ----
await db.collection('mail').add({
  message: {
    subject: 'New Signup Request',
    text: `${firstName} ${lastName} requested access to ${companyName}. Go to your dashboard to review pending users.`,
    html: `<p><strong>${firstName} ${lastName}</strong> requested access to <strong>${companyName}</strong>.<br/>Go to your users panel in the dashboard to review pending users.</p>`,
    to: adminEmails,
  },
});


    return res.status(200).json({ code: 'OK', requestId: docRef.id });
  } catch (error) {
    console.error('Error in submitSignupRequest:', error);
    return res
      .status(500)
      .json({ code: 'SERVER_ERROR', error: 'Failed to process request' });
  }
};

