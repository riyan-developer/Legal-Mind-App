import React, { type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  onReset: () => void;
};

type State = {
  hasError: boolean;
};

export class GlobalErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global UI crash", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface-elevated p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Chat crashed
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong in the workspace. Reset the current chat state to continue.
          </p>
          <Button className="mt-6 w-full" onClick={this.handleReset}>
            Reset Chat
          </Button>
        </div>
      </div>
    );
  }
}
