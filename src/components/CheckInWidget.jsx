import { useEffect, useState } from "react";
import { C, buttonStyle } from "../styles/theme";
import { getCheckInStatus, performCheckIn, CHECKIN_DAILY_REWARD } from "../services/checkins";

/**
 * Daily check-in widget. Gated to VIP members only (users with at least
 * one ever-approved deposit) — non-VIP users see an explanatory locked
 * state instead of the check-in button, rather than the widget
 * disappearing entirely, so the incentive to become VIP is visible.
 *
 * Each day's ₦100 credits straight to withdrawable balance the moment
 * the person checks in — no lock, no waiting period, same as Referral
 * and Welcome bonuses. The streak counter is still shown and still
 * tracked (consecutive-day count, longest streak) for engagement/display
 * purposes, but it no longer gates or forfeits any money — missing a day
 * just resets the visual streak counter back to 1 on the next check-in.
 *
 * Does NOT have its own withdraw button — per the site owner's explicit
 * request to stop showing withdrawable money as separate "tags" per
 * source, check-in balance now only withdraws through the single
 * combined withdraw flow on the Dashboard (CombinedWithdrawModal), which
 * pools VIP profit + Referral Bonus + Welcome Bonus + Check-in balance
 * into one request. This widget still displays the current balance for
 * visibility/motivation, it just doesn't let the user withdraw it here
 * independently — that would let the same balance potentially be drawn
 * down through two different paths.
 */
export default function CheckInWidget({ userId, isVipMember }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    try {
      const s = await getCheckInStatus(userId);
      setStatus(s);
    } catch (e) {
      console.error("Failed to load check-in status:", e);
    }
  }

  useEffect(() => {
    if (isVipMember) load();
  }, [isVipMember]);

  async function handleCheckIn() {
    if (busy || !status || status.checkedInToday) return;
    setBusy(true);
    setErr("");
    try {
      const updated = await performCheckIn(userId);
      setStatus(updated);
      setOk(`₦${CHECKIN_DAILY_REWARD.toLocaleString()} added to your withdrawable balance!`);
    } catch (e) {
      console.error("Check-in failed:", e);
      setErr("Could not check in. Please try again.");
    }
    setBusy(false);
  }

  if (!isVipMember) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px dashed ${C.border}`,
          borderRadius: 16,
          padding: "16px 18px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.muted }}>Daily Check-In</span>
        </div>
        <div style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>
          Available to VIP members — make your first deposit to unlock daily check-in rewards.
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.gold}22, ${C.charcoal}80)`,
        border: `1px solid ${C.gold}30`,
        borderRadius: 16,
        padding: "16px 18px",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#F9F1E7" }}>
              {status.currentStreak}-day streak
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
            {status.checkedInToday
              ? "Checked in today ✓"
              : `Check in daily to earn ₦${CHECKIN_DAILY_REWARD} — credited instantly to your withdrawable balance`}
          </div>
        </div>
        <button
          style={{ ...buttonStyle(status.checkedInToday ? "ghost" : "gold"), padding: "10px 20px", fontSize: 13 }}
          onClick={handleCheckIn}
          disabled={busy || status.checkedInToday}
        >
          {status.checkedInToday ? "✓ Checked In" : busy ? "…" : "Check In"}
        </button>
      </div>

      {err && <p style={{ fontSize: 11, color: C.red, marginTop: 10, fontWeight: 600 }}>{err}</p>}
      {ok && <p style={{ fontSize: 11, color: C.green, marginTop: 10, fontWeight: 600 }}>{ok}</p>}

      {status.unlockedBalance > 0 && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${C.gold}20`,
            fontSize: 13,
            fontWeight: 700,
            color: C.green,
          }}
        >
          ₦{status.unlockedBalance.toLocaleString()} available — withdraw anytime from the main Withdraw button
        </div>
      )}
    </div>
  );
}
