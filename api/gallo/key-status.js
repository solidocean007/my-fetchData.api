const { cors, runMiddleware } = require("../_lib/cors");
const { db } = require("../_lib/firebaseAdmin");
const { requireAuth, getUserWithCompany } = require("../_lib/auth");

module.exports = async (req, res) => {
  try {
    await runMiddleware(req, res, cors);
    if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

    const auth = await requireAuth(req);
    const user = await getUserWithCompany(auth.uid);

    const snap = await db.collection("apiKeys").doc(user.companyId).get();
    const curr = (snap.exists && snap.get("externalApiKeys")) || [];

    const find = (env) => curr.find((k) => k.name === "galloApiKey" && k.env === env);
    const dev = find("dev");
    const prod = find("prod");

    return res.status(200).json({
      prod: prod ? { exists: true, lastFour: prod.lastFour, updatedAt: prod.updatedAt } : { exists: false },
      dev:  dev  ? { exists: true, lastFour: dev.lastFour,  updatedAt: dev.updatedAt  } : { exists: false },
    });
  } catch (e) {
    return res.status(e.code || 500).json({ error: e.message || "Server error" });
  }
};
