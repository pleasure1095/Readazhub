import { getUserDeposits } from "./deposits";
import { getUserNotifications } from "./notifications";

/**
 * Builds a unified "Recent Activity" timeline for a user by combining
 * several existing data sources rather than maintaining a separate
 * activity-log collection. Every event type here is derived from data we
 * already store for other reasons (deposits, notifications) — this
 * function's only job is presentation: normalize each into a common
 * {type, title, amount, sign, ts} shape and sort by time.
 *
 * Notifications already cover deposit approval/rejection, referral
 * bonuses, and withdrawal requests, so we don't re-derive those directly
 * from the deposits collection (would double them up) — we read
 * notifications for those events, and read deposits only for the recurring
 * "daily profit" entries notifications don't cover.
 */
export async function getActivityFeed(userId, deposits = null) {
  const [depositList, notifs] = await Promise.all([
    deposits || getUserDeposits(userId),
    getUserNotifications(userId),
  ]);

  const events = [];

  // Notifications already describe deposit approvals/rejections, referral
  // bonuses, withdrawal requests, and check-in unlocks in human-readable
  // form — reuse that text directly rather than re-deriving it.
  for (const n of notifs) {
    let sign = null;
    let amount = null;
    const amountMatch = n.msg.match(/₦([\d,]+)/);
    if (amountMatch) amount = amountMatch[1];

    if (n.type === "approved" || n.type === "referral") sign = "+";
    if (n.type === "withdrawal") sign = "-";
    // withdrawal_paid is a confirmation of an ALREADY-deducted request
    // (the "-₦X submitted — awaiting processing" entry already showed
    // the deduction) — deliberately left with no sign so it doesn't look
    // like a second, separate deduction for the same withdrawal.

    events.push({
      type: n.type,
      title: n.msg,
      amount,
      sign,
      ts: n.ts,
    });
  }

  // Daily profit credits aren't individually logged anywhere (earnings
  // accrue continuously via calculateInvestmentEarnings, not as discrete
  // stored events) — approximate one feed entry per approved deposit at
  // its approval moment, which is the one concrete, real timestamp we do
  // have for each investment.
  //
  // `d.amount || 0` guards against any deposit record missing this field
  // (e.g. malformed/legacy data) — without this, a single bad record
  // crashes the ENTIRE activity feed for that user with "Cannot read
  // properties of undefined (reading 'toLocaleString')", taking down the
  // whole Dashboard rather than just showing one odd-looking ₦0 entry.
  for (const d of depositList) {
    if (d.status === "approved" && d.approvedAt) {
      events.push({
        type: "approved_investment",
        title: `${d.planLabel || "VIP Plan"} activated`,
        amount: (d.amount || 0).toLocaleString(),
        sign: null,
        ts: d.approvedAt,
      });
    }
  }

  return events.sort((a, b) => b.ts - a.ts);
}
