import { collection, getDocs, doc, updateDoc, getDoc, runTransaction, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { REFERRAL_LEVEL_1_PCT, REFERRAL_LEVEL_2_PCT } from "../utils/referralPlans";

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

    transaction.update(userRef, {
      referralBonusTotal: referralBonusTotal - fromReferral,
      welcomeBonus: welcomeBonus - fromWelcome,
    });
  });
}
