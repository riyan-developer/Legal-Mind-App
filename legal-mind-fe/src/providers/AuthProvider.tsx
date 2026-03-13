import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  completeBackendOnboarding,
  exchangeBackendSession,
  getSupabaseSession,
  logoutBackendSession,
  refreshBackendSession,
  signInWithProvider,
  signOutSupabase,
} from "@/services/auth";
import { AuthStatus, canUploadForRole, useAuthStore } from "@/store/authStore";
import type { AuthUser, PendingProfile } from "@/types/auth";

type AuthContextValue = {
  hydrated: boolean;
  status: AuthStatus;
  user: AuthUser | null;
  pendingProfile: PendingProfile | null;
  accessToken: string | null;
  canUpload: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  handleOAuthCallback: () => Promise<"authenticated" | "onboarding">;
  completeOnboarding: (role: "partner" | "junior_associate") => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const hydrated = useAuthStore((state) => state.hydrated);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const pendingProfile = useAuthStore((state) => state.pendingProfile);
  const pendingSupabaseAccessToken = useAuthStore(
    (state) => state.pendingSupabaseAccessToken
  );
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setOnboarding = useAuthStore((state) => state.setOnboarding);
  const setLoading = useAuthStore((state) => state.setLoading);
  const clearSession = useAuthStore((state) => state.clearSession);
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const applyAuthenticatedSession = (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }) => {
    setAuthenticated(payload);
  };

  const refreshSession = async () => {
    const currentRefreshToken = useAuthStore.getState().refreshToken;

    if (!currentRefreshToken) {
      clearSession();
      return null;
    }

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    refreshInFlightRef.current = refreshBackendSession(currentRefreshToken)
      .then((session) => {
        applyAuthenticatedSession(session);
        return session.accessToken;
      })
      .catch(async () => {
        await signOutSupabase().catch(() => undefined);
        clearSession();
        queryClient.clear();
        return null;
      })
      .finally(() => {
        refreshInFlightRef.current = null;
      });

    return refreshInFlightRef.current;
  };

  useEffect(() => {
    if (!hydrated || bootstrapped) {
      return;
    }

    const bootstrap = async () => {
      if (status === "authenticated" && refreshToken) {
        if (!expiresAt || expiresAt <= Date.now() + 60_000) {
          await refreshSession();
        }
        setBootstrapped(true);
        return;
      }

      if (status === "onboarding" && pendingSupabaseAccessToken && pendingProfile) {
        setBootstrapped(true);
        return;
      }

      clearSession();
      setBootstrapped(true);
    };

    void bootstrap();
  }, [
    bootstrapped,
    clearSession,
    expiresAt,
    hydrated,
    pendingProfile,
    pendingSupabaseAccessToken,
    refreshToken,
    status,
  ]);

  useEffect(() => {
    if (status !== "authenticated" || !expiresAt || !refreshToken) {
      return;
    }

    const refreshDelay = Math.max(expiresAt - Date.now() - 5 * 60_000, 30_000);
    const timeout = window.setTimeout(() => {
      void refreshSession();
    }, refreshDelay);

    return () => {
      clearTimeout(timeout);
    };
  }, [expiresAt, refreshToken, status]);

  const signIn = (provider: "google" | "azure") => signInWithProvider(provider);

  const handleOAuthCallback = async () => {
    setLoading();

    try {
      const supabaseSession = await getSupabaseSession();
      const backendSession = await exchangeBackendSession(supabaseSession.access_token);

      if (backendSession.onboardingRequired) {
        setOnboarding({
          profile: backendSession.profile,
          supabaseAccessToken: supabaseSession.access_token,
        });
        return "onboarding";
      }

      applyAuthenticatedSession(backendSession);
      return "authenticated";
    } catch (error) {
      clearSession();
      throw error;
    }
  };

  const completeOnboarding = async (role: "partner" | "junior_associate") => {
    const supabaseToken = useAuthStore.getState().pendingSupabaseAccessToken;

    if (!supabaseToken) {
      throw new Error("Missing onboarding session");
    }

    const session = await completeBackendOnboarding(supabaseToken, role);
    applyAuthenticatedSession(session);
  };

  const logout = async () => {
    const currentRefreshToken = useAuthStore.getState().refreshToken;

    await logoutBackendSession(currentRefreshToken).catch(() => undefined);
    await signOutSupabase().catch(() => undefined);
    clearSession();
    queryClient.clear();
  };

  const value = useMemo(
    () => ({
      hydrated,
      status: bootstrapped ? status : "loading",
      user,
      pendingProfile,
      accessToken,
      canUpload: canUploadForRole(user?.role),
      signInWithGoogle: () => signIn("google"),
      signInWithMicrosoft: () => signIn("azure"),
      handleOAuthCallback,
      completeOnboarding,
      logout,
      refreshSession,
    }),
    [accessToken, bootstrapped, hydrated, pendingProfile, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
