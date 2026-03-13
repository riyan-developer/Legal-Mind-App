export type AppRole = 'admin' | 'partner' | 'junior_associate';

export type AuthenticatedRequestUser = {
  id: string;
  email?: string;
  role?: AppRole;
};

export type AuthUserProfile = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  is_active: boolean;
  created_at?: string | null;
};

export type SupabaseIdentity = {
  id: string;
  email: string;
  full_name: string;
};

export type SupabaseAccessTokenClaims = {
  sub: string;
  email?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  role?: string;
  user_metadata?: Record<string, unknown>;
  full_name?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

export type JwtTokenType = 'access' | 'refresh';

export type AppJwtPayload = {
  sub: string;
  email?: string;
  type?: JwtTokenType;
};
