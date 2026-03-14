import jwt, { type SignOptions } from 'jsonwebtoken';
import { authRepo } from './auth.repo.js';
import { AppError } from '../../lib/app-error.js';
import { env } from '../../config/env.js';
import { usersRepo } from '../users/users.repo.js';
import { auditService } from '../audit/audit.service.js';
import {
  completeOnboardingSchema,
  exchangeSessionSchema,
  logoutSchema,
  refreshSessionSchema,
} from './auth.schema.js';
import type {
  AppJwtPayload,
  AuthUserProfile,
  SupabaseAccessTokenClaims,
  SupabaseIdentity,
} from '../../types/auth.js';

const buildDisplayName = (identity: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) => {
  const metadata = identity.user_metadata ?? {};
  const fullName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    [metadata.given_name, metadata.family_name]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' ')
      .trim();

  if (fullName) {
    return fullName;
  }

  if (identity.email) {
    return identity.email.split('@')[0];
  }

  return 'LegalMind User';
};

const buildDisplayNameFromClaims = (claims: Partial<SupabaseAccessTokenClaims>) =>
  buildDisplayName({
    email: claims.email,
    user_metadata: {
      ...(claims.user_metadata ?? {}),
      full_name: claims.full_name,
      name: claims.name,
      given_name: claims.given_name,
      family_name: claims.family_name,
    },
  });

const resolveSupabaseIdentity = async (supabaseAccessToken: string): Promise<SupabaseIdentity> => {
  const decoded = jwt.decode(supabaseAccessToken);
  const claims =
    decoded && typeof decoded === 'object'
      ? (decoded as Partial<SupabaseAccessTokenClaims>)
      : null;

  if (!claims?.sub || !claims.email) {
    throw new AppError(`Invalid Supabase session ${JSON.stringify(claims)}`, 401);
  }

  return {
    id: claims.sub,
    email: claims.email,
    full_name: buildDisplayNameFromClaims(claims),
  };
};

const issueTokens = (user: AuthUserProfile) => {
  const accessTokenTtl = env.APP_ACCESS_TOKEN_TTL as SignOptions['expiresIn'];
  const refreshTokenTtl = env.APP_REFRESH_TOKEN_TTL as SignOptions['expiresIn'];

  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    },
    env.APP_JWT_SECRET,
    {
      expiresIn: accessTokenTtl,
    },
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      type: 'refresh',
    },
    env.APP_REFRESH_JWT_SECRET,
    {
      expiresIn: refreshTokenTtl,
    },
  );

  const decoded = jwt.decode(accessToken) as { exp?: number } | null;

  return {
    accessToken,
    refreshToken,
    expiresAt: decoded?.exp ? decoded.exp * 1000 : Date.now(),
  };
};

const buildAuthenticatedResponse = (user: AuthUserProfile) => ({
  onboardingRequired: false as const,
  user,
  ...issueTokens(user),
});

export const authService = {
  async exchangeSession(payload: unknown) {
    const parsed = exchangeSessionSchema.parse(payload);
    const identity = await resolveSupabaseIdentity(parsed.supabaseAccessToken);
    const user = await authRepo.findUserProfileById(identity.id);

    if (!user) {
      return {
        onboardingRequired: true as const,
        profile: identity,
      };
    }

    if (!user.is_active) {
      throw new AppError('User account is inactive', 403);
    }

    await auditService.record({
      userId: user.id,
      action: 'auth.login',
      entityType: 'auth_session',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        source: 'supabase_sso',
      },
    });

    return buildAuthenticatedResponse(user);
  },

  async completeOnboarding(payload: unknown) {
    const parsed = completeOnboardingSchema.parse(payload);
    const identity = await resolveSupabaseIdentity(parsed.supabaseAccessToken);
    const existingUser = await authRepo.findUserProfileById(identity.id);

    if (existingUser) {
      if (!existingUser.is_active) {
        throw new AppError('User account is inactive', 403);
      }

      return buildAuthenticatedResponse(existingUser);
    }

    const user = await usersRepo.create({
      id: identity.id,
      email: identity.email,
      full_name: identity.full_name,
      role: parsed.role,
      is_active: true,
    });

    await auditService.record({
      userId: user.id,
      action: 'auth.login',
      entityType: 'auth_session',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        source: 'supabase_sso',
        onboardingCompleted: true,
      },
    });

    return buildAuthenticatedResponse(user);
  },

  async refreshSession(payload: unknown) {
    const parsed = refreshSessionSchema.parse(payload);

    let decoded: AppJwtPayload;

    try {
      decoded = jwt.verify(parsed.refreshToken, env.APP_REFRESH_JWT_SECRET) as AppJwtPayload;
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = await authRepo.findUserProfileById(decoded.sub);

    if (!user || !user.is_active) {
      throw new AppError('Unauthorized user', 401);
    }

    return buildAuthenticatedResponse(user);
  },

  async logout(payload: unknown) {
    const parsed = logoutSchema.parse(payload ?? {});

    if (parsed.refreshToken) {
      try {
        const decoded = jwt.verify(parsed.refreshToken, env.APP_REFRESH_JWT_SECRET) as AppJwtPayload;

        if (decoded.type === 'refresh') {
          await auditService.record({
            userId: decoded.sub,
            action: 'auth.logout',
            entityType: 'auth_session',
            entityId: decoded.sub,
            metadata: {
              source: 'manual_logout',
            },
          });
        }
      } catch {
        // Logout should stay best-effort even if the refresh token is missing or expired.
      }
    }

    return { success: true };
  },

  async getMe(userId: string) {
    const user = await authRepo.findUserProfileById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  },
};
