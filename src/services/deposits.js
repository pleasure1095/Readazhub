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
import { db } from "./firebase";
import { VIPS } from "../utils/vipPlans";
import { createNotification } from "./notifications";
import { creditReferralBonusIfEligible } from "./adminUsers";

const DEPOSITS_COLLECTION = "deposits";

// Cloudinary unsigned-upload config. "Unsigned" means the upload happens
// directly from the browser with no backend/API-secret involved — safe
// to expose in client code, since an unsigned preset can only ever
// upload (never delete/list/manage) and is scoped to whatever folder/
// transformation rules were set on the preset itself in Cloudinary's
// dashboard. This replaces an earlier, never-working Firebase Storage
// integration — Storage requires the paid Blaze plan, which this project
// intentionally doesn't use, so every screenshot upload was silently
// failing before this change (caught and swallowed, so deposits still
// submitted, just always with screenshotUrl: null).
const CLOUDINARY_CLOUD_NAME = "dn9iipzwl";
const CLOUDINARY_UPLOAD_PRESET = "tpruhzjg";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

function genRef() {
  return "VDE-" + Math.random().toString(36).toUpperCase().slice(2, 8) + "-" + Date.now().toString(36).toUpperCase().slice(-4);
}

/**
 * Compresses an image file client-side before upload, to conserve
 * Cloudinary's free-tier quota (25 credits/month ≈ 5GB storage + 10GB
 * bandwidth on a rolling 30-day window) — a raw phone-camera screenshot
 * can easily be 3-5MB, and this app expects meaningful deposit volume
 * over time, so uncompressed uploads would burn through the free tier
 * fast. Downscales to a max dimension of 1600px (plenty for a payment
 * screenshot to stay legible — these are simple text/UI screenshots, not
 * detailed photography where downscaling would lose meaningful detail)
 * and re-encodes as JPEG at 0.75 quality.
 *
 * Runs entirely in the browser via Canvas — no server/library dependency
 * needed. Falls back to the original file if compression fails for any
 * reason (e.g. an unusual file type Canvas can't decode), so a
 * compression bug can never block a legitimate deposit submission.
 */
function compressImage(file, maxDimension = 1600, quality = 0.75) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // compression failed, fall back to original
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // couldn't decode, fall back to original
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads an optional payment screenshot to Cloudinary and returns its
 * secure (https) delivery URL. Returns null if no file is provided —
 * screenshots are optional as long as a transaction reference is
 * supplied instead.
 *
 * Compresses the image client-side first (see compressImage above) to
 * conserve the free-tier quota, then uploads via Cloudinary's unsigned
 * upload endpoint using the preset configured in Cloudinary's dashboard
 * (Settings → Upload → Upload presets → Signing Mode: Unsigned).
 *
 * Upload failures here are intentionally non-fatal: logged and
 * swallowed rather than thrown, since a working transaction reference
 * should be enough to submit a deposit even if the screenshot upload
 * itself couldn't complete. The caller (submitDeposit) still requires at
 * least one proof method before allowing submission at all.
 *
 * Races against a 10s timeout (slightly longer than the old Storage
 * version's 8s, since compression + upload together take a bit more
 * time than upload alone) so a slow/stalled connection can never leave
 * the Submit button hung indefinitely.
 */
async function uploadScreenshot(userId, file) {
  if (!file) return null;
  try {
    const compressedFile = await compressImage(file);

    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    // Organizes uploads by user in Cloudinary's own folder view, purely
    // for the admin's own browsing convenience if they ever need to look
    // directly in the Cloudinary dashboard — not read by this app.
    formData.append("folder", `readazhub-deposits/${userId}`);

    const uploadPromise = fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
      return res.json();
    });

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 10000));

    const result = await Promise.race([uploadPromise, timeoutPromise]);
    return result?.secure_url || null;
  } catch (err) {
    console.error("Screenshot upload failed (continuing without it):", err);
    return null;
  }
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
 * Submits a new deposit for admin review. planId must match a key in
 * VIPS (utils/vipPlans.js) — amount and daily rate are derived from that
 * shared source rather than trusted from the caller, so a tampered client
 * request can't submit an arbitrary amount.
 *
 * Proof of payment is a transaction reference and/or a screenshot — the
 * caller (DepositModal.jsx) enforces that at least one of the two is
 * provided before calling this, streamlined from an earlier version that
 * also collected a sender name and free-text description.
 */
export async function submitDeposit({ userId, userName, userEmail, planId, amountPaid, txRef, narrationCode, screenshotFile }) {
  const plan = VIPS[planId];
  if (!plan) throw new Error("Invalid VIP plan selected.");
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
    amountPaid,
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
 * Immediately credits a ONE-TIME flat referral bonus (9% level 1, 2%
 * level 2 of the deposit amount) to the referrer(s), if any — see
 * services/adminUsers.js creditReferralBonusIfEligible. This is the
 * moment the referred user has paid for an active plan, so it's the
 * moment the referral bonus is paid too.
 *
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

  await creditReferralBonusIfEligible({ ...deposit, id: deposit.id });

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
