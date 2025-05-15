import applyCors from "../utils/cors";
import { NextApiRequest, NextApiResponse } from "next";
import { admin } from "../firebaseAdmin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await applyCors(req, res);  // ✅ Apply your CORS helper

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { postId, token } = req.body;
  console.log("Validating post share token:", { postId, token });

  if (!postId || !token) {
    return res.status(400).json({ valid: false, error: "Missing parameters" });
  }

  const postRef = admin.firestore().collection("posts").doc(postId);
  const doc = await postRef.get();

  if (!doc.exists) {
    return res.status(404).json({ valid: false, error: "Post not found" });
  }

  const post = doc.data();
  const isValid = post?.token?.sharedToken === token;

  res.status(200).json({ valid: isValid, post: isValid ? post : null });
}
