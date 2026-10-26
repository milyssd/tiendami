export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { endpoint, HttpError } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
export const GET = endpoint(async (req) => {
  const u = await requireUser();
  const id = req.nextUrl.pathname.split('/')[3];
  const o = await db.order.findFirst({
    where: { id, userId: u.id, paidAt: { not: null } },
    include: { items: true },
  });
  if (!o) throw new HttpError(404, 'Recibo no disponible.');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let page = pdf.addPage();
  let y = 760;
  const line = (text: string, size = 12) => {
    if (y < 60) {
      page = pdf.addPage();
      y = 760;
    }
    page.drawText(
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, ''),
      { x: 45, y, size, font },
    );
    y -= size + 14;
  };
  line('TIENDAMI / RECIBO DE PAGO', 23);
  line(o.number);
  line(`Fecha: ${o.paidAt?.toISOString().slice(0, 10)}`);
  line(`Cliente: ${u.name}`);
  for (const i of o.items)
    line(
      `${i.quantity} x ${i.productName.slice(0, 55)} - Bs ${((i.quantity * i.unitPrice) / 100).toFixed(2)}`,
    );
  line(`Envio: Bs ${(o.shipping / 100).toFixed(2)}`);
  line(`Descuento: Bs ${(o.discount / 100).toFixed(2)}`);
  line(`TOTAL PAGADO: Bs ${(o.total / 100).toFixed(2)}`, 18);
  line('Recibo comercial. No constituye factura fiscal.', 10);
  return new NextResponse(new Uint8Array(await pdf.save()), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${o.number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
