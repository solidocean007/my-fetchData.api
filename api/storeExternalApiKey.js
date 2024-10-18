const Cors = require('cors');
const { db, admin } = require('../firebaseAdmin'); // Firebase admin setup

// Initialize CORS middleware
const cors = Cors({
  methods: ['POST'],
  origin: '*', // Adjust origin for security if needed
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

    console.log('Received Body:', req.body); // Log the request body for debugging

    const { companyId, externalApiName, externalApiKey } = req.body;

    // Validate the presence of all required fields
    if (!companyId || !externalApiName || !externalApiKey) {
      console.error('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Reference the document using the provided companyId
    const companyDocRef = db.collection('apiKeys').doc(companyId);

    // Update the document with the new external API key
    await companyDocRef.set(
      {
        externalApiKeys: admin.firestore.FieldValue.arrayUnion({
          name: externalApiName,
          key: externalApiKey,
        }),
      },
      { merge: true } // Merge new data with existing document
    );

    console.log('External API Key added successfully');
    res.status(200).json({ message: 'External API Key added successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to add external API key', details: error.message });
  }
};
