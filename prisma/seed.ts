import { PrismaClient, ProductType } from '@prisma/client';
import argon2 from 'argon2';
import { loadEnvConfig } from '@next/env';
import { databaseAdapter } from '../lib/server/adapter';
loadEnvConfig(process.cwd());
const db = new PrismaClient({ adapter: databaseAdapter() });
const rows: {
  slug: string;
  name: string;
  type: ProductType;
  category: string;
  brand: string;
  art: string;
  price: number;
  old?: number;
  attrs: Record<string, string>;
  variants?: { name: string; price: number; sku: string }[];
}[] = [
  {
    slug: 'teclado-mecanico-k68',
    name: 'Teclado mecánico K68 RGB',
    type: 'PHYSICAL',
    category: 'gaming',
    brand: 'Redragon',
    art: 'keyboard',
    price: 34900,
    old: 42500,
    attrs: {
      Conexión: 'USB-C',
      Compatibilidad: 'PC / Mac',
      Garantía: '12 meses',
      Formato: '68 teclas',
    },
  },
  {
    slug: 'audifonos-cloud-core',
    name: 'Audífonos Cloud Core',
    type: 'PHYSICAL',
    category: 'gaming',
    brand: 'HyperX',
    art: 'headset',
    price: 45900,
    attrs: {
      Conexión: 'Jack 3.5 mm',
      Compatibilidad: 'Multiplataforma',
      Garantía: '12 meses',
    },
  },
  {
    slug: 'steam-gift-card-20',
    name: 'Steam Gift Card · 20 USD',
    type: 'DIGITAL',
    category: 'digitales',
    brand: 'Steam',
    art: 'giftcard',
    price: 15900,
    attrs: {
      Plataforma: 'Steam',
      Región: 'Bolivia / USD',
      Entrega: 'Código digital',
    },
  },
  {
    slug: 'atelier-no-07',
    name: 'Atelier No. 07 · Eau de parfum',
    type: 'PHYSICAL',
    category: 'perfumes',
    brand: 'Atelier',
    art: 'perfume',
    price: 4500,
    attrs: {
      Notas: 'Ámbar · madera',
      Concentración: 'Eau de parfum',
      Género: 'Unisex',
    },
    variants: [
      { name: 'Decant 5 ml', price: 4500, sku: 'AT07-5' },
      { name: 'Decant 10 ml', price: 7900, sku: 'AT07-10' },
      { name: 'Frasco 100 ml', price: 54900, sku: 'AT07-100' },
    ],
  },
  {
    slug: 'mouse-wireless-g305',
    name: 'Mouse inalámbrico G305',
    type: 'PHYSICAL',
    category: 'gaming',
    brand: 'Logitech',
    art: 'mouse',
    price: 29900,
    old: 36900,
    attrs: {
      Conexión: 'Inalámbrico',
      Compatibilidad: 'PC / Mac',
      Garantía: '12 meses',
    },
  },
  {
    slug: 'fortnite-1000-vbucks',
    name: 'Fortnite · 1.000 V-Bucks',
    type: 'DIGITAL',
    category: 'digitales',
    brand: 'Epic Games',
    art: 'vbucks',
    price: 8900,
    attrs: {
      Plataforma: 'Epic Games',
      Región: 'Bolivia',
      Entrega: 'Código digital',
    },
  },
  {
    slug: 'desarrollo-web-desde-cero',
    name: 'Desarrollo web desde cero',
    type: 'COURSE',
    category: 'cursos',
    brand: 'TiendaMi Academy',
    art: 'course',
    price: 19900,
    old: 29900,
    attrs: {
      Nivel: 'Desde cero',
      Duración: '12 horas',
      Instructor: 'Equipo TiendaMi',
    },
  },
  {
    slug: 'tu-web-profesional',
    name: 'Tu web. Tu siguiente nivel.',
    type: 'SERVICE',
    category: 'servicios',
    brand: 'TiendaMi Studio',
    art: 'service',
    price: 149900,
    attrs: {
      Plazo: '15 días hábiles',
      Alcance: 'Sitio de 5 páginas',
      Incluye: 'Diseño + desarrollo',
    },
  },
  {
    slug: 'javascript-en-la-practica',
    name: 'JavaScript en la práctica',
    type: 'COURSE',
    category: 'cursos',
    brand: 'TiendaMi Academy',
    art: 'course',
    price: 24900,
    attrs: {
      Nivel: 'Intermedio',
      Duración: '16 horas',
      Instructor: 'Equipo TiendaMi',
    },
  },
  {
    slug: 'landing-para-tu-negocio',
    name: 'Una landing para tu negocio',
    type: 'SERVICE',
    category: 'servicios',
    brand: 'TiendaMi Studio',
    art: 'service',
    price: 79900,
    attrs: {
      Plazo: '7 días hábiles',
      Alcance: 'Landing de una página',
      Incluye: 'Diseño responsive',
    },
  },
  {
    slug: 'kit-planificacion-gamer',
    name: 'Kit de planificación creativo',
    type: 'DOWNLOAD',
    category: 'descargables',
    brand: 'TiendaMi Studio',
    art: 'download',
    price: 2900,
    attrs: { Formato: 'PDF', Licencia: 'Uso personal' },
  },
  {
    slug: 'guia-primer-setup',
    name: 'Guía para tu primer setup',
    type: 'DOWNLOAD',
    category: 'descargables',
    brand: 'TiendaMi Studio',
    art: 'download',
    price: 1900,
    attrs: { Formato: 'PDF', Licencia: 'Uso personal' },
  },
];
async function main() {
  const labels: Record<string, string> = {
    gaming: 'Gaming & tech',
    digitales: 'Códigos digitales',
    perfumes: 'Perfumes',
    cursos: 'Cursos',
    servicios: 'Servicios web',
    descargables: 'Descargables',
  };
  for (const [slug, name] of Object.entries(labels))
    await db.category.upsert({
      where: { slug },
      create: { slug, name },
      update: {},
    });
  await db.setting.upsert({
    where: { key: 'store' },
    create: {
      key: 'store',
      value: {
        name: 'TiendaMi',
        exchangeRate: 6.96,
        localShipping: 1500,
        provinceShipping: 3000,
        riskThreshold: 60,
        phoneThreshold: 100000,
        whatsapp: '',
        bankDetails: '',
        paymentQrFileId: '',
        legalDraft: true,
      },
    },
    update: {},
  });
  for (const r of rows) {
    const category = await db.category.findUniqueOrThrow({
      where: { slug: r.category },
    });
    const brand = await db.brand.upsert({
      where: { name: r.brand },
      create: { name: r.brand },
      update: {},
    });
    const product = await db.product.upsert({
      where: { slug: r.slug },
      create: {
        slug: r.slug,
        name: r.name,
        type: r.type,
        categoryId: category.id,
        brandId: brand.id,
        image: `/art/${r.art}.svg`,
        imageAlt: `Ilustración de ${r.name}`,
        description:
          r.type === 'DIGITAL'
            ? 'Código digital individual para canjear en la plataforma indicada. Comprueba la región antes de comprar. Se entrega después de confirmar tu pago y superar la revisión de seguridad. No vendemos cuentas ni solicitamos tu contraseña.'
            : r.type === 'COURSE'
              ? 'Aprende con un enfoque práctico y a tu ritmo. Este curso de ejemplo muestra la estructura de módulos y lecciones. El temario y los videos deben completarse antes de habilitar ventas.'
              : r.type === 'SERVICE'
                ? 'Un sitio pensado para tu negocio, con diseño adaptable y una estructura clara. Coordinamos el alcance contigo y hacemos seguimiento del proyecto desde tu cuenta. Hosting y dominio se cotizan por separado.'
                : r.type === 'DOWNLOAD'
                  ? 'Un recurso digital de ejemplo creado por TiendaMi. Licencia individual de uso personal. Descarga privada disponible después de confirmar el pago.'
                  : 'Un buen pick para tu día a día. Producto de ejemplo del catálogo: confirma las especificaciones, disponibilidad y condiciones de garantía con la tienda antes de publicar.',
        featured: true,
        active: true,
        variants: {
          create: (
            r.variants ?? [
              { name: 'Estándar', price: r.price, sku: r.slug.toUpperCase() },
            ]
          ).map((v) => ({
            ...v,
            oldPrice: r.old ?? null,
            stock: r.type === 'PHYSICAL' ? 15 : 0,
            platform: r.attrs.Plataforma,
            region: r.attrs.Región,
            warrantyMonths: r.category === 'gaming' ? 12 : 0,
          })),
        },
      },
      update: {},
    });
    // Los productos digitales y cursos se muestran como muestra de catálogo, sin stock vendible hasta preparar contenido real.

    for (const [name, value] of Object.entries(r.attrs)) {
      let attr = await db.attribute.findFirst({
        where: { categoryId: category.id, name },
      });
      if (!attr)
        attr = await db.attribute.create({
          data: { categoryId: category.id, name },
        });
      await db.attributeValue.upsert({
        where: {
          attributeId_productId: {
            attributeId: attr.id,
            productId: product.id,
          },
        },
        create: { attributeId: attr.id, productId: product.id, value },
        update: {},
      });
    }
    if (r.type === 'COURSE') {
      const course = await db.course.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          instructor: 'Equipo TiendaMi',
          level: r.attrs.Nivel,
          modules: {
            create: {
              title: 'Tu punto de partida',
              position: 1,
              lessons: {
                create: [
                  {
                    title: 'Bienvenido al curso',
                    position: 1,
                    preview: true,
                    text: 'Este es un curso de demostración. El administrador debe publicar contenido original antes de comercializarlo.',
                  },
                  {
                    title: 'Prepara tu espacio de trabajo',
                    position: 2,
                    text: 'Organiza tus herramientas y objetivos para empezar.',
                  },
                ],
              },
            },
          },
        },
        update: {},
      });
      void course;
    }
    if (r.type === 'DOWNLOAD' && !product.downloadFileId) {
      const { PDFDocument, StandardFonts } = await import('pdf-lib');
      const { mkdir, writeFile } = await import('node:fs/promises');
      const { resolve } = await import('node:path');
      const doc = await PDFDocument.create();
      const page = doc.addPage();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      page.drawText(r.name, { x: 50, y: 750, size: 23, font });
      page.drawText(
        'Recurso de ejemplo de TiendaMi. Sustituir por contenido editorial final.',
        { x: 50, y: 710, size: 11, font },
      );
      const bytes = await doc.save();
      const dir = resolve(process.env.STORAGE_ROOT ?? './storage/private');
      await mkdir(dir, { recursive: true });
      const path = `seed-${r.slug}.pdf`;
      await writeFile(resolve(dir, path), bytes, { mode: 0o600 });
      const file = await db.storedFile.upsert({
        where: { path },
        create: {
          path,
          ownerId: 'system',
          mime: 'application/pdf',
          bytes: bytes.length,
          originalBytes: bytes.length,
        },
        update: {},
      });
      await db.product.update({
        where: { id: product.id },
        data: { downloadFileId: file.id },
      });
    }
  }
  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    if (process.env.SEED_ADMIN_PASSWORD.length < 16)
      throw new Error('Admin password must have at least 16 characters');
    await db.user.upsert({
      where: { email: process.env.SEED_ADMIN_EMAIL.toLowerCase() },
      create: {
        email: process.env.SEED_ADMIN_EMAIL.toLowerCase(),
        name: 'Administración',
        role: 'ADMIN',
        verifiedAt: new Date(),
        passwordHash: await argon2.hash(process.env.SEED_ADMIN_PASSWORD),
      },
      update: {},
    });
    console.info('Admin seed complete.');
  } else
    console.info(
      'No admin created: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to provision one.',
    );
  console.info(
    'Catalog seed complete: 12 example products. Digital codes are not seeded.',
  );
}
main().finally(() => db.$disconnect());
