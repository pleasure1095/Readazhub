import { collection, query, where, getDocs } from "firebase/firestore";

/**
 * Generates a referral code like "JOHN4X9K" and verifies it doesn't already
 * exist in Firestore before returning it. Retries on collision.
 *
 * This replaces the old localStorage version, which checked uniqueness
 * against an in-memory users object. Now it's a real (if small) network
 * round-trip per attempt, but collisions are rare enough that this almost
 * always resolves on the first try.
 */
export async function genReferralCode(name, db, maxAttempts = 5) {
  const prefix = (name || "USER")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, "X");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
    const code = prefix + suffix;

    const q = query(collection(db, "users"), where("referralCode", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) return code;
  }

  // Extremely unlikely fallback: append a timestamp fragment to force uniqueness.
  return prefix + Date.now().toString(36).toUpperCase().slice(-4);
}
