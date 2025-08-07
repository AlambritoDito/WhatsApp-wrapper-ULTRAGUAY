import dotenv from 'dotenv';
dotenv.config();

import {
  sendText,
  sendInteractive,
  startWebhookServer,
  parseIncoming
} from '../src/index';

// 1. Arrancar servidor de webhook en el puerto 3000
startWebhookServer(3000);
console.log('Webhook server started on port 3000');

// 2. Enviar un mensaje de texto de prueba
(async () => {
  try {
    const to = process.env.TEST_PHONE!;
    console.log('Enviando mensaje de texto a:', to);
    await sendText(to, '¡Hola mundo desde Quick Start!');

    // 3. Enviar botones interactivos de prueba
    console.log('Enviando mensaje interactivo a:', to);
    await sendInteractive(
      to,
      '¿Qué deseas hacer?',
      [
        { id: 'ver_catalogo', title: 'Ver catálogo' },
        { id: 'contacto',    title: 'Contacto' }
      ]
    );
    console.log('Mensajes enviados con éxito');
  } catch (err: any) {
    console.error('Error en Quick Start script:', err.response?.data ?? err.message);
  }
})();
