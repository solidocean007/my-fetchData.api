const { db } = require('../../utils/firebase'); // Ensure Firebase is properly configured
const { doc, updateDoc, arrayUnion } = require('firebase/firestore');
const Cors = require('cors');

// Initialize the CORS middleware
const cors = Cors({
  methods: ['POST'], // Allow POST method
  origin: '*', // Allow requests from any origin (adjust if needed for security)
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
  // Run CORS middleware
  await runMiddleware(req, res, cors);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { companyId, externalApiName, externalApiKey } = req.body;

  if (!companyId || !externalApiName || !externalApiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Reference to the document in the 'apiKeys' collection
    const companyDocRef = doc(db, 'apiKeys', companyId);

    // Add the external API key to the company's document using arrayUnion
    await updateDoc(companyDocRef, {
      externalApiKeys: arrayUnion({
        name: externalApiName,
        key: externalApiKey,
      }),
    });

    return res.status(200).json({ message: 'External API Key added successfully' });
  } catch (error) {
    console.error('Error adding external API key:', error);
    return res.status(500).json({ error: 'Failed to add external API key' });
  }
};
