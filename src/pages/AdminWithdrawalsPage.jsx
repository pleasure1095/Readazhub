import { useEffect, useState } from "react";
import { C, buttonStyle, cardStyle } from "../styles/theme";
import { getAllWithdrawalRequests, markCombinedWithdrawalPaid, rejectCombinedWithdrawal } from "../services/withdrawalRequests";
import { ErrorBox, SuccessBox } from "../components/MessageBox";

function withdrawalAge(requestedAt) {
  const hoursAgo = (Date.now() - requestedAt) / (60 * 60 * 1000);
  if (hoursAgo < 24) {
    const h = Math.max(1, Math.floor(hoursAgo));
    return { label: `${h}h ago`, color: "#3DBE6C" };
  }
  const days = Math.floor(hoursAgo / 24);
  if (days <= 3) return { label: `${days}d ago`, color: "#E8B84B" };
  return { label: `${days}d ago — overdue`, color: "#E0685E" };
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Dedicated admin withdrawals page — pulled out of AdminDepositsPage so
 * withdrawal approval has its own bottom-nav destination rather than
 * living above the deposit list. Reuses the exact same
 * services/withdrawalRequests.js functions AdminDepositsPage used, so
 * behavior (transactional mark-paid, mirrored refund on reject) is
 * unchanged — only the page location moved.
 */
export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const all = await getAllWithdrawalRequests();
      setRequests(all);
    } catch (e) {
      console.error(e);
      setErr("Could not load withdrawal requests.");
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
      await markCombinedWithdrawalPaid(req.id);
      setOk("Withdrawal marked as paid.");
      await load();
    } catch (e) {
      console.error(e);
      setErr("Could not update withdrawal.");
    }
    setBusyId(null);
  }

  async function handleReject(req) {
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

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    paid: requests.filter((r) => r.status === "paid").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };
  const filtered = requests
    .filter((r) => tab === "all" || r.status === tab)
    .sort((a, b) => b.requestedAt - a.requestedAt);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Loading withdrawal requests…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Withdrawal Requests</h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Review and approve user withdrawal requests</p>

      <ErrorBox msg={err} />
      <SuccessBox msg={ok} />

      <div className="admin-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Pending", value: counts.pending, color: C.emerald },
          { label: "Paid", value: counts.paid, color: C.green },
          { label: "Rejected", value: counts.rejected, color: C.red },
        ].map((s, i) => (
          <div key={i} style={{ ...cardStyle, border: `1px solid ${s.color}28`, padding: 14 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["pending", "paid", "rejected", "all"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...buttonStyle(tab === t ? "gold" : "ghost"), padding: "7px 14px", fontSize: 12, textTransform: "capitalize" }}>
            {t} ({t === "all" ? requests.length : counts[t] || 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.dim }}>
          No withdrawal requests found
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((req) => {
            const age = withdrawalAge(req.requestedAt);
            const b = req.breakdown || {};
            const parts = [];
            if (b.vipProfit > 0) parts.push(`VIP Profit ₦${b.vipProfit.toLocaleString()}`);
            if (b.referral > 0) parts.push(`Referral ₦${b.referral.toLocaleString()}`);
            if (b.welcome > 0) parts.push(`Welcome ₦${b.welcome.toLocaleString()}`);
            if (b.checkIn > 0) parts.push(`Check-In ₦${b.checkIn.toLocaleString()}`);
            const sc = req.status === "paid" ? C.green : req.status === "rejected" ? C.red : "rgba(123,158,217,0.3)";
            return (
              <div key={req.id} style={{ ...cardStyle, border: `1px solid ${sc}`, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ color: "#F9F1E7" }}>{req.userName}</strong> — ₦{(req.amount || 0).toLocaleString()}
                  </div>
                  {req.status === "pending" ? (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: age.color,
                        background: `${age.color}1c`,
                        padding: "3px 9px",
                        borderRadius: 20,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {age.label}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: req.status === "paid" ? C.green : C.red,
                        background: req.status === "paid" ? `${C.green}1c` : `${C.red}1c`,
                        padding: "3px 9px",
                        borderRadius: 20,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {req.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  {req.bankDetails?.bank} · {req.bankDetails?.accNo} · {req.bankDetails?.accName}
                </div>
                {parts.length > 0 && (
                  <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 8 }}>Combined from: {parts.join(" · ")}</div>
                )}
                <div style={{ fontSize: 10.5, color: C.dim, marginBottom: req.status === "pending" ? 10 : 0 }}>
                  Requested {fmtDate(req.requestedAt)}
                </div>
                {req.status === "pending" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...buttonStyle("gold"), flex: 1, fontSize: 12, padding: "8px" }} onClick={() => handleMarkPaid(req)} disabled={busyId === req.id}>
                      Mark Paid
                    </button>
                    <button style={{ ...buttonStyle("danger"), flex: 1, fontSize: 12, padding: "8px" }} onClick={() => handleReject(req)} disabled={busyId === req.id}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
