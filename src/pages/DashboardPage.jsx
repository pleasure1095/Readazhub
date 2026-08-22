import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, buttonStyle, cardStyle } from "../styles/theme";
import { VIPS, VIP_LIST } from "../utils/vipPlans";
import { calculateInvestmentEarnings, isEarningToday } from "../utils/earnings";
import { isWithinWithdrawalHours, WHATSAPP_GROUP_LINK } from "../utils/paymentInfo";
import { getUserDeposits } from "../services/deposits";
import { getReviewStatus, countReviewedEarningDays, getReviewedDatesForInvestment } from "../services/reviews";
import { getCheckInStatus } from "../services/checkins";
import PlanCarousel from "../components/PlanCarousel";
import EarnersTicker from "../components/EarnersTicker";
import CheckInWidget from "../components/CheckInWidget";
import ReadEarnWidget from "../components/ReadEarnWidget";
import PromoBanner from "../components/PromoBanner";
import ActionGrid from "../components/ActionGrid";
import ActivityFeed from "../components/ActivityFeed";
import WelcomeBanner from "../components/WelcomeBanner";
import DepositModal from "../components/DepositModal";
import CombinedWithdrawModal from "../components/CombinedWithdrawModal";
import { getActivityFeed } from "../services/activityFeed";

function chipStyle(color) {
  return {
    display: "inline-block",
    padding: "3px 12px",
    borderRadius: 20,
    background: `${color}22`,
    color,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
  };
}

function fmt(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [activityEvents, setActivityEvents] = useState([]);
  const [completedReviewDays, setCompletedReviewDays] = useState([]);
  const [completedDayTimestamps, setCompletedDayTimestamps] = useState({});
  const [todayDateString, setTodayDateString] = useState("");
  const [checkInBalance, setCheckInBalance] = useState(0);
  const [checkInLifetimeWithdrawn, setCheckInLifetimeWithdrawn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [preselectedPlanId, setPreselectedPlanId] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [statScrollPaused, setStatScrollPaused] = useState(false);
  const [tick, setTick] = useState(0);

  async function load() {
    try {
      const all = await getUserDeposits(user.uid);
      setDeposits(all);
      // Reuses the deposits we just fetched rather than querying twice.
      const events = await getActivityFeed(user.uid, all);
      setActivityEvents(events);
      const reviewStatus = await getReviewStatus(user.uid);
      setCompletedReviewDays(reviewStatus.completedDays);
      setCompletedDayTimestamps(reviewStatus.completedDayTimestamps);
      setTodayDateString(reviewStatus.today);
      // Check-in balance lives in its own Firestore collection, separate
      // from VIP investments/bonuses — without fetching it here, the
      // Dashboard's top-level "Withdrawable Profit" stat card would stay
      // blind to check-in earnings entirely (CheckInWidget shows its own
      // balance correctly, but the summary cards never knew about it).
      const checkInStatus = await getCheckInStatus(user.uid);
      setCheckInBalance(checkInStatus.unlockedBalance || 0);
      setCheckInLifetimeWithdrawn(checkInStatus.lifetimeWithdrawn || 0);
      // Referral bonus is now a ONE-TIME flat credit stored on the user
      // profile (referralBonusTotal), applied the instant a referred
      // user's deposit is approved. Nothing to live-compute — just
      // refresh the user profile so any credit from elsewhere shows up.
      await refreshUser();
    } catch (e) {
      console.error("Failed to load deposits:", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Re-render periodically so accruing earnings and the withdrawal-hours
  // window stay live without requiring a manual refresh. `tick` itself
  // isn't used for any value — incrementing it just forces this component
  // to re-run calculateInvestmentEarnings() with a fresh Date.now() below.
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60000);
    return () => clearInterval(t);
  }, []);
  void tick; // referenced so its purpose is explicit, not silently relied upon

  const approved = deposits.filter((d) => d.status === "approved");
  const pending = deposits.filter((d) => d.status === "pending");
  const rejected = deposits.filter((d) => d.status === "rejected");

  // VIP membership for check-in eligibility: having at least one deposit
  // that was EVER approved, regardless of whether that specific investment
  // is still active, fully withdrawn, or otherwise — membership, once
  // earned, doesn't expire.
  const isVipMember = approved.length > 0;

  // "Migrate" suggests the next tier above the user's current highest
  // active plan, since READAZHUB plans don't expire (unlike the reference
  // design's 30-day cycles) — this is just a friendlier entry point into
  // the same deposit flow as a fresh deposit, defaulting to an upgrade
  // rather than starting back at VIP 1.
  function openMigrate() {
    const ownedPlanIds = new Set(deposits.filter((d) => d.status === "approved" || d.status === "pending").map((d) => d.planId));
    const nextTier = VIP_LIST.find((p) => !ownedPlanIds.has(p.id));
    setPreselectedPlanId(nextTier ? nextTier.id : VIP_LIST[VIP_LIST.length - 1].id);
    setShowDeposit(true);
  }

  function openNewDeposit() {
    setPreselectedPlanId(null);
    setShowDeposit(true);
  }

  // Opens the single combined withdraw flow — covers VIP profit, Referral
  // Bonus, Welcome Bonus, and Check-in balance together, replacing what
  // used to be several separate withdraw buttons/modals per source.
  function openWithdraw() {
    setShowWithdraw(true);
  }

  function openSupport() {
    // Points to the community WhatsApp GROUP (same link used in
    // WelcomeModal/WelcomeBanner), not a 1:1 chat with a specific number
    // — per the site owner's request that Support lead directly to the
    // group rather than a personal DM.
    window.open(WHATSAPP_GROUP_LINK, "_blank", "noopener,noreferrer");
  }

  // Enrich each approved deposit with live earnings figures using the
  // shared calculation utility — the single source of truth for the
  // capital-locked, profit-only-withdrawal, daily-review-gate, and
  // (as of this session) per-day 24h maturity rules. A single `now` is
  // captured once and reused across countReviewedEarningDays() and
  // calculateInvestmentEarnings() so they're always evaluated against
  // the same instant. reviewedDatesForInvestment + completedDayTimestamps
  // are passed through so calculateInvestmentEarnings can split each
  // investment's earned days into matured (withdrawable) vs
  // still-maturing (task done, 24h timer not yet finished).
  const now = Date.now();
  const investments = approved.map((d) => {
    const plan = VIPS[d.planId] || { label: d.planLabel, daily: d.planDaily, color: C.emerald };
    const reviewedDayCount = countReviewedEarningDays(d.approvedAt, now, completedReviewDays);
    const reviewedDatesForInvestment = getReviewedDatesForInvestment(d.approvedAt, completedReviewDays);
    const calc = calculateInvestmentEarnings(
      d.planDaily,
      d.approvedAt,
      d.lifetimeWithdrawn || 0,
      reviewedDayCount,
      now,
      reviewedDatesForInvestment,
      completedDayTimestamps
    );
    return { ...d, plan, ...calc };
  });

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalDaily = investments.reduce((s, i) => s + i.plan.daily, 0);
  const totalAvailableEarnings = investments.reduce((s, i) => s + i.availableEarnings, 0);
  const totalWithdrawableProfit = investments.reduce((s, i) => s + i.withdrawableBalance, 0);
  // Sum of earnings that have been EARNED (task completed) but haven't
  // finished their individual 24h maturity timer yet — shown separately
  // from totalWithdrawableProfit so users can see what's coming without
  // mistaking it for money they can withdraw right now.
  const totalMaturingProfit = investments.reduce((s, i) => s + i.maturingEarnings, 0);
  const totalMissedEarnings = investments.reduce((s, i) => s + i.missedEarnings, 0);
  // "Today's Earnings" — the sum of TODAY's dailyRate across every
  // investment that has today's reading task completed. Distinct from
  // totalAvailableEarnings, which is a LIFETIME cumulative sum across
  // every day ever earned. ₦0 if today's reading hasn't been completed
  // yet, even if every previous day was read — matches the app's
  // existing all-or-nothing daily reading gate (see utils/earnings.js
  // isEarningToday for the exact rule this mirrors). Note this is
  // "earned today", not "withdrawable today" — today's amount still
  // needs its own 24h maturity window before it moves from maturing to
  // withdrawable (see maturingEarnings/withdrawableBalance below).
  const totalTodayEarnings = investments.reduce((s, i) => {
    return s + (isEarningToday(i.approvedAt, todayDateString, completedReviewDays, now) ? i.plan.daily : 0);
  }, 0);
  // One-time flat credit (9%/2% two-level of deposit amount), stored on
  // the user profile and spent down directly on withdrawal.
  const referralBonus = user.referralBonusTotal || 0;
  const welcomeBonus = user.welcomeBonus || 0;

  const withinHours = isWithinWithdrawalHours();

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Loading your portfolio…</div>;
  }

  return (
    <div>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 800,
          marginBottom: 18,
          color: C.text,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: C.techGlow,
            boxShadow: `0 0 8px ${C.techGlow}`,
            display: "inline-block",
          }}
        />
        Dashboard
      </h2>

      <WelcomeBanner />

      {pending.length > 0 && (
        <div
          style={{
            background: "rgba(46,204,113,0.08)",
            border: "1px solid rgba(46,204,113,0.3)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <strong style={{ color: C.emerald }}>
            ⏳ {pending.length} deposit{pending.length > 1 ? "s" : ""} pending admin approval
          </strong>
        </div>
      )}
      {rejected.length > 0 && (
        <div
          style={{
            background: "rgba(207,120,120,0.08)",
            border: "1px solid rgba(207,120,120,0.25)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <strong style={{ color: C.red }}>
            ❌ {rejected.length} deposit{rejected.length > 1 ? "s" : ""} rejected
          </strong>
        </div>
      )}

      {/* REORDERED this pass: Action Grid now sits right after the alert
          banners, immediately visible without scrolling — matching the
          reference app's layout where the icon grid is one of the first
          things on screen, not buried under a long stat block. The daily
          task widgets (Read & Earn, Check-in) also moved up, ahead of
          Activity Feed and the stat scroller, since completing today's
          task is the single most important action-item on this screen
          and previously required scrolling past a feed of past events to
          reach it. */}
      <ActionGrid
        onDeposit={openNewDeposit}
        onMigrate={openMigrate}
        onWithdraw={openWithdraw}
        onSupport={openSupport}
      />

      {/* Balance & bonus overview — 4 "major" figures get real visual
          weight up top (Today's Earnings, Withdrawable Profit, Welcome
          Bonus, Referral Bonus). The full 8-stat auto-scrolling row now
          lives further down the page (see below), after the daily task
          widgets, since a first-time glance at 4 clear numbers matters
          more here than the complete breakdown.
          "Today's Earnings" replaces lifetime Total Earnings in this top
          row — for a daily-task app, "what did I earn today" is the more
          actionable, motivating number than a cumulative lifetime total,
          which is still available in the full 8-stat scroller below. */}
      {(() => {
        const majorStats = [
          { key: "todayEarnings", label: "Today's Earnings", value: `₦${fmt(totalTodayEarnings)}`, color: C.lime },
          { key: "withdrawable", label: "Withdrawable Profit", value: `₦${fmt(totalWithdrawableProfit + referralBonus + welcomeBonus + checkInBalance)}`, color: C.emerald },
          // Earned (task completed) but still inside its 24h per-day
          // maturity window — shown separately so it's never mistaken
          // for money that's withdrawable right now.
          { key: "maturing", label: "Maturing (24h)", value: `₦${fmt(totalMaturingProfit)}`, color: C.gold || C.purple },
          { key: "welcomeBonus", label: "Welcome Bonus", value: `₦${fmt(welcomeBonus)}`, color: C.purple },
          { key: "referralBonus", label: "Referral Bonus", value: `₦${fmt(referralBonus)}`, color: C.forest },
        ];
        return (
          <div className="major-stat-grid" style={{ marginBottom: 20 }}>
            {majorStats.map((s) => (
              <div key={s.key} style={{ ...cardStyle, border: `1px solid ${s.color}35`, padding: 18 }}>
                <div style={{ fontSize: 10.5, letterSpacing: "0.1em", color: C.dim, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 23, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      <ReadEarnWidget userId={user.uid} isVipMember={isVipMember} onEarningsUnlocked={load} />
      <CheckInWidget userId={user.uid} isVipMember={isVipMember} />

      <PromoBanner />

      {/* Full 8-stat breakdown, auto-scrolling — kept for anyone who wants
          the complete picture (Total Investment, Daily Earnings, Missed,
          Active Plans, on top of the 4 majors above), but now positioned
          after the primary action items rather than before them. */}
      {(() => {
        const allStats = [
          { key: "totalInvestment", label: "Total Investment", value: `₦${fmt(totalInvested)}`, color: C.emerald },
          { key: "dailyEarnings", label: "Daily Earnings", value: `₦${fmt(totalDaily)}`, color: C.green },
          { key: "todayEarnings", label: "Today's Earnings", value: `₦${fmt(totalTodayEarnings)}`, color: C.lime },
          { key: "totalEarnings", label: "Lifetime Earnings", value: `₦${fmt(totalAvailableEarnings + checkInBalance)}`, color: C.lime },
          { key: "maturing", label: "Maturing (24h)", value: `₦${fmt(totalMaturingProfit)}`, color: C.gold || C.purple },
          { key: "missed", label: "Missed (Unread)", value: `₦${fmt(totalMissedEarnings)}`, color: C.dim },
          { key: "referralBonus", label: "Referral Bonus", value: `₦${fmt(referralBonus)}`, color: C.forest },
          { key: "welcomeBonus", label: "Welcome Bonus", value: `₦${fmt(welcomeBonus)}`, color: C.purple },
          { key: "withdrawable", label: "Withdrawable Profit", value: `₦${fmt(totalWithdrawableProfit + referralBonus + welcomeBonus + checkInBalance)}`, color: C.emerald },
          { key: "activePlans", label: "Active VIP Plans", value: investments.length, color: C.green },
        ];
        // Duplicated once so the CSS scroll-loop animation can slide from
        // 0% to -50% and land back exactly where it started, giving a
        // seamless infinite loop instead of a visible jump/reset.
        const loopStats = [...allStats, ...allStats];

        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.dim, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Full Breakdown
              </span>
              <button
                onClick={() => setStatScrollPaused((p) => !p)}
                style={{
                  background: "none",
                  border: "none",
                  color: C.dim,
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "2px 6px",
                  minHeight: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {statScrollPaused ? "▶ Resume scroll" : "⏸ Pause scroll"}
              </button>
            </div>
            <div className="stat-scroll-viewport" style={{ marginBottom: 24 }}>
              <div className={`stat-scroll-track${statScrollPaused ? " stat-scroll-paused" : ""}`}>
                {loopStats.map((s, i) => (
                  <div key={`${s.key}-${i}`} className="stat-scroll-card" style={{ border: `1px solid ${s.color}28` }}>
                    <div style={{ fontSize: 9.5, letterSpacing: "0.08em", color: C.dim, textTransform: "uppercase", marginBottom: 6, whiteSpace: "nowrap" }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color, whiteSpace: "nowrap" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      })()}

      <ActivityFeed events={activityEvents} />
      <EarnersTicker />
      <PlanCarousel />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text }}>My VIP Plans</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {investments.length > 0 && (
            <button style={{ ...buttonStyle("ghost"), padding: "9px 18px", fontSize: 13 }} onClick={openMigrate}>
              ⇧ Migrate
            </button>
          )}
          <button style={{ ...buttonStyle("gold"), padding: "9px 18px", fontSize: 13 }} onClick={openNewDeposit}>
            + New Deposit
          </button>
        </div>
      </div>

      {investments.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "50px 20px",
            background: C.surface,
            border: `1px dashed ${C.border}`,
            borderRadius: 14,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
          <div style={{ fontSize: 15, color: C.dim, marginBottom: 8 }}>No active VIP plans yet</div>
          <div style={{ fontSize: 13, color: "#4A5A50", marginBottom: 18 }}>Make a deposit and wait for admin approval</div>
          <button style={{ ...buttonStyle("gold"), padding: "9px 20px" }} onClick={openNewDeposit}>
            Make First Deposit
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {investments.map((inv) => (
            <div key={inv.id} style={{ ...cardStyle, border: `1px solid ${inv.plan.color}28` }} className="fade">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={chipStyle(inv.plan.color)}>{inv.plan.label}</span>
                    <span style={chipStyle(C.green)}>ACTIVE</span>
                  </div>
                  <div style={{ fontSize: 12, color: inv.plan.color, fontWeight: 600 }}>
                    ₦{inv.plan.daily.toLocaleString()} daily earnings
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                    Invested ₦{(inv.amount || 0).toLocaleString()} (locked) · Approved {fmtDate(inv.approvedAt)}
                  </div>
                  {inv.maturingEarnings > 0 && (
                    <div style={{ fontSize: 11, color: C.gold || C.purple, marginTop: 4, fontWeight: 600 }}>
                      ₦{fmt(inv.maturingEarnings)} maturing
                      {inv.nextMaturityAt ? ` · next unlock ${fmtDate(inv.nextMaturityAt)} ${new Date(inv.nextMaturityAt).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}` : ""}
                    </div>
                  )}
                  {inv.missedEarnings > 0 && (
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 4, fontWeight: 600 }}>
                      ₦{fmt(inv.missedEarnings)} missed on unread days
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>₦{fmt(inv.withdrawableBalance)}</div>
                  <div style={{ fontSize: 11, color: C.dim }}>withdrawable now</div>
                  {inv.maturingEarnings > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.gold || C.purple, marginTop: 2 }}>
                      +₦{fmt(inv.maturingEarnings)} maturing
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deposits.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: C.muted, marginBottom: 14 }}>
            Deposit History
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {deposits.map((d) => {
              const sc = d.status === "approved" ? C.green : d.status === "rejected" ? C.red : C.emerald;
              return (
                <div
                  key={d.id}
                  style={{
                    ...cardStyle,
                    border: `1px solid ${sc}20`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 10,
                    padding: 16,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={chipStyle(sc)}>{d.status.toUpperCase()}</span>
                      <span style={{ fontSize: 11, color: C.dim }}>{d.ref}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>{fmtDate(d.submittedAt)}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: sc }}>₦{(d.amount || 0).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showDeposit && (
        <DepositModal
          user={user}
          initialPlanId={preselectedPlanId}
          onClose={() => {
            setShowDeposit(false);
            setPreselectedPlanId(null);
          }}
          onDone={load}
        />
      )}
      {showWithdraw && (
        <CombinedWithdrawModal
          userId={user.uid}
          userName={user.name}
          investments={investments}
          referralWithdrawableBalance={referralBonus}
          welcomeBonus={welcomeBonus}
          checkInBalance={checkInBalance}
          checkInLifetimeWithdrawn={checkInLifetimeWithdrawn}
          savedBankDetails={user.savedBankDetails}
          onClose={() => setShowWithdraw(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
