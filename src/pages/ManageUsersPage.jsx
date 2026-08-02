import { useEffect, useState } from "react";
import { listAllUsers, setUserRole } from "../services/adminUsers";
import { useAuth } from "../context/AuthContext";
import { C, buttonStyle, cardStyle, labelStyle } from "../styles/theme";
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

/**
 * Admin-only screen for viewing all registered users and promoting/demoting
 * their role. This replaces "edit Firestore by hand" as the way to grant
 * admin access — Firestore rules are still the real enforcement; this is
 * just a safer, auditable way to trigger the same write.
 */
export default function ManageUsersPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busyUid, setBusyUid] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const list = await listAllUsers();
      setUsers(list);
    } catch (e) {
      console.error(e);
      setErr("Could not load users. Please try again.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleRole(u) {
    setErr("");
    setOk("");
    if (u.uid === currentAdmin.uid) {
      setErr("You cannot change your own role.");
      return;
    }
    const nextRole = u.role === "admin" ? "user" : "admin";
    const confirmed = window.confirm(
      nextRole === "admin"
        ? `Grant admin access to ${u.name}? They will be able to approve deposits and manage users.`
        : `Remove admin access from ${u.name}?`
    );
    if (!confirmed) return;

    setBusyUid(u.uid);
    try {
      await setUserRole(u.uid, nextRole);
      setUsers((prev) => prev.map((p) => (p.uid === u.uid ? { ...p, role: nextRole } : p)));
      setOk(`${u.name} is now ${nextRole === "admin" ? "an admin" : "a regular user"}.`);
    } catch (e) {
      console.error(e);
      setErr("Could not update role. Please try again.");
    }
    setBusyUid(null);
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
        Manage Users
      </h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
        View all registered users and manage admin access.
      </p>

      <ErrorBox msg={err} />
      <SuccessBox msg={ok} />

      <div style={{ marginBottom: 20 }}>
        <FormInput
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 50, color: C.dim }}>Loading users…</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 50,
            background: C.surface,
            border: `1px dashed ${C.border}`,
            borderRadius: 14,
            color: C.dim,
          }}
        >
          {search ? "No users match your search" : "No users found"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((u) => (
            <div
              key={u.uid}
              style={{
                ...cardStyle,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "#F9F1E7", fontWeight: 500 }}>{u.name}</span>
                  <span style={chipStyle(u.role === "admin" ? C.red : C.green)}>
                    {u.role === "admin" ? "ADMIN" : "USER"}
                  </span>
                  {u.uid === currentAdmin.uid && <span style={chipStyle(C.blue)}>YOU</span>}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                  Referral code: {u.referralCode}
                </div>
              </div>
              <button
                style={{ ...buttonStyle(u.role === "admin" ? "danger" : "ghost"), fontSize: 12, padding: "8px 16px" }}
                onClick={() => toggleRole(u)}
                disabled={busyUid === u.uid || u.uid === currentAdmin.uid}
              >
                {busyUid === u.uid ? "Updating…" : u.role === "admin" ? "Remove Admin" : "Make Admin"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
