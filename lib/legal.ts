export const legal: Record<
  string,
  { title: string; sections: { title: string; text: string }[] }
> = {
  terminos: {
    title: 'Términos y condiciones',
    sections: [
      {
        title: 'Antes de publicar esta tienda',
        text: 'Este documento es un borrador operativo para revisión del titular. Completa la razón social, NIT cuando corresponda, domicilio, canales de contacto, cobertura y condiciones comerciales. No reemplaza asesoría legal ni las obligaciones aplicables de protección al consumidor en Bolivia.',
      },
      {
        title: 'Compras y confirmación de pago',
        text: 'Los precios se expresan en bolivianos. La visualización en USD es referencial según el tipo de cambio configurado. El total válido se calcula en el servidor al crear el pedido. El pedido reserva existencias por 2 horas; la entrega o acceso depende de la confirmación manual del abono y la revisión de seguridad.',
      },
      {
        title: 'Productos con distintas formas de entrega',
        text: 'Un pedido puede combinar productos físicos, códigos digitales, cursos, servicios y archivos. Cada artículo tiene su propio estado de cumplimiento. Consulta las políticas específicas de tu producto antes de comprar.',
      },
      {
        title: 'Uso de la cuenta',
        text: 'Protege tu contraseña y no compartas sesiones, códigos ni enlaces privados. Nunca solicitamos las credenciales de tus juegos o cuentas de terceros. Puedes cerrar todas tus sesiones desde Mi cuenta.',
      },
      {
        title: 'Atención y reclamos',
        text: 'Puedes abrir un ticket desde tu cuenta y relacionarlo con un pedido. La tienda debe completar sus horarios, datos de contacto y procedimientos de reclamo antes de comenzar a operar.',
      },
    ],
  },
  privacidad: {
    title: 'Política de privacidad',
    sections: [
      {
        title: 'Responsable y finalidad',
        text: 'El titular de la tienda debe completar su identidad y contacto antes de publicar. Usamos los datos de cuenta, contacto, pedidos y soporte para procesar compras, entregar productos y atender consultas. No vendemos datos personales.',
      },
      {
        title: 'Datos necesarios',
        text: 'Guardamos contraseñas mediante hash Argon2, sesiones mediante tokens con hash y códigos digitales cifrados. Los comprobantes y archivos privados se almacenan fuera del directorio público. Nunca pedimos contraseñas de cuentas de juegos ni datos completos de tarjetas bancarias.',
      },
      {
        title: 'Seguridad y antifraude',
        text: 'Registramos acciones administrativas, entregas y revelados de códigos. Los controles de riesgo ayudan a revisar pedidos que necesitan confirmación adicional. Una revisión manual puede retrasar la entrega.',
      },
      {
        title: 'Tus derechos',
        text: 'Solicita acceso, corrección, exportación o eliminación mediante un ticket de soporte. Ciertas obligaciones comerciales o legales pueden exigir conservar registros mínimos; el titular debe establecer los plazos y el proceso antes de operar.',
      },
      {
        title: 'Analítica opcional',
        text: 'Las cookies no esenciales requieren consentimiento. Esta versión no carga servicios de analítica externos. Si se habilita Umami, debe respetarse la selección de cookies y la configuración de seguridad.',
      },
    ],
  },
  cookies: {
    title: 'Política de cookies',
    sections: [
      {
        title: 'Esenciales',
        text: 'La cookie httpOnly tm_session mantiene tu sesión durante un máximo de 7 días. Usa SameSite=Lax y Secure bajo HTTPS. El carrito, favoritos, tema y preferencias de cookies se guardan en el almacenamiento local de tu navegador.',
      },
      {
        title: 'Opcionales',
        text: 'No se instalan cookies de analítica en esta versión. Puedes cambiar tus preferencias desde Configurar cookies en el pie de página. Rechazar cookies no esenciales no impide comprar.',
      },
    ],
  },
  envios: {
    title: 'Envíos y devoluciones',
    sections: [
      {
        title: 'Modalidades',
        text: 'Puedes elegir recojo sin costo, delivery local o envío por flota/encomienda. La cobertura local y los plazos se coordinan con la tienda. Las tarifas configuradas aparecen al crear tu pedido. La dirección solo se solicita si hay productos físicos con envío.',
      },
      {
        title: 'Seguimiento y garantía',
        text: 'Una vez preparado el pedido, la tienda registra el transportista o la guía. Conserva el recibo y el número de serie cuando corresponda. Las condiciones de garantía de cada periférico se indican en su ficha.',
      },
      {
        title: 'Devoluciones',
        text: 'Contacta a soporte con el número de pedido y evidencia del problema. El titular debe establecer plazos, responsabilidades y condiciones compatibles con la normativa boliviana antes de operar. Los artículos digitales tienen una política específica.',
      },
    ],
  },
  digitales: {
    title: 'Política de productos digitales',
    sections: [
      {
        title: 'Qué vendemos',
        text: 'Vendemos códigos y tarjetas de regalo, no cuentas compartidas ni acceso a cuentas ajenas. Revisa la plataforma, la región, el valor y los requisitos de canje en la ficha del producto.',
      },
      {
        title: 'Entrega',
        text: 'Cada código se asigna de forma exclusiva a un artículo del pedido. La entrega ocurre al confirmar el pago y aprobar los controles de riesgo. Necesitas una cuenta con correo verificado para acceder a Mis compras. El aviso de compra no incluye el código en texto plano.',
      },
      {
        title: 'Revelado y reclamos',
        text: 'Revelar un código queda registrado por seguridad. Una vez revelado, no admite reembolso salvo que la tienda compruebe un defecto o incumplimiento. Abre un ticket si el código no funciona y conserva la evidencia, sin compartir públicamente el código.',
      },
    ],
  },
  servicios: {
    title: 'Política de servicios y cursos',
    sections: [
      {
        title: 'Servicios web',
        text: 'El alcance y el plazo se describen en el paquete contratado. Hosting, dominio y ampliaciones se cotizan por separado salvo indicación expresa. El proyecto se crea al confirmar el pago. Comparte tu brief y sigue las etapas desde Mis proyectos.',
      },
      {
        title: 'Pagos y entregables',
        text: 'Esta versión procesa el importe total del paquete. Los pagos parciales por hitos y la aceptación de cotizaciones requieren habilitación adicional antes de ofrecerse. No anuncies anticipos automáticos hasta completar esa integración.',
      },
      {
        title: 'Cursos',
        text: 'El acceso se habilita al confirmar el pago. Las lecciones y los archivos dependen del curso contratado. El progreso se guarda en tu cuenta y el certificado se habilita al completar todas las lecciones. El certificado acredita finalización, no una titulación oficial.',
      },
      {
        title: 'Contenido protegido',
        text: 'Los contenidos privados requieren autenticación. El cifrado de video, los enlaces con vencimiento y la marca de agua reducen la exposición; no impiden la grabación de pantalla. No compartas tu sesión ni redistribuyas el material.',
      },
    ],
  },
};
