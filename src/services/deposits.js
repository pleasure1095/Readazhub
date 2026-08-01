import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { VIPS } from "../utils/vipPlans";
import { createNotification } from "./notifications";

const DEPOSITS_COLLECTION = "deposits";

function genRef() {
  return "VDE-" + Math.random().toString(36).toUpperCase().slice(2, 8) + "-" + Date.now().toString(36).toUpperCase().slice(-4);
}

/**
 * Fetches all deposits belonging to a specific user, newest first.
 *
 * Sorted client-side rather than via Firestore's orderBy() — combining
 * where() + orderBy() on different fields requires a composite index to
 * be manually created in Firebase Console, which is an easy step to miss
 * (and awkward to set up from a phone). Sorting the small per-user result
 * set in JS avoids that dependency entirely.
 */
export async function getUserDeposits(userId) {
  const q = query(collection(db, DEPOSITS_COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return results.sort((a, b) => b.submittedAt - a.submittedAt);
}

/**
 * Fetches all deposits across all users, for the admin approval queue.
 */
export async function getAllDeposits() {
  const q = query(collection(db, DEPOSITS_COLLECTION), orderBy("submittedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Uploads an optional payment screenshot to Firebase Storage and returns
 * its download URL. Returns null if no file is provided — screenshots are
 * optional as long as a transaction reference is supplied instead.
 *
 * Upload failures here (e.g. Storage not yet enabled/configured on this
 * Firebase project) are intentionally non-fatal: they're logged and
 * swallowed rather than thrown, since a working transaction reference
 * should be enough to submit a deposit even if the screenshot upload
 * itself couldn't complete. The caller (submitDeposit) still requires at
 * least one proof method before allowing submission at all.
 *
 * Race against an 8-second timeout so a slow/stalled network call can
 * never leave the Submit button hung indefinitely — uploadBytes() has no
 * built-in timeout, so without this a bad connection means the person is
 * stuck staring at "Submitting…" with no way forward. On timeout the
 * deposit still submits (see submitDeposit), just without the screenshot
 * attached — the transaction reference/description text still goes
 * through either way.
 */
async function uploadScreenshot(userId, file) {
  if (!file) return null;
  try {
    const path = `deposit-screenshots/${userId}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, path);
    const uploadPromise = uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef));
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve(null), 8000)
    );
    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (err) {
    console.error("Screenshot upload failed (continuing without it):", err);
    return null;
  }
}

/**
 * Submits a new deposit for admin review. planId must match a key in
 * VIPS (utils/vipPlans.js) — amount and daily rate are derived from that
 * shared source rather than trusted from the caller, so a tampered client
 * request can't submit an arbitrary amount.
 *
 * Proof of payment is primarily the sender's name and the amount they
 * report paying — simpler for users than requiring a transaction
 * reference or screenshot, which are now optional extras that speed up
 * admin review but aren't required to submit.
 */
export async function submitDeposit({ userId, userName, userEmail, planId, senderName, amountPaid, proof, txRef, narrationCode, screenshotFile }) {
  const plan = VIPS[planId];
  if (!plan) throw new Error("Invalid VIP plan selected.");
  if (!senderName?.trim()) throw new Error("Enter the name used for the transfer.");
  if (!amountPaid || amountPaid <= 0) throw new Error("Enter the amount you paid.");

  const screenshotUrl = await uploadScreenshot(userId, screenshotFile);
  const reference = genRef();

  const depositData = {
    ref: reference,
    userId,
    userName,
    userEmail,
    planId,
    planLabel: plan.label,
    planDaily: plan.daily,
    amount: plan.amount,
    senderName: senderName.trim(),
    amountPaid,
    proof: proof?.trim() || "",
    txRef: txRef?.trim() || "",
    narrationCode: narrationCode || "",
    screenshotUrl,
    status: "pending",
    lifetimeWithdrawn: 0,
    submittedAt: Date.now(),
  };

  const docRef = await addDoc(collection(db, DEPOSITS_COLLECTION), depositData);
  return { id: docRef.id, ...depositData };
}

/**
 * Admin action: approve a pending deposit. Sets approvedAt, which is the
 * timestamp all earnings calculations key off (see utils/earnings.js —
 * earnings begin 24h after this moment, not after submission).
 *
 * Sends the user an in-app notification. Referral bonus crediting is no
 * longer triggered here — it's now a RECURRING, live-computed 9%/2%
 * (two-level) share of the referred user's actual daily earnings (see
 * services/referralEarnings.js), computed fresh whenever the referrer's
 * own Dashboard loads rather than credited once at approval time.
 * deposit must include userId (pass the full deposit object from the
 * admin queue, not just the id).
 */
export async function approveDeposit(deposit, adminNote = "") {
  await updateDoc(doc(db, DEPOSITS_COLLECTION, deposit.id), {
    status: "approved",
    approvedAt: Date.now(),
    decidedAt: Date.now(),
    adminNote: adminNote.trim(),
  });

  await createNotification(
    deposit.userId,
    "approved",
    `Your deposit of ₦${(deposit.amount || 0).toLocaleString()} (${deposit.planLabel}) has been approved and is now active. Earnings begin in 24 hours.`
  );
}

/**
 * Admin action: reject a pending deposit. No earnings ever accrue since
 * approvedAt is never set.
 */
export async function rejectDeposit(deposit, adminNote = "") {
  await updateDoc(doc(db, DEPOSITS_COLLECTION, deposit.id), {
    status: "rejected",
    decidedAt: Date.now(),
    adminNote: adminNote.trim(),
  });

  await createNotification(
    deposit.userId,
    "rejected",
    `Your deposit of ₦${(deposit.amount || 0).toLocaleString()} (${deposit.ref}) was rejected.${adminNote ? " Reason: " + adminNote : ""}`
  );
}

/**
 * Records a withdrawal request against a specific deposit's accrued
 * profit. This does NOT immediately move money — it logs the request with
 * bank details for the admin to process manually, consistent with the
 * project's manual-payout model (no payment gateway integration).
 *
 * lifetimeWithdrawn is incremented immediately on request rather than on
 * admin fulfillment, preventing a user from requesting the same profit
 * twice while a withdrawal is pending. If a withdrawal is later rejected
 * by an admin, lifetimeWithdrawn should be decremented back (handled in
 * rejectWithdrawal below).
 */
export async function requestWithdrawal(depositId, currentLifetimeWithdrawn, amount, bankDetails, userId) {
  const newLifetimeWithdrawn = currentLifetimeWithdrawn + amount;
  await updateDoc(doc(db, DEPOSITS_COLLECTION, depositId), {
    lifetimeWithdrawn: newLifetimeWithdrawn,
    lastWithdrawalRequest: {
      amount,
      ...bankDetails,
      requestedAt: Date.now(),
      status: "pending",
    },
  });

  await createNotification(
    userId,
    "withdrawal",
    `Withdrawal request for ₦${amount.toLocaleString()} submitted — awaiting processing.`
  );
}

/**
 * Admin action: mark the most recent withdrawal request on a deposit as
 * paid out (funds sent manually via bank transfer outside the app).
 */
export async function markWithdrawalPaid(depositId, lastWithdrawalRequest) {
  await updateDoc(doc(db, DEPOSITS_COLLECTION, depositId), {
    lastWithdrawalRequest: { ...lastWithdrawalRequest, status: "paid", paidAt: Date.now() },
  });
}

/**
 * Admin action: reject a withdrawal request. Restores the withdrawn
 * amount back to the user's available balance since it was never paid out.
 */
export async function rejectWithdrawal(depositId, currentLifetimeWithdrawn, lastWithdrawalRequest) {
  const restoredLifetimeWithdrawn = Math.max(0, currentLifetimeWithdrawn - lastWithdrawalRequest.amount);
  await updateDoc(doc(db, DEPOSITS_COLLECTION, depositId), {
    lifetimeWithdrawn: restoredLifetimeWithdrawn,
    lastWithdrawalRequest: { ...lastWithdrawalRequest, status: "rejected", decidedAt: Date.now() },
  });
}
