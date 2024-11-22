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

    // Validate `baseUrl`
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

    // Handle different content types
    const contentType = response.headers.get('content-type');
    let responseData;

    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else if (contentType?.includes('text')) {
      responseData = await response.text();
    } else if (response.status === 204 || !contentType) {
      // Handle empty responses or no content
      responseData = null;
    } else {
      // Fallback for binary or unknown response types
      responseData = await response.buffer();
    }

    // Check for upstream errors
    if (!response.ok) {
      console.error(`Upstream error: ${response.status} - ${response.statusText}`);
      return res.status(response.status).json({
        error: 'Upstream API error',
        details: responseData || response.statusText,
      });
    }

    // Send the fetched data back as the response
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in fetchData handler:', error);

    // Provide more context for the error
    res.status(500).json({
      error: 'Failed to fetch data',
      details: error.message || 'Unknown error',
    });
  }
}


