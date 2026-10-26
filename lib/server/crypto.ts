import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
function key(version: string) {
  const value = process.env[`CODE_KEY_${version}`];
  if (!value) throw new Error('Missing encryption key');
  const k = Buffer.from(value, 'base64');
  if (k.length !== 32) throw new Error('Encryption key must be 32 bytes');
  return k;
}
export function encryptCode(
  code: string,
  version = process.env.CODE_ACTIVE_KEY ?? 'V1',
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(version), iv);
  const ciphertext = Buffer.concat([
    cipher.update(code, 'utf8'),
    cipher.final(),
  ]);
  return {
    ciphertext: Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
      'base64',
    ),
    keyVersion: version,
    fingerprint: hash(code.trim().toUpperCase()),
  };
}
export function decryptCode(ciphertext: string, version: string) {
  const raw = Buffer.from(ciphertext, 'base64');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(version),
    raw.subarray(0, 12),
  );
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([
    decipher.update(raw.subarray(28)),
    decipher.final(),
  ]).toString('utf8');
}
function signingKey() {
  const v = process.env.STORAGE_SIGNING_KEY;
  if (!v || Buffer.from(v, 'base64').length !== 32)
    throw new Error('Missing signing key');
  return v;
}
export function signPath(path: string, expires: number) {
  return createHmac('sha256', signingKey())
    .update(`${path}:${expires}`)
    .digest('hex');
}
export function verifyPath(path: string, expires: number, signature: string) {
  if (
    !Number.isSafeInteger(expires) ||
    expires < Date.now() ||
    expires > Date.now() + 300_000
  )
    return false;
  const expected = Buffer.from(signPath(path, expires), 'hex');
  const got = Buffer.from(signature, 'hex');
  return got.length === expected.length && timingSafeEqual(got, expected);
}
