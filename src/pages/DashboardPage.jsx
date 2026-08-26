import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, buttonStyle, cardStyle } from "../styles/theme";
import { VIPS, VIP_LIST } from "../utils/vipPlans";
import { calculateInvestmentEarnings, isEarningToday } from "../utils/earnings";
import { isWithinWithdrawalHours, WHATSAPP_GROUP_LINK } from "../utils/paymentInfo";
import { isLaunchPauseActive, LAUNCH_PAUSE_ENDS_AT } from "../utils/launchPause";
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

/**
 * Live countdown to a target timestamp, e.g. "6h 32m" or "45m 12s" once
 * under an hour. Ticks on its OWN 1-second interval, deliberately kept
 * separate from the Dashboard's existing 60-second `tick` state — a
 * countdown needs second-level granularity to feel "live", but forcing
 * the entire Dashboard (all its investment math, review-day fetches,
 * etc.) to re-render every second just for this one small label would be
 * wasteful. Returns null once the target has passed, so the caller can
 * decide what to show instead (the parent card already re-derives
 * `maturingEarnings`/`nextMaturityAt` from real data on its own refresh
 * cycle, so this component only OWNS the countdown text, not the
 * decision of what's maturing).
 */
function MaturityCountdown({ targetTs, style }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!targetTs) return null;
  const remainingMs = targetTs - now;
  if (remainingMs <= 0) return <span style={style}>Unlocking…</span>;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const text = hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  return <span style={style}>{text}</span>;
}

/**
 * Bold "digital clock" style countdown to a plan's 30-day expiry —
 * dark glowing segments (days / hrs / min), switching to a red/orange
 * glow in the final URGENT_THRESHOLD_MS window so a user notices their
 * plan is about to close. Ticks once a minute (not every second, unlike
 * MaturityCountdown above) — a 30-day countdown doesn't need
 * second-level precision, and a slower tick is kinder to battery/perf
 * for what's likely to be several of these rendered at once if a user
 * has multiple plans.
 */
/**
 * ONE-TIME launch-pause banner (see utils/launchPause.js) — shown only
 * to already-upgraded VIP members while the Aug 26, 2026 relaunch pause
 * is active. Counts down to LAUNCH_PAUSE_ENDS_AT, then this component
 * naturally stops rendering anything (isLaunchPauseActive() returns
 * false) — no manual cleanup needed after launch.
 *
 * Deliberately always uses the "urgent" red/orange color scheme from
 * the countdown segments below (unlike PlanCountdown, which only turns
 * urgent in the final 3 days) — a launch pause is inherently something
 * that deserves attention regardless of how much time is left on it.
 */
function LaunchPauseBanner() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!isLaunchPauseActive(now)) return null;

  const remainingMs = LAUNCH_PAUSE_ENDS_AT - now;
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const segStyle = {
    background: "linear-gradient(160deg, #2D2226, #1A1315)",
    color: "#FF8A6B",
    borderRadius: 10,
    padding: "8px 10px",
    textAlign: "center",
    minWidth: 44,
    boxShadow: "0 3px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 14px rgba(255,138,107,0.25)",
  };
  const numStyle = {
    fontSize: 18,
    fontWeight: 900,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
    textShadow: "0 0 10px rgba(255,138,107,0.5)",
    letterSpacing: "-0.02em",
  };
  const unitStyle = {
    fontSize: 7.5,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    opacity: 0.7,
    marginTop: 3,
    fontWeight: 700,
    color: "#F4E4C1",
  };
  const colonStyle = { display: "flex", alignItems: "center", fontSize: 16, fontWeight: 900, color: "#D9C4A8", padding: "0 2px" };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(255,138,107,0.1), rgba(255,138,107,0.03))",
        border: "1px solid rgba(255,138,107,0.3)",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 2 }}>🚀 Launching Soon</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
        Earnings and withdrawals are paused for launch. Everything resumes automatically when the countdown ends.
      </div>
      <div style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
        <div style={segStyle}><div style={numStyle}>{String(hours).padStart(2, "0")}</div><div style={unitStyle}>hrs</div></div>
        <div style={colonStyle}>:</div>
        <div style={segStyle}><div style={numStyle}>{String(minutes).padStart(2, "0")}</div><div style={unitStyle}>min</div></div>
        <div style={colonStyle}>:</div>
        <div style={segStyle}><div style={numStyle}>{String(seconds).padStart(2, "0")}</div><div style={unitStyle}>sec</div></div>
      </div>
    </div>
  );
}

const URGENT_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // last 3 days
function PlanCountdown({ targetTs }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    // Ticks every SECOND now (was every 60s) so the added seconds
    // segment below actually moves live rather than sitting frozen
    // between minute-boundary re-renders.
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!targetTs) return null;
  const remainingMs = targetTs - now;
  if (remainingMs <= 0) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const isUrgent = remainingMs <= URGENT_THRESHOLD_MS;

  const segStyle = {
    background: "linear-gradient(160deg, #2D2226, #1A1315)",
    color: isUrgent ? "#FF8A6B" : "#FFD166",
    borderRadius: 10,
    padding: "8px 10px",
    textAlign: "center",
    minWidth: 44,
    boxShadow: isUrgent
      ? "0 3px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 14px rgba(255,138,107,0.25)"
      : "0 3px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 14px rgba(255,209,102,0.18)",
  };
  const numStyle = {
    fontSize: 18,
    fontWeight: 900,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
    textShadow: isUrgent ? "0 0 10px rgba(255,138,107,0.5)" : "0 0 10px rgba(255,209,102,0.4)",
    letterSpacing: "-0.02em",
  };
  const unitStyle = {
    fontSize: 7.5,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    opacity: 0.7,
    marginTop: 3,
    fontWeight: 700,
    color: "#F4E4C1",
  };
  const colonStyle = { display: "flex", alignItems: "center", fontSize: 16, fontWeight: 900, color: "#D9C4A8", padding: "0 2px" };

  return (
    <div style={{ display: "inline-flex", gap: 5, alignItems: "center", marginTop: 6 }}>
      <div style={segStyle}><div style={numStyle}>{String(days).padStart(2, "0")}</div><div style={unitStyle}>days</div></div>
      <div style={colonStyle}>:</div>
      <div style={segStyle}><div style={numStyle}>{String(hours).padStart(2, "0")}</div><div style={unitStyle}>hrs</div></div>
      <div style={colonStyle}>:</div>
      <div style={segStyle}><div style={numStyle}>{String(minutes).padStart(2, "0")}</div><div style={unitStyle}>min</div></div>
      <div style={colonStyle}>:</div>
      <div style={segStyle}><div style={numStyle}>{String(seconds).padStart(2, "0")}</div><div style={unitStyle}>sec</div></div>
    </div>
  );
}

/**
 * Large, always-urgent countdown for the VIP Starter retirement
 * deadline — deliberately bigger and more alarming than PlanCountdown
 * above (this is a one-time, business-critical cutoff, not a routine
 * per-plan expiry), and ticks every SECOND since the deadline is under
 * 24 hours away — a minute-granularity tick would feel sluggish for a
 * countdown this close and this important. Always renders in the
 * urgent red/orange palette (no green "plenty of time" state), since by
 * definition every user seeing this banner is inside the final ~24h
 * window — see isStarterDeadline in DashboardPage's investments
 * calculation for the gating logic.
 */
function VipStarterDeadlineCountdown({ targetTs }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = Math.max(0, targetTs - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const segStyle = {
    background: "linear-gradient(160deg, #4A1810, #2A0D0A)",
    color: "#FF8A6B",
    borderRadius: 14,
    padding: "14px 16px",
    textAlign: "center",
    minWidth: 72,
    boxShadow: "0 6px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px rgba(255,138,107,0.35)",
  };
  const numStyle = {
    fontSize: 34,
    fontWeight: 900,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
    textShadow: "0 0 16px rgba(255,138,107,0.6)",
    letterSpacing: "-0.02em",
  };
  const unitStyle = {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    opacity: 0.75,
    marginTop: 5,
    fontWeight: 800,
    color: "#FFD1C2",
  };
  const colonStyle = { display: "flex", alignItems: "center", fontSize: 30, fontWeight: 900, color: "#FF8A6B", padding: "0 4px" };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
      <div style={segStyle}><div style={numStyle}>{String(hours).padStart(2, "0")}</div><div style={unitStyle}>hrs</div></div>
      <div style={colonStyle}>:</div>
      <div style={segStyle}><div style={numStyle}>{String(minutes).padStart(2, "0")}</div><div style={unitStyle}>min</div></div>
      <div style={colonStyle}>:</div>
      <div style={segStyle}><div style={numStyle}>{String(seconds).padStart(2, "0")}</div><div style={unitStyle}>sec</div></div>
    </div>
  );
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
  const [upgradeSource, setUpgradeSource] = useState(null); // { depositId, planId } | null
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

  // A real upgrade: merges the user's current highest active plan into
  // the next tier up, closing the old one out (see approveDeposit in
  // services/deposits.js) rather than running two plans side by side.
  // Requires an actual approved, still-active (not already superseded)
  // deposit to upgrade FROM — if the user has none, this falls back to
  // a normal fresh deposit at VIP Starter.
  function openMigrate() {
    const activeApproved = deposits.filter((d) => d.status === "approved");
    if (activeApproved.length === 0) {
      // Falling through to a normal (non-upgrade) deposit here is only
      // correct when the user genuinely has no approved plan yet. If
      // they DO have one and still land here, the most likely cause is
      // `deposits` not being loaded/passed correctly into this component
      // — this alert + log makes that failure visible instead of quietly
      // showing the full-price picker with no explanation.
      if (deposits.length > 0) {
        console.warn("openMigrate: no approved deposit found, but user has", deposits.length, "deposit(s) with statuses:", deposits.map((d) => d.status));
        alert(`No active VIP plan found to upgrade from (you have ${deposits.length} deposit(s) on file, but none are approved). Opening a regular deposit instead — contact support if you believe this is wrong.`);
      }
      setUpgradeSource(null);
      setPreselectedPlanId(null);
      setShowDeposit(true);
      return;
    }
    // Highest-value active plan is the one to upgrade — if a user somehow
    // has more than one still-active approved deposit (e.g. from before
    // this upgrade flow existed), upgrading the largest one first is the
    // more sensible default.
    const highest = activeApproved.reduce((a, b) => ((b.amount || 0) > (a.amount || 0) ? b : a));
    const nextTier = VIP_LIST.find((p) => p.amount > (highest.amount || 0));
    setUpgradeSource({ depositId: highest.id, planId: highest.planId });
    setPreselectedPlanId(nextTier ? nextTier.id : VIP_LIST[VIP_LIST.length - 1].id);
    setShowDeposit(true);
  }

  function openNewDeposit() {
    setPreselectedPlanId(null);
    setUpgradeSource(null);
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
  // VIP Starter (vip1) retirement deadline — a fixed, one-time business
  // cutoff separate from and EARLIER than each plan's own 30-day cycle.
  // Only vip1 plans are affected; every other tier keeps its normal
  // 30-day expiry from calculateInvestmentEarnings untouched. Deadline:
  // Wed, Aug 26, 2026, 12:00pm WAT (UTC+1) — 2026-08-26T11:00:00.000Z.
  const VIP_STARTER_DEADLINE = new Date("2026-08-26T11:00:00.000Z").getTime();
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
    // A VIP Starter plan is force-closed at the retirement deadline even
    // if its own 30-day cycle hasn't finished yet — the EARLIER of the
    // two cutoffs wins. isExpired/planExpiresAt get overridden here
    // rather than inside calculateInvestmentEarnings itself, since that
    // function is generic to every plan and shouldn't carry a one-off,
    // single-tier business rule. Already-matured withdrawableBalance is
    // untouched either way — this only affects whether MORE profit can
    // accrue going forward, same principle as the normal 30-day cap.
    const isStarter = d.planId === "vip1";
    const starterForceClosed = isStarter && now >= VIP_STARTER_DEADLINE;
    const effectiveExpiresAt = isStarter ? Math.min(calc.planExpiresAt, VIP_STARTER_DEADLINE) : calc.planExpiresAt;
    return {
      ...d,
      plan,
      ...calc,
      isExpired: calc.isExpired || starterForceClosed,
      planExpiresAt: effectiveExpiresAt,
      isStarterDeadline: isStarter && !calc.isExpired && now < VIP_STARTER_DEADLINE,
    };
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
  // Earliest nextMaturityAt across every investment that actually has
  // something maturing — this is what the top-card countdown ticks
  // toward. An investment with maturingEarnings === 0 has nothing
  // pending, so its nextMaturityAt (if any) is irrelevant here and must
  // be excluded, or a fully-matured old investment could wrongly surface
  // a stale/past timestamp instead of the real next unlock.
  const nextMaturityTimestamps = investments
    .filter((i) => i.maturingEarnings > 0 && i.nextMaturityAt)
    .map((i) => i.nextMaturityAt);
  const earliestMaturity = nextMaturityTimestamps.length > 0 ? Math.min(...nextMaturityTimestamps) : null;
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

      {investments.some((i) => i.isStarterDeadline) && (
        <div
          style={{
            background: "linear-gradient(160deg, #3A1410, #2A0D0A)",
            border: "1px solid rgba(255,138,107,0.35)",
            borderRadius: 16,
            padding: 20,
            marginBottom: 18,
            boxShadow: "0 6px 20px rgba(0,0,0,0.3), 0 0 30px rgba(255,138,107,0.12)",
          }}
        >
          <div style={{ fontSize: 11, color: "#FF8A6B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
            ⚠ VIP Starter is being retired
          </div>
          <div style={{ fontSize: 15, color: "#F4E4C1", fontWeight: 600, marginBottom: 14, lineHeight: 1.4 }}>
            Your VIP Starter plan will close automatically at 12:00pm tomorrow. Migrate now to keep earning — you'll only pay the difference.
          </div>
          <VipStarterDeadlineCountdown targetTs={VIP_STARTER_DEADLINE} />
          <button
            style={{ ...buttonStyle("gold"), width: "100%", marginTop: 16, fontSize: 15, fontWeight: 800, padding: "14px" }}
            onClick={openMigrate}
          >
            Migrate Now →
          </button>
        </div>
      )}

      <WelcomeBanner />

      {isVipMember && <LaunchPauseBanner />}

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
          { key: "maturing", label: "Maturing (24h)", value: `₦${fmt(totalMaturingProfit)}`, color: C.gold || C.purple, showCountdown: true },
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
                {s.showCountdown && totalMaturingProfit > 0 && earliestMaturity && (
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                    unlocks in <MaturityCountdown targetTs={earliestMaturity} style={{ fontWeight: 700, color: s.color }} />
                  </div>
                )}
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
                    <span style={chipStyle(inv.isExpired ? C.dim : C.green)}>{inv.isExpired ? "CLOSED" : "ACTIVE"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: inv.plan.color, fontWeight: 600 }}>
                    ₦{inv.plan.daily.toLocaleString()} daily earnings
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                    Invested ₦{(inv.amount || 0).toLocaleString()} (locked) · Approved {fmtDate(inv.approvedAt)}
                  </div>
                  {!inv.isExpired && inv.planExpiresAt && (
                    <div>
                      <div style={{ fontSize: 10, color: C.dim, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                        Plan ends {fmtDate(inv.planExpiresAt)}
                      </div>
                      <PlanCountdown targetTs={inv.planExpiresAt} />
                    </div>
                  )}
                  {inv.isExpired && (
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
                      30-day cycle ended {fmtDate(inv.planExpiresAt)} — withdraw any remaining balance below.
                    </div>
                  )}
                  {inv.maturingEarnings > 0 && (
                    <div style={{ fontSize: 11, color: C.gold || C.purple, marginTop: 8, fontWeight: 600 }}>
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
          upgradeFromDepositId={upgradeSource?.depositId}
          upgradeFromPlanId={upgradeSource?.planId}
          onClose={() => {
            setShowDeposit(false);
            setPreselectedPlanId(null);
            setUpgradeSource(null);
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
