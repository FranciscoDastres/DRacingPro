import {
  randomBytes,
  scrypt as nodeScrypt,
  type ScryptOptions,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

// promisify loses the options overload, so we re-type it to keep the scrypt
// cost parameters (which matter for password-hash strength).
const scrypt = promisify(nodeScrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: ScryptOptions,
) => Promise<Buffer>;
const KEY_LENGTH = 64;
const COST = 32_768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 64 * 1024 * 1024;
const PREFIX = 'scrypt';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);
  return [
    PREFIX,
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  encodedHash: string | null,
): Promise<boolean> {
  const parsed = parseHash(encodedHash);
  const salt = parsed?.salt ?? Buffer.alloc(16);
  const expected = parsed?.derivedKey ?? Buffer.alloc(KEY_LENGTH);
  const actual = await deriveKey(password, salt);
  return parsed !== null && timingSafeEqual(actual, expected);
}

function parseHash(encodedHash: string | null): {
  derivedKey: Buffer;
  salt: Buffer;
} | null {
  if (!encodedHash) return null;
  const [prefix, cost, blockSize, parallelization, salt, derivedKey] =
    encodedHash.split('$');
  if (
    prefix !== PREFIX ||
    Number(cost) !== COST ||
    Number(blockSize) !== BLOCK_SIZE ||
    Number(parallelization) !== PARALLELIZATION ||
    !salt ||
    !derivedKey
  ) {
    return null;
  }

  const decodedSalt = Buffer.from(salt, 'base64url');
  const decodedKey = Buffer.from(derivedKey, 'base64url');
  if (decodedSalt.length !== 16 || decodedKey.length !== KEY_LENGTH)
    return null;
  return { derivedKey: decodedKey, salt: decodedSalt };
}

async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scrypt(password, salt, KEY_LENGTH, {
    N: COST,
    maxmem: MAX_MEMORY,
    p: PARALLELIZATION,
    r: BLOCK_SIZE,
  })) as Buffer;
}
