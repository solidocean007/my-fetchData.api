import Cors from "cors";

// Initialize the CORS middleware
const cors = Cors({
  methods: ["GET", "POST", "PUT", "DELETE"], // Allow all HTTP methods
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
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  console.log("Received request body:", req.body); // Log the incoming request body

  // Run the middleware to enable CORS
  try {
    await runMiddleware(req, res, cors);
  } catch (corsError) {
    console.error("CORS error:", corsError);
    return res.status(500).json({ error: "CORS middleware failed" });
  }

  try {
    // Get the request options from the body of the POST request
    const { baseUrl, method = "GET", headers = {}, body } = req.body;

    // Validate `baseUrl`
    if (!baseUrl || typeof baseUrl !== "string") {
      return res.status(400).json({ error: "Invalid or missing baseUrl" });
    }

    // Log the details of the forwarding request
    console.log(`Forwarding request to: ${baseUrl}`);
    console.log(`Method: ${method}, Headers:`, headers);

    // Forward the request to the specified baseUrl
    const response = await fetch(baseUrl, {
      method,
      headers,
      body: method !== "GET" ? JSON.stringify(body) : undefined,
    });

    // Log the raw response details
    console.log("Raw response status:", response.status);
    console.log(
      "Raw response headers:",
      Array.from(response.headers.entries())
    );

    // Log and forward the raw response as is
    const contentType = response.headers.get("content-type");
    const responseData =
      contentType?.includes("application/json")
        ? await response.json()
        : contentType?.includes("text")
        ? await response.text()
        : await response.arrayBuffer();

    console.log("Forwarded response body:", responseData);

    // Send the forwarded response back to the client
    res.status(response.status).json(responseData);
  } catch (error) {
    console.error("Error in fetchData handler:", error);
    res.status(500).json({
      error: "Failed to fetch data",
      details: error.message || "Unknown error",
    });
  }
}

