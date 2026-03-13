import { supabase } from "@/config/supabase";
import type {
  AuthExchangeResponse,
  AuthenticatedSession,
} from "@/types/auth";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const authUrl = (path: string) =>
  `${apiBaseUrl}${path.startsWith("/") ? path : `/auth/${path}`}`;

const readJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : "Authentication request failed";
    throw new Error(message);
  }

  return (await response.json()) as T;
};

const postAuth = <T>(path: string, body: unknown) =>
  fetch(authUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then((response) => readJson<T>(response));

export const signInWithProvider = async (provider: "google" | "azure") => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw error;
  }
};

export const getSupabaseSession = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw error ?? new Error("Failed to recover Supabase session");
  }

  return data.session;
};

export const exchangeBackendSession = (supabaseAccessToken: string) =>
  postAuth<AuthExchangeResponse>("/auth/exchange", {
    supabaseAccessToken,
  });

export const completeBackendOnboarding = (
  supabaseAccessToken: string,
  role: "partner" | "junior_associate"
) =>
  postAuth<AuthenticatedSession>("/auth/onboard", {
    supabaseAccessToken,
    role,
  });

export const refreshBackendSession = (refreshToken: string) =>
  postAuth<AuthenticatedSession>("/auth/refresh", {
    refreshToken,
  });

export const logoutBackendSession = (refreshToken: string | null) =>
  postAuth<{ success: boolean }>("/auth/logout", {
    refreshToken,
  });

export const signOutSupabase = async () => {
  await supabase.auth.signOut();
};
