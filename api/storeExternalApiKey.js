import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../utils/firebase';  // Ensure your Firebase config is imported
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

// Define the API function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { companyId, externalApiName, externalApiKey } = req.body;

  if (!companyId || !externalApiName || !externalApiKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Reference to the document in the apiKeys collection
    const companyDocRef = doc(db, 'apiKeys', companyId);

    // Add the external API key to the company document
    await updateDoc(companyDocRef, {
      externalApiKeys: arrayUnion({
        name: externalApiName,
        key: externalApiKey,
      }),
    });

    return res.status(200).json({ message: 'External API Key added successfully' });
  } catch (error) {
    console.error('Error writing external API key:', error);
    return res.status(500).json({ error: 'Failed to add external API key' });
  }
}
