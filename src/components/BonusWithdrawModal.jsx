import { useState } from "react";
import { C, buttonStyle, labelStyle } from "../styles/theme";
import { BANKS, isWithinWithdrawalHours, WITHDRAWAL_HOURS_TEXT } from "../utils/paymentInfo";
import { validateWithdrawalAmount, MIN_WITHDRAWAL } from "../utils/earnings";
import { withdrawBonusBalance } from "../services/adminUsers";
import { createNotification } from "../services/notifications";
import FormInput from "./FormInput";
import { ErrorBox, SuccessBox } from "./MessageBox";
import Overlay from "./Overlay";

/**
 * Withdrawal flow for the combined referral bonus + welcome bonus
 * balance — separate from WithdrawModal (which is tied to a specific VIP
 * investment's own withdrawableBalance) since bonus money lives on the
 * user profile, not on any single deposit.
 */
export default function BonusWithdrawModal({ userId, availableBalance, onClose, onDone }) {
  const [amount, setAmount] = useState(String(availableBalance));
  const [bank, setBank] = useState("");
  const [accNo, setAccNo] = useState("");
  const [accName, setAccName] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const withinHours = isWithinWithdrawalHours();

  async function submit() {
    setErr("");
    if (!withinHours) {
      setErr(WITHDRAWAL_HOURS_TEXT);
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0 || !Number.isInteger(numAmount)) {
      setErr("Enter a valid whole-number withdrawal amount.");
      return;
    }
    const validation = validateWithdrawalAmount(numAmount, availableBalance);
    if (!validation.valid) {
      setErr(validation.reason);
      return;
    }
    if (!bank) {
      setErr("Select your bank.");
      return;
    }
    if (!/^\d{10}$/.test(accNo)) {
      setErr("Account number must be 10 digits.");
      return;
    }
    if (!accName.trim()) {
      setErr("Enter account name.");
      return;
    }

    setBusy(true);
    try {
      await withdrawBonusBalance(userId, numAmount);
      await createNotification(userId, "withdrawal", `Bonus withdrawal of ₦${numAmount.toLocaleString()} submitted — awaiting processing.`);
      setOk("Withdrawal request submitted! Admin will process it shortly.");
      setTimeout(() => {
        onDone();
        onClose();
      }, 2000);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Could not submit withdrawal. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: C.crimson, marginBottom: 4 }}>
        Withdraw Bonus Balance
      </h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
        Referral and welcome bonuses combined.
      </p>

      {!withinHours && (
        <div
          style={{
            background: "rgba(207,120,120,0.1)",
            border: "1px solid rgba(207,120,120,0.3)",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
            fontSize: 12,
            color: C.red,
          }}
        >
          ⏰ {WITHDRAWAL_HOURS_TEXT}
        </div>
      )}

      <div
        style={{
          background: `${C.crimson}10`,
          border: `1px solid ${C.crimson}25`,
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ color: C.dim }}>Available Bonus Balance</span>
          <span style={{ color: C.crimson, fontWeight: 700 }}>₦{availableBalance.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: C.dim }}>Minimum Withdrawal</span>
          <span style={{ color: "#F9F1E7" }}>₦{MIN_WITHDRAWAL.toLocaleString()}</span>
        </div>
      </div>

      <ErrorBox msg={err} />
      <SuccessBox msg={ok} />

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Amount to Withdraw</label>
        <FormInput
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Min ₦${MIN_WITHDRAWAL.toLocaleString()}`}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Bank Name</label>
        <select
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "#111A14",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "#F9F1E7",
            fontSize: 14,
          }}
        >
          <option value="">— Select your bank —</option>
          {BANKS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Account Number (10 digits)</label>
        <FormInput
          placeholder="0123456789"
          value={accNo}
          maxLength={10}
          onChange={(e) => setAccNo(e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Account Name</label>
        <FormInput placeholder="As it appears on your bank account" value={accName} maxLength={60} onChange={(e) => setAccName(e.target.value)} />
      </div>
      <button style={{ ...buttonStyle("gold"), width: "100%" }} onClick={submit} disabled={busy || !!ok || !withinHours}>
        Submit Withdrawal Request
      </button>
      <button style={{ ...buttonStyle("ghost"), width: "100%", marginTop: 8 }} onClick={onClose}>
        Cancel
      </button>
    </Overlay>
  );
}
