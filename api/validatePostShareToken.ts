import Cors from "cors";
import { db, admin } from "../firebaseAdmin";
import { NextApiRequest, NextApiResponse } from "next";

// CORS Setup
const cors = Cors({
  methods: ["POST"],
  origin: "*",
});

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Incoming request to validatePostShareToken", req.body);

  try {
    await runMiddleware(req, res, cors);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { postId, token } = req.body;

    if (!postId || !token) {
      console.error("Missing postId or token");
      return res.status(400).json({ valid: false, error: "Missing postId or token" });
    }

    const postRef = db.collection("posts").doc(postId);
    const doc = await postRef.get();

    if (!doc.exists) {
      console.error("Post not found");
      return res.status(404).json({ valid: false, error: "Post not found" });
    }

    const post = doc.data();
    const valid = token === post?.token?.sharedToken;

    console.log("Token validation result:", valid);

    return res.status(200).json({
      valid,
      post: valid ? { id: doc.id, ...post } : null,
    });
  } catch (error: any) {
    console.error("Error in validatePostShareToken:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}

