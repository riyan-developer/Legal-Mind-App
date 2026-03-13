import { useState } from "react";
import { Navigate } from "react-router-dom";
import { LogIn, BriefcaseBusiness, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const roleLabels = {
  partner: "Partner",
  junior_associate: "Associate",
} as const;

const Home = () => {
  const {
    hydrated,
    status,
    pendingProfile,
    signInWithGoogle,
    signInWithMicrosoft,
    completeOnboarding,
  } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Preparing LegalMind...</p>
      </div>
    );
  }

  if (status === "authenticated") {
    return <Navigate to="/chat" replace />;
  }

  const handleProviderSignIn = async (provider: "google" | "azure") => {
    try {
      setError(null);

      if (provider === "google") {
        await signInWithGoogle();
        return;
      }

      await signInWithMicrosoft();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Login failed");
    }
  };

  const handleRoleSelection = async (role: "partner" | "junior_associate") => {
    try {
      setError(null);
      setIsSubmitting(true);
      await completeOnboarding(role);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Failed to complete onboarding"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <Scale className="h-3.5 w-3.5 text-primary" />
              LegalMind Workspace
            </div>

            <div className="space-y-5">
              <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                Legal drafting with document-grounded answers and role-aware access.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                Sign in with Google or Microsoft to access your legal workspace. New users
                complete a one-step role setup before entering the chat.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-border bg-surface-elevated p-8 shadow-sm">
            {status === "onboarding" && pendingProfile ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    First Login
                  </p>
                  <h2 className="font-heading text-2xl font-semibold text-foreground">
                    Are you Partner or Associate?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {pendingProfile.full_name || pendingProfile.email}
                  </p>
                </div>

                <div className="grid gap-3">
                  {(Object.keys(roleLabels) as Array<keyof typeof roleLabels>).map((role) => (
                    <Button
                      key={role}
                      variant="outline"
                      className="h-auto justify-between rounded-2xl px-4 py-4 text-left"
                      onClick={() => handleRoleSelection(role)}
                      disabled={isSubmitting}
                    >
                      <span className="font-heading text-sm">{roleLabels[role]}</span>
                      <BriefcaseBusiness className="h-4 w-4 text-primary" />
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Welcome
                  </p>
                  <h2 className="font-heading text-2xl font-semibold text-foreground">
                    Sign in to continue
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Use your organization account to access LegalMind.
                  </p>
                </div>

                <div className="grid gap-3">
                  <Button
                    className="justify-between rounded-2xl px-4 py-6"
                    onClick={() => handleProviderSignIn("google")}
                  >
                    <span>Login with Google</span>
                    <LogIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-between rounded-2xl px-4 py-6"
                    onClick={() => handleProviderSignIn("azure")}
                    disabled
                  >
                    <span>Login with Microsoft</span>
                    <LogIn className="h-4 w-4" /> 
                  </Button>
                  <span className="text-xs text-muted-foreground">Disabled because the provider configuration is not available for the free plan.</span>
                </div>
              </div>
            )}

            {error ? (
              <p className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Home;
