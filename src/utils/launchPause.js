/**
 * ONE-TIME LAUNCH PAUSE — per the site owner's explicit request for the
 * platform's relaunch on August 26, 2026.
 *
 * From now until LAUNCH_PAUSE_ENDS_AT:
 * - ALL earnings are frozen: the daily reading task cannot be completed
 *   (services/reviews.js markArticleRead throws), and no day counts
 *   toward earnings even if a completion is attempted.
 * - ALL withdrawals are blocked (services/withdrawalRequests.js
 *   requestCombinedWithdrawal throws).
 * - Applies to EVERY user — existing/already-upgraded accounts AND any
 *   new signups between now and the cutoff. There is no exemption list.
 * - Dashboard shows a live countdown to this timestamp for already-
 *   upgraded users (see PlanCountdown-style countdown in
 *   pages/DashboardPage.jsx).
 *
 * IMPORTANT — this is a ONE-TIME, DATED PAUSE, not a permanent feature.
 * Once LAUNCH_PAUSE_ENDS_AT passes, isLaunchPauseActive() simply
 * returns false forever after and every check below becomes a no-op —
 * nothing further needs to be deleted or toggled off manually. This
 * file is safe to leave in place after launch; it will not re-trigger
 * for any future date.
 *
 * Cutoff: August 26, 2026, 12:00 PM WAT (UTC+1) = 11:00 AM UTC.
 * As confirmed by the site owner: any reading-task completion recorded
 * for "today" (Aug 26, WAT) BEFORE this pause was put in place needed
 * to be reverted — see the one-time migration script
 * scripts/revertTodayCompletionsForLaunchPause.md for that data fix,
 * which is separate from (and only needs to run once, before) this
 * ongoing runtime check.
 */
export const LAUNCH_PAUSE_ENDS_AT = 1787742000000; // Aug 26 2026, 12:00 PM WAT / 11:00 AM UTC

export function isLaunchPauseActive(now = Date.now()) {
  return now < LAUNCH_PAUSE_ENDS_AT;
}
