import Cors from "cors"; // cannot find module
import { NextApiRequest, NextApiResponse } from "next";

// Initialize CORS
const cors = Cors({
  methods: ["POST"],
  origin: "*",  // You can replace "*" with your domain in production
});

// Helper to run middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function applyCors(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors);
}
