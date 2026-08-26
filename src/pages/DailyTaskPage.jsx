import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C } from "../styles/theme";
import { getUserDeposits } from "../services/deposits";
import ReadEarnWidget from "../components/ReadEarnWidget";

/**
 * Standalone "Daily Task" page, split out of DashboardPage per the site
 * owner's request — Read & Earn now has its own bottom-nav tab rather
 * than living only inside the Dashboard. ReadEarnWidget itself is
 * unchanged; this page just gives it a home and figures out
 * isVipMember the same way DashboardPage does (any approved deposit).
 *
 * Deliberately does NOT pass an onEarningsUnlocked callback tied to
 * DashboardPage's load() — the two pages don't share state, and
 * DashboardPage already refetches its own earnings figures on its own
 * mount/interval, so the numbers stay correct next time the user visits
 * Home even without a cross-page callback.
 */
export default function DailyTaskPage() {
  const { user } = useAuth();
  const [isVipMember, setIsVipMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getUserDeposits(user.uid)
      .then((deposits) => {
        if (!cancelled) setIsVipMember(deposits.some((d) => d.status === "approved"));
      })
      .catch((e) => console.error("Failed to load deposits:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Daily Task</h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
        Read today's featured articles to unlock today's VIP earnings.
      </p>

      {loading ? (
        <p style={{ fontSize: 13, color: C.dim }}>Loading…</p>
      ) : !isVipMember ? (
        <div
          style={{
            background: "rgba(36,28,32,0.035)",
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 18,
            fontSize: 13,
            color: C.muted,
          }}
        >
          Join a VIP plan to unlock the daily Read & Earn task.
        </div>
      ) : (
        <ReadEarnWidget userId={user.uid} isVipMember={isVipMember} />
      )}
    </div>
  );
}
