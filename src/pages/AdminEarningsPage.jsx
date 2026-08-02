import { useEffect, useState } from "react";
import { C, buttonStyle, cardStyle } from "../styles/theme";
import { getAllDeposits } from "../services/deposits";
import { getReviewStatus, countReviewedEarningDays } from "../services/reviews";
import { calculateInvestmentEarnings, getDaysEarning } from "../utils/earnings";
import { getAllWithdrawalRequests, markCombinedWithdrawalPaid, rejectCombinedWithdrawal } from "../services/withdrawalRequests";
import FormInput from "../components/FormInput";

function fmt(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

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

/**
 * Admin-facing earnings overview — one row per approved VIP investment,
 * showing exactly what the investor sees on their own dashboard: days
 * elapsed, days actually reviewed, available balance, and lifetime
 * withdrawn. Also surfaces pending combined withdrawal requests directly
 * on this page (not just a count) so an admin can act on them without
 * switching to the Deposits tab, and pay/reject right here.
 *
 * Deliberately reuses calculateInvestmentEarnings() and
 * countReviewedEarningDays() — the same functions DashboardPage.jsx
 * calls for the user's own view — rather than recomputing this logic
 * independently. This guarantees the number an admin sees here can never
 * drift from what the user sees on their own screen; there's only one
 * place the math lives.
 *
 * Per-user review data (completedDays) has to be fetched separately per
 * unique userId since it's not stored on the deposit itself — cached in
 * a Map keyed by userId so a user with multiple investments only costs
 * one extra read, not one per investment.
 */
export default function AdminEarningsPage() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filter, setFilter] = useState("all"); // all | has_balance | pending_withdrawal | grace
  const [readStats, setReadStats] = useState(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    const loadStartedAt = Date.now();
    try {
      const allDeposits = await getAllDeposits();
      const approved = allDeposits.filter((d) => d.status === "approved");

      // Combined withdrawal requests now live in their own collection
      // (withdrawalRequests) rather than being tagged onto a single
      // deposit — a combined request can span VIP profit AND bonuses,
      // so it no longer maps cleanly onto one investment.
      try {
        const allWithdrawals = await getAllWithdrawalRequests();
        setWithdrawalRequests(allWithdrawals.filter((r) => r.status === "pending"));
      } catch (e) {
        console.error("Failed to load withdrawal requests:", e);
      }

      // Fetch each unique user's review record once, not once per investment.
      const uniqueUserIds = [...new Set(approved.map((d) => d.userId))];
      const reviewsByUser = new Map();
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          try {
            const status = await getReviewStatus(uid);
            reviewsByUser.set(uid, status.completedDays);
          } catch (e) {
            console.error(`Failed to load reviews for user ${uid}:`, e);
            reviewsByUser.set(uid, []);
          }
        })
      );
      // Surfaced in the UI (not just console) so this doesn't stay a
      // silent, invisible cost as the VIP member count grows — this page
      // does 1 read per unique VIP member every time it's opened, with
      // no caching. At small scale (tens of members) that's fast and
      // harmless; if this count climbs into the hundreds and load time
      // becomes noticeable, that's the signal a caching layer or a
      // Cloud Function aggregate is worth building, rather than
      // guessing at the right time to add that complexity upfront.
      setReadStats({ userCount: uniqueUserIds.length, loadMs: Date.now() - loadStartedAt });

      // A single `now` is captured once and reused across the whole map
      // (and for calculateInvestmentEarnings below), so
      // countReviewedEarningDays() is always evaluated against the same
      // instant getDaysEarning-equivalent logic uses internally —
      // previously this passed daysEarning's RESULT (elapsed 24-hour
      // periods) into countReviewedEarningDays where it was treated as
      // elapsed calendar days, which drift apart depending on what time
      // of day a deposit was approved, causing genuinely-reviewed days to
      // go undetected (this is what the site owner reported: "users keep
      // reviewing but it doesn't reflect here").
      const now = Date.now();
      const enriched = approved.map((d) => {
        const completedDays = reviewsByUser.get(d.userId) || [];
        const reviewedDayCount = countReviewedEarningDays(d.approvedAt, now, completedDays);
        const calc = calculateInvestmentEarnings(d.planDaily, d.approvedAt, d.lifetimeWithdrawn || 0, reviewedDayCount, now);
        return { ...d, ...calc, reviewedDayCount };
      });

      // Soonest-due (or most overdue-looking) first: sort by withdrawable
      // balance descending, since that's the figure an admin most likely
      // wants to scan for — who currently has money sitting ready.
      enriched.sort((a, b) => b.withdrawableBalance - a.withdrawableBalance);

      setInvestments(enriched);
    } catch (e) {
      console.error(e);
      setErr("Could not load earnings overview.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkPaid(req) {
    setErr("");
    setOk("");
    setBusyId(req.id);
    try {
      await markCombinedWithdrawalPaid(req.id, req.userId, req.amount);
      setOk("Withdrawal marked as paid.");
      await load();
    } catch (e) {
      console.error(e);
      setErr("Could not update withdrawal.");
    }
    setBusyId(null);
  }

  async function handleRejectWithdrawal(req) {
    setErr("");
    setOk("");
    setBusyId(req.id);
    try {
      await rejectCombinedWithdrawal(req);
      setOk("Withdrawal rejected and balance restored.");
      await load();
    } catch (e) {
      console.error(e);
      setErr("Could not reject withdrawal.");
    }
    setBusyId(null);
  }

  let filtered = investments;
  if (searchName.trim()) {
    const q = searchName.trim().toLowerCase();
    filtered = filtered.filter((i) => i.userName?.toLowerCase().includes(q) || i.userEmail?.toLowerCase().includes(q));
  }
  if (filter === "has_balance") filtered = filtered.filter((i) => i.withdrawableBalance > 0);
  if (filter === "grace") filtered = filtered.filter((i) => i.stillInGracePeriod);
  if (filter === "pending_withdrawal") {
    const pendingUserIds = new Set(withdrawalRequests.map((r) => r.userId));
    filtered = filtered.filter((i) => pendingUserIds.has(i.userId));
  }

  const totals = {
    withdrawable: investments.reduce((s, i) => s + i.withdrawableBalance, 0),
    lifetimeWithdrawn: investments.reduce((s, i) => s + (i.lifetimeWithdrawn || 0), 0),
    lifetimeDeposited: investments.reduce((s, i) => s + (i.amount || 0), 0),
    missed: investments.reduce((s, i) => s + i.missedEarnings, 0),
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Loading earnings overview…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Earnings Overview</h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
        Live per-investment earnings — matches exactly what each user sees on their own dashboard.
      </p>
      {readStats && (
        <p style={{ fontSize: 10.5, color: C.dim, marginBottom: 20 }}>
          Loaded {readStats.userCount} VIP member record{readStats.userCount === 1 ? "" : "s"} in {readStats.loadMs}ms.
          {readStats.userCount > 150 && " Consider a caching layer if this keeps growing."}
        </p>
      )}

      {err && (
        <div style={{ background: "rgba(207,120,120,0.1)", border: "1px solid rgba(207,120,120,0.3)", borderRadius: 10, padding: 12, marginBottom: 16, color: C.red, fontSize: 13 }}>
          {err}
        </div>
      )}
      {ok && (
        <div style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)", borderRadius: 10, padding: 12, marginBottom: 16, color: C.green, fontSize: 13 }}>
          {ok}
        </div>
      )}

      <div className="admin-grid" style={{ marginBottom: 20 }}>
        <div style={{ ...cardStyle, border: `1px solid ${C.green}28`, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Total Withdrawable Now</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>₦{fmt(totals.withdrawable)}</div>
        </div>
        <div style={{ ...cardStyle, border: `1px solid ${C.muted}28`, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Lifetime Withdrawn</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.muted }}>₦{fmt(totals.lifetimeWithdrawn)}</div>
        </div>
        <div style={{ ...cardStyle, border: `1px solid ${C.gold}28`, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Lifetime Deposited</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.gold }}>₦{fmt(totals.lifetimeDeposited)}</div>
        </div>
        <div style={{ ...cardStyle, border: `1px solid ${C.emerald}28`, padding: 14 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Pending Withdrawal Requests</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.emerald }}>{withdrawalRequests.length}</div>
        </div>
      </div>

      {withdrawalRequests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: C.emerald }}>
            Pending Withdrawal Requests ({withdrawalRequests.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {withdrawalRequests.map((req) => (
              <div key={req.id} style={{ ...cardStyle, border: `1px solid ${C.emerald}40`, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, color: C.text, fontWeight: 700 }}>{req.userName}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                      {req.bankDetails?.bank} · {req.bankDetails?.accNo} · {req.bankDetails?.accName}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.dim, marginTop: 2 }}>Requested {fmtDate(req.requestedAt)} · Ref: {req.ref}</div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.emerald }}>₦{fmt(req.amount)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    disabled={busyId === req.id}
                    onClick={() => handleMarkPaid(req)}
                    style={{ ...buttonStyle("gold"), flex: 1, padding: "9px 14px", fontSize: 12 }}
                  >
                    {busyId === req.id ? "…" : "Mark Paid"}
                  </button>
                  <button
                    disabled={busyId === req.id}
                    onClick={() => handleRejectWithdrawal(req)}
                    style={{ ...buttonStyle("ghost"), flex: 1, padding: "9px 14px", fontSize: 12 }}
                  >
                    {busyId === req.id ? "…" : "Reject & Refund"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-search-grid" style={{ marginBottom: 14 }}>
        <FormInput placeholder="Search by name or email" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "all", label: `All (${investments.length})` },
          { key: "has_balance", label: "Has withdrawable balance" },
          { key: "grace", label: "Still in 24h grace period" },
          { key: "pending_withdrawal", label: `Has pending withdrawal (${withdrawalRequests.length})` },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ ...buttonStyle(filter === f.key ? "gold" : "ghost"), padding: "7px 14px", fontSize: 12 }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.dim }}>
          No investments match this view.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((inv) => (
            <div key={inv.id} style={{ ...cardStyle, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, color: C.text, fontWeight: 600 }}>{inv.userName}</span>
                    <span style={chipStyle(C.emerald)}>{inv.planLabel}</span>
                    {inv.stillInGracePeriod && <span style={chipStyle(C.dim)}>GRACE PERIOD</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{inv.userEmail}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                    Approved {fmtDate(inv.approvedAt)} · Earnings started {fmtDate(inv.earningsStartTime)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>₦{fmt(inv.withdrawableBalance)}</div>
                  <div style={{ fontSize: 11, color: C.dim }}>withdrawable now</div>
                </div>
              </div>

              <div style={{ marginTop: 14, padding: 12, background: "rgba(36,28,32,0.03)", borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Daily Rate</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>₦{fmt(inv.planDaily)}/day</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Days Elapsed</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{inv.daysEarning}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Days Read</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{inv.reviewedDayCount} / {inv.daysEarning}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Missed (unread)</div>
                  <div style={{ fontSize: 13, color: inv.missedEarnings > 0 ? C.red : C.text, fontWeight: 600 }}>₦{fmt(inv.missedEarnings)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Lifetime Withdrawn</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>₦{fmt(inv.lifetimeWithdrawn || 0)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
