import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const AuthCallback = () => {
  const { handleOAuthCallback } = useAuth();
  const [searchParams] = useSearchParams();
  const [nextRoute, setNextRoute] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const providerError =
      searchParams.get("error_description") || searchParams.get("error");

    if (providerError) {
      setError(providerError);
      return;
    }

    const run = async () => {
      try {
        const nextState = await handleOAuthCallback();
        setNextRoute(nextState === "authenticated" ? "/chat" : "/");
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : "Failed to complete sign-in"
        );
      }
    };

    void run();
  }, [handleOAuthCallback, searchParams]);

  if (nextRoute) {
    return <Navigate to={nextRoute} replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md rounded-3xl border border-border bg-surface-elevated px-6 py-8 text-center shadow-sm">
        {error ? (
          <>
            <p className="text-sm font-medium text-destructive">Sign-in failed</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">Completing sign-in...</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Exchanging your SSO session and preparing your workspace.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
