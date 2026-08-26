import { C, buttonStyle } from "../styles/theme";
import Logo from "./Logo";

function IconBell({ color }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Top header — logo, greeting, alerts bell, sign out. The Alerts/
 * notifications bell moved here (top-right) from the bottom nav per the
 * site owner's request, freeing up that bottom slot for "Daily Task".
 * Hidden for admins, matching the previous behavior where the
 * unread-notifications poll in App.jsx was skipped entirely for admin
 * accounts (admins don't have a NotificationsPage/tab).
 */
export default function Nav({ user, onLogout, onOpenNotifications, unreadCount = 0, isAdmin }) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid rgba(249,241,231,0.14)",
        background: `${C.navDarkDeep}EB`,
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        gap: 12,
      }}
    >
      <Logo size={26} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: C.navMuted, fontWeight: 600 }}>Hi, {user?.name?.split(" ")[0]}</span>
        {!isAdmin && (
          <button
            onClick={onOpenNotifications}
            style={{
              position: "relative",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Alerts"
          >
            <IconBell color={C.navText} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  background: C.red,
                  color: "#fff",
                  borderRadius: "50%",
                  minWidth: 15,
                  height: 15,
                  fontSize: 9,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                  border: `1.5px solid ${C.navDarkDeep}`,
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        )}
        <button
          style={{
            ...buttonStyle("ghost"),
            padding: "7px 12px",
            fontSize: 12,
            color: C.navText,
            borderColor: "rgba(249,241,231,0.28)",
          }}
          onClick={onLogout}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
