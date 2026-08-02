import { C } from "../styles/theme";

// Solid, bright colors per action — matches the reference app's style of
// a distinct saturated color per icon tile (green Deposit, gold
// Withdraw, blue Migrate, purple Support) rather than everything reading
// as the same brand crimson.
const ACTIONS = [
  { key: "deposit", label: "Deposit", icon: "＋", color: C.green },
  { key: "withdraw", label: "Withdraw", icon: "↑", color: C.gold },
  { key: "migrate", label: "Migrate", icon: "⇄", color: C.blue },
  { key: "support", label: "Support", icon: "💬", color: C.purple },
];

/**
 * Quick-action grid — deliberately kept to 4 items, each leading somewhere
 * genuinely different from what's already one tap away on the bottom nav.
 * "Portfolio" and "Network"/"Leaders" were considered and dropped: they'd
 * either duplicate the Dashboard itself or duplicate the Referrals tab,
 * adding taps without adding capability.
 *
 * REDESIGNED this pass to match the reference app's icon-badge style: the
 * icon sits centered inside its OWN solid, bright color circle (not a
 * faint tinted rectangle) which itself sits on the app's regular card
 * background — this two-layer structure (bold badge + normal card) is
 * what the reference achieves and the previous version was missing, even
 * though the icon itself was already horizontally centered.
 */
export default function ActionGrid({ onDeposit, onMigrate, onWithdraw, onSupport }) {
  const handlers = { deposit: onDeposit, withdraw: onWithdraw, migrate: onMigrate, support: onSupport };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
        marginBottom: 20,
      }}
    >
      {ACTIONS.map((a) => (
        <button
          key={a.key}
          onClick={handlers[a.key]}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: "14px 6px 12px",
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            background: C.surface,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: a.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 800,
              color: "#241C20",
              flexShrink: 0,
            }}
          >
            {a.icon}
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: C.text }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
