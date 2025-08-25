// api/_lib/auth.js
const { admin, db } = require("./firebaseAdmin");

async function requireAuth(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw { code: 401, message: "Missing Authorization Bearer token" };
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded; // { uid, ... }
  } catch {
    throw { code: 401, message: "Invalid auth token" };
  }
}

async function getUserWithCompany(uid) {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) throw { code: 400, message: "User not found" };
  const user = snap.data();
  if (!user.companyId) throw { code: 400, message: "User has no companyId" };
  return user; // expect { companyId, role, ... }
}

function assertCompanyAdmin(user) {
  const role = (user.role || "").toString().toLowerCase();
  if (!["admin", "super-admin", "owner"].includes(role)) {
    throw { code: 403, message: "Admin role required" };
  }
}

module.exports = { requireAuth, getUserWithCompany, assertCompanyAdmin };
