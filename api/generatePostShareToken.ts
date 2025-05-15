import { NextApiRequest, NextApiResponse } from "next";
import applyCors from "../utils/cors";
import { v4 as uuidv4 } from "uuid";
import { admin, db } from "../firebaseAdmin";

// Ensure Firebase is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Incoming request to generate post share token", req.body);

  // ✅ Apply shared CORS handling
  await applyCors(req, res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { postId } = req.body;

  if (!postId) {
    console.error("Missing postId");
    return res.status(400).json({ error: "Missing postId" });
  }

  try {
    const postRef = db.collection("posts").doc(postId);
    const newToken = uuidv4();
    const newExpiry = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    await postRef.update({
      "token.sharedToken": newToken,
      "token.tokenExpiry": newExpiry,
    });

    console.log("Generated new token:", newToken);
    res.status(200).json({ token: newToken });
  } catch (error: any) {
    console.error("Error generating post share token:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
