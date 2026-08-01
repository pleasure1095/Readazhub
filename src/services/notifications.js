import { collection, addDoc, updateDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

const NOTIFS_COLLECTION = "notifications";

/**
 * Sorted client-side to avoid requiring a Firestore composite index
 * (see the same note in services/deposits.js getUserDeposits).
 */
export async function getUserNotifications(userId) {
  const q = query(collection(db, NOTIFS_COLLECTION), where("userId", "==", userId));
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return results.sort((a, b) => b.ts - a.ts);
}

export async function createNotification(userId, type, msg) {
  await addDoc(collection(db, NOTIFS_COLLECTION), {
    userId,
    type,
    msg,
    ts: Date.now(),
    read: false,
  });
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, NOTIFS_COLLECTION, notifId), { read: true });
}
