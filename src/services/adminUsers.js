import { collection, getDocs, doc, updateDoc, getDoc, deleteDoc, runTransaction, query, where, orderBy } from "firebase/firestore";
import { db } from "./firebase";
import { REFERRAL_LEVEL_1_PCT, REFERRAL_LEVEL_2_PCT } from "../utils/referralPlans";

const USERS_COLLECTION = "users";
const DEPOSITS_COLLECTION = "deposits";
const REVIEWS_COLLECTION = "reviews";
const CHECKINS_COLLECTION = "checkins";

// Matches the WAT date-string format used throughout reviews.js/
// withdrawalRequests.js, so this revert targets exactly the same "today"
// those files mean.
function getWATDateString(timestamp = Date.now()) {
  const watMs = timestamp + 60 * 60 * 1000;
  const d = new Date(watMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * ONE-TIME data fix for the Aug 26, 2026 launch pause (see
 * utils/launchPause.js) — per the site owner's explicit instruction:
 * anyone who already completed TODAY's (Aug 26 WAT) reading task before
 * the pause was deployed needs that completion REVERTED, so it doesn't
 * count once the pause lifts. This only strips today's date out of
 * completedDays/completedDayTimestamps/readArticleIds — it does NOT
 * touch any other day's history, does NOT touch deposits/earnings
 * figures directly (those are derived live from completedDays, so
 * removing today's date here automatically zeroes today's contribution
 * everywhere else), and does NOT touch the 24h cooldown timestamp
 * (lastRatingAt) since the pause's own check in markArticleRead already
 * blocks new reads regardless of cooldown state.
 *
 * SAFE TO RUN MORE THAN ONCE: it only ever removes today's WAT date if
 * present — running it again after it's already been reverted for a
 * user is a no-op for them (findable via the returned `alreadyClean`
 * count). Intended to be run exactly once, via the admin button in
 * AdminDepositsPage.jsx, then never needed again after this launch.
 */
export async function revertTodaysCompletionsForLaunchPause() {
  const todayDateString = getWATDateString();
  const usersSnap = await getDocs(collection(db, REVIEWS_COLLECTION));

  let reverted = 0;
  let alreadyClean = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const completedDays = data.completedDays || [];
    if (!completedDays.includes(todayDateString)) {
      alreadyClean++;
      continue;
    }

    const updatedCompletedDays = completedDays.filter((d) => d !== todayDateString);
    const updatedTimestamps = { ...(data.completedDayTimestamps || {}) };
    delete updatedTimestamps[todayDateString];

    const update = { completedDays: updatedCompletedDays, completedDayTimestamps: updatedTimestamps };
    // Only clear today's in-progress read list if it was today's — an
    // older lastRatingDate means readArticleIds already refers to a
    // past day and getReviewStatus() ignores it anyway (see reviews.js:
    // readArticleIds is only honored when lastRatingDate === today).
    if (data.lastRatingDate === todayDateString) {
      update.readArticleIds = [];
    }

    await updateDoc(doc(db, REVIEWS_COLLECTION, userDoc.id), update);
    reverted++;
  }

  return { reverted, alreadyClean, totalChecked: usersSnap.docs.length, todayDateString };
}

/**
 * Fetches all user profiles, newest first. Fine for now given expected
 * user volumes; if the user base grows large, this should be paginated
 * (Firestore startAfter/limit) rather than loading everything at once.
 */
/**
 * ONE-TIME "Fresh Start" reset — per the site owner's explicit
 * instruction for a relaunch: wipes accumulated EARNINGS across every
 * user while deliberately preserving each user's VIP plan itself (the
 * deposit record, its tier/amount/planId all stay exactly as they are).
 *
 * What this changes, per approved deposit:
 *   - lifetimeWithdrawn → 0
 *   - approvedAt → NOW — this is what "restarts the earning clock"
 *     means concretely: both the 30-day plan cycle and the 24h-per-day
 *     maturity math (calculateInvestmentEarnings, earnings.js) key off
 *     approvedAt, so resetting it is the only way to zero out
 *     accumulated/maturing profit without deleting the deposit.
 *   - amount, planId, planDaily, userId, status: UNTOUCHED — the plan
 *     and its principal survive the reset exactly as they were.
 * Only deposits with status "approved" are touched — pending/rejected/
 * superseded deposits are left alone (they have no earnings to reset).
 *
 * What this changes, per user document:
 *   - referralBonusTotal → 0
 *   - welcomeBonus → 350 (flat, matching the new relaunch amount — see
 *     getWelcomeBonusAmount in services/auth.js for new-signup parity)
 *   - referralLifetimeWithdrawn / welcomeLifetimeWithdrawn → 0
 *
 * What this changes, per checkins document:
 *   - unlockedBalance → 0, lifetimeWithdrawn → 0 (streak/lastCheckIn
 *     fields untouched — this only zeroes the MONEY, not check-in
 *     history/streaks, since the reset is scoped to earnings only)
 *
 * What this changes, per reviews document:
 *   - completedDays → [], completedDayTimestamps → {}, readArticleIds
 *     → [] — full reading-history wipe, so no plan shows leftover
 *     "already matured" days from before the reset once approvedAt
 *     jumps to now.
 *
 * NOT touched by this function, ever: deposit records themselves are
 * never deleted (kept for the site owner's own bookkeeping trail per
 * their explicit instruction), and withdrawalRequests history is left
 * fully intact as a permanent record of what was paid out before the
 * reset.
 *
 * SAFETY: pass dryRun: true to get back exactly what WOULD change
 * (counts only, zero writes) before running for real — given the scale
 * and irreversibility of this operation, always dry-run first.
 */
export async function resetAllAccountsForFreshStart({ dryRun = true } = {}) {
  const FRESH_START_WELCOME_BONUS = 350;
  const now = Date.now();

  const [depositsSnap, usersSnap, checkinsSnap, reviewsSnap] = await Promise.all([
    getDocs(collection(db, DEPOSITS_COLLECTION)),
    getDocs(collection(db, USERS_COLLECTION)),
    getDocs(collection(db, CHECKINS_COLLECTION)),
    getDocs(collection(db, REVIEWS_COLLECTION)),
  ]);

  const approvedDeposits = depositsSnap.docs.filter((d) => d.data().status === "approved");

  const summary = {
    depositsReset: approvedDeposits.length,
    usersReset: usersSnap.docs.length,
    checkinsReset: checkinsSnap.docs.length,
    reviewsReset: reviewsSnap.docs.length,
    dryRun,
  };

  if (dryRun) return summary;

  for (const depDoc of approvedDeposits) {
    await updateDoc(doc(db, DEPOSITS_COLLECTION, depDoc.id), {
      lifetimeWithdrawn: 0,
      approvedAt: now,
    });
  }

  for (const userDoc of usersSnap.docs) {
    await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), {
      referralBonusTotal: 0,
      welcomeBonus: FRESH_START_WELCOME_BONUS,
      referralLifetimeWithdrawn: 0,
      welcomeLifetimeWithdrawn: 0,
    });
  }

  for (const checkinDoc of checkinsSnap.docs) {
    await updateDoc(doc(db, CHECKINS_COLLECTION, checkinDoc.id), {
      unlockedBalance: 0,
      lifetimeWithdrawn: 0,
    });
  }

  for (const reviewDoc of reviewsSnap.docs) {
    await updateDoc(doc(db, REVIEWS_COLLECTION, reviewDoc.id), {
      completedDays: [],
      completedDayTimestamps: {},
      readArticleIds: [],
    });
  }

  return summary;
}

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

  // Clawbacks run BEFORE the user doc is deleted, but are independently
  // fault-tolerant (each wrapped in its own try/catch) rather than
  // letting one referrer-lookup failure abort the whole delete — a user
  // with a bad/orphaned referrerCode shouldn't become undeletable.
  // Failures here are collected and surfaced in the return value so the
  // admin isn't silently left thinking a clawback happened when it
  // didn't.
  const clawbackErrors = [];
  try {
    await clawBack(target.referrerCode, REFERRAL_LEVEL_1_PCT);
  } catch (e) {
    console.error("Level 1 referral clawback failed:", e);
    clawbackErrors.push("level1");
  }
  try {
    await clawBack(target.referrerOfReferrerCode, REFERRAL_LEVEL_2_PCT);
  } catch (e) {
    console.error("Level 2 referral clawback failed:", e);
    clawbackErrors.push("level2");
  }

  // The user's OWN document is deleted FIRST, deliberately, before any
  // of the related-collection cleanup below. This is the single change
  // that actually makes them disappear from the admin Users list — if
  // ANYTHING below this line throws (a deposit fails to delete, a
  // network blip mid-loop), the user is still gone from every list and
  // can't be mistaken for "not deleted." Previously this ran LAST, which
  // meant a failure partway through cleanup could leave deposits/reviews
  // already deleted while the user document itself — the thing that
  // actually controls whether they show up anywhere — was untouched,
  // making a real partial-delete look indistinguishable from "nothing
  // happened" from the admin's point of view.
  await deleteDoc(doc(db, USERS_COLLECTION, uid));

  // Everything below is best-effort cleanup of related collections.
  // Each step is independently caught so one failure (e.g. a single
  // deposit doc with a permissions quirk) doesn't leave the others
  // undone — reviews/checkins are keyed by uid directly; deposits need
  // a query since a user can have multiple. deleteDoc() is a no-op
  // (does not throw) if a doc doesn't exist, so this is safe even for
  // users who never checked in or never completed a review.
  // Notifications and withdrawalRequests are left as historical records
  // (same reasoning as elsewhere in this app — they're not spendable
  // balances, just a log) rather than deleted.
  const cleanupErrors = [];
  const depositResults = await Promise.allSettled(depositsSnap.docs.map((d) => deleteDoc(d.ref)));
  const failedDeposits = depositResults.filter((r) => r.status === "rejected").length;
  if (failedDeposits > 0) {
    console.error(`${failedDeposits} of ${depositsSnap.docs.length} deposit doc(s) failed to delete for uid ${uid}`);
    cleanupErrors.push(`${failedDeposits} deposit(s)`);
  }

  try {
    await deleteDoc(doc(db, REVIEWS_COLLECTION, uid));
  } catch (e) {
    console.error("Failed to delete reviews doc:", e);
    cleanupErrors.push("reviews");
  }

  try {
    await deleteDoc(doc(db, CHECKINS_COLLECTION, uid));
  } catch (e) {
    console.error("Failed to delete checkins doc:", e);
    cleanupErrors.push("checkins");
  }

  return { deleted: true, clawbackErrors, cleanupErrors };
}
