import { admin } from "../firebaseAdmin";

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
      const { postId, token } = JSON.parse(body);
      if (!postId || !token) return res.status(400).json({ valid: false, error: "Missing parameters" });

      const postRef = admin.firestore().collection("posts").doc(postId);
      const doc = await postRef.get();
      if (!doc.exists) return res.status(404).json({ valid: false, error: "Post not found" });

      const post = doc.data();
      const now = Date.now();
      const matchingToken = (post.tokens || []).find(t => t.token === token && t.expiry.toMillis() > now);

      const isValid = Boolean(matchingToken);

      return res.status(200).json({ valid: isValid, post: isValid ? post : null });

    } catch (error) {
      console.error("Error validating post share token:", error);
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });
}
