import { useState, useMemo, useEffect } from "react";
import { C, buttonStyle, labelStyle } from "../styles/theme";
import { resetUserEarnings } from "../services/adminUsers";
import { getUserDeposits } from "../services/deposits";
import FormInput from "./FormInput";
import { ErrorBox } from "./MessageBox";
import Overlay from "./Overlay";

/**
 * Per-user, pick-your-parts earnings reset — lets an admin choose exactly
 * which of a single user's earnings to zero out (check-in balance,
 * reading history, referral bonus, and/or a specific deposit's earning
 * clock) rather than the all-or-nothing bulk Fresh Start reset.
 *
 * welcomeBonus is deliberately NEVER an option here, per the site
 * owner's explicit choice — it's considered separate from
 * deposit/earning resets and only the bulk Fresh Start tool touches it.
 *
 * Takes the full users list from the parent page (same pattern as
 * AdminCreateDepositModal) to avoid a redundant Firestore read on open.
 */
export default function AdminResetUserEarningsModal({ users, onClose, onDone }) {
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userDeposits, setUserDeposits] = useState([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);

  const [resetCheckIn, setResetCheckIn] = useState(false);
  const [resetReadingTask, setResetReadingTask] = useState(false);
  const [resetReferralBonus, setResetReferralBonus] = useState(false);
  const [depositIdToReset, setDepositIdToReset] = useState("");

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 20);
    return users
      .filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q))
      .slice(0, 20);
  }, [users, userQuery]);

  const selectedUser = users.find((u) => u.uid === selectedUserId);
  const approvedDeposits = userDeposits.filter((d) => d.status === "approved");

  useEffect(() => {
    if (!selectedUserId) {
      setUserDeposits([]);
      setDepositIdToReset("");
      return;
    }
    setLoadingDeposits(true);
    getUserDeposits(selectedUserId)
      .then(setUserDeposits)
      .catch((e) => console.error("Failed to load user deposits:", e))
      .finally(() => setLoadingDeposits(false));
  }, [selectedUserId]);

  const anythingSelected = resetCheckIn || resetReadingTask || resetReferralBonus || !!depositIdToReset;

  async function handleSubmit() {
    setErr("");
    if (!selectedUser) {
      setErr("Select a user first.");
      return;
    }
    if (!anythingSelected) {
      setErr("Select at least one thing to reset.");
      return;
    }
    setBusy(true);
    try {
      const result = await resetUserEarnings(selectedUser.uid, {
        resetCheckIn,
        resetReadingTask,
        resetReferralBonus,
        depositIdToReset: depositIdToReset || null,
      });
      setResultSummary(result);
      setDone(true);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Could not reset earnings for this user.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.green, marginBottom: 10 }}>Reset Complete</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
            Reset for {selectedUser?.name}: {resultSummary?.actionsPerformed.join(", ") || "nothing selected"}.
          </p>
          <button
            style={{ ...buttonStyle("gold"), width: "100%" }}
            onClick={() => {
              onDone();
              onClose();
            }}
          >
            Done
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: C.emerald, marginBottom: 4 }}>Reset User Earnings</h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
        Choose exactly what to reset for one user. Welcome bonus is never affected here.
      </p>

      <ErrorBox msg={err} />

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Find User</label>
        <FormInput
          placeholder="Search by name, email, or phone"
          value={userQuery}
          onChange={(e) => {
            setUserQuery(e.target.value);
            setSelectedUserId("");
          }}
        />
        {!selectedUser && userQuery.trim() && (
          <div style={{ marginTop: 6, maxHeight: 180, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
            {filteredUsers.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: C.dim }}>No matching users.</div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.uid}
                  onClick={() => {
                    setSelectedUserId(u.uid);
                    setUserQuery(`${u.name} (${u.email})`);
                  }}
                  style={{ padding: "10px 12px", fontSize: 12.5, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
                >
                  <div style={{ color: C.text, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ color: C.dim, fontSize: 11 }}>{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                </div>
              ))
            )}
          </div>
        )}
        {selectedUser && <div style={{ marginTop: 6, fontSize: 12, color: C.emerald }}>✓ Selected: {selectedUser.name} ({selectedUser.email})</div>}
      </div>

      {selectedUser && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>What to reset</label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 0", cursor: "pointer" }}>
              <input type="checkbox" checked={resetCheckIn} onChange={(e) => setResetCheckIn(e.target.checked)} />
              Check-in balance (unlocked balance → ₦0)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 0", cursor: "pointer" }}>
              <input type="checkbox" checked={resetReadingTask} onChange={(e) => setResetReadingTask(e.target.checked)} />
              Reading task history (completed days → cleared)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 0", cursor: "pointer" }}>
              <input type="checkbox" checked={resetReferralBonus} onChange={(e) => setResetReferralBonus(e.target.checked)} />
              Referral bonus (→ ₦0)
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Deposit earning clock (optional)</label>
            {loadingDeposits ? (
              <p style={{ fontSize: 12, color: C.dim }}>Loading deposits…</p>
            ) : approvedDeposits.length === 0 ? (
              <p style={{ fontSize: 12, color: C.dim }}>No approved deposits for this user.</p>
            ) : (
              <select
                value={depositIdToReset}
                onChange={(e) => setDepositIdToReset(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  fontSize: 13,
                  background: C.surface,
                  color: C.text,
                }}
              >
                <option value="">Don't reset any deposit</option>
                {approvedDeposits.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.planLabel} — ₦{d.amount?.toLocaleString()} (ref: {d.ref})
                  </option>
                ))}
              </select>
            )}
          </div>

          <button style={{ ...buttonStyle("gold"), width: "100%" }} onClick={handleSubmit} disabled={busy || !anythingSelected}>
            {busy ? "Resetting…" : "Reset Selected Items"}
          </button>
        </>
      )}
      <button style={{ ...buttonStyle("ghost"), width: "100%", marginTop: 8 }} onClick={onClose}>
        Cancel
      </button>
    </Overlay>
  );
}
