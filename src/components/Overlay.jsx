import { C } from "../styles/theme";

export default function Overlay({ children, onClose }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(36,28,32,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        backdropFilter: "blur(10px)",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 40px 80px rgba(36,28,32,0.25)",
        }}
        className="fade"
      >
        {children}
      </div>
    </div>
  );
}
