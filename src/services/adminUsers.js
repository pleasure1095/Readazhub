import { collection, getDocs, doc, updateDoc, getDoc, deleteDoc, runTransaction, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { REFERRAL_LEVEL_1_PCT, REFERRAL_LEVEL_2_PCT } from "../utils/referralPlans";

const USERS_COLLECTION = "users";
const DEPOSITS_COLLECTION = "deposits";
const REVIEWS_COLLECTION = "reviews";
const CHECKINS_COLLECTION = "checkins";

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
 * Credits a ONE-TIME flat referral bonus, called from approveDeposit()
 * the moment a referred user's deposit is approved (i.e. they pay for an
 * active plan). Level 1 referrer gets 9% of the approved amount, Level 2
 * (the Level-1 referrer's own referrer) gets 2%. Gated by
 * `rewardedDepositIds` on the referred user's own doc so re-approval or
 * any retry can never double-pay. Adds straight onto `referralBonusTotal`
 * on the referrer's user doc, from which it's later withdrawable via
 * withdrawBonusBalance below.
 */
export async function creditReferralBonusIfEligible(deposit) {
  const referredSnap = await getDoc(doc(db, USERS_COLLECTION, deposit.userId));
  if (!referredSnap.exists()) return;
  const referred = referredSnap.data();

  const alreadyRewarded = (referred.rewardedDepositIds || []).includes(deposit.id);
  if (alreadyRewarded) return;

  const level1Code = referred.referrerCode;
  const level2Code = referred.referrerOfReferrerCode;

  async function bump(code, pct) {
    if (!code) return;
    const q = query(collection(db, USERS_COLLECTION), where("referralCode", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const referrerDoc = snap.docs[0];
    const current = referrerDoc.data().referralBonusTotal || 0;
    await updateDoc(doc(db, USERS_COLLECTION, referrerDoc.id), {
      referralBonusTotal: current + deposit.amount * pct,
    });
  }

  await bump(level1Code, REFERRAL_LEVEL_1_PCT);
  await bump(level2Code, REFERRAL_LEVEL_2_PCT);

  await updateDoc(doc(db, USERS_COLLECTION, deposit.userId), {
    rewardedDepositIds: [...(referred.rewardedDepositIds || []), deposit.id],
  });
}

/**
 * Withdraws from the combined bonus balance (referral + welcome bonus).
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

    // See requestCombinedWithdrawal in services/withdrawalRequests.js for
    // why these two lifetime-withdrawn counters exist — without them, a
    // withdrawal here silently disappears from admin reporting even
    // though it correctly leaves the user's spendable balance.
    const referralLifetimeWithdrawn = data.referralLifetimeWithdrawn || 0;
    const welcomeLifetimeWithdrawn = data.welcomeLifetimeWithdrawn || 0;

    transaction.update(userRef, {
      referralBonusTotal: referralBonusTotal - fromReferral,
      welcomeBonus: welcomeBonus - fromWelcome,
      referralLifetimeWithdrawn: referralLifetimeWithdrawn + fromReferral,
      welcomeLifetimeWithdrawn: welcomeLifetimeWithdrawn + fromWelcome,
    });
  });
}

/**
 * Deletes a user AND reverses any referral bonus their approved deposits
 * generated for their Level 1 / Level 2 referrer(s), so a removed user
 * never leaves a "phantom" bonus behind on their referrer's balance.
 *
 * Per the site owner's explicit rule: once a referred user is deleted,
 * any bonus already paid out because of them should be CLAWED BACK
 * retroactively — this is a deliberate deviation from the earlier
 * one-time-credit-is-permanent design (see creditReferralBonusIfEligible
 * above), scoped specifically to deletion.
 *
 * WHY THIS FUNCTION HAS TO EXIST AT ALL: deleting a user directly from
 * the Firebase Console (Firestore + Auth) bypasses all app code — no
 * clawback, no cleanup of their other collections, nothing. That's what
 * was happening before this function existed, which is why deleted
 * users' referral bonuses kept sitting untouched on their referrers'
 * balances. This function is the ONLY path that performs the clawback;
 * deleting via the Console will always skip it.
 *
 * ORDER OF OPERATIONS MATTERS: bonus reversal reads this user's own
 * approved deposits and their OWN referrerCode/referrerOfReferrerCode
 * fields, so it must run BEFORE those documents are deleted, not after.
 *
 * KNOWN LIMITATION: this only removes the user's Firestore data (users,
 * deposits, reviews, checkins docs). It does NOT delete their Firebase
 * AUTH account — client-side Firebase Auth can only ever delete the
 * CURRENTLY SIGNED-IN user, never an arbitrary other user; deleting
 * someone else's Auth account requires the Admin SDK, which means a
 * Cloud Function or a small backend, neither of which exists in this
 * app's current architecture (phone-only Replit/Netlify workflow, no
 * Cloud Functions set up — see firebase.json). Practically: the deleted
 * user's login will stop working (their profile lookup on login will
 * fail and they'll be shown an error), but their email/password
 * credential technically still exists in Firebase Auth until removed
 * manually from the Firebase Console → Authentication tab. Flagged here
 * as a known gap, not silently glossed over.
 */
export async function deleteUserAndReverseBonus(uid) {
  const targetSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!targetSnap.exists()) throw new Error("User not found.");
  const target = targetSnap.data();

  // Sum this user's own APPROVED deposits — the base each referral bonus
  // credit was calculated from at approval time (deposit.amount * pct in
  // creditReferralBonusIfEligible). Rejected/pending deposits never
  // generated a bonus in the first place, so they're excluded here too.
  const depositsQ = query(collection(db, DEPOSITS_COLLECTION), where("userId", "==", uid));
  const depositsSnap = await getDocs(depositsQ);
  const approvedDepositTotal = depositsSnap.docs
    .map((d) => d.data())
    .filter((d) => d.status === "approved")
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  // Reverse the Level 1 bonus off this user's own direct referrer, and
  // the Level 2 bonus off that referrer's own referrer — mirroring
  // exactly which two people creditReferralBonusIfEligible paid when
  // this user's deposit(s) were originally approved.
  async function clawBack(code, pct) {
    if (!code || approvedDepositTotal <= 0) return;
    const q = query(collection(db, USERS_COLLECTION), where("referralCode", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const referrerDoc = snap.docs[0];
    const current = referrerDoc.data().referralBonusTotal || 0;
    const clawback = approvedDepositTotal * pct;
    // Never drive the referrer's balance negative — if they've already
    // withdrawn more than this clawback amount, floor at 0 rather than
    // going negative (a negative spendable balance has no sane meaning
    // in the withdrawal flow elsewhere in this app).
    await updateDoc(doc(db, USERS_COLLECTION, referrerDoc.id), {
      referralBonusTotal: Math.max(0, current - clawback),
    });
  }

  await clawBack(target.referrerCode, REFERRAL_LEVEL_1_PCT);
  await clawBack(target.referrerOfReferrerCode, REFERRAL_LEVEL_2_PCT);

  // Clean up every collection this user has a doc in. reviews/checkins
  // are keyed by uid directly; deposits need a query since a user can
  // have multiple. deleteDoc() is a no-op (does not throw) if a doc
  // doesn't exist, so this is safe even for users who never checked in
  // or never completed a review. Notifications and withdrawalRequests
  // are left as historical records (same reasoning as elsewhere in this
  // app — they're not spendable balances, just a log) rather than
  // deleted.
  await Promise.all(depositsSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, REVIEWS_COLLECTION, uid));
  await deleteDoc(doc(db, CHECKINS_COLLECTION, uid));
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
}
