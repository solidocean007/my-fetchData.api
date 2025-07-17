const Cors = require('cors');
const { admin } = require('../firebaseAdmin'); // Firebase admin setup

// Initialize CORS middleware
const cors = Cors({
  methods: ['POST'],
  origin: '*', // For testing; tighten this later in production
});

// Helper method to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

module.exports = async (req, res) => {
  try {
    await runMiddleware(req, res, cors);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'A valid email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
      return res.status(200).json({ exists: true, uid: userRecord.uid });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(200).json({ exists: false });
      }
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } catch (error) {
    console.error('Error in checkUserExists:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
};
