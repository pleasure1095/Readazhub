import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, buttonStyle, labelStyle, cardStyle } from "../styles/theme";
import FormInput from "../components/FormInput";
import { ErrorBox } from "../components/MessageBox";
import Logo from "../components/Logo";

// Same 8-digit numeric password rule as the original app. Firebase Auth
// itself only enforces a 6-character minimum, so this app-level rule is
// what actually keeps passwords consistent with the old design intent.
const PASSWORD_RULE = /^\d{8}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", refCode: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function friendlyError(code) {
    switch (code) {
      case "auth/email-already-in-use":
        return "Email already registered.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  }

  async function submit() {
    setErr("");

    if (mode === "register") {
      if (!form.name.trim() || !form.email.trim() || !form.password) {
        setErr("All fields required.");
        return;
      }
      if (!EMAIL_RULE.test(form.email.trim())) {
        setErr("Please enter a valid email address.");
        return;
      }
      if (!PASSWORD_RULE.test(form.password)) {
        setErr("Password must be exactly 8 numeric digits e.g. 12345678");
        return;
      }
    } else {
      if (!form.email.trim() || !form.password) {
        setErr("Email and password required.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "register") {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          refCode: form.refCode,
        });
      } else {
        await login(form.email, form.password);
      }
    } catch (e) {
      console.error(e);
      setErr(friendlyError(e.code));
    }
    setBusy(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: cardStyle.background,
          border: `1px solid ${C.gold}30`,
          borderRadius: 20,
          padding: "44px 28px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
        className="fade"
      >
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "center" }}>
          <Logo size={36} />
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: C.gold,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 28, textAlign: "center", fontWeight: 600 }}>
          {mode === "login" ? "Sign in to your portfolio" : "Start growing your wealth today"}
        </p>

        <ErrorBox msg={err} />

        {mode === "register" && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Full Name</label>
              <FormInput placeholder="John Smith" value={form.name} maxLength={60} onChange={set("name")} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Phone Number</label>
              <FormInput
                placeholder="08012345678"
                inputMode="numeric"
                maxLength={14}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^\d+]/g, "") }))}
              />
            </div>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email Address</label>
          <FormInput type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
        </div>

        <div style={{ marginBottom: 6, position: "relative" }}>
          <label style={labelStyle}>Password {mode === "register" ? "(8 digits)" : ""}</label>
          <FormInput
            type={showPw ? "text" : "password"}
            inputMode={mode === "register" ? "numeric" : "text"}
            placeholder={mode === "register" ? "e.g. 12345678" : "Enter password"}
            value={form.password}
            maxLength={mode === "register" ? 8 : undefined}
            onChange={(e) => {
              const v = mode === "register" ? e.target.value.replace(/\D/g, "").slice(0, 8) : e.target.value;
              setForm((f) => ({ ...f, password: v }));
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={{ paddingRight: 44 }}
          />
          <button
            onClick={() => setShowPw((v) => !v)}
            style={{
              position: "absolute",
              right: 12,
              top: 28,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.muted,
              padding: 4,
              fontSize: 18,
            }}
          >
            {showPw ? "🙈" : "👁"}
          </button>
        </div>

        {mode === "register" && (
          <p style={{ fontSize: 11, color: C.dim, marginBottom: 14 }}>
            Must be exactly 8 numbers e.g. 12345678
          </p>
        )}

        {mode === "register" && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Referral Code (optional)</label>
            <FormInput placeholder="e.g. JOHN4X9K" value={form.refCode} onChange={set("refCode")} />
          </div>
        )}

        {mode === "login" && <div style={{ marginBottom: 20 }} />}

        <button style={{ ...buttonStyle("gold"), width: "100%" }} onClick={submit} disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.muted }}>
          {mode === "login" ? "No account? " : "Have one? "}
          <button
            onClick={() => {
              setMode((m) => (m === "login" ? "register" : "login"));
              setErr("");
            }}
            style={{ background: "none", border: "none", color: C.emerald, cursor: "pointer", fontSize: 13 }}
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
