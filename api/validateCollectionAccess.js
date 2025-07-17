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
      const { collectionId, userId } = JSON.parse(body);

      if (!collectionId || !userId) {
        return res.status(400).json({ valid: false, error: "Missing collectionId or userId" });
      }

      const collectionRef = admin.firestore().collection("collections").doc(collectionId);
      const docSnap = await collectionRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ valid: false, error: "Collection not found" });
      }

      const collection = docSnap.data();
      const collectionOwnerId = collection.ownerId;

      // Fetch the owner's user document to compare companyId
      const ownerRef = admin.firestore().collection("users").doc(collectionOwnerId);
      const ownerSnap = await ownerRef.get();

      if (!ownerSnap.exists) {
        return res.status(404).json({ valid: false, error: "Collection owner not found" });
      }

      const ownerData = ownerSnap.data();
      const ownerCompanyId = ownerData?.companyId;

      // Fetch the requesting user's document
      const userRef = admin.firestore().collection("users").doc(userId);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        return res.status(404).json({ valid: false, error: "User not found" });
      }

      const userData = userSnap.data();
      const userCompanyId = userData?.companyId;

      // ✅ Rule 1: Allow if in the same company
      if (ownerCompanyId && userCompanyId && ownerCompanyId === userCompanyId) {
        return res.status(200).json({ valid: true });
      }

      // ✅ Rule 2: Allow if shareable outside company and user is signed in
      if (collection.isShareableOutsideCompany) {
        return res.status(200).json({ valid: true });
      }

      // ❌ Otherwise, deny access
      return res.status(403).json({ valid: false, error: "Access denied. Not authorized." });

    } catch (error) {
      console.error("Error validating collection access:", error);
      return res.status(500).json({ valid: false, error: "Internal server error", details: error.message });
    }
  });
}
