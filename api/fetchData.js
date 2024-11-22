// api/fetchData.js
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
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  console.log('Received request body:', req.body); // Log the request body

  // Run the middleware to enable CORS
  try {
    await runMiddleware(req, res, cors);
  } catch (corsError) {
    console.error('CORS error:', corsError);
    return res.status(500).json({ error: 'CORS middleware failed' });
  }

  try {
    // Get the request options from the body of the POST request
    const { baseUrl, method = 'GET', headers = {}, body } = req.body;

    // Validate the request body
    if (!baseUrl || typeof baseUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing baseUrl' });
    }

    console.log(`Forwarding request to: ${baseUrl}`);
    console.log(`Method: ${method}, Headers:`, headers);

    // Fetch data using the options provided in the request
    const response = await fetch(baseUrl, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get('content-type');
    let responseData;

    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else if (contentType?.includes('text')) {
      responseData = await response.text();
    } else {
      responseData = await response.buffer(); // Handle binary data if necessary
    }

    if (!response.ok) {
      console.error(
        `Error from upstream API: ${response.status} - ${response.statusText}`
      );
      console.error('Response body:', responseData);
      return res
        .status(response.status)
        .json({ error: 'Upstream API error', details: responseData });
    }

    // Send the fetched data back as the response
    res.status(200).json(responseData);
  } catch (error) {
    // Enhanced error logging and handling
    console.error('Error in fetchData handler:', error);

    const isFetchError = error.name === 'FetchError';
    const statusCode = isFetchError ? 502 : 500;
    const errorMessage = isFetchError
      ? 'Failed to fetch from upstream API'
      : 'Internal Server Error';

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message || 'Unknown error',
    });
  }
}

