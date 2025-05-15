import { NextApiRequest, NextApiResponse } from "next";
import applyCors from "../utils/cors";
import { admin, db } from "../firebaseAdmin";

// Initialize Firebase if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Incoming request to validate collection access", req.body);

  // ✅ Apply shared CORS handling
  await applyCors(req, res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { collectionId, userId } = req.body;

  if (!collectionId || !userId) {
    console.error("Missing collectionId or userId");
    return res.status(400).json({ valid: false, error: "Missing collectionId or userId" });
  }

  try {
    const collectionRef = db.collection("collections").doc(collectionId);
    const docSnap = await collectionRef.get();

    if (!docSnap.exists) {
      console.error("Collection not found");
      return res.status(404).json({ valid: false, error: "Collection not found" });
    }

    const collection = docSnap.data();
    const isOwnerOrShared =
      collection?.ownerId === userId ||
      (collection?.sharedWith || []).includes(userId);

    console.log("Collection access validation result:", isOwnerOrShared);
    res.status(200).json({ valid: isOwnerOrShared });
  } catch (error: any) {
    console.error("Error in validateCollectionAccess:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
