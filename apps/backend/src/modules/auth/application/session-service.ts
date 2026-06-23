import { createHash, randomBytes } from 'node:crypto';

import type {
  AuthRepository,
  AuthUser,
  GoogleProfile,
  ProfileUpdate,
  SessionMetadata,
  UserRole,
} from '../domain/auth.js';

const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CreatedSession {
  expiresAt: Date;
  token: string;
  user: AuthUser;
}

export class SessionService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly sessionTtlMs = DEFAULT_SESSION_TTL_MS,
    private readonly adminEmails: readonly string[] = [],
  ) {}

  async authenticate(token: string | undefined): Promise<AuthUser | null> {
    if (!token) return null;
    return this.repository.findUserBySessionHash(hashSessionToken(token));
  }

  async loginWithGoogle(
    profile: GoogleProfile,
    metadata: SessionMetadata,
  ): Promise<CreatedSession> {
    const upserted = await this.repository.upsertGoogleUser(profile);
    // The emails configured as administrators are promoted on sign-in, so the
    // principal admin gets workshop privileges without manual DB changes.
    const user =
      this.adminEmails.includes(profile.email.toLowerCase()) &&
      upserted.role !== 'admin'
        ? await this.repository.setUserRole(upserted.id, 'admin')
        : upserted;
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);

    await this.repository.createSession(
      user.id,
      hashSessionToken(token),
      expiresAt,
      metadata,
    );

    return { expiresAt, token, user };
  }

  isAdminEmail(email: string): boolean {
    return this.adminEmails.includes(email.trim().toLowerCase());
  }

  async loginAsDeveloper(
    role: UserRole,
    metadata: SessionMetadata,
  ): Promise<CreatedSession> {
    const user = await this.repository.upsertDeveloperUser(role);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);

    await this.repository.createSession(
      user.id,
      hashSessionToken(token),
      expiresAt,
      metadata,
    );

    return { expiresAt, token, user };
  }

  async updateProfile(
    userId: string,
    update: ProfileUpdate,
  ): Promise<AuthUser> {
    return this.repository.updateProfile(userId, update);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.repository.revokeSession(hashSessionToken(token));
  }
}

export function hashSessionToken(token: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(createHash('sha256').update(token).digest());
}
