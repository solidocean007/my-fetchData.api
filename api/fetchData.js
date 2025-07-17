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
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
    });

    console.log("Raw response status:", response.status);
    console.log("Raw response headers:", Array.from(response.headers.entries()));

    const contentLength = response.headers.get("content-length");
    let responseData;

    if (!contentLength || parseInt(contentLength) === 0) {
      // Handle empty response body
      console.log("Empty response body from backend");
      responseData = null; // No content to parse
    } else if (response.headers.get("content-type")?.includes("application/json")) {
      // Parse JSON response if available
      try {
        responseData = await response.json();
      } catch (error) {
        console.error("Failed to parse JSON response:", error);
        return res.status(500).json({
          error: "Invalid JSON response from upstream API",
          details: error.message,
        });
      }
    } else {
      // Handle unexpected content types
      console.warn("Unexpected content type:", response.headers.get("content-type"));
      responseData = await response.text(); // Fallback to text
    }

    if (!response.ok) {
      console.error(
        `Upstream error: ${response.status} - ${response.statusText}`
      );
      return res.status(response.status).json({
        error: "Upstream API error",
        details: responseData || response.statusText,
      });
    }

    // Send the successful response back to the client
    return res.status(response.status).json(responseData || { message: "Success with no content" });
  } catch (error) {
    console.error("Error in fetchData handler:", error);
    res.status(500).json({
      error: "Failed to fetch data",
      details: error.message || "Unknown error",
    });
  }
}


