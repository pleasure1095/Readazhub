import { C } from "../styles/theme";

// Wordmark: READAZHUB. Duplicated from the Gadjiz codebase; brand name confirmed.
export default function Logo({ size = 28 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill={C.crimson} />
        <path d="M9 21l6-13 8 13h-4.2l-1-2H14l-1 2H9z" fill={C.cream} fillOpacity=".95" />
        <circle cx="16" cy="14" r="1.6" fill={C.cream} fillOpacity=".95" />
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
