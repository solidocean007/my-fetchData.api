const { cors, runMiddleware } = require("../_lib/cors");
const { db } = require("../_lib/firebaseAdmin");
const { requireAuth, getUserWithCompany } = require("../_lib/auth");

// if you have different base URLs per env, put them here:
const BASE = {
  prod: "https://q2zgrnmnvl.execute-api.us-west-2.amazonaws.com",
  dev:  "https://q2zgrnmnvl.execute-api.us-west-2.amazonaws.com", // same for now
};
const PATHS = { programs: "/healy/programs", goals: "/healy/goals", accounts: "/healy/accounts" };

const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

module.exports = async (req, res) => {
  try {
    await runMiddleware(req, res, cors);
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const auth = await requireAuth(req);
    const user = await getUserWithCompany(auth.uid);

    const { endpoint, qs = {}, env = "prod", method = "GET", body } = req.body || {};
    if (!PATHS[endpoint]) return res.status(400).json({ error: "Invalid endpoint" });
    if (!["prod", "dev"].includes(env)) return res.status(400).json({ error: "env must be 'prod' or 'dev'" });

    // read key (server-side only)
    const doc = await db.collection("apiKeys").doc(user.companyId).get();
    const keys = (doc.exists && doc.get("externalApiKeys")) || [];
    const match = keys.find((k) => k.name === "galloApiKey" && k.env === env);
    if (!match || !match.key) return res.status(412).json({ error: `No ${env} key set for galloApiKey` });

    // build request
    const url = `${BASE[env]}${PATHS[endpoint]}${
      Object.keys(qs).length ? `?${new URLSearchParams(qs)}` : ""
    }`;

    const r = await fetch(url, {
      method,
      headers: { "x-api-key": match.key, "content-type": "application/json" },
      body: method !== "GET" ? JSON.stringify(body || {}) : undefined,
    });

    const isJSON = (r.headers.get("content-type") || "").includes("application/json");
    const data = isJSON ? await r.json() : await r.text();

    if (!r.ok) return res.status(r.status).json({ error: "Upstream error", details: data });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(e.code || 500).json({ error: e.message || "Server error" });
  }
};
