import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const algorithm = "scrypt";
const keyLength = 64;
const cost = 2 ** 15;
const blockSize = 8;
const parallelization = 3;
const maximumMemory = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await derivePasswordKey(password, salt, {
    N: cost,
    r: blockSize,
    p: parallelization,
  });

  return [
    algorithm,
    cost,
    blockSize,
    parallelization,
    salt.toString("base64"),
    derivedKey.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [storedAlgorithm, rawCost, rawBlockSize, rawParallelization, rawSalt, rawKey] =
    storedHash.split("$");

  if (
    storedAlgorithm !== algorithm ||
    !rawCost ||
    !rawBlockSize ||
    !rawParallelization ||
    !rawSalt ||
    !rawKey
  ) {
    return false;
  }

  const salt = Buffer.from(rawSalt, "base64");
  const storedKey = Buffer.from(rawKey, "base64");
  const derivedKey = await derivePasswordKey(password, salt, {
    N: Number(rawCost),
    r: Number(rawBlockSize),
    p: Number(rawParallelization),
  });

  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

function derivePasswordKey(
  password: string,
  salt: Buffer,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keyLength,
      { ...options, maxmem: maximumMemory },
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
