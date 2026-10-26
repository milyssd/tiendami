import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { db } from './db';
import { hash } from './crypto';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(req: NextRequest) {
  const expected = new URL(process.env.APP_URL ?? 'http://localhost:3000')
    .origin;
  if (req.headers.get('origin') !== expected)
    throw new HttpError(403, 'Solicitud no permitida.');
}
// La aplicación no confía en CF-Connecting-IP. Nginx normaliza X-Real-IP y no es accesible públicamente.
export const ipHash = (req: NextRequest) =>
  hash(
    process.env.TRUST_PROXY === 'true'
      ? (req.headers.get('x-real-ip') ?? 'unknown')
      : 'local',
  );
export async function limit(key: string, max = 20, minutes = 15) {
  const now = new Date();
  const reset = new Date(Date.now() + minutes * 60_000);
  await db.rateLimit.deleteMany({ where: { key, resetAt: { lte: now } } });
  const entry = await db.rateLimit.upsert({
    where: { key },
    create: { key, hits: 1, resetAt: reset },
    update: { hits: { increment: 1 } },
  });
  if (entry.hits > max)
    throw new HttpError(429, 'Demasiados intentos. Intenta más tarde.');
}
export function endpoint(fn: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    let response: NextResponse;
    try {
      response = await fn(req);
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'digest' in e &&
        typeof e.digest === 'string' &&
        (e.digest === 'DYNAMIC_SERVER_USAGE' || e.digest.startsWith('NEXT_'))
      )
        throw e;
      if (e instanceof HttpError)
        response = NextResponse.json(
          { error: e.message },
          { status: e.status },
        );
      else if (e instanceof ZodError)
        response = NextResponse.json(
          {
            error: 'Revisa los datos del formulario.',
            fields: e.flatten().fieldErrors,
          },
          { status: 400 },
        );
      else if (e instanceof SyntaxError)
        response = NextResponse.json(
          { error: 'El formato de la solicitud no es válido.' },
          { status: 400 },
        );
      else {
        console.error('Request failed', {
          name: e instanceof Error ? e.name : 'Unknown',
        });
        response = NextResponse.json(
          { error: 'No pudimos completar la solicitud.' },
          { status: 500 },
        );
      }
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
}
export async function audit(
  actorId: string,
  action: string,
  entityId: string,
  ip: string,
) {
  await db.auditLog.create({ data: { actorId, action, entityId, ipHash: ip } });
}
