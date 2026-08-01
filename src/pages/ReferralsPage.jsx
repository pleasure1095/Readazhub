import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, buttonStyle, cardStyle } from "../styles/theme";

export default function ReferralsPage() {
  const { user, refreshUser } = useAuth();
  const [copied, setCopied] = useState("");

  // Referral bonuses are credited by an admin approving someone else's
  // deposit, which happens outside this user's own session — refresh on
  // mount so the displayed total reflects the latest Firestore data rather
  // than a possibly-stale value cached since login.
  useEffect(() => {
    refreshUser();
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
          <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>₦{(user.referralBonusTotal || 0).toLocaleString()}</div>
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
                background: "rgba(255,255,255,0.04)",
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
                background: "rgba(255,255,255,0.04)",
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
        Share your link or code with friends. When someone you referred makes their first VIP
        deposit and it's approved by an admin, you receive a one-time bonus equal to 9% of that
        plan's daily earnings — for example, a VIP Growth referral earns you ₦144. If they were
        referred using your friend's own link (i.e. you referred your friend, and they referred
        someone else), you also earn a 2nd-level bonus of 2% on that person's first deposit.
      </div>
    </div>
  );
}
