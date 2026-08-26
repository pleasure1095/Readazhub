import { C } from "../styles/theme";

// Small inline icon set — avoids adding an icon library dependency for
// just a handful of simple glyphs. Each is a minimal 24x24 stroke icon.
function IconHome({ active, color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? color : C.navMuted} strokeWidth="2">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconInvest({ active, color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? color : C.navMuted} strokeWidth="2">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 15l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconWallet({ active, color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? color : C.navMuted} strokeWidth="2">
      <rect x="3" y="6" width="18" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 12h2" strokeLinecap="round" />
      <path d="M3 9h18" strokeLinecap="round" />
    </svg>
  );
}
function IconUsers({ active, color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? color : C.navMuted} strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M21 20v-.7a4 4 0 0 0-3-3.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBook({ active, color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? color : C.navMuted} strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSettings({ active, color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? color : C.navMuted} strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Full 5-item nav for regular users. "Alerts" moved to the top Nav bar
// (bell icon, top-right) per the site owner's request; this bottom bar
// now has "Daily Task" in its place, linking to the new standalone
// Read & Earn page. Each item gets its own distinct `color` (used for
// both the icon stroke and label text when active) so the tabs are
// visually differentiated from one another, not just gold-vs-muted.
const USER_ITEMS = [
  { key: "dashboard", label: "Home", Icon: IconHome, color: C.gold },
  { key: "plans", label: "Plans", Icon: IconInvest, color: C.emerald },
  { key: "dailyTask", label: "Daily Task", Icon: IconBook, color: C.crimson },
  { key: "referrals", label: "Referrals", Icon: IconUsers, color: C.blue },
  { key: "settings", label: "Settings", Icon: IconSettings, color: C.purple },
];

const ADMIN_ITEMS = [
  { key: "deposits", label: "Deposits", Icon: IconWallet, color: C.gold },
  { key: "earnings", label: "Earnings", Icon: IconInvest, color: C.emerald },
  { key: "cashflow", label: "Cash Flow", Icon: IconWallet, color: C.blue },
  { key: "users", label: "Users", Icon: IconUsers, color: C.purple },
];

/**
 * Primary bottom navigation bar, always visible (not just a mobile
 * fallback) — this is now the main way to move between sections, per the
 * requested app-style navigation. The old top Nav tabs were removed from
 * daily use in favor of this bar; Nav.jsx now only renders the logo/
 * greeting/sign-out row, no duplicate tab buttons.
 */
export default function BottomTabBar({ tab, setTab, isAdmin }) {
  const items = isAdmin ? ADMIN_ITEMS : USER_ITEMS;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "10px 4px calc(10px + env(safe-area-inset-bottom))",
        background: `linear-gradient(180deg, ${C.navDark}F5, ${C.navDarkDeep}FA)`,
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(249,241,231,0.14)",
        zIndex: 60,
      }}
    >
      {items.map(({ key, label, Icon, color }) => {
        const active = tab === key;
        return (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 10px",
              minWidth: 52,
            }}
          >
            <div style={{ position: "relative" }}>
              <Icon active={active} color={color} />
            </div>
            <span
              style={{
                fontSize: 10,
                color: active ? color : C.navMuted,
                fontWeight: active ? 800 : 600,
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
