import { v4 as uuidv4 } from "uuid";
import { admin, db } from "../firebaseAdmin";

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

export default async function handler(req, res) {
  console.log("Incoming request to generate collection share token");

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
      const { collectionId } = JSON.parse(body);

      if (!collectionId) {
        console.error("Missing collectionId");
        return res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Missing collectionId" }));
      }

      const collectionRef = db.collection("collections").doc(collectionId);
      const newToken = uuidv4();
      const newExpiry = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      await collectionRef.update({
        shareToken: newToken,
        tokenExpiry: newExpiry,
      });

      console.log("Generated new collection share token:", newToken);
      return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ token: newToken }));

    } catch (error) {
      console.error("Error generating collection share token:", error);
      return res.writeHead(500, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Internal server error", details: error.message }));
    }
  });
}

