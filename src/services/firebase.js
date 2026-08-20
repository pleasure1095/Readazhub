import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config is read from environment variables so the same codebase
// can point at different Firebase projects (dev/staging/prod) without
// code changes. See .env.example for the required keys.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fail loudly and visibly rather than letting initializeApp() throw at
// module-load time. An uncaught throw here happens BEFORE React mounts,
// which produces a silent blank screen with no on-page indication of what
// went wrong — exactly the failure mode that's hardest to diagnose without
// browser dev tools. Instead, we detect missing config up front and render
// a plain-HTML error message directly, so the problem is visible on any
// device, even without console access.
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  const message =
    "READAZHUB configuration error: missing Firebase settings (" +
    missingKeys.join(", ") +
    "). Check that all VITE_FIREBASE_* environment variables are set correctly in your hosting provider, then redeploy.";

  // Render directly into the page, bypassing React entirely, since React
  // itself hasn't mounted yet at this point.
  document.body.innerHTML =
    '<div style="font-family:system-ui,sans-serif;background:#0A0D0B;color:#CF7878;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;">' +
    '<div style="max-width:480px;">' +
    '<h1 style="font-size:18px;margin-bottom:12px;">Configuration Error</h1>' +
    '<p style="font-size:14px;line-height:1.6;color:#E4B8B8;">' +
    message +
    "</p></div></div>";

  throw new Error(message);
}

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  const message =
    "READAZHUB failed to initialize Firebase. This usually means one of the VITE_FIREBASE_* environment variables has an incorrect value (a typo, extra quote marks, or a truncated string). Original error: " +
    err.message;

  document.body.innerHTML =
    '<div style="font-family:system-ui,sans-serif;background:#0A0D0B;color:#CF7878;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;">' +
    '<div style="max-width:480px;">' +
    '<h1 style="font-size:18px;margin-bottom:12px;">Configuration Error</h1>' +
    '<p style="font-size:14px;line-height:1.6;color:#E4B8B8;">' +
    message +
    "</p></div></div>";

  throw err;
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
