// api/fetchData.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching data:", error);  // Log the error
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}

