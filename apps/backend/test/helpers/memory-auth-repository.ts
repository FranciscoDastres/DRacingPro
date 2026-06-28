import type {
  AuthRepository,
  AuthUser,
  GoogleProfile,
  LocalAdminCredentials,
  ProfileUpdate,
  SessionMetadata,
} from '../../src/modules/auth/domain/auth.js';

export const testUser: AuthUser = {
  avatarUrl: null,
  displayName: 'Cliente NAVI',
  email: 'cliente@example.com',
  id: '9d8ce4e1-1e2b-4a98-beb6-c96e8d5e63f2',
  phone: null,
  role: 'customer',
};

export class MemoryAuthRepository implements AuthRepository {
  anonymizedUserId: string | null = null;
  passwordHash: string | null = null;
  revoked = false;
  revokedAllForUserId: string | null = null;
  user: AuthUser | null = testUser;

  async anonymizeUserAccount(userId: string): Promise<void> {
    this.anonymizedUserId = userId;
    this.revoked = true;
    this.user = null;
  }

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

  async revokeAllSessionsForUser(userId: string): Promise<number> {
    this.revokedAllForUserId = userId;
    this.revoked = true;
    return 1;
  }

  async findLocalAdminByEmail(
    email: string,
  ): Promise<LocalAdminCredentials | null> {
    if (
      !this.user ||
      this.user.email !== email ||
      this.user.role !== 'admin' ||
      !this.passwordHash
    ) {
      return null;
    }
    return { passwordHash: this.passwordHash, user: this.user };
  }

  async updateProfile(
    _userId: string,
    update: ProfileUpdate,
  ): Promise<AuthUser> {
    if (!this.user) throw new Error('Test user is not configured');
    this.user = {
      ...this.user,
      displayName: update.displayName,
      phone: update.phone,
    };
    return this.user;
  }

  async upsertGoogleUser(_profile: GoogleProfile): Promise<AuthUser> {
    if (!this.user) throw new Error('Test user is not configured');
    return this.user;
  }

  async upsertDeveloperUser(): Promise<AuthUser> {
    if (!this.user) throw new Error('Test user is not configured');
    this.user = { ...this.user, role: 'customer' };
    return this.user;
  }
}
