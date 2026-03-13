export type AppRole = "admin" | "partner" | "junior_associate";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  is_active: boolean;
  created_at?: string;
};

export type PendingProfile = {
  id: string;
  email: string;
  full_name: string;
};

export type AuthenticatedSession = {
  onboardingRequired: false;
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type OnboardingRequiredSession = {
  onboardingRequired: true;
  profile: PendingProfile;
};

export type AuthExchangeResponse =
  | AuthenticatedSession
  | OnboardingRequiredSession;
