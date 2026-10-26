import { test, expect } from '@playwright/test';
import { db } from '../../lib/server/db';
const fixtureEmails: string[] = [];
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: fixtureEmails } } });
  await db.$disconnect();
});

test('home, filters, variant, bag, persistence and checkout', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'TU PRÓXIMO',
  );
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page.screenshot({ path: '/tmp/tiendami-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Ver todo el catálogo' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: /TODO EL UNIVERSO/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Perfumes', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page
    .getByRole('link', { name: 'Atelier No. 07 · Eau de parfum', exact: true })
    .click();
  await page.getByRole('button', { name: 'Decant 10 ml', exact: true }).click();
  await expect(page.locator('.detail-price')).toContainText('79');
  await page.getByRole('button', { name: 'Lo quiero en mi carrito' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Decant 10 ml');
  await page
    .getByRole('button', { name: 'Cerrar carrito', exact: true })
    .click();
  await page.reload();
  await page.getByRole('button', { name: /Abrir carrito/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Decant 10 ml');
  await page.getByRole('link', { name: 'Continuar con mi pedido' }).click();
  await expect(
    page.getByRole('heading', { name: /HAGÁMOSLO TUYO/ }),
  ).toBeVisible();
  await expect(page.getByText('Total en Bs', { exact: true })).toBeVisible();
  await expect(page.locator('.order-summary .cart-total strong')).toContainText(
    '79',
  );
});
test('mobile navigation, search and no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page.screenshot({ path: '/tmp/tiendami-mobile.png', fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Abrir navegación' }).click();
  await expect(
    page.getByRole('link', { name: 'Servicios web', exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Buscar en el catálogo' })
    .fill('mouse');
  await page
    .getByRole('textbox', { name: 'Buscar en el catálogo' })
    .press('Enter');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: 'Mouse inalámbrico G305', exact: true }),
  ).toBeVisible();
  const navigation = page.getByRole('navigation', {
    name: 'Navegación principal',
  });
  await navigation.getByRole('link', { name: 'Perfumes', exact: true }).click();
  await expect(
    page.getByRole('link', {
      name: 'Atelier No. 07 · Eau de parfum',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await navigation
    .getByRole('link', { name: 'Códigos digitales', exact: true })
    .click();
  await expect(page.locator('.product-card')).toHaveCount(2);
});
test('account creates session and logs out, server enforces role', async ({
  page,
}) => {
  await page.goto('/cuenta');
  await page.getByRole('button', { name: 'Solo esenciales' }).click();
  await page.getByRole('button', { name: 'Soy nuevo por aquí' }).click();
  const email = `browser-${Date.now()}@example.invalid`;
  fixtureEmails.push(email);
  await page.getByLabel('Tu nombre', { exact: true }).fill('Persona de prueba');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill('Example-test-password-2026');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(
    page.getByRole('heading', { name: /HOLA, PERSONA/ }),
  ).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'tm_session')?.httpOnly).toBe(true);
  await page.goto('/admin');
  await expect(page).toHaveURL(/cuenta/);
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /QUÉ BUENO VERTE/ }),
  ).toBeVisible();
});
