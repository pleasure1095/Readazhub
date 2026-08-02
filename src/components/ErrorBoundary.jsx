import { Component } from "react";
import { C, buttonStyle } from "../styles/theme";

/**
 * Top-level error boundary. Without this, any uncaught error anywhere in
 * the component tree unmounts the whole app silently — a blank screen
 * with no on-page indication of what went wrong, which is exactly the
 * failure mode that's hardest to diagnose on a device without access to
 * browser dev tools.
 *
 * This is a standard React safety net, not a fix for any one specific bug —
 * every production React app should have one at the root.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Logged for anyone who does have console access; the on-screen
    // message below is what covers everyone else.
    console.error("READAZHUB crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: C.bg,
            color: "#E4F0E7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 460, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, color: C.red, marginBottom: 12 }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 8, lineHeight: 1.6 }}>
              READAZHUB hit an unexpected error and couldn't continue.
            </p>
            <p
              style={{
                fontSize: 12,
                color: C.dim,
                marginBottom: 20,
                lineHeight: 1.6,
                fontFamily: "monospace",
                wordBreak: "break-word",
                background: "rgba(36,28,32,0.035)",
                padding: 12,
                borderRadius: 8,
              }}
            >
              {this.state.error.message}
            </p>
            <button style={buttonStyle("gold")} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
