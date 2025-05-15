import { NextApiRequest, NextApiResponse } from "next";
import { admin } from "../firebaseAdmin";

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ Set CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle Preflight OPTIONS Request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Validate HTTP Method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { postId, token } = req.body;
  console.log("Validating post share token:", { postId, token });

  if (!postId || !token) {
    return res.status(400).json({ valid: false, error: "Missing parameters" });
  }

  try {
    const postRef = admin.firestore().collection("posts").doc(postId);
    const doc = await postRef.get();

    if (!doc.exists) {
      console.error("Post not found for ID:", postId);
      return res.status(404).json({ valid: false, error: "Post not found" });
    }

    const post = doc.data();
    const isValid = post?.token?.sharedToken === token;

    res.status(200).json({ valid: isValid, post: isValid ? post : null });
  } catch (error: any) {
    console.error("Error validating post share token:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
