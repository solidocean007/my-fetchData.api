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

      console.log("Incoming validation request:", { postId, token });

      if (!postId || !token) {
        console.error("Missing postId or token in request.");
        return res.status(400).json({ valid: false, error: "Missing parameters" });
      }

      const postRef = admin.firestore().collection("posts").doc(postId);
      const doc = await postRef.get();

      if (!doc.exists) {
        console.error("Post not found for ID:", postId);
        return res.status(404).json({ valid: false, error: "Post not found" });
      }

      const post = doc.data();
      console.log("Fetched post data:", post);

      if (!Array.isArray(post.tokens)) {
        console.error("No tokens array or invalid structure on post.");
        return res.status(500).json({ valid: false, error: "Invalid token structure on post" });
      }

      const now = Date.now();
      const matchingToken = post.tokens.find(t => t.token === token && t.expiry.toMillis() > now);

      if (!matchingToken) {
        console.error("Token not valid or expired.", { postTokens: post.tokens });
        return res.status(400).json({ valid: false, error: "Invalid or expired token" });
      }

      console.log("Token is valid:", matchingToken);
      return res.status(200).json({ valid: true, post });

    } catch (error) {
      console.error("Unhandled error during validation:", error);
      return res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });
}
