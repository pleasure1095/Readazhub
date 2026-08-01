import { useEffect, useState } from "react";
import { C, GRADIENTS } from "../styles/theme";
import { VIP_LIST } from "../utils/vipPlans";

const CARD_GRADIENTS = [GRADIENTS.green, GRADIENTS.gold, GRADIENTS.blue, GRADIENTS.purple, GRADIENTS.green, GRADIENTS.gold];

/**
 * Auto-rotating banner showcasing each VIP plan in turn. Purely
 * presentational — reads from the shared VIP_LIST constants, doesn't
 * touch user data, deposits, or earnings logic at all.
 *
 * Advances every 3.5s, pauses on hover/touch so it doesn't fight someone
 * trying to read a specific plan's numbers.
 */
export default function PlanCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % VIP_LIST.length);
    }, 3500);
    return () => clearInterval(t);
  }, [paused]);

  const plan = VIP_LIST[index];
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      style={{
        position: "relative",
        borderRadius: 18,
        padding: "20px 22px",
        marginBottom: 20,
        overflow: "hidden",
        background: gradient,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        transition: "background 0.5s ease",
      }}
    >
      <div
        key={plan.id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
          animation: "planFadeIn 0.5s ease",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(255,255,255,0.22)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.04em",
              marginBottom: 8,
            }}
          >
            {plan.label}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
            Invest <strong style={{ color: "#fff" }}>₦{plan.amount.toLocaleString()}</strong> · Earn{" "}
            <strong style={{ color: "#fff" }}>₦{plan.daily.toLocaleString()}/day</strong>
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>
          ₦{plan.daily.toLocaleString()}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}> /day</span>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 5, marginTop: 14 }}>
        {VIP_LIST.map((p, i) => (
          <div
            key={p.id}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 2,
              background: i === index ? "#fff" : "rgba(255,255,255,0.25)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes planFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
