import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  encryptCode,
  decryptCode,
  signPath,
  verifyPath,
} from '../lib/server/crypto';
import { parseCodes } from '../lib/server/code-import';
process.env.CODE_KEY_TEST = randomBytes(32).toString('base64');
describe('digital inventory protection', () => {
  it('uses authenticated encryption and random nonces', () => {
    const a = encryptCode('EXAMPLE-NOT-A-REAL-KEY', 'TEST');
    const b = encryptCode('EXAMPLE-NOT-A-REAL-KEY', 'TEST');
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(decryptCode(a.ciphertext, 'TEST')).toBe('EXAMPLE-NOT-A-REAL-KEY');
  });
  it('rejects modified ciphertext and wrong key versions', () => {
    const a = encryptCode('EXAMPLE-NOT-A-REAL-KEY', 'TEST');
    const raw = Buffer.from(a.ciphertext, 'base64');
    raw[30] ^= 1;
    expect(() => decryptCode(raw.toString('base64'), 'TEST')).toThrow();
    expect(() => decryptCode(a.ciphertext, 'MISSING')).toThrow();
  });
  it('supports key rotation without destroying old keys', () => {
    process.env.CODE_KEY_NEW = randomBytes(32).toString('base64');
    const old = encryptCode('EXAMPLE-ROTATION-CODE', 'TEST');
    const next = encryptCode(decryptCode(old.ciphertext, 'TEST'), 'NEW');
    expect(decryptCode(next.ciphertext, 'NEW')).toBe('EXAMPLE-ROTATION-CODE');
  });
  it('binds a signed file URL to path, user and expiry', () => {
    const expires = Date.now() + 60000;
    const path = 'user-a/lesson/00001.ts';
    const sig = signPath(path, expires);
    expect(verifyPath(path, expires, sig)).toBe(true);
    expect(verifyPath('user-b/lesson/00001.ts', expires, sig)).toBe(false);
    expect(verifyPath(path, Date.now() - 1, sig)).toBe(false);
    expect(verifyPath(path, expires, 'abc')).toBe(false);
  });
  it('rejects duplicate and malformed CSV entries', () => {
    const d = parseCodes(
      'code,provider,cost,expiresAt\nEXAMPLE-CODE-1,Test,10,\nEXAMPLE-CODE-1,Test,10,\nBAD,Test,0,',
    );
    expect(d.rows).toHaveLength(1);
    expect(d.errors).toHaveLength(2);
  });
});
