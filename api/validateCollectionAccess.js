import { admin, db } from "../firebaseAdmin";

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export default async function handler(req, res) {
  console.log("Incoming request to validate collection access");

  // ✅ Set CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle Preflight OPTIONS Request
  if (req.method === "OPTIONS") {
    return res.writeHead(200).end();
  }

  if (req.method !== "POST") {
    return res.writeHead(405, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", async () => {
    try {
      const { collectionId, userId } = JSON.parse(body);

      if (!collectionId || !userId) {
        console.error("Missing collectionId or userId");
        return res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ valid: false, error: "Missing collectionId or userId" }));
      }

      const collectionRef = db.collection("collections").doc(collectionId);
      const docSnap = await collectionRef.get();

      if (!docSnap.exists) {
        console.error("Collection not found");
        return res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ valid: false, error: "Collection not found" }));
      }

      const collection = docSnap.data();
      const isOwnerOrShared =
        collection?.ownerId === userId ||
        (collection?.sharedWith || []).includes(userId);

      console.log("Collection access validation result:", isOwnerOrShared);
      return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ valid: isOwnerOrShared }));
    } catch (error) {
      console.error("Error in validateCollectionAccess:", error);
      return res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Internal server error", details: error.message }));
    }
  });
}
