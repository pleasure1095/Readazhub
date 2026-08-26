import {
  collection,
  doc,
  addDoc,
  updateDoc,
  runTransaction,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notifications";
import { MIN_WITHDRAWAL } from "../utils/earnings";
import { isLaunchPauseActive, LAUNCH_PAUSE_ENDS_AT } from "../utils/launchPause";

const WITHDRAWAL_REQUESTS_COLLECTION = "withdrawalRequests";
const DEPOSITS_COLLECTION = "deposits";
const CHECKINS_COLLECTION = "checkins";
const USERS_COLLECTION = "users";

// Withdrawal processing fee — 12% of the REQUESTED amount, taken off
// what's actually paid out to the user, not off what's deducted from
// their balance. Per the site owner's explicit confirmation: if a user
// requests ₦10,000, their balance decreases by the full ₦10,000 (matching
// what they saw and confirmed on screen), but admin only pays out
// ₦8,800 — the fee is absorbed on the payout side, not added on top of
// what the user's balance loses. Applies to the full combined request
// amount regardless of which sources (VIP profit / referral / welcome /
// check-in) it was drawn from.
export const WITHDRAWAL_FEE_RATE = 0.12;

function genRef() {
  return "GWD-" + Math.random().toString(36).toUpperCase().slice(2, 8) + "-" + Date.now().toString(36).toUpperCase().slice(-4);
}

// Same WAT (West Africa Time, UTC+1) calendar-day boundary already used
// for the daily reading task in services/reviews.js — kept in sync
// deliberately so "one withdrawal per day" and "one reading task per
// day" always reset at the same moment for a user, rather than two
// independently-drifting day boundaries.
function getWATDateString(timestamp = Date.now()) {
  const watMs = timestamp + 60 * 60 * 1000;
  const d = new Date(watMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * ONE WITHDRAWAL REQUEST PER WAT CALENDAR DAY, per the site owner's
 * explicit confirmation:
 * - Measured by WAT calendar day, not a rolling 24h window — resets at
 *   WAT midnight regardless of what time the last request was made.
 * - ANY request from today counts as "used" the daily slot, regardless
 *   of its current status — pending, paid, AND rejected all block a new
 *   request until the next WAT day. A rejected request does NOT free up
 *   another same-day attempt.
 *
 * Called from inside requestCombinedWithdrawal() before the transaction
 * starts, since this is a read against a different collection query
 * shape than a transaction.get() supports directly.
 *
 * Filters by requestedAt CLIENT-SIDE after a single where("userId", ...)
 * query, rather than adding a second where() clause for requestedAt —
 * matches the exact pattern services/deposits.js:getUserDeposits()
 * already uses (see its comment) specifically to avoid requiring a
 * manually-created Firestore composite index, which is an easy step to
 * miss and awkward to set up from a phone with no terminal access. A
 * single user's total request history is small enough that client-side
 * filtering has no real performance cost.
 */
async function hasWithdrawalRequestToday(userId, now = Date.now()) {
  const todayDateString = getWATDateString(now);
  const watMidnightUtcMs = (() => {
    const [y, m, d] = todayDateString.split("-").map(Number);
    // Midnight WAT (UTC+1) expressed as its equivalent UTC instant is
    // 23:00 UTC the previous day, i.e. Date.UTC(y, m-1, d, -1).
    return Date.UTC(y, m - 1, d, -1, 0, 0, 0);
  })();

  const q = query(collection(db, WITHDRAWAL_REQUESTS_COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.some((d) => (d.data().requestedAt || 0) >= watMidnightUtcMs);
}

/**
 * Combines every withdrawable balance a user has — VIP investment
 * profit (across all their approved deposits), Referral Bonus, Welcome
 * Bonus, and Check-in balance — into ONE total, per the site owner's
 * explicit request to stop showing these as separate "tags" the user
 * has to withdraw individually.
 *
 * This is a pure display/summary helper — it does NOT deduct anything.
 * `investments` is expected to already carry each deposit's live
 * `withdrawableBalance` (as computed by utils/earnings.js), the same
 * shape DashboardPage.jsx already builds.
 *
 * `referralWithdrawableBalance` is simply the user's stored
 * `referralBonusTotal` — a one-time flat bonus credited directly at
 * deposit-approval time (see services/adminUsers.js
 * creditReferralBonusIfEligible), spent down directly on withdrawal.
 */
export function getCombinedWithdrawableBalance({ investments, referralWithdrawableBalance, welcomeBonus, checkInBalance }) {
  const vipProfit = investments.reduce((sum, inv) => sum + (inv.withdrawableBalance || 0), 0);
  const referral = referralWithdrawableBalance || 0;
  const welcome = welcomeBonus || 0;
  const checkIn = checkInBalance || 0;
  return {
    total: vipProfit + referral + welcome + checkIn,
    breakdown: { vipProfit, referral, welcome, checkIn },
  };
}

/**
 * Submits ONE combined withdrawal request that draws from potentially
 * several underlying balance sources to cover the requested amount.
 *
 * Draw order (doesn't affect the total, only which pot empties first for
 * a PARTIAL withdrawal): Referral Bonus -> Welcome Bonus -> Check-in ->
 * VIP investment profit (oldest-approved investment first, since that's
 * a stable, deterministic tie-breaker). VIP profit is drawn last since
 * it's the most "durable" balance; bonuses are cleared first.
 *
 * Each source's deduction is written directly to its own document (same
 * as the individual withdraw flows already did — deposits'
 * lifetimeWithdrawn, checkins' unlockedBalance, users'
 * referralLifetimeWithdrawn/welcomeBonus), so double-spending during a
 * pending request is still prevented exactly as before. What's NEW is
 * that all of this is now coordinated by one function and reported to
 * admin as ONE withdrawalRequests document with a `breakdown` field,
 * instead of the user submitting up to 4 separate requests across
 * different admin screens.
 *
 * Uses a single Firestore transaction so either everything succeeds
 * together or nothing is deducted at all — no risk of a partial failure
 * leaving money deducted from one pot but not reflected in the combined
 * request record.
 */
export async function requestCombinedWithdrawal({
  userId,
  userName,
  amount,
  bankDetails,
  investments, // [{ id: depositId, withdrawableBalance, lifetimeWithdrawn }, ...]
  referralWithdrawableBalance, // user's stored referralBonusTotal
  welcomeBonus,
  checkInBalance,
  checkInLifetimeWithdrawn,
}) {
  // ONE-TIME LAUNCH PAUSE (see utils/launchPause.js) — all withdrawals
  // blocked for every user until LAUNCH_PAUSE_ENDS_AT, per the site
  // owner's explicit request for the Aug 26, 2026 relaunch. Checked
  // first, before the minimum-amount check, so this specific reason is
  // shown rather than being masked by an unrelated validation error.
  if (isLaunchPauseActive()) {
    const hoursLeft = Math.ceil((LAUNCH_PAUSE_ENDS_AT - Date.now()) / (60 * 60 * 1000));
    throw new Error(`Withdrawals are paused for launch. They resume in about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.`);
  }

  if (!amount || amount < MIN_WITHDRAWAL) {
    throw new Error(`Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}.`);
  }

  // NOTE: this check runs before the transaction below, not inside it —
  // Firestore transactions can't run arbitrary `where` queries, only
  // direct document reads by reference. In the extremely rare case of
  // two near-simultaneous double-taps both passing this check before
  // either's transaction commits, two requests could land on the same
  // day. Matches the existing pattern in this file (the amount-vs-
  // balance check above the transaction has the same limitation) — an
  // admin reviewing requests would still catch a same-day duplicate
  // manually if it ever happened.
  if (await hasWithdrawalRequestToday(userId)) {
    throw new Error("You've already placed a withdrawal request today. You can request again after midnight (WAT).");
  }

  const { total, breakdown: available } = getCombinedWithdrawableBalance({
    investments,
    referralWithdrawableBalance,
    welcomeBonus,
    checkInBalance,
  });

  if (amount > total) {
    throw new Error(`This exceeds your available balance of ₦${total.toLocaleString()}.`);
  }

  // Determine how much to draw from each pot, in order, without
  // exceeding what's actually available in that pot.
  let remaining = amount;
  const draw = { referral: 0, welcome: 0, checkIn: 0, vipProfit: 0 };

  draw.referral = Math.min(available.referral, remaining);
  remaining -= draw.referral;

  draw.welcome = Math.min(available.welcome, remaining);
  remaining -= draw.welcome;

  draw.checkIn = Math.min(available.checkIn, remaining);
  remaining -= draw.checkIn;

  draw.vipProfit = Math.min(available.vipProfit, remaining);
  remaining -= draw.vipProfit;

  // Spread the vipProfit draw across individual investments, oldest
  // (lowest id sort isn't meaningful — use array order as given, which
  // callers should pass oldest-approved-first for a deterministic,
  // explainable draw order) first, until the vipProfit portion is fully
  // covered.
  const perInvestmentDraws = [];
  let vipRemaining = draw.vipProfit;
  for (const inv of investments) {
    if (vipRemaining <= 0) break;
    const take = Math.min(inv.withdrawableBalance || 0, vipRemaining);
    if (take > 0) {
      perInvestmentDraws.push({ depositId: inv.id, amount: take, newLifetimeWithdrawn: (inv.lifetimeWithdrawn || 0) + take });
      vipRemaining -= take;
    }
  }

  const ref = genRef();
  // Fee is computed off the full REQUESTED amount, not off any single
  // source within the breakdown — matches the confirmed design (user's
  // balance loses the full `amount`, admin pays out `payoutAmount`).
  // Rounded to the nearest naira since payouts are whole currency, not
  // fractional kobo amounts.
  const feeAmount = Math.round(amount * WITHDRAWAL_FEE_RATE);
  const payoutAmount = amount - feeAmount;

  await runTransaction(db, async (transaction) => {
    // Re-read the user doc inside the transaction for referral/welcome —
    // these two are the only sources also writable elsewhere concurrently
    // (deposits/checkins are keyed per-document per-source already).
    // Both are now simple stored balances, re-read and compared directly.
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) throw new Error("User not found.");
    const userData = userSnap.data();
    const currentWelcome = userData.welcomeBonus || 0;
    const currentReferralBonusTotal = userData.referralBonusTotal || 0;
    const currentReferralLifetimeWithdrawn = userData.referralLifetimeWithdrawn || 0;
    const currentWelcomeLifetimeWithdrawn = userData.welcomeLifetimeWithdrawn || 0;

    if (draw.welcome > currentWelcome) {
      throw new Error("Your balance changed — please refresh and try again.");
    }
    if (draw.referral > currentReferralBonusTotal) {
      throw new Error("Your referral balance changed — please refresh and try again.");
    }

    if (draw.referral > 0 || draw.welcome > 0) {
      transaction.update(userRef, {
        referralBonusTotal: currentReferralBonusTotal - draw.referral,
        welcomeBonus: currentWelcome - draw.welcome,
        // Lifetime-withdrawn counters for referral/welcome, added so the
        // Admin Earnings Overview total can include these payouts (see
        // AdminEarningsPage.jsx) — mirrors the same "deduct from balance
        // AND grow a lifetime counter, both at request time" pattern
        // already used for VIP deposits and check-in above/below.
        referralLifetimeWithdrawn: currentReferralLifetimeWithdrawn + draw.referral,
        welcomeLifetimeWithdrawn: currentWelcomeLifetimeWithdrawn + draw.welcome,
      });
    }

    if (draw.checkIn > 0) {
      const checkinRef = doc(db, CHECKINS_COLLECTION, userId);
      transaction.update(checkinRef, {
        unlockedBalance: (checkInBalance || 0) - draw.checkIn,
        lifetimeWithdrawn: (checkInLifetimeWithdrawn || 0) + draw.checkIn,
      });
    }

    for (const d of perInvestmentDraws) {
      const depositRef = doc(db, DEPOSITS_COLLECTION, d.depositId);
      transaction.update(depositRef, { lifetimeWithdrawn: d.newLifetimeWithdrawn });
    }

    const requestRef = doc(collection(db, WITHDRAWAL_REQUESTS_COLLECTION));
    transaction.set(requestRef, {
      ref,
      userId,
      userName,
      amount,
      feeRate: WITHDRAWAL_FEE_RATE,
      feeAmount,
      payoutAmount,
      bankDetails,
      breakdown: { ...draw, perInvestmentDraws },
      status: "pending",
      requestedAt: Date.now(),
    });
  });

  await createNotification(userId, "withdrawal", `Withdrawal request for ₦${amount.toLocaleString()} submitted — awaiting processing.`);

  return { ref };
}

/**
 * Fetches all combined withdrawal requests (admin view), newest first.
 */
export async function getAllWithdrawalRequests() {
  const snap = await getDocs(collection(db, WITHDRAWAL_REQUESTS_COLLECTION));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => b.requestedAt - a.requestedAt);
  return list;
}

/**
 * Admin action: mark a combined withdrawal request as paid. This does
 * NOT touch the underlying balance documents — those were already
 * deducted at request time (same pattern as the original per-source
 * withdraw flows), so marking paid is purely a status update reflecting
 * that the admin has sent the money outside the app.
 *
 * UPDATED this session: notification now references payoutAmount (the
 * actual amount sent, after the 12% withdrawal fee) rather than the
 * pre-fee requested amount — showing "paid ₦10,000" when the user
 * actually received ₦8,800 would be actively misleading, not just
 * imprecise.
 */
export async function markCombinedWithdrawalPaid(requestId, userId, payoutAmount) {
  await updateDoc(doc(db, WITHDRAWAL_REQUESTS_COLLECTION, requestId), {
    status: "paid",
    paidAt: Date.now(),
  });

  if (userId) {
    await createNotification(
      userId,
      "withdrawal_paid",
      `✅ Your withdrawal has been paid: ₦${(payoutAmount || 0).toLocaleString()}.`
    );
  }
}

/**
 * Admin action: reject a combined withdrawal request and restore every
 * balance it drew from — reversing exactly the amounts recorded in
 * `breakdown` at request time, so a rejected request always fully
 * refunds the user regardless of what their balance has done since
 * (e.g. new deposits, new bonuses) in the meantime.
 */
export async function rejectCombinedWithdrawal(request) {
  const { userId, breakdown } = request;

  await runTransaction(db, async (transaction) => {
    // Firestore transactions require every read to happen before any
    // write — mixing get() and update() calls (as the previous version
    // did, one balance at a time) throws at runtime the moment a second
    // read follows a write. All reads are gathered first here, then all
    // writes are applied, so this works regardless of how many balances
    // a given request touches.
    const userRef = breakdown.referral > 0 || breakdown.welcome > 0 ? doc(db, USERS_COLLECTION, userId) : null;
    const userSnap = userRef ? await transaction.get(userRef) : null;

    const checkinRef = breakdown.checkIn > 0 ? doc(db, CHECKINS_COLLECTION, userId) : null;
    const checkinSnap = checkinRef ? await transaction.get(checkinRef) : null;

    const depositRefs = breakdown.vipProfit > 0 && breakdown.perInvestmentDraws
      ? breakdown.perInvestmentDraws.map((d) => doc(db, DEPOSITS_COLLECTION, d.depositId))
      : [];
    const depositSnaps = [];
    for (const ref of depositRefs) {
      depositSnaps.push(await transaction.get(ref));
    }

    // All reads are done — now safe to write.
    if (userRef && userSnap && userSnap.exists()) {
      const userData = userSnap.data();
      transaction.update(userRef, {
        referralBonusTotal: (userData.referralBonusTotal || 0) + breakdown.referral,
        welcomeBonus: (userData.welcomeBonus || 0) + breakdown.welcome,
        // Refund reverses the lifetime-withdrawn counters set at request
        // time (see requestWithdrawal above) — clamped at 0 as a safety
        // floor, matching the same Math.max(0, ...) pattern used for the
        // checkin/deposit lifetimeWithdrawn refunds just below.
        referralLifetimeWithdrawn: Math.max(0, (userData.referralLifetimeWithdrawn || 0) - breakdown.referral),
        welcomeLifetimeWithdrawn: Math.max(0, (userData.welcomeLifetimeWithdrawn || 0) - breakdown.welcome),
      });
    }

    if (checkinRef && checkinSnap && checkinSnap.exists()) {
      const checkinData = checkinSnap.data();
      transaction.update(checkinRef, {
        unlockedBalance: (checkinData.unlockedBalance || 0) + breakdown.checkIn,
        lifetimeWithdrawn: Math.max(0, (checkinData.lifetimeWithdrawn || 0) - breakdown.checkIn),
      });
    }

    if (breakdown.vipProfit > 0 && breakdown.perInvestmentDraws) {
      breakdown.perInvestmentDraws.forEach((d, idx) => {
        const depositSnap = depositSnaps[idx];
        if (depositSnap && depositSnap.exists()) {
          const depositData = depositSnap.data();
          transaction.update(depositRefs[idx], {
            lifetimeWithdrawn: Math.max(0, (depositData.lifetimeWithdrawn || 0) - d.amount),
          });
        }
      });
    }

    const requestRef = doc(db, WITHDRAWAL_REQUESTS_COLLECTION, request.id);
    transaction.update(requestRef, { status: "rejected", decidedAt: Date.now() });
  });

  await createNotification(userId, "withdrawal", `Your withdrawal request for ₦${request.amount.toLocaleString()} was rejected and refunded to your balance.`);
}
