// // api/fetchData.js
// import fetch from 'node-fetch';
import Cors from 'cors';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow all HTTP methods
});


// Helper method to wait for the middleware to complete
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

// Use dynamic import for node-fetch since it's an ES module
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export default async function handler(req, res) {
  console.log('Received request body:', req.body); // Log the request body
  // Run the middleware to enable CORS
  await runMiddleware(req, res, cors);

  try {
    // Get the request options from the body of the POST request
    const { baseUrl, method = 'GET', headers = {}, body } = req.body;

    // Check for a valid URL
    if (!baseUrl || typeof baseUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing baseUrl' });
    }
   
    // Fetch data using the options provided in the request
    const response = await fetch(baseUrl, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(body) : undefined, // Only include body for non-GET requests
    });

    const data = await response.json();

    // Send the fetched data back as the response
    res.status(200).json(data);
  } catch (error) {
    // Log and return the error response
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
