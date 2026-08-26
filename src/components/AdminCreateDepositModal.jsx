import { useState, useMemo } from "react";
import { C, buttonStyle, labelStyle, inputStyle } from "../styles/theme";
import { VIP_LIST } from "../utils/vipPlans";
import { adminSubmitDeposit } from "../services/deposits";
import FormInput from "./FormInput";
import { ErrorBox } from "./MessageBox";
import Overlay from "./Overlay";

// VIP Starter (vip1) is retired from new deposits — matches the same
// rule enforced server-side in services/deposits.js (both
// submitDeposit and adminSubmitDeposit reject it). Filtered out here
// too so an admin can't even select it in the first place, rather than
// letting them pick it and only finding out it's rejected on submit.
const SELECTABLE_PLANS = VIP_LIST.filter((p) => p.id !== "vip1");

/**
 * Lets an admin create an ALREADY-APPROVED deposit directly, for users
 * who have difficulty completing the normal self-service submit flow
 * (choose plan -> payment instructions -> proof upload). Skips proof
 * entirely per the site owner's explicit choice — the admin is vouching
 * for the payment, not reviewing evidence of it.
 *
 * Takes the full list of users (already loaded by the parent page for
 * search/filtering elsewhere) rather than fetching its own copy, so
 * opening this modal doesn't trigger a redundant Firestore read.
 */
export default function AdminCreateDepositModal({ users, onClose, onDone }) {
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [planId, setPlanId] = useState(SELECTABLE_PLANS[0]?.id || "vip2");
  const [adminNote, setAdminNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [savedRef, setSavedRef] = useState("");

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 20); // cap the idle list so it doesn't dump the whole user base
    return users
      .filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q))
      .slice(0, 20);
  }, [users, userQuery]);

  const selectedUser = users.find((u) => u.uid === selectedUserId);
  const plan = SELECTABLE_PLANS.find((p) => p.id === planId);

  async function handleSubmit() {
    setErr("");
    if (!selectedUser) {
      setErr("Select a user first.");
      return;
    }
    setBusy(true);
    try {
      const result = await adminSubmitDeposit({
        userId: selectedUser.uid,
        userName: selectedUser.name,
        userEmail: selectedUser.email,
        planId,
        adminNote,
      });
      setSavedRef(result.ref);
      setDone(true);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Could not create deposit.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.green, marginBottom: 10 }}>
            Deposit Created & Approved
          </h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            {selectedUser?.name}'s {plan.label} plan is now active. Earnings begin 24 hours from now.
          </p>
          <div
            style={{
              background: "rgba(46,204,113,0.08)",
              border: `1px solid ${C.emerald}30`,
              borderRadius: 10,
              padding: 14,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Reference
            </div>
            <div style={{ fontSize: 18, color: C.emerald, fontWeight: 700, letterSpacing: "0.1em" }}>{savedRef}</div>
          </div>
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
      <h2 style={{ fontSize: 18, fontWeight: 800, color: C.emerald, marginBottom: 4 }}>
        Create Deposit for User
      </h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
        Creates an already-approved deposit — no proof step, for users who need help completing the normal flow.
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
          <div
            style={{
              marginTop: 6,
              maxHeight: 180,
              overflowY: "auto",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
            }}
          >
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
                  style={{
                    padding: "10px 12px",
                    fontSize: 12.5,
                    cursor: "pointer",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ color: C.text, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ color: C.dim, fontSize: 11 }}>{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                </div>
              ))
            )}
          </div>
        )}
        {selectedUser && (
          <div style={{ marginTop: 6, fontSize: 12, color: C.emerald }}>
            ✓ Selected: {selectedUser.name} ({selectedUser.email})
          </div>
        )}
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>VIP Plan</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SELECTABLE_PLANS.map((p) => (
            <div
              key={p.id}
              onClick={() => setPlanId(p.id)}
              style={{
                background: planId === p.id ? `${p.color}14` : "rgba(36,28,32,0.025)",
                border: `1px solid ${planId === p.id ? p.color : "rgba(36,28,32,0.1)"}`,
                borderRadius: 12,
                padding: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, margin: "4px 0 2px" }}>₦{p.amount.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: C.green }}>₦{p.daily.toLocaleString()}/day</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Admin Note (optional)</label>
        <FormInput
          placeholder="e.g. Confirmed payment via phone call"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
        />
      </div>

      <button style={{ ...buttonStyle("gold"), width: "100%" }} onClick={handleSubmit} disabled={busy || !selectedUser}>
        {busy ? "Creating…" : `Create & Approve — ₦${plan.amount.toLocaleString()} ${plan.label}`}
      </button>
      <button style={{ ...buttonStyle("ghost"), width: "100%", marginTop: 8 }} onClick={onClose}>
        Cancel
      </button>
    </Overlay>
  );
}
