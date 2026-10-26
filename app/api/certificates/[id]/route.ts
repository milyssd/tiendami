export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { endpoint, HttpError } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
export const GET = endpoint(async (req) => {
  const u = await requireUser();
  const id = req.nextUrl.pathname.split('/')[3];
  const e = await db.enrollment.findFirst({
    where: { id, userId: u.id, certificateCode: { not: null } },
    include: { course: { include: { product: true } } },
  });
  if (!e) throw new HttpError(404, 'Certificado no disponible.');
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const clean = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '');
  for (const [text, y, size] of [
    ['TIENDAMI / ACADEMY', 500, 20],
    ['CERTIFICADO DE FINALIZACION', 420, 28],
    [u.name, 340, 30],
    [e.course.product.name, 280, 20],
    [
      `Verificar: ${process.env.APP_URL}/certificado/${e.certificateCode}`,
      130,
      10,
    ],
  ] as [string, number, number][])
    page.drawText(clean(text), { x: 60, y, size, font });
  return new NextResponse(new Uint8Array(await pdf.save()), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="certificado-tiendami.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
});
