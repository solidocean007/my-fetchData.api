// api/fetchData.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { baseUrl, method = 'GET', headers = {}, queryParams = [], body } = req.body;

    let url = baseUrl;
    if (queryParams.length) {
      const queryString = queryParams.map(({ key, value }) => `${key}=${encodeURIComponent(value)}`).join('&');
      url += `?${queryString}`;
    }

    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
      };

      if (method === 'POST' || method === 'PUT') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
