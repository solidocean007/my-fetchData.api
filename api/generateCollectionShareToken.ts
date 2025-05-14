import { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { admin, db } from "../firebaseAdmin";

// Initialize CORS middleware
const cors = Cors({
  methods: ["POST"],
  origin: "*",  // Adjust for production
});

// Middleware runner
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

if (!admin.apps.length) {
  admin.initializeApp();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Incoming request to generate collection share token", req.body);

  try {
    await runMiddleware(req, res, cors);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { collectionId } = req.body;

    if (!collectionId) {
      console.error("Missing collectionId");
      return res.status(400).json({ error: "Missing collectionId" });
    }

    const collectionRef = db.collection("collections").doc(collectionId);
    const newToken = uuidv4();
    const newExpiry = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    await collectionRef.update({
      "shareToken": newToken,
      "tokenExpiry": newExpiry,
    });

    console.log("Generated new collection share token:", newToken);
    res.status(200).json({ token: newToken });

  } catch (error: any) {
    console.error("Error generating collection share token:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

