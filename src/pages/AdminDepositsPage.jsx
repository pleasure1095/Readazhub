import { useEffect, useState } from "react";
import { C, buttonStyle, cardStyle, labelStyle } from "../styles/theme";
import { getAllDeposits, approveDeposit, rejectDeposit } from "../services/deposits";
import { getAllWithdrawalRequests, markCombinedWithdrawalPaid, rejectCombinedWithdrawal } from "../services/withdrawalRequests";
import FormInput from "../components/FormInput";
import { ErrorBox, SuccessBox } from "../components/MessageBox";

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

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * "Due" indicator for a pending withdrawal request — since there's no
 * fixed SLA in the business rules (no promise like "paid within 24h"),
 * this doesn't claim a hard deadline was missed. It just surfaces how
 * long a request has been sitting, color-coded so an admin can triage at
 * a glance instead of reading every timestamp: green under a day, amber
 * 1-3 days, red past 3 days (a judgment threshold, easy to adjust if the
 * site owner wants a stricter or looser cutoff).
 */
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

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [notes, setNotes] = useState({});
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchRef, setSearchRef] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [allDeposits, allWithdrawals] = await Promise.all([getAllDeposits(), getAllWithdrawalRequests()]);
      setDeposits(allDeposits);
      setWithdrawalRequests(allWithdrawals);
    } catch (e) {
      console.error(e);
      setErr("Could not load deposits.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(dep) {
    setErr("");
    setOk("");
    setBusyId(dep.id);
    try {
      await approveDeposit(dep, notes[dep.id] || "");
      // Referral bonus is no longer credited at approval time — it's a
      // recurring 9%/2% share of actual daily earnings, live-computed on
      // the referrer's own Dashboard (services/referralEarnings.js), so
      // there's nothing to report here beyond the approval itself.
      setOk("Deposit approved.");
      await load();
    } catch (e) {
      console.error(e);
      setErr("Could not approve deposit.");
    }
    setBusyId(null);
  }

  async function handleReject(dep) {
    setErr("");
    setOk("");
    setBusyId(dep.id);
    try {
      await rejectDeposit(dep, notes[dep.id] || "");
      setOk("Deposit rejected.");
      await load();
    } catch (e) {
      console.error(e);
      setErr("Could not reject deposit.");
    }
    setBusyId(null);
  }

  async function handleMarkPaid(req) {
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

  let filtered = deposits.filter((d) => tab === "all" || d.status === tab);
  if (searchName.trim()) filtered = filtered.filter((d) => d.userName?.toLowerCase().includes(searchName.trim().toLowerCase()));
  if (searchEmail.trim()) filtered = filtered.filter((d) => d.userEmail?.toLowerCase().includes(searchEmail.trim().toLowerCase()));
  if (searchRef.trim())
    filtered = filtered.filter(
      (d) =>
        (d.ref || "").toLowerCase().includes(searchRef.trim().toLowerCase()) ||
        (d.txRef || "").toLowerCase().includes(searchRef.trim().toLowerCase()) ||
        (d.narrationCode || "").toLowerCase().includes(searchRef.trim().toLowerCase())
    );

  const counts = {
    pending: deposits.filter((d) => d.status === "pending").length,
    approved: deposits.filter((d) => d.status === "approved").length,
    rejected: deposits.filter((d) => d.status === "rejected").length,
  };
  const pendingWithdrawals = withdrawalRequests
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.requestedAt - b.requestedAt);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Loading deposits…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
        Deposit Management
      </h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Review and approve user deposit requests</p>

      <ErrorBox msg={err} />
      <SuccessBox msg={ok} />

      <div className="admin-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Pending", value: counts.pending, color: C.emerald },
          { label: "Approved", value: counts.approved, color: C.green },
          { label: "Rejected", value: counts.rejected, color: C.red },
        ].map((s, i) => (
          <div key={i} style={{ ...cardStyle, border: `1px solid ${s.color}28`, padding: 14 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {pendingWithdrawals.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, color: C.muted, marginBottom: 12 }}>
            Pending Withdrawal Requests
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {pendingWithdrawals.map((req) => {
              const age = withdrawalAge(req.requestedAt);
              const b = req.breakdown || {};
              const parts = [];
              if (b.vipProfit > 0) parts.push(`VIP Profit ₦${b.vipProfit.toLocaleString()}`);
              if (b.referral > 0) parts.push(`Referral ₦${b.referral.toLocaleString()}`);
              if (b.welcome > 0) parts.push(`Welcome ₦${b.welcome.toLocaleString()}`);
              if (b.checkIn > 0) parts.push(`Check-In ₦${b.checkIn.toLocaleString()}`);
              return (
                <div key={req.id} style={{ ...cardStyle, border: "1px solid rgba(123,158,217,0.3)", padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13 }}>
                      <strong style={{ color: "#F9F1E7" }}>{req.userName}</strong> — ₦{(req.amount || 0).toLocaleString()}
                    </div>
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
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                    {req.bankDetails?.bank} · {req.bankDetails?.accNo} · {req.bankDetails?.accName}
                  </div>
                  {parts.length > 0 && (
                    <div style={{ fontSize: 10.5, color: C.dim, marginBottom: 10 }}>
                      Combined from: {parts.join(" · ")}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...buttonStyle("gold"), flex: 1, fontSize: 12, padding: "8px" }} onClick={() => handleMarkPaid(req)} disabled={busyId === req.id}>
                      Mark Paid
                    </button>
                    <button style={{ ...buttonStyle("danger"), flex: 1, fontSize: 12, padding: "8px" }} onClick={() => handleRejectWithdrawal(req)} disabled={busyId === req.id}>
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="admin-search-grid" style={{ marginBottom: 20 }}>
        <FormInput placeholder="Search by Name" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
        <FormInput placeholder="Search by Email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
        <FormInput placeholder="Search by Reference or Narration Code" value={searchRef} onChange={(e) => setSearchRef(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["pending", "approved", "rejected", "all"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...buttonStyle(tab === t ? "gold" : "ghost"), padding: "7px 14px", fontSize: 12, textTransform: "capitalize" }}>
            {t} ({t === "all" ? deposits.length : counts[t] || 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.dim }}>
          No deposits found
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((dep) => {
            const sc = dep.status === "approved" ? C.green : dep.status === "rejected" ? C.red : C.emerald;
            return (
              <div key={dep.id} style={{ ...cardStyle, border: `1px solid ${sc}20` }} className="fade">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, color: "#F9F1E7", fontWeight: 500 }}>{dep.userName}</span>
                      <span style={chipStyle(sc)}>{dep.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>{dep.userEmail}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>Submitted: {fmtDate(dep.submittedAt)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>₦{(dep.amount || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{dep.planLabel} · ₦{(dep.planDaily || 0).toLocaleString()}/day</div>
                  </div>
                </div>

                <div style={{ marginTop: 14, padding: 12, background: "rgba(255,255,255,0.025)", borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Payment Details</div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: C.dim }}>Ref: </span>
                    <span style={{ color: C.emerald }}>{dep.ref}</span>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <span style={{ color: C.dim }}>Sender: </span>
                    <span style={{ color: "#F9F1E7" }}>{dep.senderName}</span>
                  </div>
                  {dep.narrationCode && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <span style={{ color: C.dim }}>Narration Code: </span>
                      <span style={{ color: C.crimson, fontWeight: 800, letterSpacing: "0.05em" }}>{dep.narrationCode}</span>
                      <span style={{ color: C.dim }}> — search this in your bank statement</span>
                    </div>
                  )}
                  {dep.amountPaid != null && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <span style={{ color: C.dim }}>Amount Paid (reported): </span>
                      <span style={{ color: dep.amountPaid === dep.amount ? "#F9F1E7" : C.red, fontWeight: dep.amountPaid === dep.amount ? 400 : 700 }}>
                        ₦{(dep.amountPaid || 0).toLocaleString()}
                      </span>
                      {dep.amountPaid !== dep.amount && (
                        <span style={{ color: C.red }}> ⚠ expected ₦{(dep.amount || 0).toLocaleString()}</span>
                      )}
                    </div>
                  )}
                  {dep.txRef && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <span style={{ color: C.dim }}>Transaction ID: </span>
                      {dep.txRef}
                    </div>
                  )}
                  {dep.proof && <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{dep.proof}</div>}
                  {dep.screenshotUrl && (
                    <div style={{ marginTop: 10 }}>
                      <img src={dep.screenshotUrl} alt="Payment proof" style={{ maxWidth: 200, borderRadius: 8, border: `1px solid ${C.border}` }} />
                    </div>
                  )}
                </div>

                {dep.status === "pending" && (
                  <>
                    <div style={{ marginTop: 12 }}>
                      <label style={labelStyle}>Admin Note (optional)</label>
                      <FormInput
                        placeholder="Reason for approval or rejection…"
                        value={notes[dep.id] || ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [dep.id]: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button style={{ ...buttonStyle("gold"), flex: 1 }} onClick={() => handleApprove(dep)} disabled={busyId === dep.id}>
                        ✓ Approve
                      </button>
                      <button style={{ ...buttonStyle("danger"), flex: 1 }} onClick={() => handleReject(dep)} disabled={busyId === dep.id}>
                        ✗ Reject
                      </button>
                    </div>
                  </>
                )}
                {dep.status !== "pending" && dep.adminNote && (
                  <div style={{ marginTop: 10, fontSize: 11, color: C.dim }}>Note: {dep.adminNote}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
