import { C } from "../styles/theme";
import { WHATSAPP_GROUP_LINK } from "../utils/paymentInfo";

/**
 * Permanent (non-dismissible) banner at the top of the Dashboard.
 *
 * Trimmed down from an earlier version that greeted the user by name and
 * repeated the WhatsApp CTA verbatim — now that WelcomeModal shows on
 * EVERY login (not just the first ever) and already includes the
 * WhatsApp link plus the full VIP plans list, having this banner say the
 * same "Welcome, [name] — join our community" right underneath felt
 * redundant, like being greeted twice in a row. This banner still keeps
 * the WhatsApp link always reachable on the page itself (not just inside
 * a dismissible popup), but doesn't duplicate the modal's greeting text.
 */
export default function WelcomeBanner() {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.crimson}2E, ${C.charcoalDeep}80)`,
        border: `1px solid ${C.crimson}25`,
        borderRadius: 14,
        padding: "12px 16px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
        💬 Get updates, support, and announcements in our community.
      </div>
      <a
        href={WHATSAPP_GROUP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          padding: "8px 16px",
          borderRadius: 9,
          background: "linear-gradient(135deg,#D4506A,#8C1E2E)",
          color: "#F9F1E7",
          fontSize: 12.5,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Join WhatsApp
      </a>
    </div>
  );
}
