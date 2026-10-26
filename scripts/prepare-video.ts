import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { spawn } from 'node:child_process';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { db } from '../lib/server/db';
async function main() {
  const [lessonId, input] = process.argv.slice(2);
  if (!lessonId || !input)
    throw new Error(
      'Usage: npx tsx scripts/prepare-video.ts LESSON_UUID INPUT_FILE',
    );
  await db.lesson.findUniqueOrThrow({ where: { id: lessonId } });
  const dir = resolve(
    process.env.STORAGE_ROOT ?? './storage/private',
    'courses',
    lessonId,
  );
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await writeFile(resolve(dir, 'key.bin'), randomBytes(16), { mode: 0o600 });
  const info = resolve(dir, 'key-info');
  await writeFile(info, `key.bin\n${resolve(dir, 'key.bin')}\n`, {
    mode: 0o600,
  });
  try {
    await new Promise<void>((ok, no) => {
      const ff = spawn(
        'ffmpeg',
        [
          '-y',
          '-i',
          resolve(input),
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '23',
          '-vf',
          "scale=w='min(1280,iw)':h=-2",
          '-c:a',
          'aac',
          '-hls_time',
          '6',
          '-hls_playlist_type',
          'vod',
          '-hls_key_info_file',
          info,
          '-hls_segment_filename',
          resolve(dir, '%05d.ts'),
          resolve(dir, 'playlist.m3u8'),
        ],
        { stdio: 'inherit' },
      );
      ff.on('error', no);
      ff.on('exit', (code) =>
        code === 0 ? ok() : no(new Error('ffmpeg failed')),
      );
    });
    await db.lesson.update({
      where: { id: lessonId },
      data: { storagePath: `courses/${lessonId}/playlist.m3u8` },
    });
  } finally {
    await unlink(info).catch(() => {});
  }
}
main().finally(() => db.$disconnect());
