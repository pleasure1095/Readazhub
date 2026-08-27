import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { getTodaysArticles } from "../utils/articles";

const REVIEWS_COLLECTION = "reviews";
const RATING_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// WAT (UTC+1) day boundary, consistent with check-in and withdrawal-hours
// conventions used elsewhere in the app.
function getWATDateString(timestamp = Date.now()) {
  const watMs = timestamp + 60 * 60 * 1000;
  const d = new Date(watMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function watDateStringToDayIndex(dateString) {
  return Math.floor(new Date(dateString + "T00:00:00Z").getTime() / (24 * 60 * 60 * 1000));
}

function todayDayIndex() {
  return watDateStringToDayIndex(getWATDateString());
}

/**
 * Fetches a user's reading record: which WAT dates they've fully
 * completed (read every featured article that day), today's in-progress
 * reads (in case they've read some but not all of today's articles), and
 * whether they're currently locked out by the 24h rolling cooldown.
 *
 * CHANGED this session: this used to be a per-product 1-5 STAR RATING
 * system ("Daily Reviews" — rate all of today's featured products).
 * Per the site owner's request, the platform is now Read & Earn: the
 * task is simply reading each of today's featured ARTICLES in full
 * (tracked as "read" once opened, no rating involved). The underlying
 * completion/cooldown/earnings-gating mechanism is UNCHANGED and reused
 * as-is — only the content source (articles instead of products) and
 * the completion action (mark-as-read instead of a 1-5 star rating)
 * changed. This is intentional: the day-completion logic, the 24h
 * rolling cooldown, and countReviewedEarningDays() below were all
 * hand-verified in an earlier session and carry real money
 * consequences, so reusing them exactly rather than rewriting from
 * scratch avoids reintroducing bugs that were already fixed once.
 *
 * IMPORTANT — two independent clocks, on purpose (unchanged from before):
 *  - WHICH ARTICLES ARE SHOWN and WHICH DAYS COUNT TOWARD EARNINGS still
 *    run on the existing shared WAT-calendar-day system (completedDays,
 *    getTodaysArticles) — this is UNCHANGED, since earnings math
 *    (countReviewedEarningDays in this file, calculateInvestmentEarnings
 *    in utils/earnings.js) already depends on it and was hand-verified
 *    this session; rebuilding it around a per-user rolling clock would
 *    risk reintroducing that exact class of bug.
 *  - WHETHER THE "MARK AS READ" BUTTONS ARE ENABLED is a SEPARATE, new
 *    24h rolling check based on `lastRatingAt` (kept as the field name
 *    for continuity with existing Firestore documents — see note in
 *    markArticleRead below) — a user who finishes reading at 11pm is
 *    locked out until 11pm the NEXT day, even though the featured
 *    articles themselves may have already switched to a new calendar
 *    day's set at WAT midnight in between. They'll see new articles, but
 *    can't mark them read until their personal 24h timer runs out.
 */
export async function getReviewStatus(userId) {
  const snap = await getDoc(doc(db, REVIEWS_COLLECTION, userId));
  const today = getWATDateString();
  const todaysArticles = getTodaysArticles(todayDayIndex());
  const now = Date.now();

  if (!snap.exists()) {
    return { completedDays: [], completedDayTimestamps: {}, readArticleIds: [], today, todaysArticles, lastRatingAt: null, cooldownActive: false, cooldownEndsAt: null };
  }

  const data = snap.data();
  const readArticleIds = data.lastRatingDate === today ? data.readArticleIds || [] : [];
  const lastRatingAt = data.lastRatingAt || null;
  const cooldownEndsAt = lastRatingAt ? lastRatingAt + RATING_COOLDOWN_MS : null;
  const cooldownActive = cooldownEndsAt != null && now < cooldownEndsAt;

  return {
    completedDays: data.completedDays || [],
    // Per-day completion timestamp — WAT date string -> the exact
    // moment the user finished reading ALL of that day's articles.
    // This is what the 24h-per-day maturity timer is measured from
    // (see utils/earnings.js), distinct from `today` (calendar date,
    // used only for the reading-gate/which-articles-are-shown logic).
    completedDayTimestamps: data.completedDayTimestamps || {},
    readArticleIds,
    today,
    todaysArticles,
    lastRatingAt,
    cooldownActive,
    cooldownEndsAt,
  };
}

/**
 * Marks one of today's articles as read. If this completes reading for
 * ALL of today's articles, marks today as a completed reading-day, which
 * is what unlocks that day's VIP earnings.
 *
 * Field names (`lastRatingAt`, `lastRatingDate`, `RATING_COOLDOWN_MS`)
 * are deliberately UNCHANGED from the earlier star-rating design, even
 * though "rating" no longer accurately describes what's happening. This
 * is a conscious tradeoff: renaming these would mean either a one-time
 * Firestore migration script touching every existing user's review
 * document (real risk of a bug silently losing someone's completedDays
 * history, which is what earnings math depends on), or juggling both old
 * and new field names as a permanent compatibility shim. Renaming
 * variables in code costs nothing; renaming fields in a live money-
 * bearing database costs real risk for zero user-facing benefit — the
 * field names are never shown to a user, only read by this file.
 *
 * The 24h rolling cooldown only STARTS once a full day's set is
 * COMPLETED (allRead === true) — not after marking every individual
 * article. Setting it after each single read would lock a user out
 * partway through reading today's 3 articles (e.g. blocked from opening
 * article 2 just because they finished article 1 a minute earlier),
 * which defeats the purpose entirely. Enforced server-side (not just in
 * the UI) — throws if called while a previous COMPLETED day's cooldown
 * is still active, so a user can't bypass the lockout by calling this
 * directly.
 */
export async function markArticleRead(userId, articleId) {
  const status = await getReviewStatus(userId);
  if (status.cooldownActive) {
    const hoursLeft = Math.ceil((status.cooldownEndsAt - Date.now()) / (60 * 60 * 1000));
    throw new Error(`You can read again in about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"}.`);
  }

  const updatedReadIds = status.readArticleIds.includes(articleId)
    ? status.readArticleIds
    : [...status.readArticleIds, articleId];

  const allRead = status.todaysArticles.every((a) => updatedReadIds.includes(a.id));
  const updatedCompletedDays = allRead && !status.completedDays.includes(status.today)
    ? [...status.completedDays, status.today]
    : status.completedDays;

  const now = Date.now();

  // Stamps the exact moment TODAY's reading was completed. This is now
  // the anchor for that day's earnings maturity: per the site owner,
  // each day's earning becomes withdrawable 24h after the user actually
  // completed that day's task — NOT 24h after deposit approval. Every
  // completed day gets its own independent timestamp/timer, keyed by
  // WAT date string so it survives across investments (the task is
  // shared across all of a user's VIP plans, not per-investment).
  // Only written once per day (first completion), matching completedDays
  // semantics — re-completing an already-completed day is a no-op here.
  const updatedCompletedDayTimestamps = allRead && !(status.today in status.completedDayTimestamps)
    ? { ...status.completedDayTimestamps, [status.today]: now }
    : status.completedDayTimestamps;

  // Only stamp lastRatingAt (which starts the 24h cooldown) once the
  // full set is complete — reading only 1 or 2 of 3 articles should NOT
  // start the clock, since the user still needs to read the remaining
  // articles in this same sitting.
  const docUpdate = {
    completedDays: updatedCompletedDays,
    completedDayTimestamps: updatedCompletedDayTimestamps,
    readArticleIds: updatedReadIds,
    lastRatingDate: status.today,
  };
  if (allRead) {
    docUpdate.lastRatingAt = now;
  }

  await setDoc(doc(db, REVIEWS_COLLECTION, userId), docUpdate, { merge: true });

  const cooldownEndsAt = allRead ? now + RATING_COOLDOWN_MS : status.cooldownEndsAt;
  return {
    completedDays: updatedCompletedDays,
    completedDayTimestamps: updatedCompletedDayTimestamps,
    readArticleIds: updatedReadIds,
    today: status.today,
    todaysArticles: status.todaysArticles,
    allReadToday: allRead,
    lastRatingAt: allRead ? now : status.lastRatingAt,
    cooldownActive: allRead,
    cooldownEndsAt,
  };
}

/**
 * Counts how many of an investment's elapsed earning-days fall on a WAT
 * date the user FULLY completed (read every featured article that day)
 * — this is the `reviewedDayCount` figure utils/earnings.js needs. There
 * is no partial credit and no catch-up: a day not fully read earns
 * nothing for that day, permanently.
 *
 * FIXED this session: the previous version computed a single
 * `startDayIndex` from the earnings-start moment, then checked indices
 * `startDayIndex + i` for `i` in `[0, daysEarning)` — treating daysEarning
 * (a count of elapsed 24-HOUR PERIODS from the exact approval timestamp)
 * as if it lined up with elapsed WAT CALENDAR DAYS. These two clocks
 * drift apart depending on what time of day the deposit was approved: a
 * deposit approved at, say, 10am WAT has its 24h-period boundaries
 * falling mid-day, not at the WAT midnight boundary the review system
 * actually uses — so a user who genuinely reviewed "today" could have
 * their review land on a calendar-day index the old math never checked,
 * making it look like 0 days were reviewed even when they weren't.
 *
 * Fixed by walking WAT calendar days directly, from the earnings-start
 * date through TODAY's WAT date (inclusive), checking each real calendar
 * day rather than an elapsed-period count. Takes `now` instead of
 * `daysEarning` for this reason — callers should pass the same `now`
 * they used for getDaysEarning(), not its result.
 */
export function countReviewedEarningDays(approvedAt, now, completedDays) {
  // CHANGED this session: earnings maturity moved from "24h after
  // deposit approval, then daily thereafter" to "24h after the user
  // completed THAT SPECIFIC day's reading task" — a per-day rolling
  // timer, confirmed by the site owner (see utils/earnings.js file
  // header). Reading can now start the SAME WAT day the deposit is
  // approved — there's no more up-front 24h grace period before the
  // task even becomes eligible. So the day-range walked here starts
  // from the investment's approval date directly (not
  // getEarningsStartTime(approvedAt), which no longer applies to this
  // count). This function still only answers "was this WAT day
  // reviewed" — the actual 24h-per-day MATURITY split (matured vs
  // still-maturing ₦ amounts) is computed separately in
  // utils/earnings.js:calculateInvestmentEarnings from
  // completedDayTimestamps, since that requires per-day timestamps this
  // function (which only sees date strings) doesn't have.
  const completedSet = new Set(completedDays.map(watDateStringToDayIndex));
  const startDayIndex = watDateStringToDayIndex(getWATDateString(approvedAt));
  const todayDayIndex = watDateStringToDayIndex(getWATDateString(now));

  let count = 0;
  for (let idx = startDayIndex; idx <= todayDayIndex; idx++) {
    if (completedSet.has(idx)) count++;
  }
  return count;
}

/**
 * Returns the actual WAT date strings (a subset of completedDays) that
 * count toward a specific investment — i.e. reviewed dates falling on or
 * after that investment's approval date. Added this session alongside
 * the per-day 24h maturity model: utils/earnings.js needs the actual
 * date strings (not just a count) so it can look each one up in
 * completedDayTimestamps and determine which have finished their
 * individual 24h maturity timer and which are still maturing.
 */
export function getReviewedDatesForInvestment(approvedAt, completedDays) {
  const startDayIndex = watDateStringToDayIndex(getWATDateString(approvedAt));
  return completedDays.filter((dateStr) => watDateStringToDayIndex(dateStr) >= startDayIndex);
}
