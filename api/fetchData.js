// api/fetchData.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    // Hardcode the API endpoint to test the function
    const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
    const data = await response.json();

    // Return the fetched data as the response
    res.status(200).json(data);
  } catch (error) {
    // Handle any errors
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}

