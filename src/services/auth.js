import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { genReferralCode } from "../utils/referral";

const USERS_COLLECTION = "users";
export const WELCOME_BONUS = 500;

/**
 * Fetches a user's Firestore profile document by uid.
 * Returns null if it doesn't exist (shouldn't normally happen,
 * but guards against partial signups / manual Firestore edits).
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

/**
 * Looks up a user document by referral code. Used at registration
 * time to validate an optional referral code the new user entered.
 */
export async function findUserByReferralCode(code) {
  if (!code) return null;
  const q = query(
    collection(db, USERS_COLLECTION),
    where("referralCode", "==", code.trim().toUpperCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { uid: docSnap.id, ...docSnap.data() };
}

/**
 * Registers a new user: creates the Firebase Auth account, then creates
 * the matching Firestore profile document. If the Firestore write fails
 * after the Auth account is created, we still return the auth user —
 * the caller can decide how to handle a partial signup.
 *
 * NOTE ON PASSWORDS: Firebase Auth enforces a 6-character minimum by default,
 * not our app's 8-digit rule. We validate the 8-digit rule client-side before
 * calling this, but the *authoritative* password rule lives in Firebase Auth
 * itself. See Stage 1 security notes below.
 */
export async function registerUser({ name, email, password, phone, refCode }) {
  const normalizedEmail = email.trim().toLowerCase();

  const credential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password
  );
  const uid = credential.user.uid;

  // Referral code lookup must happen AFTER sign-in, not before — Firestore
  // rules require isSignedIn() to read the users collection, and there is
  // no auth session yet before createUserWithEmailAndPassword() resolves.
  // Looking it up earlier caused every referred signup to fail with a
  // permission-denied error surfaced to the user as "Something went wrong."
  let referrerCode = "";
  let referrerOfReferrerCode = "";
  if (refCode && refCode.trim()) {
    const referrer = await findUserByReferralCode(refCode);
    if (referrer) {
      referrerCode = referrer.referralCode;
      // Level 2 chain: resolve the referrer's OWN referrer at signup time
      // and store it directly on the new user, rather than re-looking-up
      // the chain every time a Level 2 bonus needs to be paid. This is a
      // point-in-time snapshot — if the referrer's own referrerCode is
      // ever reassigned or corrected later (not currently possible via
      // any UI action, but noted for completeness), it will NOT
      // retroactively update already-registered downstream users.
      referrerOfReferrerCode = referrer.referrerCode || "";
    }
  }

  const referralCode = await genReferralCode(name, db);

  const profile = {
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : "",
    role: "user",
    referralCode,
    referrerCode,
    referrerOfReferrerCode,
    // Referral bonus is now LIVE-COMPUTED (9% Level 1 / 2% Level 2 of
    // each referred user's actual daily earnings, recurring for as long
    // as their investment earns) — see services/referralEarnings.js.
    // referralLifetimeWithdrawn is the ONLY stored field: a running
    // counter of how much of that live-computed total has already been
    // withdrawn, mirroring exactly how a VIP investment's own
    // lifetimeWithdrawn works against its live-computed totalEarnings.
    referralLifetimeWithdrawn: 0,
    // ₦500 welcome bonus, credited once at registration only — existing
    // users created before this feature don't have this field, which is
    // intentional (confirmed: no retroactive credit for pre-existing
    // accounts). Withdrawable identically to referral bonus earnings for
    // balance and withdrawal purposes: always part of the overall withdrawable
    // total, subject to the same ₦600 minimum withdrawal rule as
    // everything else — not a separate pot with its own rules.
    welcomeBonus: WELCOME_BONUS,
    createdAt: Date.now(),
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), profile);

  return { uid, ...profile };
}

/**
 * Logs a user in with email/password, then loads their Firestore profile.
 * Throws if either step fails so the caller can show an appropriate error.
 */
export async function loginUser({ email, password }) {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );
  const profile = await getUserProfile(credential.user.uid);
  if (!profile) {
    throw new Error(
      "Account exists but profile data is missing. Please contact support."
    );
  }
  return profile;
}

export async function logoutUser() {
  await signOut(auth);
}

/**
 * Updates editable profile fields (name, phone) in Firestore.
 * Email is intentionally not editable here — changing Firebase Auth email
 * requires re-authentication and is handled separately if ever needed.
 */
export async function updateUserProfile(uid, { name, phone }) {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    name: name.trim(),
    phone: phone.trim(),
  });
}

/**
 * Saves the user's bank details to their profile so future withdrawals
 * can auto-fill instead of re-typing bank/account number/account name
 * every single time. Stored as a single nested object (savedBankDetails)
 * rather than three separate top-level fields — keeps it self-contained
 * and easy to check for existence (`if (user.savedBankDetails)`) without
 * needing to check three fields individually.
 *
 * This is a genuinely separate concern from updateUserProfile (name/
 * phone) — kept as its own function so Settings' "Save Bank Details"
 * action doesn't need to also resend name/phone just to update one
 * nested object, and vice versa.
 */
export async function saveBankDetails(uid, { bank, accNo, accName }) {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    savedBankDetails: {
      bank,
      accNo,
      accName,
      updatedAt: Date.now(),
    },
  });
}

/**
 * Re-authenticates the current user with their existing password.
 * Required before Firebase will allow a password change if the user's
 * session isn't "recent" (Firebase's own security requirement, not ours).
 * Call this when changePassword() throws "auth/requires-recent-login".
 */
export async function reauthenticateUser(currentPassword) {
  if (!auth.currentUser) throw new Error("Not signed in.");
  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
}

/**
 * Updates the current user's password via Firebase Auth.
 * Firebase requires a recently-authenticated session for this to succeed;
 * if it fails with "auth/requires-recent-login", the caller should prompt
 * the user for their current password and call reauthenticateUser() first,
 * then retry.
 */
export async function changePassword(newPassword) {
  if (!auth.currentUser) throw new Error("Not signed in.");
  await fbUpdatePassword(auth.currentUser, newPassword);
}
