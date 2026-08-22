import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, buttonStyle, cardStyle } from "../styles/theme";
import FormInput from "../components/FormInput";
import { listAllUsers, setUserRole, deleteUserAndReverseBonus } from "../services/adminUsers";

function chipStyle(color) {
  return {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    background: `${color}22`,
    color,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
  };
}

export default function ManageUsersPage() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busyUid, setBusyUid] = useState(null);
  const [expandedUid, setExpandedUid] = useState(null);
  // Two-tap confirmation for delete — set to the uid awaiting a second
  // confirming tap, cleared on any other action. Deletion is
  // irreversible (see deleteUserAndReverseBonus in services/adminUsers.js
  // for the full clawback + cleanup it performs), so a single accidental
  // tap should never be enough to trigger it.
  const [confirmDeleteUid, setConfirmDeleteUid] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const all = await listAllUsers();
      setUsers(all);
    } catch (e) {
      console.error(e);
      setErr("Could not load users.");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleRole(u) {
    setErr("");
    setOk("");
    setBusyUid(u.uid);
    try {
      const newRole = u.role === "admin" ? "user" : "admin";
      await setUserRole(u.uid, newRole);
      setOk(`${u.name} is now ${newRole === "admin" ? "an admin" : "a regular user"}.`);
      await load();
    } catch (e) {
      console.error(e);
      setErr("Could not update role.");
    }
    setBusyUid(null);
  }

  async function handleDelete(u) {
    if (confirmDeleteUid !== u.uid) {
      // First tap: arm confirmation, don't delete yet.
      setConfirmDeleteUid(u.uid);
      setErr("");
      setOk("");
      return;
    }
    // Second tap on the same user within the confirmation window: proceed.
    setErr("");
    setOk("");
    setBusyUid(u.uid);
    setConfirmDeleteUid(null);
    try {
      await deleteUserAndReverseBonus(u.uid);
      setOk(`${u.name} deleted. Any referral bonus their deposits generated has been reversed.`);
      await load();
    } catch (e) {
      console.error(e);
      setErr("Could not delete user.");
    }
    setBusyUid(null);
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  /**
   * Direct (Level 1) referrals for a given user, computed client-side
   * from the SAME full user list already loaded for this page — no
   * extra Firestore reads needed, since listAllUsers() already returns
   * every user's referrerCode.
   */
  function getDirectReferrals(referralCode) {
    if (!referralCode) return [];
    return users.filter((u) => u.referrerCode === referralCode);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Loading users…</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Manage Users</h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
        {users.length} total user{users.length === 1 ? "" : "s"}
      </p>

      {err && (
        <div style={{ background: "rgba(207,120,120,0.1)", border: "1px solid rgba(207,120,120,0.3)", borderRadius: 10, padding: 12, marginBottom: 16, color: C.red, fontSize: 13 }}>
          {err}
        </div>
      )}
      {ok && (
        <div style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)", borderRadius: 10, padding: 12, marginBottom: 16, color: C.green, fontSize: 13 }}>
          {ok}
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <FormInput placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.dim }}>
          No users match this search.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((u) => {
            const directReferrals = getDirectReferrals(u.referralCode);
            const isExpanded = expandedUid === u.uid;
            return (
              <div
                key={u.uid}
                style={{
                  ...cardStyle,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{u.name}</span>
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

                {/* Delete is separate from Make/Remove Admin above and
                    requires two taps to confirm — deleteUserAndReverseBonus
                    (services/adminUsers.js) both removes this user's data
                    AND claws back any referral bonus their deposits
                    generated for their referrer(s), so it's irreversible
                    in a way that has real money consequences for OTHER
                    users, not just this one. */}
                <div style={{ marginTop: 10 }}>
                  <button
                    style={{ ...buttonStyle("danger"), fontSize: 11.5, padding: "7px 14px" }}
                    onClick={() => handleDelete(u)}
                    disabled={busyUid === u.uid || u.uid === currentAdmin.uid}
                  >
                    {busyUid === u.uid
                      ? "Deleting…"
                      : confirmDeleteUid === u.uid
                      ? "Tap again to confirm delete"
                      : "Delete User"}
                  </button>
                  {confirmDeleteUid === u.uid && (
                    <div style={{ fontSize: 10.5, color: C.dim, marginTop: 6, lineHeight: 1.5 }}>
                      This permanently deletes {u.name}'s data and reverses any referral bonus their
                      deposits generated for their referrer(s). This cannot be undone.{" "}
                      <span
                        style={{ color: C.emerald, fontWeight: 700, cursor: "pointer" }}
                        onClick={() => setConfirmDeleteUid(null)}
                      >
                        Cancel
                      </span>
                    </div>
                  )}
                </div>

                {/* Referral visibility for admin — previously there was
                    no way to see who a user referred at all, only their
                    own referral code. This shows direct (Level 1)
                    referral count always, and expands to list names on
                    tap. */}
                <button
                  onClick={() => setExpandedUid(isExpanded ? null : u.uid)}
                  style={{
                    marginTop: 10,
                    background: "none",
                    border: "none",
                    padding: 0,
                    minHeight: "auto",
                    cursor: directReferrals.length > 0 ? "pointer" : "default",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: directReferrals.length > 0 ? C.emerald : C.dim,
                  }}
                  disabled={directReferrals.length === 0}
                >
                  {directReferrals.length === 0
                    ? "No referrals yet"
                    : `${directReferrals.length} direct referral${directReferrals.length === 1 ? "" : "s"} ${isExpanded ? "▲" : "▼"}`}
                </button>

                {isExpanded && directReferrals.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {directReferrals.map((r) => (
                      <div
                        key={r.uid}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 10px",
                          background: "rgba(36,28,32,0.03)",
                          borderRadius: 8,
                        }}
                      >
                        <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>{r.name}</span>
                        <span style={{ fontSize: 11, color: C.dim }}>{r.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
