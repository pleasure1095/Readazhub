import { C } from "../styles/theme";

export function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div
      style={{
        background: "rgba(207,120,120,0.12)",
        border: "1px solid rgba(207,120,120,0.3)",
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 16,
        fontSize: 13,
        color: C.red,
      }}
    >
      {msg}
    </div>
  );
}

export function SuccessBox({ msg }) {
  if (!msg) return null;
  return (
    <div
      style={{
        background: "rgba(46,204,113,0.12)",
        border: "1px solid rgba(46,204,113,0.3)",
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 16,
        fontSize: 13,
        color: C.green,
      }}
    >
      {msg}
    </div>
  );
}
