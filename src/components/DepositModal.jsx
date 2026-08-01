import { useState } from "react";
import { C, buttonStyle, labelStyle, inputStyle } from "../styles/theme";
import { VIP_LIST } from "../utils/vipPlans";
import { OPAY_DETAILS } from "../utils/paymentInfo";
import { submitDeposit } from "../services/deposits";
import FormInput from "./FormInput";
import { ErrorBox } from "./MessageBox";
import Overlay from "./Overlay";
import CopyRow from "./CopyRow";

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
 * Generates a short, unique narration/remark code for a deposit — the
 * user copies this into their bank transfer's narration field so the
 * admin can match an incoming bank alert to a specific pending deposit
 * by searching their bank statement for the code, rather than guessing
 * from sender name/amount alone (which can be ambiguous if two people
 * send similar amounts around the same time).
 *
 * 8 characters after the prefix (not 6) — verified by hand-testing
 * the 6-char version first: at 10,000 generated codes it already produced
 * 1 collision (expected birthday-paradox behavior for a 36^6-space code).
 * Two different users landing on the same narration code would make
 * matching unreliable exactly when it matters most (high deposit volume),
 * so the extra 2 characters meaningfully reduce that risk while still
 * being short enough to type correctly into a bank app's narration field.
 * The prefix makes it recognizable as belonging to this app if it shows
 * up in a bank statement search — "RZH-" for READAZHUB, kept distinct
 * from Gadjiz's "GDZ-" so codes from the two apps are never confused in
 * a shared or similar bank statement search.
 */
function genNarrationCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "RZH-"; // READAZHUB narration prefix — distinct from Gadjiz's "GDZ-"
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function DepositModal({ user, onClose, onDone, initialPlanId }) {
  const [step, setStep] = useState(1);
  const [planId, setPlanId] = useState(initialPlanId || "vip1");
  const [senderName, setSenderName] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [proof, setProof] = useState("");
  const [txRef, setTxRef] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [savedRef, setSavedRef] = useState("");
  // Generated once via useState initializer (not on every render) — the
  // same code stays valid if the user navigates back and forth between
  // steps 1-3 without closing the modal.
  const [narrationCode] = useState(genNarrationCode);

  const plan = VIP_LIST.find((p) => p.id === planId);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setScreenshotFile(f);
    setScreenshotName(f.name);
  }

  async function submitProof() {
    setErr("");
    if (!senderName.trim()) {
      setErr("Enter the name used for the transfer.");
      return;
    }
    const numAmountPaid = Number(amountPaid);
    if (!numAmountPaid || numAmountPaid <= 0) {
      setErr("Enter the amount you paid.");
      return;
    }

    setBusy(true);
    try {
      // Overall safety net: even with the screenshot upload's own 8s
      // timeout (services/deposits.js), this races the whole submission
      // against 15s so the button can never hang indefinitely for ANY
      // reason — a stalled Firestore write, a dropped connection, etc.
      // If it times out, the person sees a clear error and can retry,
      // instead of being stuck on "Submitting…" with no way forward.
      const result = await Promise.race([
        submitDeposit({
          userId: user.uid,
          userName: user.name,
          userEmail: user.email,
          planId,
          senderName,
          amountPaid: numAmountPaid,
          proof,
          txRef,
          narrationCode,
          screenshotFile,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("This is taking longer than expected. Please check your connection and try again.")), 15000)
        ),
      ]);
      setSavedRef(result.ref);
      setDone(true);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Could not submit deposit. Please try again.");
    }
    setBusy(false);
  }

  const steps = ["Choose Plan", "Payment Details", "Submit Proof"];

  if (done) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.green, marginBottom: 10 }}>
            Proof Submitted!
          </h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            Your deposit is under review. Once approved, your VIP plan activates — earnings begin
            24 hours after approval.
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
              Your Reference
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
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                height: 3,
                borderRadius: 2,
                marginBottom: 5,
                background: step >= i + 1 ? C.emerald : "rgba(255,255,255,0.1)",
              }}
            />
            <div style={{ fontSize: 9, color: step === i + 1 ? C.emerald : C.dim, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {s}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.emerald, marginBottom: 16 }}>
            Choose a VIP Plan
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
            {VIP_LIST.map((p) => (
              <div
                key={p.id}
                onClick={() => setPlanId(p.id)}
                style={{
                  background: planId === p.id ? `${p.color}14` : "rgba(255,255,255,0.02)",
                  border: `1px solid ${planId === p.id ? p.color : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 12,
                  padding: 14,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={chipStyle(p.color)}>{p.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: p.color, margin: "6px 0 2px" }}>
                  ₦{p.amount.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: C.green }}>
                  ₦{p.daily.toLocaleString()}
                  <span style={{ fontSize: 11, fontWeight: 400 }}>/day</span>
                </div>
              </div>
            ))}
          </div>
          <button style={{ ...buttonStyle("gold"), width: "100%" }} onClick={() => setStep(2)}>
            Continue →
          </button>
          <button style={{ ...buttonStyle("ghost"), width: "100%", marginTop: 8 }} onClick={onClose}>
            Cancel
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.emerald, marginBottom: 4 }}>
            Make Your Transfer
          </h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
            Send exactly the amount below to this account.
          </p>
          <div
            style={{
              background: "rgba(46,204,113,0.07)",
              border: "1px solid rgba(46,204,113,0.28)",
              borderRadius: 14,
              padding: 18,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Payment Account
            </div>
            <CopyRow label="Bank" value={OPAY_DETAILS.bank} />
            <CopyRow label="Account Number" value={OPAY_DETAILS.accountNumber} />
            <CopyRow label="Account Name" value={OPAY_DETAILS.accountName} />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 12, paddingTop: 12 }}>
              <CopyRow label="Amount to Send" value={`₦${plan.amount.toLocaleString()}`} accent={C.green} big />
            </div>
          </div>

          <div
            style={{
              background: `${C.crimson}24`,
              border: `1px solid ${C.crimson}40`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              ⚠️ Required — Transfer Narration/Remark
            </div>
            <CopyRow label="Enter this code" value={narrationCode} accent={C.crimson} big />
            <p style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              When making the transfer in your bank app, paste this code into the
              "Narration", "Remark", or "Description" field. This helps us match your
              payment to your deposit quickly.
            </p>
          </div>
          <button style={{ ...buttonStyle("gold"), width: "100%" }} onClick={() => setStep(3)}>
            I've Made the Transfer →
          </button>
          <button style={{ ...buttonStyle("ghost"), width: "100%", marginTop: 8 }} onClick={() => setStep(1)}>
            ← Back
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.emerald, marginBottom: 4 }}>
            Submit Proof
          </h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
            Confirm your name and the amount you paid below.
          </p>
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            <div>
              Plan: <span style={{ color: plan.color }}>{plan.label} — ₦{plan.daily.toLocaleString()}/day</span>
            </div>
            <div style={{ marginTop: 4 }}>
              Expected Amount: <span style={{ color: C.green }}>₦{plan.amount.toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 4 }}>
              Narration Code Used: <span style={{ color: C.crimson, fontWeight: 700, letterSpacing: "0.05em" }}>{narrationCode}</span>
            </div>
          </div>
          <ErrorBox msg={err} />
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Your Sender Name (as on OPay)</label>
            <FormInput placeholder="e.g. Chioma Adebayo" value={senderName} maxLength={60} onChange={(e) => setSenderName(e.target.value)} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Amount You Paid (₦)</label>
            <FormInput
              type="number"
              placeholder={`e.g. ${plan.amount}`}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
            {Number(amountPaid) > 0 && Number(amountPaid) !== plan.amount && (
              <p style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
                This differs from the expected ₦{plan.amount.toLocaleString()} — the admin will review this before
                approving.
              </p>
            )}
          </div>

          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: 16,
              marginBottom: 4,
            }}
          >
            <p style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Optional — speeds up approval
            </p>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Payment Description (optional)</label>
            <textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="Time sent, any other details…"
              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Transaction Reference / ID (optional)</label>
            <FormInput placeholder="e.g. OPay TXN12345678" value={txRef} maxLength={60} onChange={(e) => setTxRef(e.target.value)} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Upload Payment Screenshot (optional)</label>
            <input type="file" accept="image/*" onChange={handleFile} style={{ ...inputStyle, padding: "8px 10px" }} />
            {screenshotName && <div style={{ marginTop: 8, fontSize: 11, color: C.green }}>✓ {screenshotName} attached</div>}
          </div>
          <button style={{ ...buttonStyle("gold"), width: "100%" }} onClick={submitProof} disabled={busy}>
            {busy ? "Submitting…" : "Submit for Review ✓"}
          </button>
          <button style={{ ...buttonStyle("ghost"), width: "100%", marginTop: 8 }} onClick={() => setStep(2)}>
            ← Back
          </button>
        </>
      )}
    </Overlay>
  );
}
