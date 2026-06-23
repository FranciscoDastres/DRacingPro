import type { DatabaseClient } from '@dracing/database';

import type {
  AuthRepository,
  AuthUser,
  GoogleProfile,
  ProfileUpdate,
  SessionMetadata,
  UserRole,
} from '../domain/auth.js';

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly database: DatabaseClient) {}

  async createSession(
    userId: string,
    tokenHash: Uint8Array<ArrayBuffer>,
    expiresAt: Date,
    metadata: SessionMetadata,
  ): Promise<void> {
    await this.database.auth_sessions.create({
      data: {
        expires_at: expiresAt,
        ip_address: metadata.ipAddress ?? null,
        token_hash: tokenHash,
        user_agent: metadata.userAgent ?? null,
        user_id: userId,
      },
    });
  }

  async findUserBySessionHash(
    tokenHash: Uint8Array<ArrayBuffer>,
  ): Promise<AuthUser | null> {
    const session = await this.database.auth_sessions.findFirst({
      include: { users: true },
      where: {
        expires_at: { gt: new Date() },
        revoked_at: null,
        token_hash: tokenHash,
        users: { is_active: true },
      },
    });

    if (!session) return null;
    return mapUser(session.users);
  }

  async revokeSession(tokenHash: Uint8Array<ArrayBuffer>): Promise<void> {
    await this.database.auth_sessions.updateMany({
      data: { revoked_at: new Date() },
      where: { revoked_at: null, token_hash: tokenHash },
    });
  }

  async setUserRole(userId: string, role: UserRole): Promise<AuthUser> {
    const user = await this.database.users.update({
      data: { role },
      where: { id: userId },
    });
    return mapUser(user);
  }

  async updateProfile(
    userId: string,
    update: ProfileUpdate,
  ): Promise<AuthUser> {
    const user = await this.database.users.update({
      data: { display_name: update.displayName, phone: update.phone },
      where: { id: userId },
    });
    return mapUser(user);
  }

  async upsertDeveloperUser(role: UserRole): Promise<AuthUser> {
    const email =
      role === 'admin' ? 'admin@dracing.local' : 'cliente@dracing.local';
    const displayName = role === 'admin' ? 'Administrador' : 'Cliente';
    const user = await this.database.users.upsert({
      create: { display_name: displayName, email, role },
      update: { role },
      where: { email },
    });
    return mapUser(user);
  }

  async upsertGoogleUser(profile: GoogleProfile): Promise<AuthUser> {
    return this.database.$transaction(async (transaction) => {
      const existingAccount = await transaction.oauth_accounts.findUnique({
        include: { users: true },
        where: {
          provider_provider_subject: {
            provider: 'google',
            provider_subject: profile.subject,
          },
        },
      });

      if (existingAccount) {
        const user = await transaction.users.update({
          data: {
            avatar_url: profile.avatarUrl,
            display_name: profile.displayName,
            email: profile.email,
          },
          where: { id: existingAccount.user_id },
        });
        await transaction.oauth_accounts.update({
          data: { last_login_at: new Date() },
          where: {
            provider_provider_subject: {
              provider: 'google',
              provider_subject: profile.subject,
            },
          },
        });
        return mapUser(user);
      }

      const user = await transaction.users.upsert({
        create: {
          avatar_url: profile.avatarUrl,
          display_name: profile.displayName,
          email: profile.email,
        },
        update: {
          avatar_url: profile.avatarUrl,
          display_name: profile.displayName,
        },
        where: { email: profile.email },
      });

      await transaction.oauth_accounts.create({
        data: {
          provider: 'google',
          provider_subject: profile.subject,
          user_id: user.id,
        },
      });

      return mapUser(user);
    });
  }
}

function mapUser(user: {
  avatar_url: string | null;
  display_name: string;
  email: string;
  id: string;
  phone: string | null;
  role: 'admin' | 'customer';
}): AuthUser {
  return {
    avatarUrl: user.avatar_url,
    displayName: user.display_name,
    email: user.email,
    id: user.id,
    phone: user.phone,
    role: user.role,
  };
}
