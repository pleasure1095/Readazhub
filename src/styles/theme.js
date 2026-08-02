// Crimson & Cream premium theme — FLIPPED TO LIGHT MODE this pass, per
// direct feedback that the dark theme (even after an earlier brightening
// pass) still read as too dark. Business logic (VIP plans, earnings
// rules, withdrawal limits) is entirely unaffected by this file — this
// is visual tokens only.
//
// This is a genuine light/dark flip, not a lightness nudge: background
// goes from dark charcoal to cream/white, and primary text flips from
// light-on-dark to dark-on-light. The crimson brand color and the
// distinct accent palette (green/gold/blue/purple restored in the
// previous pass) are kept exactly as-is — only the neutral
// background/surface/text tokens changed, since those are what actually
// determine "dark vs light," not the brand accent hues.
//
// `text` is the NEW primary token most components should use for body
// copy (dark, readable on a light background) — `cream`/`creamDeep` are
// kept defined (now genuinely light/cream-colored) for anywhere that
// still explicitly wants a light-colored surface or light text ON a
// dark/colored element (e.g. white text sitting on a solid crimson
// button or a colored icon badge), which still needs to stay light even
// in light mode.
export const C = {
  charcoal: "#FBF6EF",
  charcoalDeep: "#FFFFFF",
  crimson: "#D4415C",
  crimsonDeep: "#A6293F",
  cream: "#FFFFFF",
  creamDeep: "#F9F1E7",
  green: "#1D9C57",
  red: "#C23B2E",
  bg: "#FBF6EF",
  surface: "#FFFFFF",
  border: "rgba(36,28,32,0.12)",
  // Primary readable text color — dark, for body copy on the light
  // background. Use this (or `dim` for secondary text) anywhere the old
  // theme used a light/cream color for plain page text.
  text: "#241C20",
  muted: "#4A3D40",
  dim: "#8A7A75",
  // Subtle tech accent for the "gadget hub" feel on the Dashboard header
  // only — kept separate from the crimson brand palette rather than
  // replacing it, so the rest of the app (auth, admin, forms) is
  // untouched and the accent reads as a deliberate, contained detail.
  techGlow: "#1B93A6",
  // Distinct accent colors, deepened slightly from the dark-theme
  // versions so each still has enough contrast against a WHITE
  // background (a light green/gold/blue/purple that worked on dark
  // charcoal can read as washed-out or low-contrast on white).
  emerald: "#1D9C57",
  forest: "#177A45",
  lime: "#6FA82E",
  gold: "#B9791C",
  navy: "#241C20",
  blue: "#2C63B0",
  purple: "#6E3FB0",
  // Dedicated dark tokens for the top header (Nav.jsx) and bottom tab
  // bar (BottomTabBar.jsx) ONLY — these two structural bars intentionally
  // stay dark even though the rest of the app is light mode (a common,
  // deliberate pattern: a dark nav frame around light content adds
  // structure/contrast). Kept as separate named tokens rather than
  // reusing `charcoal`/`charcoalDeep`, since those two now correctly
  // mean "near-white" everywhere else in the light theme — reusing them
  // here would make the nav bars accidentally go white too.
  navDark: "#241C20",
  navDarkDeep: "#1A1416",
  // Light text tokens for content sitting ON the dark nav bars above —
  // C.text/C.muted/C.dim are dark-on-light now (correct for the rest of
  // the light-mode app), which would be unreadable against navDark/
  // navDarkDeep. Nav.jsx and BottomTabBar.jsx should use these instead
  // of C.text/C.muted/C.dim for any text/icons drawn on their own bars.
  navText: "#F9F1E7",
  navMuted: "#C2B3A7",
};

export const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  background: "#FFFFFF",
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
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
  background: "linear-gradient(160deg, rgba(212,65,92,0.06), rgba(255,255,255,0.9))",
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 1px 3px rgba(36,28,32,0.06)",
};

export function buttonStyle(variant = "gold") {
  return {
    padding: "14px 22px",
    background:
      variant === "gold"
        ? "linear-gradient(135deg,#E8748A,#A6293F)"
        : variant === "danger"
        ? "rgba(194,59,46,0.1)"
        : variant === "ghost"
        ? "transparent"
        : "rgba(36,28,32,0.06)",
    border:
      variant === "danger"
        ? "1px solid rgba(194,59,46,0.35)"
        : variant === "ghost"
        ? `1px solid ${C.border}`
        : "none",
    borderRadius: 10,
    // Gold/primary buttons keep white text (they sit on a solid crimson
    // gradient regardless of light/dark theme). Danger and ghost/ordinary
    // buttons now use dark text, since their backgrounds are light/pale
    // in light mode rather than dark.
    color: variant === "gold" ? "#FFFFFF" : variant === "danger" ? "#C23B2E" : C.text,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "opacity 0.15s",
    minHeight: 44,
  };
}

// A few named gradient presets used for stat cards / VIP cards. Kept
// dark-on-light-friendly (deepened slightly vs. the dark-theme versions)
// so white/light icon glyphs and badge text sitting ON these gradients
// still have enough contrast — these gradients themselves are still
// meant to be small colored accent surfaces (icon badges, plan chips),
// not full-page backgrounds, so they intentionally stay saturated/dark
// even though the rest of the app went light.
export const GRADIENTS = {
  green: "linear-gradient(135deg, #2CB86C, #177A45)",
  gold: "linear-gradient(135deg, #D4A017, #B9791C)",
  blue: "linear-gradient(135deg, #3D74C4, #2C4F8F)",
  purple: "linear-gradient(135deg, #8657C9, #5A3494)",
};
