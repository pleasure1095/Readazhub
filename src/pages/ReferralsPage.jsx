import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, buttonStyle, cardStyle } from "../styles/theme";
import { calculateReferralNetworkEarnings } from "../services/referralEarnings";
import { REFERRAL_LEVEL_1_PCT, REFERRAL_LEVEL_2_PCT } from "../utils/referralPlans";

export default function ReferralsPage() {
  const { user, refreshUser } = useAuth();
  const [copied, setCopied] = useState("");
  const [network, setNetwork] = useState({ level1Total: 0, level2Total: 0, lifetimeEarned: 0, level1Referrals: [], level2Referrals: [] });
  const [loading, setLoading] = useState(true);

  // Referral earnings are now live-computed (9% Level 1 / 2% Level 2,
  // recurring on each referred user's actual daily earnings) rather than
  // a stored balance — see services/referralEarnings.js. Fetched fresh on
  // mount so this always reflects the real, current state of the whole
  // referral network, not a cached/stale figure.
  useEffect(() => {
    refreshUser();
    calculateReferralNetworkEarnings(user.referralCode).then((result) => {
      setNetwork(result);
      setLoading(false);
    });
  }, []);

  const link = `${window.location.origin}${window.location.pathname}?ref=${user.referralCode}`;

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
        Referrals
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ ...cardStyle, border: `1px solid ${C.emerald}28`, padding: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.dim, textTransform: "uppercase", marginBottom: 8 }}>
            Referral Code
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.emerald, letterSpacing: "0.05em" }}>{user.referralCode}</div>
        </div>
        <div style={{ ...cardStyle, border: `1px solid ${C.green}28`, padding: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.dim, textTransform: "uppercase", marginBottom: 8 }}>
            Total Referral Bonus
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>
            {loading ? "…" : `₦${network.lifetimeEarned.toLocaleString()}`}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>
            Level 1 · {Math.round(REFERRAL_LEVEL_1_PCT * 100)}%
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            {loading ? "…" : `₦${network.level1Total.toLocaleString()}`}
          </div>
          <div style={{ fontSize: 10.5, color: C.dim, marginTop: 4 }}>
            {loading ? "" : `${network.level1Referrals.length} direct referral${network.level1Referrals.length === 1 ? "" : "s"}`}
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>
            Level 2 · {Math.round(REFERRAL_LEVEL_2_PCT * 100)}%
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            {loading ? "…" : `₦${network.level2Total.toLocaleString()}`}
          </div>
          <div style={{ fontSize: 10.5, color: C.dim, marginTop: 4 }}>
            {loading ? "" : `${network.level2Referrals.length} second-level referral${network.level2Referrals.length === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Referral Link
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                flex: 1,
                minWidth: 200,
                background: "rgba(36,28,32,0.04)",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 12,
                color: C.muted,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {link}
            </div>
            <button style={{ ...buttonStyle(copied === "link" ? "gold" : "ghost"), padding: "9px 16px", fontSize: 12 }} onClick={() => copy(link, "link")}>
              {copied === "link" ? "✓ Copied" : "Copy Link"}
            </button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Referral Code
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                flex: 1,
                minWidth: 200,
                background: "rgba(36,28,32,0.04)",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 14,
                color: C.emerald,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              {user.referralCode}
            </div>
            <button style={{ ...buttonStyle(copied === "code" ? "gold" : "ghost"), padding: "9px 16px", fontSize: 12 }} onClick={() => copy(user.referralCode, "code")}>
              {copied === "code" ? "✓ Copied" : "Copy Code"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
        Share your link or code with friends. You earn <strong style={{ color: C.text }}>{Math.round(REFERRAL_LEVEL_1_PCT * 100)}%</strong> of
        the daily earnings of everyone you refer directly (Level 1), and{" "}
        <strong style={{ color: C.text }}>{Math.round(REFERRAL_LEVEL_2_PCT * 100)}%</strong> of the daily earnings of everyone THEY refer
        (Level 2) — for as long as their investments keep earning. Your
        bonus follows their actual earnings exactly: if they miss a day's
        review and earn ₦0 that day, your bonus for that day is ₦0 too.
      </div>
    </div>
  );
}
