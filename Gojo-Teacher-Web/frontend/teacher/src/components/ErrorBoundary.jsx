import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            background: "#F8FAFC",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 14, color: "#64748b", textAlign: "center", maxWidth: 360 }}>
            An unexpected error occurred. Please refresh the page. If the problem
            continues, contact your school administrator.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              height: 42,
              padding: "0 24px",
              borderRadius: 12,
              border: "none",
              background: "#007AFB",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Refresh page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
