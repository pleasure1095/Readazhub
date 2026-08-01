import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MIN_WITHDRAWAL, validateWithdrawalAmount } from "../utils/earnings";
import { createNotification } from "./notifications";

const CHECKINS_COLLECTION = "checkins";
export const CHECKIN_DAILY_REWARD = 100;
export const CHECKIN_STREAK_TARGET = 7;
export const CHECKIN_MAX_REWARD = CHECKIN_DAILY_REWARD * CHECKIN_STREAK_TARGET; // ₦700

// Uses WAT (UTC+1) as the reference timezone for "what day is it", staying
// consistent with the withdrawal-hours convention used elsewhere in the
// app, rather than the user's local device timezone (which could let
// someone game the streak by changing their phone's clock/timezone).
function getWATDateString(timestamp = Date.now()) {
  const watMs = timestamp + 60 * 60 * 1000; // UTC+1
  const d = new Date(watMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function daysBetweenDateStrings(a, b) {
  const dateA = new Date(a + "T00:00:00Z");
  const dateB = new Date(b + "T00:00:00Z");
  return Math.round((dateB - dateA) / (1000 * 60 * 60 * 24));
}

const DEFAULT_STATUS = {
  currentStreak: 0,
  longestStreak: 0,
  totalCheckIns: 0,
  lastCheckInDate: null,
  unlockedBalance: 0, // withdrawable — credited instantly per check-in, same as Referral/Welcome bonuses
  lifetimeWithdrawn: 0,
};

/**
 * Fetches a user's check-in record, or a default zeroed-out shape if
 * they've never checked in before.
 */
export async function getCheckInStatus(userId) {
  const snap = await getDoc(doc(db, CHECKINS_COLLECTION, userId));
  const today = getWATDateString();

  if (!snap.exists()) {
    return { ...DEFAULT_STATUS, checkedInToday: false, today };
  }

  const data = snap.data();
  return { ...DEFAULT_STATUS, ...data, checkedInToday: data.lastCheckInDate === today, today };
}

/**
 * Records today's check-in and credits ₦100 straight to the withdrawable
 * balance immediately — no 7-day lock/hold.
 *
 * Changed from an earlier design where ₦100/day accrued into a locked
 * `pendingReward` that only unlocked as one ₦700 lump sum after 7
 * CONSECUTIVE days (forfeiting everything if a day was missed before
 * day 7). Per the site owner's explicit request, Check-In now behaves
 * like Referral Bonus and Welcome Bonus — both of which already credit
 * straight to a withdrawable balance the instant they're earned, with no
 * waiting period. The streak counter is kept for display/engagement
 * purposes only (so the app can still show "5 day streak!") — it no
 * longer gates or forfeits any money.
 */
export async function performCheckIn(userId) {
  const status = await getCheckInStatus(userId);
  if (status.checkedInToday) return status;

  const today = status.today;
  const continuingStreak = status.lastCheckInDate && daysBetweenDateStrings(status.lastCheckInDate, today) === 1;
  const newStreak = continuingStreak ? status.currentStreak + 1 : 1;

  const updated = {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, status.longestStreak || 0),
    totalCheckIns: (status.totalCheckIns || 0) + 1,
    lastCheckInDate: today,
    unlockedBalance: (status.unlockedBalance || 0) + CHECKIN_DAILY_REWARD,
    lifetimeWithdrawn: status.lifetimeWithdrawn || 0,
  };

  await setDoc(doc(db, CHECKINS_COLLECTION, userId), updated);

  await createNotification(userId, "checkin", `✅ Checked in! ₦${CHECKIN_DAILY_REWARD.toLocaleString()} added to your withdrawable balance.`);

  return { ...updated, checkedInToday: true, today };
}

/**
 * Withdraws from the unlocked check-in balance. Follows the same rules as
 * VIP profit withdrawals: minimum withdrawal amount and the day-of-week
 * WAT withdrawal window (Mon-Sat 9AM-6PM, Sun 11AM-4PM), validated by the
 * caller before calling this, same pattern as WithdrawModal for VIP
 * investments.
 */
export async function withdrawCheckInBalance(userId, amount, currentUnlockedBalance, currentLifetimeWithdrawn) {
  const validation = validateWithdrawalAmount(amount, currentUnlockedBalance);
  if (!validation.valid) throw new Error(validation.reason);

  await updateDoc(doc(db, CHECKINS_COLLECTION, userId), {
    unlockedBalance: currentUnlockedBalance - amount,
    lifetimeWithdrawn: (currentLifetimeWithdrawn || 0) + amount,
  });

  await createNotification(userId, "withdrawal", `Check-in bonus withdrawal of ₦${amount.toLocaleString()} submitted.`);
}
