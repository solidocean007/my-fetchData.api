import { v4 as uuidv4 } from "uuid";
import { admin, db } from "../firebaseAdmin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", async () => {
    try {
      const { postId } = JSON.parse(body);
      if (!postId) return res.status(400).json({ error: "Missing postId" });

      const postRef = db.collection("posts").doc(postId);
      const doc = await postRef.get();
      if (!doc.exists) return res.status(404).json({ error: "Post not found" });

      const post = doc.data();
      const now = Date.now();

      const validTokens = (post.tokens || []).filter(t => t.expiry.toMillis() > now);

      // Optionally reuse the latest valid token
      if (validTokens.length > 0) {
        const latestValid = validTokens[validTokens.length - 1];
        console.log("Reusing valid token:", latestValid.token);
        return res.status(200).json({ token: latestValid.token });
      }

      // Generate new token if none are valid
      const newToken = uuidv4();
      const newExpiry = admin.firestore.Timestamp.fromDate(new Date(now + 7 * 24 * 60 * 60 * 1000));

      const updatedTokens = [...validTokens, { token: newToken, expiry: newExpiry }];
      await postRef.update({ tokens: updatedTokens });

      console.log("Generated new token:", newToken);
      return res.status(200).json({ token: newToken });

    } catch (error) {
      console.error("Error generating post share token:", error);
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });
}
