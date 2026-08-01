import { useState } from "react";
import { C } from "../styles/theme";

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function iconFor(type) {
  switch (type) {
    case "approved":
      return "✅";
    case "rejected":
      return "❌";
    case "referral":
      return "🎉";
    case "withdrawal":
      return "💸";
    case "checkin":
      return "🔥";
    case "approved_investment":
      return "📈";
    default:
      return "🔔";
  }
}

const PREVIEW_COUNT = 2;

/**
 * Shows a short preview (2 items) with a "See All →" toggle that expands
 * in place to the full list — matches the reference app's pattern of a
 * brief activity glimpse near the top of the dashboard rather than a
 * long list. No separate route/page needed since it expands inline;
 * "See All" becomes "Show Less" once expanded so it's easy to collapse
 * back down.
 */
export default function ActivityFeed({ events, limit = 20 }) {
  const [expanded, setExpanded] = useState(false);
  const allShown = events.slice(0, limit);
  const shown = expanded ? allShown : allShown.slice(0, PREVIEW_COUNT);
  const hasMore = allShown.length > PREVIEW_COUNT;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#F9F1E7" }}>Recent Activity</h3>
        {hasMore && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "none",
              border: "none",
              color: C.crimson,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {expanded ? "Show Less" : "See All →"}
          </button>
        )}
      </div>
      {shown.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 30,
            background: C.surface,
            border: `1px dashed ${C.border}`,
            borderRadius: 14,
            color: C.dim,
            fontSize: 12,
          }}
        >
          No activity yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shown.map((e, i) => (
            <div
              key={i}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 18 }}>{iconFor(e.type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "#F9F1E7", fontWeight: 600, lineHeight: 1.4 }}>{e.title}</div>
                <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>{fmtDate(e.ts)}</div>
              </div>
              {e.amount && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    color: e.sign === "-" ? C.red : e.sign === "+" ? C.green : C.muted,
                  }}
                >
                  {e.sign || ""}₦{e.amount}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
