import type {
  AuthRepository,
  AuthUser,
  GoogleProfile,
  SessionMetadata,
  UserRole,
} from '../../src/modules/auth/domain/auth.js';

export const testUser: AuthUser = {
  avatarUrl: null,
  displayName: 'Cliente NAVI',
  email: 'cliente@example.com',
  id: '9d8ce4e1-1e2b-4a98-beb6-c96e8d5e63f2',
  role: 'customer',
};

export class MemoryAuthRepository implements AuthRepository {
  revoked = false;
  user: AuthUser | null = testUser;

  async createSession(
    _userId: string,
    _tokenHash: Uint8Array<ArrayBuffer>,
    _expiresAt: Date,
    _metadata: SessionMetadata,
  ): Promise<void> {}

  async findUserBySessionHash(
    _tokenHash: Uint8Array<ArrayBuffer>,
  ): Promise<AuthUser | null> {
    return this.revoked ? null : this.user;
  }

  async revokeSession(_tokenHash: Uint8Array<ArrayBuffer>): Promise<void> {
    this.revoked = true;
  }

  async setUserRole(_userId: string, role: UserRole): Promise<AuthUser> {
    if (!this.user) throw new Error('Test user is not configured');
    this.user = { ...this.user, role };
    return this.user;
  }

  async upsertGoogleUser(_profile: GoogleProfile): Promise<AuthUser> {
    if (!this.user) throw new Error('Test user is not configured');
    return this.user;
  }

  async upsertDeveloperUser(role: UserRole): Promise<AuthUser> {
    if (!this.user) throw new Error('Test user is not configured');
    this.user = { ...this.user, role };
    return this.user;
  }
}
