export type UserRole = 'customer' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
}

export interface GoogleProfile {
  subject: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface SessionMetadata {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuthRepository {
  createSession(
    userId: string,
    tokenHash: Uint8Array<ArrayBuffer>,
    expiresAt: Date,
    metadata: SessionMetadata,
  ): Promise<void>;
  findUserBySessionHash(
    tokenHash: Uint8Array<ArrayBuffer>,
  ): Promise<AuthUser | null>;
  revokeSession(tokenHash: Uint8Array<ArrayBuffer>): Promise<void>;
  upsertGoogleUser(profile: GoogleProfile): Promise<AuthUser>;
}
