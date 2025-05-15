import { admin } from "../firebaseAdmin";

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export default async function handler(req, res) {
  // ✅ Set CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.writeHead(405, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", async () => {
    try {
      const { postId, token } = JSON.parse(body);
      console.log("Validating post share token:", { postId, token });

      if (!postId || !token) {
        return res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ valid: false, error: "Missing parameters" }));
      }

      const postRef = admin.firestore().collection("posts").doc(postId);
      const doc = await postRef.get();

      if (!doc.exists) {
        console.error("Post not found for ID:", postId);
        return res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ valid: false, error: "Post not found" }));
      }

      const post = doc.data();
      const isValid = post?.token?.sharedToken === token;

      return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ valid: isValid, post: isValid ? post : null }));
    } catch (error) {
      console.error("Error validating post share token:", error);
      return res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Internal server error", details: error.message }));
    }
  });
}
