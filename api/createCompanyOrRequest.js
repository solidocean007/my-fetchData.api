// api/createCompanyOrRequest.js
const Cors = require("cors");
const { admin, db } = require("../firebaseAdmin"); // your Admin SDK init

const cors = Cors({ methods: ["POST"], origin: "*" });

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) =>
      result instanceof Error ? reject(result) : resolve(result)
    );
  });
}

module.exports = async (req, res) => {
  try {
    await runMiddleware(req, res, cors);
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method Not Allowed" });

    const {
      uid,
      firstName,
      lastName,
      workEmail,
      companyName,
      userTypeHint,
      phone,
      notes,
    } = req.body || {};

    // Basic validation
    if (!workEmail || !companyName || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const email = String(workEmail).trim().toLowerCase();
    let finalUid = uid;

    // Ensure a Firebase Auth user exists (optional if client already created it)
    if (!finalUid) {
      try {
        const user = await admin.auth().getUserByEmail(email);
        finalUid = user.uid;
      } catch (e) {
        if (e.code === "auth/user-not-found") {
          const user = await admin
            .auth()
            .createUser({ email, emailVerified: false, disabled: false });
          finalUid = user.uid;
        } else {
          throw e;
        }
      }
    }

    // Try to find existing company by normalized name
    const companyNorm = companyName.trim().toLowerCase();
    let companyId = null;

    const q = await db
      .collection("companies")
      .where("normalizedName", "==", companyNorm)
      .limit(1)
      .get();

    if (!q.empty) {
      companyId = q.docs[0].id;
    } else {
      // create provisional company
      const ref = await db.collection("companies").add({
        companyName: companyName.trim(),
        normalizedName: companyNorm,
        companyType: userTypeHint || "distributor",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        verified: false,
        tier: "free",
        limits: {
          maxUsers: (userTypeHint || "distributor") === "distributor" ? 5 : 1,
          maxConnections: 1,
        },
      });

      companyId = ref.id;
    }

    // Create access request
    const reqRef = await db.collection("accessRequests").add({
      uid: finalUid,
      email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone || "",
      notes: notes || "",
      userTypeHint: userTypeHint || "distributor",
      companyName: companyName.trim(),
      companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    });

    // Upsert user profile doc (role: pending)
    await db
      .collection("users")
      .doc(finalUid)
      .set(
        {
          uid: finalUid,
          email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyId,
          role: "pending",
          userTypeHint: userTypeHint || "distributor",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    // Optional: set custom claims (will be applied next sign-in)
    try {
      await admin.auth().setCustomUserClaims(finalUid, {
        role: "pending",
        companyId,
      });
    } catch (e) {
      console.warn("setCustomUserClaims failed:", e?.message);
    }

    // Send admin notification via mail collection
    await db.collection("mail").add({
      to: ["support@displaygram.com"],
      message: {
        subject: `New Access Request: ${firstName} ${lastName} (${email})`,
        text: `User requested access.\nCompany: ${companyName}\nType: ${userTypeHint}\nPhone: ${phone}\nNotes: ${notes}\nRequestId: ${reqRef.id}\nCompanyId: ${companyId}`,
      },
    });

    // Send user welcome/verification (either verification link or “we’re reviewing”)
    // If you prefer to generate a true verification link:
    let verifyLink = "";
    try {
      verifyLink = await admin.auth().generateEmailVerificationLink(email);
    } catch {
      // ignore if not configured
    }
    await db.collection("mail").add({
      to: [email],
      message: {
        subject: `Welcome to Displaygram — You're set to pending`,
        text: verifyLink
          ? `Thanks ${firstName}! We created your account in pending mode.\nPlease verify your email: ${verifyLink}\nWe’ll review and finish setup shortly.`
          : `Thanks ${firstName}! We created your account in pending mode.\nWe’ll review and finish setup shortly.`,
      },
    });

    return res.status(200).json({
      ok: true,
      mode: q.empty ? "created" : "matched",
      companyId,
      requestId: reqRef.id,
    });
  } catch (error) {
    console.error("Error in createCompanyOrRequest:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
};
