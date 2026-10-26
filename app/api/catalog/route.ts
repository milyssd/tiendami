import { NextResponse } from 'next/server';
import { catalog } from '@/lib/server/catalog';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await catalog());
  } catch {
    return NextResponse.json(
      { error: 'El catálogo no está disponible.' },
      { status: 503 },
    );
  }
}
