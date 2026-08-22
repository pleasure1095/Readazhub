import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { REFERRAL_LEVEL_1_PCT, REFERRAL_LEVEL_2_PCT } from "../utils/referralPlans";

const USERS_COLLECTION = "users";
const DEPOSITS_COLLECTION = "deposits";

/**
 * Sums a single user's total APPROVED deposit amount — the base the flat
 * one-time referral bonus is a percentage of (see
 * creditReferralBonusIfEligible in services/adminUsers.js: `deposit.amount
 * * pct`, credited once the instant a referred user's deposit is
 * approved).
 *
 * REWRITTEN this session: this used to sum each referral's lifetime
 * EARNED PROFIT (availableEarnings — dailyRate × days actually reviewed),
 * under an older live-computed referral-bonus model. The app has since
 * moved to a flat one-time bonus paid on the DEPOSIT AMOUNT at approval
 * time, with no dependency on the referred user's later reading/earning
 * activity at all. The old profit-based calculation was left in place on
 * this page even after that change, so it kept showing ₦0 for any
 * referral whose deposit was approved too recently to have accrued
 * reviewed-day earnings yet (past the 24h grace period, with at least
 * one completed reading day) — even though the real flat bonus had
 * already been correctly credited to the referrer's own
 * `referralBonusTotal` the moment the deposit was approved. This is what
 * the site owner reported: bonus shows correctly on the Home dashboard
 * (which reads `referralBonusTotal` directly) but ₦0 on the Referrals
 * page (which was still running this old, unrelated calculation).
 */
async function getUserApprovedDepositTotal(userId) {
  const depositsQ = query(collection(db, DEPOSITS_COLLECTION), where("userId", "==", userId));
  const depositsSnap = await getDocs(depositsQ);
  return depositsSnap.docs
    .map((d) => d.data())
    .filter((d) => d.status === "approved")
    .reduce((sum, d) => sum + (d.amount || 0), 0);
}

/**
 * Computes a DISPLAY-ONLY breakdown of a user's referral network and the
 * Level 1 (9%) / Level 2 (2%) bonus amount each referral's approved
 * deposits generated. This mirrors — but does not replace — the real
 * bonus math: the actual money lives in `referralBonusTotal` on the
 * user's own doc, credited once per deposit approval by
 * creditReferralBonusIfEligible (services/adminUsers.js). This function
 * exists only so the Referrals page can show a Level 1 vs Level 2 split
 * and a per-referral bonus figure, since `referralBonusTotal` itself is
 * one combined running number with no per-level or per-referral
 * breakdown stored anywhere. The sum of every bonus this function
 * computes should equal `referralBonusTotal` as long as no bonus has
 * ever been withdrawn (withdrawals reduce `referralBonusTotal`, but this
 * recomputes the full lifetime total from scratch every time, so the two
 * can drift apart after a withdrawal — the Referrals page uses
 * `referralBonusTotal` directly for its headline total for that reason,
 * and only uses this breakdown for the Level 1/2 split and referral
 * list).
 */
export async function calculateReferralNetworkBreakdown(referralCode) {
  if (!referralCode) {
    return { level1Total: 0, level2Total: 0, lifetimeEarned: 0, level1Referrals: [], level2Referrals: [] };
  }

  const level1Q = query(collection(db, USERS_COLLECTION), where("referrerCode", "==", referralCode));
  const level2Q = query(collection(db, USERS_COLLECTION), where("referrerOfReferrerCode", "==", referralCode));

  const [level1Snap, level2Snap] = await Promise.all([getDocs(level1Q), getDocs(level2Q)]);

  const level1Users = level1Snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  const level2Users = level2Snap.docs.map((d) => ({ uid: d.id, ...d.data() }));

  const level1Deposited = await Promise.all(
    level1Users.map(async (u) => ({
      uid: u.uid,
      name: u.name,
      depositTotal: await getUserApprovedDepositTotal(u.uid),
    }))
  );
  const level2Deposited = await Promise.all(
    level2Users.map(async (u) => ({
      uid: u.uid,
      name: u.name,
      depositTotal: await getUserApprovedDepositTotal(u.uid),
    }))
  );

  const level1Referrals = level1Deposited.map((r) => ({ ...r, bonus: r.depositTotal * REFERRAL_LEVEL_1_PCT }));
  const level2Referrals = level2Deposited.map((r) => ({ ...r, bonus: r.depositTotal * REFERRAL_LEVEL_2_PCT }));

  const level1Total = level1Referrals.reduce((sum, r) => sum + r.bonus, 0);
  const level2Total = level2Referrals.reduce((sum, r) => sum + r.bonus, 0);

  return {
    level1Total,
    level2Total,
    lifetimeEarned: level1Total + level2Total,
    level1Referrals,
    level2Referrals,
  };
}
