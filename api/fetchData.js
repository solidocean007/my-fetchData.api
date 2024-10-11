// // api/fetchData.js
// import fetch from 'node-fetch';
import Cors from 'cors';

// Initialize the CORS middleware
const cors = Cors({
  methods: ['GET', 'HEAD'], // Allowed methods
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
  await runMiddleware(req, res, cors);

  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching data:", error);  // Log the error
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
