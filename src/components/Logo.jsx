import { C } from "../styles/theme";

// Wordmark: READAZHUB. Icon redesigned this pass — the previous mark was
// a leftover arrow/mountain shape from the Gadjiz codebase this app was
// duplicated from, which had no connection to READAZHUB's Read & Earn
// theme. Replaced with an open book: two simple trapezoid "pages"
// meeting at a center spine, deliberately built from straight lines
// rather than a hand-tuned freeform curve, so the shape is easy to
// verify by reasoning about its coordinates directly (no image-rendering
// tool was available to visually preview it before shipping) — each
// page runs from the spine (x=16) out to x=9 (left) / x=23 (right),
// centered within the 0-32 viewBox, with a slightly higher outer-top
// corner than outer-bottom corner so the pages read as gently fanned
// open rather than a flat rectangle split in half.
export default function Logo({ size = 28 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill={C.crimson} />
        {/* Left page */}
        <path d="M16 12 L9 10.3 L9 20.7 L16 22 Z" fill={C.cream} fillOpacity=".95" />
        {/* Right page (mirror of left) */}
        <path d="M16 12 L23 10.3 L23 20.7 L16 22 Z" fill={C.cream} fillOpacity=".95" />
        {/* Center spine */}
        <path d="M16 12 L16 22" stroke={C.crimson} strokeWidth="1" strokeLinecap="round" />
        {/* A couple of short page-line strokes on each side, reinforcing
            that these are book pages rather than plain triangles. */}
        <path d="M11 13.2h3M11 15.5h3M18 13.2h3M18 15.5h3" stroke={C.crimson} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.5" />
      </svg>
      <span
        style={{
          fontSize: size * 0.65,
          fontWeight: 800,
          color: C.crimson,
          letterSpacing: "0.06em",
        }}
      >
        READAZHUB
      </span>
    </div>
  );
}
