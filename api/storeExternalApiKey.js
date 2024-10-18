const Cors = require('cors');
const { db, admin } = require('../firebaseAdmin'); // Use Firebase Admin correctly

// Initialize CORS middleware
const cors = Cors({
  methods: ['POST'],
  origin: '*', // Adjust origin if needed for security
});

// Helper method to run the middleware
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
    // Run CORS middleware
    await runMiddleware(req, res, cors);

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    console.log('Request Body:', req.body); // Log the incoming request body

    const { externalApiName, externalApiKey } = req.body;

    if (!externalApiName || !externalApiKey) {
      console.error('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const companyDocRef = db.collection('apiKeys').doc('default-company-id'); // Adjust doc ID if needed

    await companyDocRef.update({
      externalApiKeys: admin.firestore.FieldValue.arrayUnion({
        name: externalApiName,
        key: externalApiKey,
      }),
    });

    console.log('External API Key added successfully');
    res.status(200).json({ message: 'External API Key added successfully' });
  } catch (error) {
    console.error('Error adding external API key:', error);
    res.status(500).json({ error: 'Failed to add external API key', details: error.message });
  }
};

