import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, PendingProfile } from "@/types/auth";

export type AuthStatus =
  | "loading"
  | "anonymous"
  | "onboarding"
  | "authenticated";

type AuthState = {
  hydrated: boolean;
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  pendingProfile: PendingProfile | null;
  pendingSupabaseAccessToken: string | null;
  setHydrated: (hydrated: boolean) => void;
  setLoading: () => void;
  setAuthenticated: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }) => void;
  setOnboarding: (payload: {
    profile: PendingProfile;
    supabaseAccessToken: string;
  }) => void;
  clearSession: () => void;
};

const defaultState = {
  status: "loading" as AuthStatus,
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  pendingProfile: null,
  pendingSupabaseAccessToken: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hydrated: false,
      ...defaultState,
      setHydrated: (hydrated) => set({ hydrated }),
      setLoading: () => set({ status: "loading" }),
      setAuthenticated: ({ user, accessToken, refreshToken, expiresAt }) =>
        set({
          status: "authenticated",
          user,
          accessToken,
          refreshToken,
          expiresAt,
          pendingProfile: null,
          pendingSupabaseAccessToken: null,
        }),
      setOnboarding: ({ profile, supabaseAccessToken }) =>
        set({
          status: "onboarding",
          pendingProfile: profile,
          pendingSupabaseAccessToken: supabaseAccessToken,
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
        }),
      clearSession: () =>
        set({
          ...defaultState,
          status: "anonymous",
        }),
    }),
    {
      name: "legal-mind-auth",
      partialize: (state) => ({
        status:
          state.status === "authenticated" || state.status === "onboarding"
            ? state.status
            : "anonymous",
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        pendingProfile: state.pendingProfile,
        pendingSupabaseAccessToken: state.pendingSupabaseAccessToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export const canUploadForRole = (role?: AuthUser["role"] | null) =>
  role === "admin" || role === "partner";
