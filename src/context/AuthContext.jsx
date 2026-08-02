import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import {
  getUserProfile,
  loginUser,
  registerUser,
  logoutUser,
  updateUserProfile,
  changePassword,
  saveBankDetails,
} from "../services/auth";

const AuthContext = createContext(null);

/**
 * Central auth state for the whole app. Wraps Firebase's onAuthStateChanged
 * listener so any component can read `user` (the Firestore profile, with
 * role/referral info etc.) without re-fetching it themselves.
 *
 * `booting` is true only during the initial auth check on page load —
 * this replaces the old localStorage session check that ran once in App.jsx.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await getUserProfile(fbUser.uid);
          setUser(profile);
        } catch (err) {
          console.error("Failed to load user profile:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setBooting(false);
    });
    return unsubscribe;
  }, []);

  async function login(email, password) {
    const profile = await loginUser({ email, password });
    setUser(profile);
    return profile;
  }

  async function register({ name, email, password, phone, refCode }) {
    const profile = await registerUser({ name, email, password, phone, refCode });
    setUser(profile);
    return profile;
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  async function updateProfile({ name, phone }) {
    if (!user) throw new Error("Not signed in.");
    await updateUserProfile(user.uid, { name, phone });
    setUser((prev) => ({ ...prev, name: name.trim(), phone: phone.trim() }));
  }

  async function updateSavedBankDetails({ bank, accNo, accName }) {
    if (!user) throw new Error("Not signed in.");
    await saveBankDetails(user.uid, { bank, accNo, accName });
    // Optimistic local update, same pattern as updateProfile above — so
    // WithdrawModal can immediately auto-fill from this without needing
    // a full profile refetch right after saving.
    setUser((prev) => ({ ...prev, savedBankDetails: { bank, accNo, accName, updatedAt: Date.now() } }));
  }

  async function updatePassword(newPassword) {
    await changePassword(newPassword);
  }

  const value = {
    user,
    booting,
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
    updateProfile,
    updateSavedBankDetails,
    updatePassword,
    // Exposed so components can refresh the profile after external writes
    // (e.g. after an admin approves a deposit and credits a referral bonus).
    refreshUser: async () => {
      if (auth.currentUser) {
        const profile = await getUserProfile(auth.currentUser.uid);
        setUser(profile);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
