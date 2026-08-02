import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { C, cardStyle } from "../styles/theme";
import { getUserNotifications, markNotificationRead } from "../services/notifications";

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function iconFor(type) {
  return type === "approved" ? "✅" : type === "rejected" ? "❌" : type === "referral" ? "🎉" : type === "withdrawal" ? "💸" : "🔔";
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const all = await getUserNotifications(user.uid);
        setNotifs(all);
        // Mark unread ones as read now that the user has viewed this page.
        const unread = all.filter((n) => !n.read);
        await Promise.all(unread.map((n) => markNotificationRead(n.id)));
      } catch (e) {
        console.error("Failed to load notifications:", e);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.dim }}>Loading notifications…</div>;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>
        Notifications
      </h2>
      {notifs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 14, color: C.dim }}>
          No notifications yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notifs.map((n) => (
            <div key={n.id} style={{ ...cardStyle, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 20 }}>{iconFor(n.type)}</div>
              <div>
                <div style={{ fontSize: 13, color: "#F9F1E7" }}>{n.msg}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{fmtDate(n.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
