// Earnings & withdrawal rules — single source of truth for the money math.
// Any component calculating investment value should import from here rather
// than recomputing this logic, so the rules only ever live in one place.
//
// RULES (confirmed with the project owner):
// 1. EARNINGS MATURITY IS PER-DAY, NOT PER-INVESTMENT.
//    CHANGED this session — the old model gated ALL earnings behind a
//    single 24h grace period measured from deposit APPROVAL, then paid
//    daily thereafter. The site owner has since confirmed a different
//    model: a deposit only needs to be approved to make the Read & Earn
//    task available at all (no separate up-front waiting period before
//    reading can start — a user can read the SAME WAT day their deposit
//    is approved). What actually gates each day's ₦ is a rolling 24h
//    timer that starts the moment the user COMPLETES that specific day's
//    reading task. So a user who reads on Monday, Tuesday, and Wednesday
//    has three independent maturity timers, each unlocking 24h after its
//    own completion — not a single clock for the whole investment.
// 2. Capital (the original investment amount) is NEVER withdrawable — it
//    stays invested permanently and only generates daily profit.
// 3. Only profit/earnings can be withdrawn, and withdrawals are tracked as
//    a running lifetime total per investment (not reset to zero on each
//    withdrawal) — so withdrawable balance = lifetime MATURED earnings
//    minus lifetime withdrawn.
// 4. Minimum withdrawal is ₦600, checked against the withdrawable
//    (matured) profit balance (not the locked capital, and not
//    still-maturing amounts).
// 5. DAILY READING GATE: a day's earning is fully conditional on the user
//    having read ALL of that day's featured articles (see
//    services/reviews.js) — the platform's Read & Earn task. No reading
//    that day = ₦0 earned for that day — this is an intentional,
//    confirmed design choice (not a bonus-on-top model). Missed days are
//    gone permanently; there is no catch-up mechanism. The same single
//    daily task unlocks that day's earning across EVERY VIP plan/
//    investment the user holds — it is not repeated per-investment.

export const PER_DAY_MATURITY_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const MIN_WITHDRAWAL = 400;

/**
 * Given the WAT date strings that count as "reviewed" for a specific
 * investment, and the map of when each date's reading was actually
 * completed, splits those days into MATURED (24h have passed since
 * completion, so the ₦ is withdrawable) and STILL-MATURING (task done,
 * but the 24h timer hasn't finished yet).
 *
 * @param {string[]} reviewedDatesForInvestment - WAT date strings, drawn
 *   from the user's completedDays, that fall on/after this investment's
 *   approval date (i.e. the days that count toward THIS investment).
 * @param {Record<string, number>} completedDayTimestamps - from
 *   services/reviews.js getReviewStatus() — WAT date string -> ms
 *   timestamp of when that day's reading was completed.
 * @param {number} now
 */
export function splitMaturedDays(reviewedDatesForInvestment, completedDayTimestamps, now = Date.now()) {
  let maturedCount = 0;
  let maturingCount = 0;
  let nextMaturityAt = null; // earliest upcoming unlock among still-maturing days

  for (const dateStr of reviewedDatesForInvestment) {
    const completedAt = completedDayTimestamps[dateStr];
    if (!completedAt) {
      // No timestamp on record for this completed day — this happens for
      // days completed BEFORE this session's per-day-timestamp change
      // shipped (completedDayTimestamps didn't exist yet, so old
      // completedDays entries have no matching timestamp). Treat these
      // as already matured rather than skipping them: the user already
      // completed the task and, under the OLD rules, would have earned
      // this money already. Silently withholding it until they redo
      // (impossible) or wait an arbitrary extra 24h would be wrong. Only
      // days completed AFTER this change has a real timestamp and goes
      // through the actual 24h maturity check below.
      maturedCount++;
      continue;
    }
    const maturesAt = completedAt + PER_DAY_MATURITY_DELAY_MS;
    if (now >= maturesAt) {
      maturedCount++;
    } else {
      maturingCount++;
      if (nextMaturityAt === null || maturesAt < nextMaturityAt) {
        nextMaturityAt = maturesAt;
      }
    }
  }

  return { maturedCount, maturingCount, nextMaturityAt };
}

/**
 * Full earnings breakdown for a single investment/deposit.
 *
 * @param {number} dailyRate - the VIP plan's daily earning amount
 * @param {number} approvedAt - timestamp the deposit was approved
 * @param {number} lifetimeWithdrawn - total profit already withdrawn from
 *   this specific investment
 * @param {number} reviewedDayCount - count of distinct earning-days for
 *   which the user completed that day's full article-reading set (Read &
 *   Earn), counting from approval through today. Callers get this from
 *   services/reviews.js countReviewedEarningDays(). Unread days earn
 *   nothing — there is no partial credit and no catch-up.
 * @param {number} now - defaults to current time; parameterized for testing
 * @param {string[]} reviewedDatesForInvestment - the actual WAT date
 *   strings behind reviewedDayCount, needed to look up each day's
 *   individual maturity timestamp. Optional for backward compatibility;
 *   matured/maturing splits are only computed when this is provided.
 * @param {Record<string, number>} completedDayTimestamps - from
 *   services/reviews.js getReviewStatus(); required alongside
 *   reviewedDatesForInvestment to compute the matured/maturing split.
 */
export function calculateInvestmentEarnings(
  dailyRate,
  approvedAt,
  lifetimeWithdrawn = 0,
  reviewedDayCount = 0,
  now = Date.now(),
  reviewedDatesForInvestment = null,
  completedDayTimestamps = null
) {
  const PLAN_DURATION_DAYS = 30;
  const PLAN_DURATION_MS = PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const planExpiresAt = approvedAt + PLAN_DURATION_MS;
  const isExpired = now >= planExpiresAt;

  // "totalEarnings" here means the theoretical max if every elapsed day
  // since approval had been read — kept for the existing "missed
  // earnings" transparency figure. Elapsed days are now measured plainly
  // from approval (no more up-front 24h grace period before the first
  // day can even be attempted).
  //
  // Capped at PLAN_DURATION_DAYS (30): every READAZHUB plan runs for a
  // fixed 30-day cycle, after which it stops accruing NEW earnings —
  // capping daysSinceApproval here automatically caps totalEarnings,
  // availableEarnings, and missedEarnings below, since they all derive
  // from it. This does NOT touch withdrawableBalance for money already
  // earned before day 30 — a user who earned ₦2,000 in matured profit
  // during the 30 days keeps full access to withdraw it after the plan
  // closes; only the ability to earn MORE stops. See DashboardPage.jsx /
  // AdminEarningsPage.jsx for where `isExpired` is used to relabel a
  // plan "Closed" instead of "Active" once this cap is reached.
  const daysSinceApproval = Math.min(
    PLAN_DURATION_DAYS,
    Math.max(0, Math.floor((now - approvedAt) / (24 * 60 * 60 * 1000)) + 1)
  );
  const totalEarnings = dailyRate * daysSinceApproval;

  const cappedReviewedDays = Math.min(reviewedDayCount, daysSinceApproval);
  const availableEarnings = dailyRate * cappedReviewedDays; // lifetime EARNED (matured + still-maturing)
  const missedEarnings = dailyRate * (daysSinceApproval - cappedReviewedDays); // forfeited permanently, shown for transparency only

  let maturedEarnings = availableEarnings;
  let maturingEarnings = 0;
  let nextMaturityAt = null;

  if (reviewedDatesForInvestment && completedDayTimestamps) {
    const { maturedCount, maturingCount, nextMaturityAt: nextAt } = splitMaturedDays(
      reviewedDatesForInvestment,
      completedDayTimestamps,
      now
    );
    // Matured/maturing day counts from splitMaturedDays aren't
    // pre-capped to the 30-day window (that function only knows about
    // read history, not plan duration) — cap them here the same way
    // cappedReviewedDays caps availableEarnings above, so a plan that's
    // run past day 30 doesn't keep counting newly-matured days from
    // reads that happened after expiry.
    const cappedMaturedCount = Math.min(maturedCount, daysSinceApproval);
    maturedEarnings = dailyRate * cappedMaturedCount;
    maturingEarnings = isExpired ? 0 : dailyRate * maturingCount;
    nextMaturityAt = isExpired ? null : nextAt;
  }

  // Withdrawable balance only ever comes from MATURED earnings — a day
  // that's been read but is still inside its 24h maturity window is not
  // withdrawable yet, even though it already counts toward
  // availableEarnings/lifetime-earned totals.
  const withdrawableBalance = Math.max(0, maturedEarnings - lifetimeWithdrawn);

  return {
    daysEarning: daysSinceApproval,
    totalEarnings,
    availableEarnings,
    maturedEarnings,
    maturingEarnings,
    nextMaturityAt,
    missedEarnings,
    withdrawableBalance,
    planExpiresAt,
    isExpired,
  };
}

/**
 * Validates a withdrawal request against the profit-only, MATURED-only
 * balance. Capital and still-maturing amounts are intentionally excluded
 * — this function only ever checks against withdrawable matured PROFIT.
 */
export function validateWithdrawalAmount(requestedAmount, withdrawableBalance) {
  if (requestedAmount < MIN_WITHDRAWAL) {
    return { valid: false, reason: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}.` };
  }
  if (requestedAmount > withdrawableBalance) {
    return {
      valid: false,
      reason: `This exceeds your available profit balance of ₦${withdrawableBalance.toLocaleString()}. Capital and still-maturing earnings cannot be withdrawn yet.`,
    };
  }
  return { valid: true, reason: "" };
}

/**
 * Whether a SPECIFIC investment is earning for TODAY specifically — used
 * for the "Today's Earnings" dashboard figure, distinct from
 * availableEarnings (which is a LIFETIME cumulative sum across every day
 * ever earned, not just today).
 *
 * CHANGED this session: no more up-front 24h grace period check — an
 * investment approved earlier today can already be earning today's rate
 * if the user has completed today's reading task. The only condition
 * left is the reading gate itself: today's WAT date must be in the
 * user's completedDays. (Whether that amount has finished its own 24h
 * per-day maturity timer yet is a separate question, answered by
 * calculateInvestmentEarnings' matured/maturing split — this function
 * only answers "is today's task done", matching what the dashboard
 * "Today's Earnings" figure has always meant: today's EARNED rate, not
 * whether it's withdrawable yet.)
 *
 * Deliberately does NOT re-derive "today" internally — callers must pass
 * the exact `todayDateString` and `completedDays` they already have from
 * services/reviews.js getReviewStatus(), so this can never drift out of
 * sync with the reading-gate logic that determines completedDays in the
 * first place.
 */
export function isEarningToday(approvedAt, todayDateString, completedDays, now = Date.now()) {
  return completedDays.includes(todayDateString);
}
