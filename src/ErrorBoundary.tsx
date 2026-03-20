import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: "#ef4444", fontFamily: "monospace", background: "#0f1117", minHeight: "100vh" }}>
          <h1 style={{ fontSize: 24 }}>Render error</h1>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 16 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 12, opacity: 0.7 }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
