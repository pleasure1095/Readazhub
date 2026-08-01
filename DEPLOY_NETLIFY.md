# Deploying READAZHUB on Netlify

> This file was duplicated from the Gadjiz project as a starting point.
> Brand name (READAZHUB) is confirmed — new GitHub repo and new Firebase
> project are being set up separately per the site owner's instructions.

The app itself needs no code changes to run on Netlify — Firebase Auth,
Firestore, and Storage all work identically regardless of where the
static frontend is hosted. Only the deployment config differs from
Firebase Hosting.

## 1. Environment variables

Netlify does not read your local `.env` file (it's gitignored, as it
should be). In the Netlify dashboard:

Site settings → Environment variables → Add the same 6 variables from
`.env.example`, with the exact `VITE_` prefixed names:

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

Vite only exposes env vars prefixed with `VITE_` to the client bundle —
this is a Vite security feature, not a Firebase requirement, but it means
if you rename these you must keep the `VITE_` prefix or the build will
silently produce a broken Firebase config.

## 2. Build settings

Already configured in `netlify.toml`:
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect: all routes fall back to `index.html`

If you connect the repo through the Netlify UI instead of using
`netlify.toml`, just confirm these same three settings match.

## 3. Authorize your Netlify domain in Firebase (required — commonly missed)

Firebase Auth blocks sign-in/sign-up from any domain not on its
authorized list. Netlify gives you a domain like
`your-site-name.netlify.app` (or your custom domain later) — until you
add it, login and registration will fail with:

    auth/unauthorized-domain

To fix: Firebase Console → Authentication → Settings → Authorized domains
→ Add domain → paste your Netlify URL (and again later if you attach a
custom domain).

## 4. Firestore & Storage rules are deployed separately

Netlify only hosts the frontend. Firestore Security Rules and Storage
Rules still deploy via the Firebase CLI, independent of where the app
is hosted:

    firebase deploy --only firestore:rules,storage:rules

Do this once now, and again any time `firebase/firestore.rules` or
`firebase/storage.rules` change in later stages.

## 5. Local development is unaffected

`npm run dev` still works exactly as before, reading from your local
`.env` file. Netlify env vars only apply to Netlify's own build process.
