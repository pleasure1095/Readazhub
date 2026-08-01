export default function Overlay({ children, onClose }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
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
          background: "#0F1611",
          border: "1px solid #2ECC7128",
          borderRadius: 20,
          padding: 28,
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 40px 80px rgba(0,0,0,0.7)",
        }}
        className="fade"
      >
        {children}
      </div>
    </div>
  );
}
