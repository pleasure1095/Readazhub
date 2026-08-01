import { C, buttonStyle } from "../styles/theme";
import Logo from "./Logo";

/**
 * Top header — logo, greeting, sign out. Tab navigation lives in
 * BottomTabBar now (the primary nav, matching the reference app-style
 * bottom bar) rather than duplicated here as top tab buttons.
 */
export default function Nav({ user, onLogout }) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: `1px solid ${C.border}`,
        background: `${C.charcoalDeep}EB`,
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        gap: 12,
      }}
    >
      <Logo size={26} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Hi, {user?.name?.split(" ")[0]}</span>
        <button style={{ ...buttonStyle("ghost"), padding: "7px 12px", fontSize: 12 }} onClick={onLogout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
