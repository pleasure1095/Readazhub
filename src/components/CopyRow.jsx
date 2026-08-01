import { useState } from "react";
import { C } from "../styles/theme";

export default function CopyRow({ label, value, accent, big }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: C.dim }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: big ? 17 : 13,
            fontWeight: big ? 700 : 400,
            color: accent || "#F9F1E7",
            letterSpacing: big ? "0.06em" : 0,
          }}
        >
          {value}
        </span>
        <button
          onClick={copy}
          style={{
            background: "none",
            border: `1px solid ${copied ? C.green : "rgba(255,255,255,0.1)"}`,
            borderRadius: 6,
            cursor: "pointer",
            color: copied ? C.green : C.dim,
            fontSize: 10,
            padding: "2px 7px",
          }}
        >
          {copied ? "✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
