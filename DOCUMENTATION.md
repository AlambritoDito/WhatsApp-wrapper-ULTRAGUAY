# Documentation for `@alan/whatsapp-wrapper`

A **modular TypeScript library** that abstracts Meta's [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) so you can:

- Send text messages, interactive buttons, templates, images, documents, and **location** pins.
- Receive and parse webhooks for **text**, **button replies**, and **location**.
- Validate webhook security with HMAC–SHA256 signatures (using **APP_SECRET**).
- Handle API errors in a typed and clear way.

---

## 📋 Table of Contents

1. [Requirements](#requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Quick Start (2 terminals)](#quick-start-2-terminals)
5. [API Reference](#api-reference)
   - [`sendText`](#sendtextto-string-message-string)
   - [`sendInteractive`](#sendinteractiveto-string-body-string-buttons-buttonoption)
   - [`sendTemplate`](#sendtemplateto-string-templatename-string-templatelanguage-string-components-templatecomponents)
   - [`sendImage`](#sendimageto-string-imageurl-string-caption-string)
   - [`sendDocument`](#senddocumentto-string-fileurl-string-filename-string)
   - [`sendLocationRequest`](#sendlocationrequestto-string-bodytext-string)
   - [`sendLocation`](#sendlocationto-string-latitude-number-longitude-number-name-string-address-string)
   - [`startWebhookServer`](#startwebhookserverport-number-onmessage-msg-incoming--promisevoid--void-opts--allowunsignedtests-boolean)
   - [`parseIncoming`](#parseincomingbody-any--incoming)
6. [Examples](#examples)
7. [Webhook & Security](#webhook--security)
8. [Troubleshooting](#troubleshooting)
9. [Folder Structure](#folder-structure)
10. [License](#license)

---

## Requirements

- Node.js ≥ 16
- Meta developer app with **WhatsApp Cloud API** enabled
- **Phone Number ID**, **Permanent Token**, and your app’s **APP_SECRET**
- (Dev) A tunneling tool (we use **Localtunnel**) to expose your localhost

---

## Installation

```bash
npm install
```

*(Project is TypeScript-first. Use `npm run build` to compile to JS if needed.)*

---

## Configuration

Create a `.env` at the repo root (copy from `.env.example`) and fill in:

```dotenv
META_TOKEN=your_permanent_token
PHONE_NUMBER_ID=your_phone_number_id
APP_SECRET=your_app_secret               # HMAC key for POST signature verification
WEBHOOK_SECRET=your_webhook_verify_token # used only for GET subscription handshake
TEST_PHONE=5213300000000                 # your test number (E.164)

# Development-only (optional)
# ALLOW_UNSIGNED_TESTS=true  # allow Meta UI "Test" events that might not include a signature
# DISABLE_SIGNATURE=true     # disable signature verification entirely (debug ONLY)
```

> **Important**
> - **APP_SECRET** (Meta → *Settings → Basic*) is used to validate `X-Hub-Signature-256` for **POST** `/webhook`.
> - **WEBHOOK_SECRET** is only the verify token used during the **GET** subscription.

---

## Quick Start (2 terminals)

### Terminal 1 — Public tunnel
Use **Localtunnel** (free) to expose your local server:

```bash
npx localtunnel --port 3000 --subdomain my-whatsapp-bot
# → https://my-whatsapp-bot.loca.lt
```

In Meta’s dashboard, set **Callback URL** to `https://my-whatsapp-bot.loca.lt/webhook` and **Verify Token** to your `WEBHOOK_SECRET`. Subscribe to the **messages** field.

### Terminal 2 — Start server and send test messages

```bash
npx ts-node scripts/quickStart.ts
```

This starts the webhook server on port **3000**, sends a text and an interactive message to `TEST_PHONE`, and logs inbound events. When you tap a button in WhatsApp, you should see the webhook body in this terminal and get an automatic reply.

> Tip: To make the Meta UI **Test** button reach your server even if the event is unsigned, set `ALLOW_UNSIGNED_TESTS=true` temporarily.

---

## API Reference

### `sendText(to: string, message: string): Promise<void>`
Sends a plain text message.

### `sendInteractive(to: string, body: string, buttons: ButtonOption[]): Promise<void>`
Sends a quick‑reply interactive message.

```ts
interface ButtonOption { id: string; title: string }
```

### `sendTemplate(to: string, templateName: string, templateLanguage: string, components?: TemplateComponents[]): Promise<void>`
Sends a pre‑approved template message.

### `sendImage(to: string, imageUrl: string, caption?: string): Promise<void>`
Sends an image by URL.

### `sendDocument(to: string, fileUrl: string, filename: string): Promise<void>`
Sends a document (PDF, Word, etc.).

### `sendLocationRequest(to: string, bodyText: string): Promise<void>`
Sends an **interactive location request**. The user sees a native **Send location** button; upon sharing, you receive a `location` message via webhook.

### `sendLocation(to: string, latitude: number, longitude: number, name?: string, address?: string): Promise<void>`
Sends a **location pin** to the user.

### `startWebhookServer(
  port: number,
  onMessage?: (msg: Incoming) => Promise<void> | void,
  opts?: { allowUnsignedTests?: boolean }
): void`
Starts an Express server, verifies signatures by default, and invokes `onMessage` for each inbound event.

### `parseIncoming(body: any): Incoming`
Normalizes the WhatsApp payload.

```ts
export type Incoming =
  | { from: string; type: 'text';     payload: string }
  | { from: string; type: 'button';   payload: string }
  | { from: string; type: 'location'; payload: {
      latitude: number; longitude: number; name?: string; address?: string; url?: string;
    }};
```

Supports `interactive.button_reply`, `interactive.list_reply`, **`location`**, and free text.

---

## Examples

### Ask for the user’s location and handle the reply

```ts
import { startWebhookServer } from '@alan/whatsapp-wrapper';
import { sendText } from '@alan/whatsapp-wrapper';
import { sendInteractive } from '@alan/whatsapp-wrapper';
import { sendLocationRequest } from '@alan/whatsapp-wrapper';

startWebhookServer(3000, async ({ from, type, payload }) => {
  if (type === 'button' && payload === 'request_location') {
    await sendLocationRequest(from, 'Please share your location 📍');
  }
  if (type === 'location') {
    const { latitude, longitude, name, address } = payload;
    await sendText(from, `✅ Location received:\nlat: ${latitude}\nlng: ${longitude}\n${name ?? ''}\n${address ?? ''}`);
  }
});

// somewhere in your flow
await sendInteractive(process.env.TEST_PHONE!, 'What would you like to do?', [
  { id: 'request_location', title: 'Share my location' },
]);
```

### Send a location pin to the user

```ts
import { sendLocation } from '@alan/whatsapp-wrapper';
await sendLocation(process.env.TEST_PHONE!, 20.6736, -103.344, 'Our office', 'GDL, MX');
```

---

## Webhook & Security

- **GET** `/webhook` → verifies **WEBHOOK_SECRET** via `hub.verify_token`.
- **POST** `/webhook` → verifies **APP_SECRET** HMAC against `X-Hub-Signature-256` using the **raw** request body.
- For debugging Meta’s **Test** button (which may be unsigned), pass `{ allowUnsignedTests: true }` to `startWebhookServer` or set `ALLOW_UNSIGNED_TESTS=true`.

---

## Troubleshooting

- **No logs when tapping buttons**
  - Ensure the tunnel URL is exactly `https://<subdomain>.loca.lt/webhook` in Meta.
  - Confirm subscription to **messages**.
  - Check that `APP_SECRET` is set and matches your app.
  - Temporarily set `ALLOW_UNSIGNED_TESTS=true` for the Meta UI **Test** button.

- **EADDRINUSE / port already in use**
  - Only one server should listen on `:3000`. Kill old processes or run `npx kill-port 3000`.

- **200 OK but message doesn’t arrive**
  - Free‑text messages require an open 24h session. Use a **template** outside the session.

- **Location doesn’t show**
  - Share location from **mobile** WhatsApp (not WhatsApp Web) when testing.

- **Validate connectivity**
  - `GET /health` locally and via your tunnel.

---

## Folder Structure

```
whatsApp-wrapper/
├── README.md
├── DOCUMENTATION.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── config/       # env & constants
│   ├── http/         # Axios client & retry interceptor
│   ├── types/        # TypeScript types
│   ├── send/         # sendText, sendInteractive, sendTemplate, sendLocation, sendLocationRequest
│   ├── receive/      # webhookServer, parseIncoming (text/button/location)
│   ├── utils/        # verifySignature (APP_SECRET), formatPhone, logger
│   └── errors/       # WhatsAppError
├── scripts/          # quickStart, server debug, tryShareLocation
└── tests/            # Jest unit tests
```

---

## License
MIT © Alan Pérez Fernández