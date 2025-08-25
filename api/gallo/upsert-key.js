const { cors, runMiddleware } = require("../_lib/cors");
const { db, admin } = require("../_lib/firebaseAdmin");
const { requireAuth, getUserWithCompany, assertCompanyAdmin } = require("../_lib/auth");

module.exports = async (req, res) => {
  try {
    await runMiddleware(req, res, cors);
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const auth = await requireAuth(req);
    const user = await getUserWithCompany(auth.uid);
    assertCompanyAdmin(user);

    const { env, key } = req.body || {};
    if (!["prod", "dev"].includes(env)) return res.status(400).json({ error: "env must be 'prod' or 'dev'" });
    if (!key || typeof key !== "string") return res.status(400).json({ error: "Missing key" });

    const docRef = db.collection("apiKeys").doc(user.companyId);
    const snap = await docRef.get();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const lastFour = key.slice(-4);
    const curr = (snap.exists && snap.get("externalApiKeys")) || [];

    // replace or add the entry for (name='galloApiKey', env)
    const next = curr.filter((k) => !(k.name === "galloApiKey" && k.env === env));
    next.push({
      name: "galloApiKey",
      env,
      key,       // (optionally encrypt before storing)
      lastFour,
      updatedAt: now,
      createdAt: snap.exists ? undefined : now,
    });

    await docRef.set({ companyId: user.companyId, externalApiKeys: next }, { merge: true });

    return res.status(200).json({ ok: true, env, lastFour });
  } catch (e) {
    const code = e.code || 500;
    return res.status(code).json({ error: e.message || "Server error" });
  }
};
