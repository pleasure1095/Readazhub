import { useEffect, useState } from "react";
import { C, buttonStyle } from "../styles/theme";
import { WHATSAPP_GROUP_LINK, WHATSAPP_GROUP_LINK_BACKUP } from "../utils/paymentInfo";
import { VIP_LIST } from "../utils/vipPlans";
import Logo from "./Logo";

/**
 * Welcome modal shown once per SESSION (every fresh login), not just once
 * ever per browser. Uses sessionStorage instead of localStorage — a
 * sessionStorage entry clears automatically when the browser tab/window
 * is closed, so signing back in later (a new session) shows it again,
 * while rapid tab switches or page refreshes within the same session
 * don't re-trigger it on every render.
 *
 * The seen-flag is keyed by userId so it's scoped per account, not just
 * per device — important on a shared/public device where a second person
 * logging in shouldn't inherit the first person's dismissal.
 */
export default function WelcomeModal({ userId, userName }) {
  const [visible, setVisible] = useState(false);
  const seenKey = `welcome_seen_${userId}`;

  useEffect(() => {
    if (!userId) return;
    try {
      if (!sessionStorage.getItem(seenKey)) {
        setVisible(true);
      }
    } catch {
      // sessionStorage unavailable (private browsing, etc.) — just skip
      // the modal rather than throwing.
    }
  }, [userId, seenKey]);

  function dismiss() {
    try {
      sessionStorage.setItem(seenKey, "1");
    } catch {
      // Non-fatal if this fails — worst case the modal reappears on the
      // next render within this same session.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && dismiss()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
        backdropFilter: "blur(8px)",
        padding: 20,
      }}
    >
      <div
        className="fade"
        style={{
          background: C.charcoalDeep,
          border: `1px solid ${C.crimson}30`,
          borderRadius: 20,
          padding: 32,
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <Logo size={30} />
        </div>
        <h2 style={{ fontSize: 20, color: C.crimson, marginBottom: 8, fontWeight: 800 }}>
          Welcome, {userName?.split(" ")[0] || "there"}
        </h2>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Your account is ready. Explore VIP plans, track your earnings, and
          grow your portfolio — all in one place.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: 18,
            maxHeight: 200,
            overflowY: "auto",
            paddingRight: 2,
          }}
        >
          {VIP_LIST.filter((plan) => plan.id !== "vip1").map((plan) => (
            <div
              key={plan.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "rgba(36,28,32,0.035)",
                border: `1px solid ${plan.color}28`,
                borderRadius: 10,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{plan.label}</span>
              <span style={{ fontSize: 11, color: C.muted, textAlign: "right" }}>
                ₦{plan.amount.toLocaleString()} → <strong style={{ color: plan.color }}>₦{plan.daily.toLocaleString()}/day</strong>
              </span>
            </div>
          ))}
        </div>

        <a
          href={WHATSAPP_GROUP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 700,
            color: C.crimson,
            textDecoration: "none",
            marginBottom: 8,
            padding: "10px",
            border: `1px solid ${C.crimson}30`,
            borderRadius: 10,
          }}
        >
          💬 Join our WhatsApp community
        </a>
        <a
          href={WHATSAPP_GROUP_LINK_BACKUP}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            fontSize: 11,
            color: C.dim,
            textDecoration: "underline",
            marginBottom: 20,
          }}
        >
          Trouble joining? Try our backup group
        </a>
        <button style={{ ...buttonStyle("gold"), width: "100%" }} onClick={dismiss}>
          Get Started
        </button>
      </div>
    </div>
  );
}
