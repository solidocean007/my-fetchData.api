import { NextApiRequest, NextApiResponse } from "next"; // Cannot find module 'next' or its corresponding type declarations.
import Cors from "cors";
import { admin, db } from "../firebaseAdmin";

// Initialize CORS
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
  console.log("Incoming request to validate collection access", req.body);

  try {
    await runMiddleware(req, res, cors);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { collectionId, userId } = req.body;

    if (!collectionId || !userId) {
      console.error("Missing collectionId or userId");
      return res.status(400).json({ valid: false, error: "Missing collectionId or userId" });
    }

    const collectionRef = db.collection("collections").doc(collectionId);
    const doc = await collectionRef.get();

    if (!doc.exists) {
      console.error("Collection not found");
      return res.status(404).json({ valid: false, error: "Collection not found" });
    }

    const collection = doc.data();
    const isOwnerOrShared = collection?.ownerId === userId || (collection?.sharedWith || []).includes(userId);

    console.log("Collection access validation result:", isOwnerOrShared);
    res.status(200).json({ valid: isOwnerOrShared });

  } catch (error: any) {
    console.error("Error in validateCollectionAccess:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
