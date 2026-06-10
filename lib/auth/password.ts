import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const HASH_ALGORITHM = "scrypt";
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export const PASSWORD_MIN_LENGTH = 12;

function assertPasswordPolicy(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
}

async function scryptHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export async function createPasswordHash(password: string): Promise<string> {
  assertPasswordPolicy(password);

  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scryptHash(password, salt);

  return [
    HASH_ALGORITHM,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, n, r, p, salt, hash] = storedHash.split("$");

  if (algorithm !== HASH_ALGORITHM || !n || !r || !p || !salt || !hash) {
    return false;
  }

  const storedKey = Buffer.from(hash, "base64url");
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      storedKey.length,
      {
        N: Number(n),
        r: Number(r),
        p: Number(p),
      },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(key);
      },
    );
  });

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}
