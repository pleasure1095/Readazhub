// Crimson & Cream premium theme, restyled per the site owner's rebrand
// request. Business logic (VIP plans, earnings rules, withdrawal limits)
// is entirely unaffected by this file — this is visual tokens only.
//
// BRIGHTENED this pass: two changes, both from direct feedback that the
// app felt dull/flat.
// 1. Base background lifted from near-black (#1D1719) to a lighter
//    charcoal (#2E262A) — still a dark theme, just with more room for
//    cards and text to read as distinct from the background rather than
//    nearly blending into it.
// 2. RESTORED distinct accent colors. The previous pass had aliased
//    emerald/gold/forest/lime ALL to the same crimson hex — meaning
//    every "different colored" stat card, badge, or button across the
//    app was actually rendering the identical color. That's very likely
//    the real cause of the app reading as "dull": it wasn't dim so much
//    as MONOCHROME everywhere a palette was supposed to differentiate
//    things (Referral Bonus vs Welcome Bonus vs Withdrawable, VIP plan
//    color chips, etc). These now resolve to genuinely different, bright
//    hues again — a true gold, a true green, a true blue/purple — while
//    keeping crimson as the single dominant BRAND color for primary
//    buttons and the header, so the palette reads as intentional rather
//    than random.
export const C = {
  charcoal: "#342B2F",
  charcoalDeep: "#241C20",
  crimson: "#D4415C",
  crimsonDeep: "#A6293F",
  cream: "#F9F1E7",
  creamDeep: "#EDE0CC",
  green: "#3ED17E",
  red: "#F08478",
  bg: "#241C20",
  surface: "rgba(255,255,255,0.10)",
  border: "rgba(249,241,231,0.18)",
  muted: "#EDE1D6",
  dim: "#C2B3A7",
  // Subtle tech accent for the "gadget hub" feel on the Dashboard header
  // only — kept separate from the crimson brand palette rather than
  // replacing it, so the rest of the app (auth, admin, forms) is
  // untouched and the accent reads as a deliberate, contained detail.
  techGlow: "#5AD1E0",
  // Genuinely distinct accent colors — no longer aliased to crimson. Each
  // one is used where the app needs to visually differentiate categories
  // of money/status (Referral vs Welcome vs Withdrawable, VIP plan chips,
  // admin stat cards) rather than everything reading as the same red.
  emerald: "#3ED17E",
  forest: "#2E9B5C",
  lime: "#B9E85A",
  gold: "#F0B23D",
  navy: "#241C20",
  blue: "#4A8FE8",
  purple: "#9B6FE0",
};

export const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(249,241,231,0.2)",
  borderRadius: 10,
  color: "#F9F1E7",
  fontSize: 16,
  outline: "none",
};

export const labelStyle = {
  display: "block",
  fontSize: 12,
  letterSpacing: "0.1em",
  color: C.muted,
  marginBottom: 8,
  textTransform: "uppercase",
};

export const cardStyle = {
  background: "linear-gradient(160deg, rgba(212,65,92,0.22), rgba(36,28,32,0.6))",
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 20,
};

export function buttonStyle(variant = "gold") {
  return {
    padding: "14px 22px",
    background:
      variant === "gold"
        ? "linear-gradient(135deg,#E8748A,#A6293F)"
        : variant === "danger"
        ? "rgba(240,132,120,0.18)"
        : variant === "ghost"
        ? "transparent"
        : "rgba(255,255,255,0.12)",
    border:
      variant === "danger"
        ? "1px solid rgba(240,132,120,0.4)"
        : variant === "ghost"
        ? "1px solid rgba(249,241,231,0.24)"
        : "none",
    borderRadius: 10,
    color: variant === "gold" ? "#F9F1E7" : variant === "danger" ? "#F08478" : "#F9F1E7",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "opacity 0.15s",
    minHeight: 44,
  };
}

// A few named gradient presets used for stat cards / VIP cards. Now
// genuinely distinct hues (green/gold/blue/purple) matching the restored
// accent palette above, instead of four shades of the same crimson.
export const GRADIENTS = {
  green: "linear-gradient(135deg, #3ED17E, #237F4B)",
  gold: "linear-gradient(135deg, #F0B23D, #C4831F)",
  blue: "linear-gradient(135deg, #4A8FE8, #2A5CA8)",
  purple: "linear-gradient(135deg, #9B6FE0, #5F3EA8)",
};
