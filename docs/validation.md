# Validación de la sesión

Fecha: 26 de octubre de 2026. Máquina de desarrollo aislada. Node 24.19.0, Next.js 16.4.3, Prisma 6.19.3 y MySQL 8 en Docker. No se ejecutó un despliegue en el servidor del propietario.

## Resultados

| Comprobación                                                | Resultado                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| Instalación reproducible con npm ci                         | Correcta; conserva .env y claves existentes                |
| Migraciones desde una base vacía                            | Las tres migraciones aplicadas correctamente               |
| Seed en base nueva, repetido dos veces                      | Correcto; 12 productos de ejemplo, sin códigos comerciales |
| Comparación schema / base de desarrollo                     | Sin diferencias                                            |
| ESLint                                                      | Sin errores ni advertencias                                |
| TypeScript                                                  | Correcto                                                   |
| Arranque de desarrollo Next 16 y recorrido catálogo/carrito | Correcto; una prueba de navegador adicional aprobada       |
| Build optimizado                                            | Correcto                                                   |
| Pruebas unitarias e integración con servidor real           | 22 aprobadas, 0 omitidas en esta ejecución                 |
| Playwright en Chromium                                      | 4 aprobadas                                                |
| Axe: portada en 1440, 390 y 320 px, temas claro y oscuro    | 0 infracciones A/AA detectadas                             |
| Lighthouse móvil: rendimiento                               | 94/100                                                     |
| Lighthouse móvil: accesibilidad                             | 100/100                                                    |
| Lighthouse móvil: buenas prácticas                          | 100/100                                                    |
| Lighthouse móvil: SEO                                       | 100/100                                                    |
| npm audit de dependencias de producción                     | 0 vulnerabilidades de producción                           |

El informe Lighthouse está en `docs/reports/lighthouse-mobile.json`. Es una medición de laboratorio de la portada local, con Chromium y la simulación móvil predeterminada. No representa datos de usuarios reales ni garantiza esos resultados en todas las rutas o en el servidor final. La medición final corresponde a Next.js 16.4.3, después de corregir contraste y el nombre accesible de la cuenta en móvil.

## Qué prueban las 22 pruebas

- Precios enteros en centavos, carritos mixtos, envío adaptativo, cupones y tipo de cambio.
- Reglas de riesgo y retención de pedidos digitales.
- AES-256-GCM, integridad de cifrado, nonces aleatorios, versiones de clave y firmas con vencimiento.
- Importación CSV con formatos inválidos y duplicados.
- Seis checkouts concurrentes sobre un código: exactamente una asignación exitosa.
- Dos checkouts concurrentes sobre una unidad física: sin sobreventa.
- Confirmación de pago idempotente y cinco estrategias de cumplimiento.
- Expiración y reposición de stock sin duplicación; un pedido pagado en revisión conserva la reserva y admite aprobación posterior al plazo de pago.
- Enrolamiento TOTP, restricción de ADMIN en panel, proyectos, archivos y soporte, recuperación de un solo uso y rechazo de reutilización de TOTP.
- Guardar ajustes conserva el QR bancario y otros campos no editados.
- Peticiones HTTP reales que rechazan IDOR, acceso de CUSTOMER a administración y orígenes CSRF ajenos.
- Comprobantes privados: imagen real optimizada a WebP y 1600 px, metadatos eliminados, rechazo de SVG disfrazado y acceso denegado a otro comprador.
- ffmpeg prepara un video sintético de 2 segundos como HLS cifrado; se descifra localmente y se verifican acceso autenticado, clave firmada, sesión de reproducción obligatoria, límite de dos sesiones, renovación, progreso y certificado PDF.

## Qué prueban los cuatro recorridos de navegador

1. Portada sin infracciones Axe detectadas en tres tamaños y dos temas.
2. Catálogo, filtro de perfumes, variante de 10 ml, carrito, persistencia tras recargar y total calculado por API.
3. Navegación y búsqueda en móvil, sin desbordamiento horizontal.
4. Registro, sesión httpOnly, bloqueo de administración para cliente y cierre de sesión.

Las capturas en `docs/screenshots/` muestran el catálogo de ejemplo sin datos de clientes. Las pruebas de navegador borran las cuentas sintéticas que crean.

## Límites de esta evidencia

- No se configuraron SMTP real, QR bancario comercial, datos bancarios, dominio ni túnel del propietario.
- No se validaron entregabilidad de correo, pago bancario real, restauración de backups, video prolongado, Safari, lectores de pantalla o tráfico comercial.
- Axe no reemplaza una auditoría manual de accesibilidad.
- El workflow CI se escribió; no se afirma que GitHub Actions lo haya ejecutado. Sin TEST_BASE_URL se omiten explícitamente las pruebas que requieren HTTP; sin ffmpeg también se omite la de video.
- El propietario autorizó sustituir Next 14 por Next 16.4.3. Se migraron React 19, las APIs asíncronas y la configuración de lint; la auditoría de producción quedó en 0 vulnerabilidades. La aplicación sigue en loopback; no se publicó un túnel.
- Esta es una primera implementación funcional. Los módulos pendientes y la configuración comercial necesaria están detallados en README.md.
- Se guardaron install_script y start_skill en el borrador del entorno. Esto no publica un snapshot ni despliega la aplicación.
