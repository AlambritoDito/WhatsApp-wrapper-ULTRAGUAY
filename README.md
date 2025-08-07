# whatsapp-wrapper

**Modular TypeScript wrapper para la WhatsApp Cloud API de Meta**

Este proyecto te proporciona un conjunto de herramientas tipadas y reutilizables para:

- **Enviar mensajes** (texto, botones, plantillas, imágenes, documentos).
- **Recibir** y **parsear** eventos de webhook (mensajes de texto y botones).
- **Verificar seguridad** de tu webhook con firma HMAC.
- **Manejar errores** específicos de la API de WhatsApp de forma clara y consistente.

---

## 📦 Características principales

- ✅ **sendText(to, message)**  
  Envía un mensaje de texto simple.

- ✅ **sendInteractive(to, body, buttons)**  
  Envía un mensaje con botones “quick reply” interactivos.

- ✅ **sendTemplate(to, name, lang, components?)**  
  Envía plantillas preaprobadas (templates).

- ✅ **sendImage(to, imageUrl, caption?)**  
  Envía una imagen desde una URL pública.

- ✅ **sendDocument(to, fileUrl, filename)**  
  Envía documentos (PDF, Word, etc.).

- 🔁 **startWebhookServer(port)**  
  Monta un servidor Express que:
  - Verifica el token de suscripción en GET `/webhook`.
  - Verifica la firma HMAC-256 en POST `/webhook`.
  - Parsea automáticamente el cuerpo y emite el mensaje limpio.

- 🧩 **parseIncoming(body)**  
  Normaliza el payload del webhook y devuelve:
  ```ts
  { from: string; type: 'text' | 'button'; payload: string }
  ```

- 🔐 **verifySignature(req, res, next)**  
  Middleware Express para validar `X-Hub-Signature-256`.

- 🔧 **formatPhone(phone: string)**  
  Limpia y convierte un número a formato internacional (solo dígitos).

- 📋 **WhatsAppError**  
  Clase de error personalizada que encapsula `statusCode` y detalles.

---

## 🚀 Instalación

1. Clona el repositorio:
   ```bash
   git clone git@github.com:AlambritoDito/WhatsApp-wrapper-ULTRAGUAY.git
   cd WhatsApp-wrapper-ULTRAGUAY
   ```

2. Instala dependencias:
   ```bash
   npm install
   ```

3. Copia y edita el archivo de ejemplo:
   ```bash
   cp .env.example .env
   # Rellena META_TOKEN, PHONE_NUMBER_ID, WEBHOOK_SECRET y TEST_PHONE...
   ```

4. Para ejecutar un archivo de ejemplo en TypeScript (ver sección siguiente):
   ```bash
   npx ts-node demo.ts
   ```

5. Para compilar a JavaScript:
   ```bash
   npm run build
   ```

6. Para ejecutar tests:
   ```bash
   npm test
   ```

7. En la carpeta `scripts/` encontrarás utilidades para enviar mensajes de prueba.
   Estos scripts usan la variable `TEST_PHONE` de tu `.env` para determinar el
   destinatario. Mantener el número de prueba en una variable de entorno evita
   compartirlo o subirlo por error al repositorio, una buena práctica para
   futuros tests y scripts de validación del wrapper.

---

## ▶️ Ejecutar un ejemplo

1. Crea un archivo `demo.ts` en la raíz del repositorio:

```ts
import { sendText, startWebhookServer } from './src';

async function main() {
  await sendText('5213312345678', 'Hola desde el wrapper');
  startWebhookServer(3000);
}

main();
```

2. Ejecuta el script anterior con:

```bash
npx ts-node demo.ts
```

Esto enviará un mensaje al número indicado y levantará un servidor de webhook en el puerto `3000`. Asegúrate de haber configurado previamente tu archivo `.env`.

---

## ⚙️ Configuración

En `.env` debes definir:

```bash
META_TOKEN=tu_permanent_token
PHONE_NUMBER_ID=tu_phone_number_id
WEBHOOK_SECRET=tu_webhook_verify_token
TEST_PHONE=5213300000000
```

- **META_TOKEN**: tu token permanente de la WhatsApp Cloud API.
- **PHONE_NUMBER_ID**: el ID del número de WhatsApp configurado en Meta.
- **WEBHOOK_SECRET**: el mismo valor que registraste al configurar tu webhook en Meta.
- **TEST_PHONE**: número de WhatsApp de pruebas utilizado por los scripts de la
  carpeta `scripts/`. Definirlo como variable de entorno evita exponerlo
  accidentalmente en el repositorio.

### Generar el `WEBHOOK_SECRET`

Para generar un `WEBHOOK_SECRET` seguro utilizando Node.js, puedes ejecutar el siguiente comando en tu terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Esto te devolverá una cadena hexadecimal de 64 caracteres (256 bits), por ejemplo:

`3f1a8e4c9d2b7f6e5a4c3b2d1f0e9a8c7b6d5e4f3a2b1c0d...`

Copia esa cadena y pégala en tu archivo `.env` como valor de `WEBHOOK_SECRET`:

```bash
WEBHOOK_SECRET=3f1a8e4c9d2b7f6e5a4c3b2d1f0e9a8c7b6d5e4f3a2b1c0d
```

---

## 📖 Ejemplos de uso

### 1. Enviar un mensaje de texto

```ts
import { sendText } from '@alan/whatsapp-wrapper';

await sendText('5213312345678', '¡Hola desde mi wrapper!');
```

### 2. Enviar botones interactivos

```ts
import { sendInteractive } from '@alan/whatsapp-wrapper';

await sendInteractive(
  '5213312345678',
  '¿Qué deseas hacer?',
  [
    { id: 'ver_habitaciones', title: 'Ver habitaciones' },
    { id: 'agendar_visita', title: 'Agendar visita' },
  ]
);
```

### 3. Montar el servidor de webhook

```ts
import { startWebhookServer } from '@alan/whatsapp-wrapper';

startWebhookServer(3000);
// GET /webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// POST /webhook con JSON de Meta
```

### 4. Procesar mensajes entrantes

```ts
import express from 'express';
import { startWebhookServer, parseIncoming } from '@alan/whatsapp-wrapper';

const app = express();
startWebhookServer(3000);

app.post('/webhook', (req, res) => {
  const { from, type, payload } = parseIncoming(req.body);
  if (type === 'button') {
    // payload == id del botón
  } else {
    // payload == texto libre
  }
  res.sendStatus(200);
});
```

---

## 🛠️ Estructura de carpetas

```
whatsapp-wrapper/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── config/         # Carga de variables y URLs base
│   ├── http/           # Cliente Axios y retry interceptor
│   ├── types/          # Interfaces y tipos TS
│   ├── send/           # Funciones para enviar mensajes
│   ├── receive/        # Webhook server y parser de payloads
│   ├── utils/          # Formateo, firma, logger
│   └── errors/         # Clases de error personalizadas
└── tests/              # Unit tests con Jest
```

---

## 📈 Cómo integrarlo en tus proyectos

1. Publica en un registry privado o usa la URL de Git:
   ```bash
   npm install git+ssh://git@github.com:AlambritoDito/WhatsApp-wrapper-ULTRAGUAY.git
   ```

2. En tu código:
   ```ts
   import {
     sendText,
     sendInteractive,
     startWebhookServer,
     parseIncoming
   } from '@alan/whatsapp-wrapper';
   ```

3. ¡Listo! Tienes una capa de abstracción ligera y robusta sobre la API de WhatsApp.

---

## 🤝 Contribuciones

¡Bienvenidas! Si quieres mejorar el wrapper:

1. Haz un fork y crea tu rama feature: `git checkout -b feature/nueva-funcion`
2. Asegúrate de añadir tests.
3. Envía tu pull request.

