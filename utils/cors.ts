import Cors from "cors";
import { NextApiRequest, NextApiResponse } from "next";

// Setup CORS with desired methods and origin
const cors = Cors({
  methods: ["POST", "GET", "OPTIONS"],
  origin: "*",  // ✅ Allow all origins (you can restrict this later)
});

// Helper to run middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function applyCors(req: NextApiRequest, res: NextApiResponse) {
  // ✅ Manually set the Access-Control-Allow-Origin header for preflight and regular requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  await runMiddleware(req, res, cors);
}
