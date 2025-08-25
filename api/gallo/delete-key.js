const { cors, runMiddleware } = require("../_lib/cors");
const { db } = require("../_lib/firebaseAdmin");
const { requireAuth, getUserWithCompany, assertCompanyAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  try {
    await runMiddleware(req, res, cors);
    if (req.method !== "POST" && req.method !== "DELETE")
      return res.status(405).json({ error: "Method Not Allowed" });

    const auth = await requireAuth(req);
    const user = await getUserWithCompany(auth.uid);
    assertCompanyAdmin(user);

    const { env } = req.body || {};
    if (!["prod", "dev"].includes(env)) return res.status(400).json({ error: "env must be 'prod' or 'dev'" });

    const ref = db.collection("apiKeys").doc(user.companyId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(200).json({ ok: true });

    const curr = snap.get("externalApiKeys") || [];
    const next = curr.filter((k) => !(k.name === "galloApiKey" && k.env === env));
    await ref.set({ externalApiKeys: next }, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(e.code || 500).json({ error: e.message || "Server error" });
  }
};
