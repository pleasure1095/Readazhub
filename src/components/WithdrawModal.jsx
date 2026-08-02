import { useState } from "react";
import { C, buttonStyle, labelStyle } from "../styles/theme";
import { BANKS, isWithinWithdrawalHours, WITHDRAWAL_HOURS_TEXT } from "../utils/paymentInfo";
import { validateWithdrawalAmount, MIN_WITHDRAWAL } from "../utils/earnings";
import { requestWithdrawal } from "../services/deposits";
import FormInput from "./FormInput";
import { ErrorBox, SuccessBox } from "./MessageBox";
import Overlay from "./Overlay";

export default function WithdrawModal({ investment, userId, savedBankDetails, onClose, onDone }) {
  const [amount, setAmount] = useState(String(investment.withdrawableBalance));
  // Auto-filled from the user's saved bank details (set in Settings) if
  // present, but still fully editable here — someone can withdraw to a
  // different account on a one-off basis without overwriting their saved
  // default.
  const [bank, setBank] = useState(savedBankDetails?.bank || "");
  const [accNo, setAccNo] = useState(savedBankDetails?.accNo || "");
  const [accName, setAccName] = useState(savedBankDetails?.accName || "");
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
    const validation = validateWithdrawalAmount(numAmount, investment.withdrawableBalance);
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
      await requestWithdrawal(
        investment.id,
        investment.lifetimeWithdrawn,
        numAmount,
        { bank, accNo, accName },
        userId
      );
      setOk("Withdrawal request submitted! Admin will process it shortly.");
      setTimeout(() => {
        onDone();
        onClose();
      }, 2000);
    } catch (e) {
      console.error(e);
      setErr("Could not submit withdrawal. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: C.emerald, marginBottom: 4 }}>
        Request Withdrawal
      </h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
        Only profit can be withdrawn — your capital stays invested.
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
          background: `${investment.plan.color}10`,
          border: `1px solid ${investment.plan.color}25`,
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ color: C.dim }}>Plan</span>
          <span style={{ color: investment.plan.color }}>{investment.plan.label}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ color: C.dim }}>Available Profit</span>
          <span style={{ color: C.emerald, fontWeight: 700 }}>₦{investment.withdrawableBalance.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: C.dim }}>Minimum Withdrawal</span>
          <span style={{ color: C.text }}>₦{MIN_WITHDRAWAL.toLocaleString()}</span>
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
        {savedBankDetails && (
          <p style={{ fontSize: 10.5, color: C.dim, marginTop: -8, marginBottom: 8 }}>
            Auto-filled from your saved bank details — edit here if withdrawing to a different account, or update your default in Settings.
          </p>
        )}
        <select
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "#FFFFFF",
            border: "1px solid rgba(36,28,32,0.14)",
            borderRadius: 8,
            color: C.text,
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
