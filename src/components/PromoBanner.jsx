import { useEffect, useState } from "react";
import { GRADIENTS } from "../styles/theme";

/**
 * Purely promotional, auto-rotating banner — marketing copy only, no real
 * user data, balances, or VIP numbers. Distinct from PlanCarousel (which
 * shows real VIP plan figures) and EarnersTicker (which is explicitly
 * placeholder withdrawal data) — this one is pure atmosphere/messaging.
 */
const SLIDES = [
  {
    title: "Grow Your Wealth Daily",
    subtitle: "Choose a VIP plan and start earning fixed daily profit — no guesswork, no market risk.",
    gradient: GRADIENTS.gold,
  },
  {
    title: "Invite Friends, Earn Together",
    subtitle: "Share your referral link and earn a bonus when your first referral goes VIP.",
    gradient: GRADIENTS.blue,
  },
  {
    title: "Check In Daily",
    subtitle: "VIP members earn extra rewards just for showing up every day — don't break the streak!",
    gradient: GRADIENTS.green,
  },
  {
    title: "Secure & Transparent",
    subtitle: "Every deposit is manually reviewed. Every naira is tracked in your dashboard.",
    gradient: GRADIENTS.purple,
  },
];

export default function PromoBanner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, [paused]);

  const slide = SLIDES[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      style={{
        borderRadius: 18,
        padding: "22px 22px",
        marginBottom: 20,
        background: slide.gradient,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        transition: "background 0.6s ease",
      }}
    >
      <div key={index} style={{ animation: "promoFadeIn 0.5s ease" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{slide.title}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 600, lineHeight: 1.5 }}>
          {slide.subtitle}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 16 }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
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
        @keyframes promoFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
