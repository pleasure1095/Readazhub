import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, buttonStyle, GRADIENTS } from "../styles/theme";
import { VIP_LIST } from "../utils/vipPlans";
import DepositModal from "../components/DepositModal";

const CARD_GRADIENTS = [GRADIENTS.green, GRADIENTS.gold, GRADIENTS.blue, GRADIENTS.purple, GRADIENTS.green, GRADIENTS.gold];

export default function VipPlansPage({ onJoined }) {
  const { user } = useAuth();
  const [showDeposit, setShowDeposit] = useState(false);
  const [preselectedPlan, setPreselectedPlan] = useState(null);

  function joinPlan(planId) {
    setPreselectedPlan(planId);
    setShowDeposit(true);
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: "#F9F1E7" }}>VIP Plans</h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, fontWeight: 500 }}>
        Earnings begin 24 hours after admin approval. Only profit is ever withdrawable — capital
        stays invested.
      </p>

      {/* Vertical stack — one full-width card per plan, in order, per the
          site owner's request (previously a horizontal swipe row). */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 6 }}>
        {VIP_LIST.map((p, i) => (
          <div
            key={p.id}
            style={{
              background: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
              borderRadius: 18,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                alignSelf: "flex-start",
                padding: "4px 12px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.22)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.04em",
              }}
            >
              {p.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>₦{p.amount.toLocaleString()}</div>
            <div
              style={{
                background: "rgba(0,0,0,0.2)",
                borderRadius: 10,
                padding: 12,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>₦{p.daily.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>daily earnings</div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
              ✓ Earnings start 24h after approval
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
              ✓ Withdraw profit Mon–Sat 9AM–6PM, Sun 11AM–4PM (WAT)
            </div>
            <button
              style={{
                marginTop: 4,
                padding: "12px 14px",
                borderRadius: 10,
                border: "none",
                background: "#fff",
                color: "#1A1204",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
              onClick={() => joinPlan(p.id)}
            >
              Join Now
            </button>
          </div>
        ))}
      </div>

      {showDeposit && (
        <DepositModal
          user={user}
          initialPlanId={preselectedPlan}
          onClose={() => setShowDeposit(false)}
          onDone={() => onJoined && onJoined()}
        />
      )}
    </div>
  );
}
