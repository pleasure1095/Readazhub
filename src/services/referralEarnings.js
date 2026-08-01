import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { calculateInvestmentEarnings } from "../utils/earnings";
import { countReviewedEarningDays } from "./reviews";
import { REFERRAL_LEVEL_1_PCT, REFERRAL_LEVEL_2_PCT } from "../utils/referralPlans";

const USERS_COLLECTION = "users";
const DEPOSITS_COLLECTION = "deposits";
const REVIEWS_COLLECTION = "reviews";

/**
 * Sums a single user's real lifetime earned VIP profit across every one of
 * their approved deposits — the SAME `availableEarnings` figure their own
 * Dashboard shows for each investment (dailyRate * reviewed-day-count),
 * NOT the theoretical max and NOT anything already withdrawn. This is
 * intentionally the same pipeline DashboardPage.jsx uses for the user's
 * own stats, so a referrer's bonus can never be based on a different
 * notion of "earned" than the referred user's own dashboard shows.
 */
async function getUserLifetimeEarnedProfit(userId, now) {
  const depositsQ = query(collection(db, DEPOSITS_COLLECTION), where("userId", "==", userId));
  const depositsSnap = await getDocs(depositsQ);
  const deposits = depositsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => d.status === "approved");

  if (deposits.length === 0) return 0;

  const reviewSnap = await getDoc(doc(db, REVIEWS_COLLECTION, userId));
  const completedDays = reviewSnap.exists() ? reviewSnap.data().completedDays || [] : [];

  let total = 0;
  for (const d of deposits) {
    const reviewedDayCount = countReviewedEarningDays(d.approvedAt, now, completedDays);
    const calc = calculateInvestmentEarnings(d.planDaily, d.approvedAt, d.lifetimeWithdrawn || 0, reviewedDayCount, now);
    // availableEarnings, not withdrawableBalance — the referral bonus is a
    // percentage of what was actually EARNED, not reduced by what the
    // referred user themselves has already withdrawn (their withdrawal
    // activity is unrelated to what the referrer is owed).
    total += calc.availableEarnings;
  }
  return total;
}

/**
 * Computes the CURRENT total lifetime referral earnings owed to a user
 * across both levels of their referral network:
 *   - Level 1 (9%): everyone whose referrerCode matches this user's own
 *     referralCode
 *   - Level 2 (2%): everyone whose referrerOfReferrerCode matches this
 *     user's own referralCode (i.e. people referred by this user's own
 *     Level-1 referrals)
 *
 * This is fully LIVE-COMPUTED, mirroring how a single VIP investment's
 * own totalEarnings/availableEarnings is computed fresh from real data
 * every load rather than trusted from a stored running total — so it can
 * never drift out of sync with what the referred users actually earned,
 * and self-corrects automatically if underlying deposit/review data ever
 * changes (e.g. an admin correction). The only thing ever STORED for
 * referral bonus is `referralLifetimeWithdrawn` on the referrer's own
 * user document — see utils/earnings.js-style pattern (totalEarnings
 * live-computed, lifetimeWithdrawn stored and subtracted).
 *
 * Works correctly for users who signed up before Level-2 tracking
 * existed too: Level 1 only needs `referrerCode` (always present since
 * the earliest version of referrals), and Level 2 only needs the
 * REFERRED user's `referrerOfReferrerCode` to have been set at THEIR
 * signup time — so older referrers automatically start seeing Level 2
 * earnings the moment any of their referrals bring in a new signup after
 * this feature shipped. No migration needed for existing accounts.
 */
export async function calculateReferralNetworkEarnings(referralCode, now = Date.now()) {
  if (!referralCode) {
    return { level1Total: 0, level2Total: 0, lifetimeEarned: 0, level1Referrals: [], level2Referrals: [] };
  }

  const level1Q = query(collection(db, USERS_COLLECTION), where("referrerCode", "==", referralCode));
  const level2Q = query(collection(db, USERS_COLLECTION), where("referrerOfReferrerCode", "==", referralCode));

  const [level1Snap, level2Snap] = await Promise.all([getDocs(level1Q), getDocs(level2Q)]);

  const level1Users = level1Snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  const level2Users = level2Snap.docs.map((d) => ({ uid: d.id, ...d.data() }));

  const level1Earned = await Promise.all(
    level1Users.map(async (u) => ({
      uid: u.uid,
      name: u.name,
      earnedProfit: await getUserLifetimeEarnedProfit(u.uid, now),
    }))
  );
  const level2Earned = await Promise.all(
    level2Users.map(async (u) => ({
      uid: u.uid,
      name: u.name,
      earnedProfit: await getUserLifetimeEarnedProfit(u.uid, now),
    }))
  );

  const level1Referrals = level1Earned.map((r) => ({ ...r, bonus: r.earnedProfit * REFERRAL_LEVEL_1_PCT }));
  const level2Referrals = level2Earned.map((r) => ({ ...r, bonus: r.earnedProfit * REFERRAL_LEVEL_2_PCT }));

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

/**
 * Full referral balance for a user: live-computed lifetime earned (both
 * levels) minus the stored lifetime-withdrawn counter. Mirrors the exact
 * shape of a VIP investment's withdrawableBalance = availableEarnings -
 * lifetimeWithdrawn (see utils/earnings.js calculateInvestmentEarnings).
 */
export async function getReferralWithdrawableBalance(referralCode, referralLifetimeWithdrawn = 0, now = Date.now()) {
  const network = await calculateReferralNetworkEarnings(referralCode, now);
  const withdrawableBalance = Math.max(0, network.lifetimeEarned - referralLifetimeWithdrawn);
  return { ...network, referralLifetimeWithdrawn, withdrawableBalance };
}
