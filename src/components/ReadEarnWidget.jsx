import { useEffect, useState } from "react";
import { C, buttonStyle } from "../styles/theme";
import { getReviewStatus, markArticleRead } from "../services/reviews";

function formatCooldownRemaining(cooldownEndsAt) {
  const msLeft = cooldownEndsAt - Date.now();
  if (msLeft <= 0) return null;
  const hours = Math.floor(msLeft / (60 * 60 * 1000));
  const minutes = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// One color per article CATEGORY (not per article) — so the same
// category always looks the same regardless of which day it appears,
// rather than a random color that'd shift meaninglessly day to day.
// Chosen to be distinguishable from each other at a glance and from the
// widget's own crimson/gold theme. Falls back to a neutral gray for any
// category not in this list, so a new/renamed category never breaks
// rendering — it just won't stand out until added here.
const CATEGORY_COLORS = {
  Accessories: "#C77DFF",
  Gadgets: "#4CC9F0",
  Health: "#52B788",
  Home: "#F4A261",
  "Life Skills": "#E76F51",
  Money: "#2ECC71",
  Productivity: "#5390D9",
  Tech: "#7B68EE",
  Watches: "#D4A017",
};
function categoryColor(category) {
  return CATEGORY_COLORS[category] || "#9A8C86";
}

/**
 * VIP-gated Read & Earn widget. Reading ALL of today's featured articles
 * unlocks that day's VIP earnings entirely — a confirmed, intentional
 * design where missing a day's reading means ₦0 earned that day,
 * permanently (no partial credit, no catch-up).
 *
 * CHANGED this session: replaced the earlier 1-5 star product-rating
 * mechanic ("Daily Reviews") with a simpler read-and-mark-as-read flow
 * per the site owner's request to rebrand the platform as Read & Earn.
 * Each article expands inline to show its full text; a "Mark as Read"
 * button appears once expanded, completing that article the moment it's
 * pressed. The underlying completion/cooldown/earnings-gating logic is
 * unchanged from before — see services/reviews.js for why those field
 * names and mechanics were deliberately preserved rather than rewritten.
 *
 * 24H ROLLING COOLDOWN: once a user completes a full day's set (reads
 * all featured articles), they're locked out from reading again for a
 * full 24 hours from that completion — NOT tied to the WAT calendar day
 * boundary. The featured ARTICLES shown still rotate at WAT midnight
 * same as before (unchanged, since earnings math depends on that), so a
 * user can see a new day's articles appear before their personal 24h
 * cooldown has actually expired — in that case they'll see the new
 * articles but stay locked out with a countdown until eligible again.
 *
 * `onEarningsUnlocked` (optional) fires the moment a reading day
 * COMPLETES (not on every individual article) — this lets
 * DashboardPage.jsx immediately refresh its earnings stat cards, so the
 * unlocked amount shows up right away instead of only appearing after a
 * manual page reload.
 */
export default function ReadEarnWidget({ userId, isVipMember, onEarningsUnlocked }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!isVipMember) return;
    getReviewStatus(userId).then(setStatus).catch((e) => console.error("Failed to load reading status:", e));
  }, [isVipMember, userId]);

  // Re-render once a minute while a cooldown is active, so the "time
  // remaining" text stays roughly accurate without needing a manual
  // refresh, and so the widget correctly unlocks itself the moment the
  // cooldown actually expires rather than staying stuck disabled until
  // the next full page load.
  useEffect(() => {
    if (!status?.cooldownActive) return;
    const t = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, [status?.cooldownActive]);

  async function handleMarkRead(articleId) {
    setBusy(true);
    setErr("");
    try {
      const wasAlreadyComplete = status.completedDays.includes(status.today);
      const result = await markArticleRead(userId, articleId);
      setStatus((prev) => ({ ...prev, ...result }));
      setExpandedId(null);

      // Only refresh the Dashboard's earnings figures at the exact moment
      // a day transitions from incomplete to complete — not on every
      // single article marked read leading up to it, since earnings are
      // all-or-nothing per day and nothing changes for the Dashboard
      // until the last article of the day is marked read.
      const justCompleted = result.allReadToday && !wasAlreadyComplete;
      if (justCompleted && onEarningsUnlocked) {
        onEarningsUnlocked();
      }
    } catch (e) {
      console.error("Failed to mark article as read:", e);
      setErr(e.message || "Could not mark as read. Please try again.");
    }
    setBusy(false);
  }

  if (!isVipMember || !status) return null;

  const readCount = status.readArticleIds.length;
  const totalCount = status.todaysArticles.length;
  const allReadToday = readCount === totalCount;
  // Re-derive live rather than trusting a possibly-stale cooldownActive
  // flag from the last fetch — cooldownEndsAt is a fixed timestamp, so
  // comparing it against Date.now() on every render (including the
  // once-a-minute forced re-renders above) keeps this accurate without
  // needing a fresh Firestore read just to notice the cooldown expired.
  const cooldownActive = status.cooldownEndsAt != null && Date.now() < status.cooldownEndsAt;
  const cooldownRemaining = cooldownActive ? formatCooldownRemaining(status.cooldownEndsAt) : null;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.crimson}33, ${C.charcoalDeep}80)`,
        border: `1px solid ${C.crimson}30`,
        borderRadius: 16,
        padding: "16px 18px",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>📖</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Read & Earn</span>
      </div>
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 14 }}>
        {cooldownActive
          ? `You can read again in ${cooldownRemaining}`
          : allReadToday
          ? "All read — today's earnings are unlocked ✓"
          : `Read all ${totalCount} articles today to unlock today's VIP earnings (${readCount}/${totalCount} done)`}
      </div>
      {err && <p style={{ fontSize: 11, color: C.red, marginBottom: 12, fontWeight: 600 }}>{err}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {status.todaysArticles.map((a) => {
          const isRead = status.readArticleIds.includes(a.id);
          const isExpanded = expandedId === a.id;
          const catColor = categoryColor(a.category);
          return (
            <div
              key={a.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: 12,
                background: "rgba(36,28,32,0.035)",
                borderRadius: 12,
                borderLeft: `3px solid ${catColor}`,
                opacity: cooldownActive ? 0.6 : 1,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: isRead || cooldownActive ? "default" : "pointer" }}
                onClick={() => {
                  if (isRead || cooldownActive) return;
                  setExpandedId(isExpanded ? null : a.id);
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: `${catColor}22`,
                    border: `1px solid ${catColor}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  {a.emoji}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{a.title}</div>
                    {isRead && <span style={{ fontSize: 15, color: C.green, flexShrink: 0 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 10, color: catColor, fontWeight: 700, marginBottom: 4 }}>
                    {a.category} · {a.readMinutes} min read
                  </div>
                  {!isExpanded && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{a.summary}</div>}
                </div>
              </div>

              {isExpanded && !isRead && (
                <div style={{ paddingLeft: 54 }}>
                  <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>{a.body}</p>
                  <button
                    disabled={busy || cooldownActive}
                    onClick={() => handleMarkRead(a.id)}
                    style={{ ...buttonStyle("gold"), padding: "8px 16px", fontSize: 12, width: "100%" }}
                  >
                    {busy ? "…" : "✓ Mark as Read"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!allReadToday && !cooldownActive && (
        <p style={{ fontSize: 11, color: C.dim, marginTop: 12, fontWeight: 600 }}>
          Unread days earn ₦0 for that day — this can't be made up later.
        </p>
      )}
    </div>
  );
}
