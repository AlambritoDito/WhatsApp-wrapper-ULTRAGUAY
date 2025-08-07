# Documentación de `@alan/whatsapp-wrapper`

Una **librería modular en TypeScript** que abstrae la [WhatsApp Cloud API de Meta](https://developers.facebook.com/docs/whatsapp/cloud-api), para que puedas:

- Enviar mensajes de texto, botones interactivos, plantillas, imágenes y documentos.  
- Recibir y parsear webhooks de mensajes de texto y botones.  
- Validar la seguridad de tu webhook con firma HMAC–SHA256.  
- Manejar errores de la API de forma tipada y clara.

---

## 📋 Tabla de contenidos

1. [Requisitos](#requisitos)  
2. [Instalación](#instalación)  
3. [Configuración](#configuración)  
4. [Quick Start](#quick-start)  
5. [API Reference](#api-reference)  
   - [`sendText`](#sendtextto-string-message-string)  
   - [`sendInteractive`](#sendinteractiveto-string-body-string-buttons-buttonoption)  
   - [`sendTemplate`](#sendtemplateto-string-templatename-string-templatelanguage-string-components-templatecomponents)  
   - [`sendImage`](#sendimageto-string-imageurl-string-caption-string)  
   - [`sendDocument`](#senddocumentto-string-fileurl-string-filename-string)  
   - [`startWebhookServer`](#startwebhookserverport-number)  
   - [`parseIncoming`](#parseincomingbody-any)  
6. [Ejemplos de uso](#ejemplos-de-uso)  
7. [Configuración del Webhook](#configuración-del-webhook)  
8. [Manejo de errores](#manejo-de-errores)  
9. [Testing](#testing)  
10. [Contribuciones](#contribuciones)  
11. [Licencia](#licencia)  

---

## Requisitos

- Node.js ≥ 16  
- npm o yarn  
- Cuenta en Meta con acceso a la WhatsApp Cloud API  
- Un **Phone Number ID** y **Permanent Token** obtenidos desde tu App de Meta  
- (Opcional en desarrollo) [ngrok](https://ngrok.com/) para exponer tu servidor local  

---

## Instalación

```bash
# Desde npm (o Git URL privado)
npm install @alan/whatsapp-wrapper
```

---

## Configuración

1. Crea un archivo `.env` en la raíz de tu proyecto (copia de `.env.example`):

   ```dotenv
   META_TOKEN=tu_permanent_token
   PHONE_NUMBER_ID=tu_phone_number_id
   WEBHOOK_SECRET=tu_webhook_secret     # usado para validar firma HMAC
   TEST_PHONE=52133XXXXXXXX             # número de prueba en formato internacional
   ```

2. Asegúrate de **NO** subir tu `.env` a Git (añádelo a `.gitignore`).

---

## Quick Start

```ts
import {
  sendText,
  sendInteractive,
  sendTemplate,
  startWebhookServer,
  parseIncoming
} from '@alan/whatsapp-wrapper';

// 1. Arrancar servidor de webhook en el puerto 3000
startWebhookServer(3000);

// 2. Enviar un mensaje de texto
await sendText(process.env.TEST_PHONE!, '¡Hola mundo!');

// 3. Enviar botones interactivos
await sendInteractive(
  process.env.TEST_PHONE!,
  '¿Qué deseas hacer?',
  [
    { id: 'ver_catalogo', title: 'Ver catálogo' },
    { id: 'contacto',    title: 'Contacto' }
  ]
);

// 4. En tu lógica de webhook:
app.post('/webhook', (req, res) => {
  const { from, type, payload } = parseIncoming(req.body);
  // type: 'text' | 'button'
  // payload: texto o id de botón
  if (type === 'button' && payload === 'ver_catalogo') {
    sendText(from, 'Aquí está el catálogo: …');
  }
  res.sendStatus(200);
});
```

---

## API Reference

### `sendText(to: string, message: string): Promise<void>`

Envía un **mensaje de texto** simple.

| Parámetro | Tipo     | Descripción                     |
|-----------|----------|---------------------------------|
| `to`      | `string` | Número destino (formato E.164)  |
| `message` | `string` | Contenido del mensaje           |

---

### `sendInteractive(to: string, body: string, buttons: ButtonOption[]): Promise<void>`

Envía un **mensaje con botones** de tipo “quick reply”.

```ts
interface ButtonOption {
  id: string;    // valor único devuelto en payload
  title: string; // texto visible en el botón
}
```

---

### `sendTemplate(to: string, templateName: string, templateLanguage: string, components?: TemplateComponents[]): Promise<void>`

Envía una **plantilla** preaprobada.

| Parámetro          | Tipo                   | Descripción                       |
|--------------------|------------------------|-----------------------------------|
| `to`               | `string`               | Número destino                    |
| `templateName`     | `string`               | Nombre de la plantilla en Meta    |
| `templateLanguage` | `string`               | Código de idioma (e.g. `en_US`)   |
| `components`       | `TemplateComponents[]` | Parámetros dinámicos (opcional)   |

---

### `sendImage(to: string, imageUrl: string, caption?: string): Promise<void>`

Envía una **imagen** desde una URL pública.

---

### `sendDocument(to: string, fileUrl: string, filename: string): Promise<void>`

Envía un **documento** (PDF, Word, etc.).

---

### `startWebhookServer(port: number): void`

Levanta un servidor Express en el puerto indicado, con rutas:

- `GET /webhook` – verificación de suscripción (usa `WEBHOOK_SECRET`).  
- `POST /webhook` – recepción de eventos, firma HMAC valida y parseo de payload.

---

### `parseIncoming(body: any): { from: string; type: 'text'|'button'; payload: string }`

Convierte el body recibido en un objeto limpio con:

- `from`    – número de WhatsApp del usuario.  
- `type`    – `"text"` o `"button"`.  
- `payload` – contenido del texto o `id` del botón.

---

## Ejemplos de uso

1. **Enviar plantilla proactiva** (fuera de sesión 24 h):

   ```ts
   await sendTemplate(
     process.env.TEST_PHONE!,
     'order_confirmation',
     'es_MX',
     [
       { type: 'body', parameters: [{ type: 'text', text: 'Alan' }] },
       { type: 'button', parameters: [{ type: 'payload', payload: 'CONFIRMAR' }] }
     ]
   );
   ```

2. **Webhook real con ngrok**:

   ```bash
   ngrok http 3000
   ```

   Configura en el panel de Meta tu webhook apuntando a  
   `https://<tu-ngrok-id>.ngrok.io/webhook`.

---

## Configuración del Webhook

- En el **Dashboard de Meta**, App > WhatsApp > Webhooks:  
  - **URL**: `https://tu-dominio.com/webhook`  
  - **Token de verificación**: mismo valor que `WEBHOOK_SECRET`  

---

## Manejo de errores

- Todos los errores de la API lanzan una **`WhatsAppError`** con:
  - `message`: descripción  
  - `statusCode`: código HTTP  
  - `details?`: payload de error de Meta

Ejemplo de captura:

```ts
try {
  await sendText(to, 'hola');
} catch (err) {
  console.error('Error:', err.statusCode, err.details);
}
```

---

## Testing

- **Unit tests** con Jest (`tests/*.test.ts`) cubren:
  - `sendText`, `sendInteractive`, `sendTemplate`  
  - `parseIncoming`  
  - `retryInterceptor`

- Ejecuta:
  ```bash
  npm test
  ```

- **Debug scripts** (`scripts/debugSendText.ts`, `scripts/testSendTemplate.ts`) para pruebas reales.

---

## Contribuciones

1. Haz fork del repo  
2. Crea tu branch: `git checkout -b feature/nombre`  
3. Añade tests si agregas funcionalidad  
4. Envía PR describiendo tu cambio

---

## Licencia

MIT © Alan Pérez Fernández  
