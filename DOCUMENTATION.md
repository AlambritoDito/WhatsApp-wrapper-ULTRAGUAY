# Documentation for `@alan/whatsapp-wrapper`

A **modular TypeScript library** that abstracts Meta's [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) so you can:

- Send text messages, interactive buttons, templates, images and documents.
- Receive and parse webhooks for text and button messages.
- Validate webhook security with HMAC–SHA256 signatures.
- Handle API errors in a typed and clear way.

---

## 📋 Table of Contents

1. [Requirements](#requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Quick Start](#quick-start)
5. [API Reference](#api-reference)
   - [`sendText`](#sendtextto-string-message-string)
   - [`sendInteractive`](#sendinteractiveto-string-body-string-buttons-buttonoption)
   - [`sendTemplate`](#sendtemplateto-string-templatename-string-templatelanguage-string-components-templatecomponents)
   - [`sendImage`](#sendimageto-string-imageurl-string-caption-string)
   - [`sendDocument`](#senddocumentto-string-fileurl-string-filename-string)
   - [`startWebhookServer`](#startwebhookserverport-number)
   - [`parseIncoming`](#parseincomingbody-any)
6. [Usage Examples](#usage-examples)
7. [Webhook Configuration](#webhook-configuration)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Contributions](#contributions)
11. [License](#license)

---

## Requirements

- Node.js ≥ 16
- npm or yarn
- Meta account with access to the WhatsApp Cloud API
- A **Phone Number ID** and **Permanent Token** obtained from your Meta App
- (Optional for development) [ngrok](https://ngrok.com/) to expose your local server

---

## Installation

```bash
# From npm (or private Git URL)
npm install @alan/whatsapp-wrapper
```

---

## Configuration

1. Create a `.env` file at the root of your project (copy from `.env.example`):

   ```dotenv
   META_TOKEN=your_permanent_token
   PHONE_NUMBER_ID=your_phone_number_id
   WEBHOOK_SECRET=your_webhook_secret     # used to validate HMAC signature
   TEST_PHONE=52133XXXXXXXX               # test number in international format
   ```

2. Make sure **NOT** to commit your `.env` to Git (add it to `.gitignore`).

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

// 1. Start a webhook server on port 3000
startWebhookServer(3000);

// 2. Send a text message
await sendText(process.env.TEST_PHONE!, 'Hello world!');

// 3. Send interactive buttons
await sendInteractive(
  process.env.TEST_PHONE!,
  'What would you like to do?',
  [
    { id: 'view_catalog', title: 'View catalog' },
    { id: 'contact',    title: 'Contact' }
  ]
);

// 4. In your webhook logic:
app.post('/webhook', (req, res) => {
  const { from, type, payload } = parseIncoming(req.body);
  // type: 'text' | 'button'
  // payload: text or button id
  if (type === 'button' && payload === 'view_catalog') {
    sendText(from, 'Here is the catalog: …');
  }
  res.sendStatus(200);
});
```

---

## API Reference

### `sendText(to: string, message: string): Promise<void>`

Sends a simple **text message**.

| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | `string` | Destination number (E.164 format) |
| `message` | `string` | Message content |

---

### `sendInteractive(to: string, body: string, buttons: ButtonOption[]): Promise<void>`

Sends a message with interactive buttons.

| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | `string` | Destination number (E.164 format) |
| `body` | `string` | Text displayed above the buttons |
| `buttons` | `ButtonOption[]` | Array of buttons `{ id: string; title: string }` |

---

### `sendTemplate(to: string, templateName: string, templateLanguage: string, components?: TemplateComponents[]): Promise<void>`

Sends a pre-approved **template**.

| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | `string` | Destination number |
| `templateName` | `string` | Template name in Meta |
| `templateLanguage` | `string` | Language code (e.g. `en_US`) |
| `components` | `TemplateComponents[]` | Dynamic parameters (optional) |

---

### `sendImage(to: string, imageUrl: string, caption?: string): Promise<void>`

Sends an **image** from a public URL.

---

### `sendDocument(to: string, fileUrl: string, filename: string): Promise<void>`

Sends a **document** (PDF, Word, etc.).

---

### `startWebhookServer(port: number): void`

Starts an Express server on the specified port with routes:

- `GET /webhook` – subscription verification (uses `WEBHOOK_SECRET`).
- `POST /webhook` – receives events, validates HMAC signature and parses the payload.

---

### `parseIncoming(body: any): { from: string; type: 'text'|'button'; payload: string }`

Converts the received body into a clean object with:

- `from` – user's WhatsApp number.
- `type` – `"text"` or `"button"`.
- `payload` – text content or button `id`.

---

## Usage Examples

1. **Send proactive template** (outside 24‑hour session):

   ```ts
   await sendTemplate(
     process.env.TEST_PHONE!,
     'order_confirmation',
     'es_MX',
     [
       { type: 'body', parameters: [{ type: 'text', text: 'Alan' }] },
       { type: 'button', parameters: [{ type: 'payload', payload: 'CONFIRM' }] }
     ]
   );
   ```

2. **Real webhook with ngrok**:

   ```bash
   ngrok http 3000
   ```

   Configure in Meta's dashboard your webhook pointing to
   `https://<your-ngrok-id>.ngrok.io/webhook`.

---

## Webhook Configuration

- In the **Meta Dashboard**, App > WhatsApp > Webhooks:
  - **URL**: `https://your-domain.com/webhook`
  - **Verification Token**: same value as `WEBHOOK_SECRET`

---

## Error Handling

- All API errors throw a **`WhatsAppError`** with:
  - `message`: description
  - `statusCode`: HTTP status code
  - `details?`: Meta's error payload

Example catch:

```ts
try {
  await sendText(to, 'hello');
} catch (err) {
  console.error('Error:', err.statusCode, err.details);
}
```

---

## Testing

- **Unit tests** with Jest (`tests/*.test.ts`) cover:
  - `sendText`, `sendInteractive`, `sendTemplate`
  - `parseIncoming`
  - `retryInterceptor`

- Run:
  ```bash
  npm test
  ```

- **Debug scripts** (`scripts/debugSendText.ts`, `scripts/quickStart.ts`) for real tests.

---

## Contributions

1. Fork the repo
2. Create your branch: `git checkout -b feature/name`
3. Add tests if you add functionality
4. Submit a PR describing your change

---

## License

MIT © Alan Pérez Fernández

