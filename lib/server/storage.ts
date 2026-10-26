import { mkdir, readFile, writeFile, unlink, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
export interface StorageProvider {
  write(bytes: Buffer, ext: string): Promise<string>;
  read(path: string): Promise<Buffer>;
  remove(path: string): Promise<void>;
}
export class LocalStorage implements StorageProvider {
  // Private uploads are provisioned at runtime, never bundled into a build.
  private root = resolve(
    /* turbopackIgnore: true */ process.env.STORAGE_ROOT ?? './storage/private',
  );
  private safe(path: string) {
    const full = resolve(this.root, path);
    const rel = relative(this.root, full);
    if (rel.startsWith('..') || isAbsolute(rel) || !rel)
      throw new Error('Invalid storage path');
    return full;
  }
  async write(bytes: Buffer, ext: string) {
    if (!/^[a-z0-9]{2,6}$/.test(ext)) throw new Error('Invalid extension');
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const name = `${randomUUID()}.${ext}`;
    await writeFile(this.safe(name), bytes, { mode: 0o600, flag: 'wx' });
    return name;
  }
  async read(path: string) {
    const full = await realpath(this.safe(path));
    const rel = relative(await realpath(this.root), full);
    if (rel.startsWith('..') || isAbsolute(rel))
      throw new Error('Invalid storage path');
    return readFile(full);
  }
  async remove(path: string) {
    await unlink(this.safe(path));
  }
}
export const storage = new LocalStorage();
export async function optimizeImage(bytes: Buffer) {
  if (bytes.length > 8 * 1024 * 1024) throw new Error('Image too large');
  const image = sharp(bytes, { limitInputPixels: 40_000_000 });
  const meta = await image.metadata();
  if (
    !['jpeg', 'png', 'webp'].includes(meta.format ?? '') ||
    (meta.pages && meta.pages > 1)
  )
    throw new Error('Unsupported image');
  const optimized = await image
    .rotate()
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return { optimized, originalBytes: bytes.length };
}
