import { useState } from "react";
import { C, buttonStyle, labelStyle } from "../styles/theme";
import { BANKS, isWithinWithdrawalHours, WITHDRAWAL_HOURS_TEXT } from "../utils/paymentInfo";
import { MIN_WITHDRAWAL } from "../utils/earnings";
import { getCombinedWithdrawableBalance, requestCombinedWithdrawal } from "../services/withdrawalRequests";
import FormInput from "./FormInput";
import { ErrorBox, SuccessBox } from "./MessageBox";
import Overlay from "./Overlay";

/**
 * Single, unified withdraw flow — replaces the earlier design where VIP
 * investment profit, Referral Bonus, Welcome Bonus, and Check-in balance
 * each had their own separate withdraw button/modal. Per the site
 * owner's explicit request, this shows ONE combined total and submits
 * ONE withdrawal request, regardless of how many underlying sources it
 * actually draws from.
 *
 * The draw order (which pot empties first for a partial withdrawal) is
 * Referral -> Welcome -> Check-in -> VIP profit, handled entirely by
 * requestCombinedWithdrawal() — this component only needs to display the
 * combined total and collect the amount + bank details.
 */
export default function CombinedWithdrawModal({
  userId,
  userName,
  investments,
  referralWithdrawableBalance,
  referralLifetimeWithdrawn,
  welcomeBonus,
  checkInBalance,
  checkInLifetimeWithdrawn,
  savedBankDetails,
  onClose,
  onDone,
}) {
  const { total, breakdown } = getCombinedWithdrawableBalance({
    investments,
    referralWithdrawableBalance,
    welcomeBonus,
    checkInBalance,
  });

  const [amount, setAmount] = useState(String(total));
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
    if (numAmount < MIN_WITHDRAWAL) {
      setErr(`Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}.`);
      return;
    }
    if (numAmount > total) {
      setErr(`This exceeds your available balance of ₦${total.toLocaleString()}.`);
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
      await requestCombinedWithdrawal({
        userId,
        userName,
        amount: numAmount,
        bankDetails: { bank, accNo, accName },
        investments,
        referralWithdrawableBalance,
        referralLifetimeWithdrawn,
        welcomeBonus,
        checkInBalance,
        checkInLifetimeWithdrawn,
      });
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
      <h2 style={{ fontSize: 18, fontWeight: 800, color: C.emerald, marginBottom: 4 }}>
        Request Withdrawal
      </h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
        All your withdrawable balances, combined into one request.
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
          background: `${C.emerald}10`,
          border: `1px solid ${C.emerald}25`,
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.emerald}20` }}>
          <span style={{ color: C.dim, fontWeight: 700 }}>Total Available</span>
          <span style={{ color: C.emerald, fontWeight: 800, fontSize: 16 }}>₦{total.toLocaleString()}</span>
        </div>
        {breakdown.vipProfit > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11.5 }}>
            <span style={{ color: C.dim }}>VIP Profit</span>
            <span style={{ color: C.text }}>₦{breakdown.vipProfit.toLocaleString()}</span>
          </div>
        )}
        {breakdown.referral > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11.5 }}>
            <span style={{ color: C.dim }}>Referral Bonus</span>
            <span style={{ color: C.text }}>₦{breakdown.referral.toLocaleString()}</span>
          </div>
        )}
        {breakdown.welcome > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11.5 }}>
            <span style={{ color: C.dim }}>Welcome Bonus</span>
            <span style={{ color: C.text }}>₦{breakdown.welcome.toLocaleString()}</span>
          </div>
        )}
        {breakdown.checkIn > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11.5 }}>
            <span style={{ color: C.dim }}>Check-In Balance</span>
            <span style={{ color: C.text }}>₦{breakdown.checkIn.toLocaleString()}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.emerald}20` }}>
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
      <button style={{ ...buttonStyle("gold"), width: "100%" }} onClick={submit} disabled={busy || !!ok || !withinHours || total <= 0}>
        Submit Withdrawal Request
      </button>
      <button style={{ ...buttonStyle("ghost"), width: "100%", marginTop: 8 }} onClick={onClose}>
        Cancel
      </button>
    </Overlay>
  );
}
