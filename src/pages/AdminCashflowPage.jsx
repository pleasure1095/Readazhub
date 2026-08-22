import { useEffect, useState } from "react";
import { C, cardStyle } from "../styles/theme";
import { getAllDeposits } from "../services/deposits";
import { getAllWithdrawalRequests } from "../services/withdrawalRequests";

function fmt(n) {
  return Math.round(n || 0).toLocaleString();
}

// WAT (West Africa Time, UTC+1) day-string key, matching the convention
// already used elsewhere in this app (see services/reviews.js) for what
// counts as "the same day" — a deposit approved at 11:58pm WAT and one
// approved at 12:02am WAT the next day should land in different day
// buckets, and using the browser's local timezone instead of a fixed
// WAT offset would make that boundary drift depending on which timezone
// the admin happens to be viewing from.
const WAT_OFFSET_MS = 60 * 60 * 1000;
function dayKey(ts) {
  const d = new Date(ts + WAT_OFFSET_MS);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function labelForKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Admin-only daily cash-flow view: total money IN (approved deposits,
 * by approvedAt) vs total money OUT (paid withdrawals, by paidAt) per
 * WAT calendar day. "In" deliberately uses `amount` (the resulting
 * plan's full value) rather than `amountPaid` — for an upgrade, amount
 * is the difference actually charged (see services/deposits.js
 * submitDeposit), so this stays consistent with what actually moved.
 * "Out" uses `payoutAmount` (post-12%-fee), since that's the real money
 * that left the business on a paid withdrawal, not the pre-fee amount
 * the user's balance was debited for.
 *
 * Deliberately does NOT include pending/rejected/superseded deposits or
 * pending/rejected withdrawal requests — this is a real cash-flow
 * ledger, not an activity log. A user's Deposits/Earnings tabs already
 * cover pending-state visibility.
 */
export default function AdminCashflowPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [days, setDays] = useState([]); // [{ key, label, inAmount, outAmount, inCount, outCount }]
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = last month, etc.

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [allDeposits, allWithdrawals] = await Promise.all([getAllDeposits(), getAllWithdrawalRequests()]);

      const byDay = new Map();
      function ensure(key) {
        if (!byDay.has(key)) {
          byDay.set(key, { key, inAmount: 0, outAmount: 0, inCount: 0, outCount: 0 });
        }
        return byDay.get(key);
      }

      allDeposits
        .filter((d) => d.status === "approved" && d.approvedAt)
        .forEach((d) => {
          const bucket = ensure(dayKey(d.approvedAt));
          bucket.inAmount += d.amount || 0;
          bucket.inCount += 1;
        });

      allWithdrawals
        .filter((w) => w.status === "paid" && w.paidAt)
        .forEach((w) => {
          const bucket = ensure(dayKey(w.paidAt));
          bucket.outAmount += w.payoutAmount ?? w.amount ?? 0;
          bucket.outCount += 1;
        });

      const list = [...byDay.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
      setDays(list);
    } catch (e) {
      console.error(e);
      setErr("Could not load cash-flow data.");
    }
    setLoading(false);
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading…</div>;
  }

  // Group the flat day list into the currently-viewed calendar month.
  const now = new Date();
  const viewDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
  const viewYear = viewDate.getUTCFullYear();
  const viewMonth = viewDate.getUTCMonth();
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay(); // 0=Sun

  const dataByKey = new Map(days.map((d) => [d.key, d]));
  const monthCells = [];
  for (let i = 0; i < firstWeekday; i++) monthCells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    monthCells.push({ day, key, data: dataByKey.get(key) || null });
  }

  const monthTotals = monthCells.reduce(
    (acc, c) => {
      if (c?.data) {
        acc.in += c.data.inAmount;
        acc.out += c.data.outAmount;
      }
      return acc;
    },
    { in: 0, out: 0 }
  );

  const recentDays = days.slice(0, 14);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Cash Flow</h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
        Daily money in (approved deposits) vs out (paid withdrawals) — full app history, all users combined.
      </p>

      {err && (
        <div style={{ padding: 12, background: "rgba(194,59,46,0.08)", border: `1px solid ${C.red}`, borderRadius: 10, color: C.red, marginBottom: 16, fontSize: 13 }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Total In ({monthLabel})</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.emerald }}>₦{fmt(monthTotals.in)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Total Out ({monthLabel})</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>₦{fmt(monthTotals.out)}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button
          onClick={() => setMonthOffset((m) => m - 1)}
          style={{ ...cardStyle, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
        >
          ← Prev
        </button>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{monthLabel}</div>
        <button
          onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
          disabled={monthOffset === 0}
          style={{ ...cardStyle, padding: "8px 14px", cursor: monthOffset === 0 ? "default" : "pointer", fontSize: 13, fontWeight: 700, opacity: monthOffset === 0 ? 0.4 : 1 }}
        >
          Next →
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, color: C.dim, fontWeight: 700 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 28 }}>
        {monthCells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />;
          const hasActivity = cell.data && (cell.data.inAmount > 0 || cell.data.outAmount > 0);
          return (
            <div
              key={cell.key}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "5px 3px",
                minHeight: 54,
                background: hasActivity ? "rgba(29,156,87,0.04)" : C.surface,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 2 }}>{cell.day}</div>
              {cell.data && cell.data.inAmount > 0 && (
                <div style={{ fontSize: 8.5, color: C.emerald, fontWeight: 700, lineHeight: 1.3 }}>
                  +{cell.data.inAmount >= 1000 ? `${Math.round(cell.data.inAmount / 1000)}k` : cell.data.inAmount}
                </div>
              )}
              {cell.data && cell.data.outAmount > 0 && (
                <div style={{ fontSize: 8.5, color: C.red, fontWeight: 700, lineHeight: 1.3 }}>
                  −{cell.data.outAmount >= 1000 ? `${Math.round(cell.data.outAmount / 1000)}k` : cell.data.outAmount}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Recent Days</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recentDays.length === 0 && (
          <div style={{ fontSize: 13, color: C.dim, padding: 20, textAlign: "center" }}>No approved deposits or paid withdrawals yet.</div>
        )}
        {recentDays.map((d) => (
          <div key={d.key} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{labelForKey(d.key)}</div>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              <span style={{ color: C.emerald, fontWeight: 700 }}>
                +₦{fmt(d.inAmount)} <span style={{ color: C.dim, fontWeight: 400 }}>({d.inCount})</span>
              </span>
              <span style={{ color: C.red, fontWeight: 700 }}>
                −₦{fmt(d.outAmount)} <span style={{ color: C.dim, fontWeight: 400 }}>({d.outCount})</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
