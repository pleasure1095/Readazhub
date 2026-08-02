import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { C } from "./styles/theme";
import { getUserNotifications } from "./services/notifications";
import AuthPage from "./pages/AuthPage";
import Nav from "./components/Nav";
import BottomTabBar from "./components/BottomTabBar";
import WelcomeModal from "./components/WelcomeModal";
import DashboardPage from "./pages/DashboardPage";
import VipPlansPage from "./pages/VipPlansPage";
import ReferralsPage from "./pages/ReferralsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import AdminDepositsPage from "./pages/AdminDepositsPage";
import AdminEarningsPage from "./pages/AdminEarningsPage";
import ManageUsersPage from "./pages/ManageUsersPage";

export default function App() {
  const { user, booting, isAdmin, logout } = useAuth();
  const [tab, setTab] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for unread notifications so the bottom nav badge stays current
  // even while the user is sitting on a different tab. Lightweight (a
  // single Firestore query) and only runs for signed-in non-admin users.
  useEffect(() => {
    if (!user || isAdmin) return;
    let cancelled = false;

    async function checkUnread() {
      try {
        const all = await getUserNotifications(user.uid);
        if (!cancelled) setUnreadCount(all.filter((n) => !n.read).length);
      } catch (e) {
        console.error("Failed to check notifications:", e);
      }
    }

    checkUnread();
    const t = setInterval(checkUnread, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user, isAdmin, tab]);

  if (booting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.dim,
        }}
      >
        Loading…
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // Default landing tab depends on role, and resets whenever the signed-in
  // user's role changes (e.g. immediately after being promoted to admin).
  const activeTab = tab || (isAdmin ? "deposits" : "dashboard");

  function renderTab() {
    if (isAdmin) {
      if (activeTab === "users") return <ManageUsersPage />;
      if (activeTab === "earnings") return <AdminEarningsPage />;
      return <AdminDepositsPage />;
    }
    if (activeTab === "plans") return <VipPlansPage onJoined={() => setTab("dashboard")} />;
    if (activeTab === "referrals") return <ReferralsPage />;
    if (activeTab === "notifications") return <NotificationsPage />;
    if (activeTab === "settings") return <SettingsPage />;
    return <DashboardPage />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: "#F9F1E7" }}>
      <Nav user={user} onLogout={logout} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px", paddingBottom: 100 }}>
        {renderTab()}
      </div>
      {/* Primary navigation — always visible, matching the reference
          app's bottom bar design. */}
      <BottomTabBar tab={activeTab} setTab={setTab} isAdmin={isAdmin} unreadCount={unreadCount} />
      <WelcomeModal userId={user.uid} userName={user.name} />
    </div>
  );
}
