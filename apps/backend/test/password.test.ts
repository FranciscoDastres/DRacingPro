import {
  hashPassword,
  verifyPassword,
} from '../src/modules/auth/infrastructure/password.js';

describe('administrator password hashing', () => {
  it('verifies only the password used to create the hash', async () => {
    const hash = await hashPassword('correct horse battery staple');

    await expect(
      verifyPassword('correct horse battery staple', hash),
    ).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
    await expect(verifyPassword('wrong password', null)).resolves.toBe(false);
  });
});
