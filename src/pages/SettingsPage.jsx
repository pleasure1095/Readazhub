import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { reauthenticateUser } from "../services/auth";
import { C, buttonStyle, cardStyle, labelStyle } from "../styles/theme";
import { WHATSAPP_GROUP_LINK, BANKS } from "../utils/paymentInfo";
import FormInput from "../components/FormInput";
import { ErrorBox, SuccessBox } from "../components/MessageBox";

const PASSWORD_RULE = /^\d{8}$/;
const APP_VERSION = "1.0.0";

/**
 * Settings page — the usual home for "Account", "Security", and general
 * app actions that most apps in this space have. Built on top of the
 * existing profile-edit and password-change logic from Stage 2 (unchanged
 * below), just organized under clearer section headers and with a general
 * "App" card added for sign out / version / support, since that's the
 * standard shape for a settings screen.
 */
export default function SettingsPage() {
  const { user, updateProfile, updateSavedBankDetails, updatePassword, logout } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [profileErr, setProfileErr] = useState("");
  const [profileOk, setProfileOk] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwOk, setPwOk] = useState("");
  const [busy, setBusy] = useState(false);

  // Bank details for withdrawal auto-fill — hydrated from the saved
  // profile if the user has set this before, otherwise blank.
  const [bank, setBank] = useState(user.savedBankDetails?.bank || "");
  const [accNo, setAccNo] = useState(user.savedBankDetails?.accNo || "");
  const [accName, setAccName] = useState(user.savedBankDetails?.accName || "");
  const [bankErr, setBankErr] = useState("");
  const [bankOk, setBankOk] = useState("");

  async function saveProfile() {
    setProfileErr("");
    setProfileOk("");
    if (!name.trim()) {
      setProfileErr("Name is required.");
      return;
    }
    setBusy(true);
    try {
      await updateProfile({ name, phone });
      setProfileOk("Profile updated successfully.");
    } catch (e) {
      console.error(e);
      setProfileErr("Could not update profile. Please try again.");
    }
    setBusy(false);
  }

  async function saveBank() {
    setBankErr("");
    setBankOk("");
    if (!bank) {
      setBankErr("Select your bank.");
      return;
    }
    if (!/^\d{10}$/.test(accNo)) {
      setBankErr("Account number must be 10 digits.");
      return;
    }
    if (!accName.trim()) {
      setBankErr("Enter the account name.");
      return;
    }
    setBusy(true);
    try {
      await updateSavedBankDetails({ bank, accNo, accName: accName.trim() });
      setBankOk("Bank details saved — they'll auto-fill on future withdrawals.");
    } catch (e) {
      console.error(e);
      setBankErr("Could not save bank details. Please try again.");
    }
    setBusy(false);
  }

  async function savePassword() {
    setPwErr("");
    setPwOk("");
    if (!PASSWORD_RULE.test(newPassword)) {
      setPwErr("Password must be exactly 8 numeric digits e.g. 12345678");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(newPassword);
      setPwOk("Password updated successfully.");
      setNewPassword("");
      setNeedsReauth(false);
      setCurrentPassword("");
    } catch (e) {
      if (e.code === "auth/requires-recent-login") {
        // Firebase needs a fresh sign-in proof before allowing sensitive
        // changes like a password update. Prompt for current password
        // instead of forcing a full logout/login round trip.
        setNeedsReauth(true);
        setPwErr("For security, please confirm your current password to continue.");
      } else {
        console.error(e);
        setPwErr("Could not update password. Please try again.");
      }
    }
    setBusy(false);
  }

  async function confirmReauthAndRetry() {
    setPwErr("");
    if (!currentPassword) {
      setPwErr("Enter your current password to continue.");
      return;
    }
    setBusy(true);
    try {
      await reauthenticateUser(currentPassword);
      await savePassword();
    } catch (e) {
      console.error(e);
      setPwErr(
        e.code === "auth/wrong-password" || e.code === "auth/invalid-credential"
          ? "Current password is incorrect."
          : "Could not verify your identity. Please try again."
      );
    }
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 460 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
        Settings
      </h2>

      <h3
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.dim,
          marginBottom: 10,
        }}
      >
        Account
      </h3>
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <ErrorBox msg={profileErr} />
        <SuccessBox msg={profileOk} />
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Full Name</label>
          <FormInput value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Phone Number</label>
          <FormInput
            value={phone}
            inputMode="numeric"
            maxLength={14}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
          />
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={labelStyle}>Email (fixed)</label>
          <FormInput value={user.email} disabled style={{ opacity: 0.5 }} />
        </div>
        <button style={{ ...buttonStyle("gold"), width: "100%", marginTop: 12 }} onClick={saveProfile} disabled={busy}>
          Save Changes
        </button>
      </div>

      <h3
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.dim,
          marginBottom: 10,
        }}
      >
        Bank Details
      </h3>
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
          Save your bank details once — they'll auto-fill every time you request a withdrawal, so you don't have to retype them.
        </p>
        <ErrorBox msg={bankErr} />
        <SuccessBox msg={bankOk} />
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
        <div style={{ marginBottom: 6 }}>
          <label style={labelStyle}>Account Name</label>
          <FormInput placeholder="As it appears on your bank account" value={accName} maxLength={60} onChange={(e) => setAccName(e.target.value)} />
        </div>
        <button style={{ ...buttonStyle("gold"), width: "100%", marginTop: 12 }} onClick={saveBank} disabled={busy}>
          {user.savedBankDetails ? "Update Bank Details" : "Save Bank Details"}
        </button>
      </div>

      <h3
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.dim,
          marginBottom: 10,
        }}
      >
        Security
      </h3>
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <ErrorBox msg={pwErr} />
        <SuccessBox msg={pwOk} />

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>New Password (8 digits)</label>
          <FormInput
            inputMode="numeric"
            placeholder="e.g. 12345678"
            value={newPassword}
            maxLength={8}
            onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, "").slice(0, 8))}
          />
        </div>

        {needsReauth && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Current Password</label>
            <FormInput
              type="password"
              placeholder="Confirm your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmReauthAndRetry()}
            />
          </div>
        )}

        <p style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>
          Must be exactly 8 numbers e.g. 12345678
        </p>

        <button
          style={{ ...buttonStyle("gold"), width: "100%" }}
          onClick={needsReauth ? confirmReauthAndRetry : savePassword}
          disabled={busy}
        >
          {needsReauth ? "Confirm & Update Password" : "Update Password"}
        </button>
      </div>

      <h3
        style={{
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: C.dim,
          marginBottom: 10,
        }}
      >
        App
      </h3>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 14,
            marginBottom: 14,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: 13, color: C.muted }}>App Version</span>
          <span style={{ fontSize: 13, color: "#F9F1E7" }}>{APP_VERSION}</span>
        </div>
        <a
          href={WHATSAPP_GROUP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            fontSize: 13,
            color: C.emerald,
            textDecoration: "none",
            paddingBottom: 14,
            marginBottom: 14,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          Contact Support →
        </a>
        <button style={{ ...buttonStyle("danger"), width: "100%" }} onClick={logout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
