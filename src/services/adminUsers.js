import { collection, getDocs, doc, updateDoc, getDoc, runTransaction, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";

const USERS_COLLECTION = "users";

/**
 * Fetches all user profiles, newest first. Fine for now given expected
 * user volumes; if the user base grows large, this should be paginated
 * (Firestore startAfter/limit) rather than loading everything at once.
 */
export async function listAllUsers() {
  const q = query(collection(db, USERS_COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/**
 * Promotes or demotes a user's role. Only callable successfully by an
 * existing admin — Firestore security rules are the real enforcement here;
 * this function just makes the intent explicit and reusable across the UI.
 */
export async function setUserRole(uid, role) {
  if (role !== "user" && role !== "admin") {
    throw new Error('Role must be "user" or "admin".');
  }
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role });
}

/**
 * Finds a single user document by uid. Used during deposit approval to
 * check referral status.
 */
export async function getUserByUid(uid) {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

/**
 * REMOVED: creditReferralBonusIfEligible() used to be called here, crediting
 * a ONE-TIME flat referralBonusTotal bump (equal to the referred user's
 * planDaily) at the moment of their FIRST approved deposit, gated by a
 * firstVipRewarded flag to prevent double-payment.
 *
 * Referral bonus is now a RECURRING, live-computed 9%/2% (two-level) share
 * of each referred user's ACTUAL daily earnings — see
 * services/referralEarnings.js calculateReferralNetworkEarnings(). It is
 * computed fresh on every load directly from the referred users' real
 * deposit + review history, not credited/stored at approval time, so
 * there is nothing left for approveDeposit() to trigger here. The
 * `referralBonusTotal` field and `firstVipRewarded` flag are no longer
 * written to new user profiles (see services/auth.js) — existing accounts
 * that still carry old values from those fields are safe to ignore, as
 * nothing reads them anymore.
 */

/**
 * ORPHANED — not called anywhere (superseded by the combined withdrawal
 * flow, services/withdrawalRequests.js, same as noted in the project
 * handoff for BonusWithdrawModal.jsx which was this function's only
 * caller). Left in place per the existing "orphaned but harmless" policy
 * for dead code in this codebase — BUT this one is no longer just inert,
 * it is now BROKEN if ever called: it reads/writes `referralBonusTotal`,
 * a field that new user profiles no longer have (see services/auth.js —
 * referral bonus is now live-computed, not stored). Do not wire this back
 * up without first rewriting it against services/referralEarnings.js.
 */
export async function withdrawBonusBalance(uid, amount) {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) throw new Error("User not found.");
    const data = snap.data();
    const referralBonusTotal = data.referralBonusTotal || 0;
    const welcomeBonus = data.welcomeBonus || 0;
    const totalAvailable = referralBonusTotal + welcomeBonus;

    if (amount > totalAvailable) {
      throw new Error(`This exceeds your available bonus balance of ₦${totalAvailable.toLocaleString()}.`);
    }

    const fromReferral = Math.min(referralBonusTotal, amount);
    const fromWelcome = amount - fromReferral;

    transaction.update(userRef, {
      referralBonusTotal: referralBonusTotal - fromReferral,
      welcomeBonus: welcomeBonus - fromWelcome,
    });
  });
}
