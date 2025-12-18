# whatsapp-wrapper


**Modular TypeScript wrapper for Meta’s WhatsApp Cloud API**

[![NPM Version](https://img.shields.io/npm/v/@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay)](https://www.npmjs.com/package/@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/AlambritoDito/WhatsApp-wrapper-ULTRAGUAY/actions/workflows/ci.yml/badge.svg)](https://github.com/AlambritoDito/WhatsApp-wrapper-ULTRAGUAY/actions)

A strongly-typed, lightweight toolkit to:

- **Send** messages (text, interactive buttons, templates, images, documents, location)
- **Receive & parse** inbound webhooks (text, button replies, **location**) 
- **Secure** your endpoint with HMAC–SHA256 signature verification
- **Handle** Cloud API errors in a clear, consistent way

---

## Table of Contents
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick Start (2 terminals)](#quick-start-2-terminals)
- [API Reference](#api-reference)
- [Webhook & Security](#webhook--security)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Folder Structure](#folder-structure)
- [License](#license)

---

## Requirements
- Node.js ≥ 16
- A Meta developer app with WhatsApp Cloud API enabled
- One **Phone Number ID**, **Permanent Token**, your app’s **APP_SECRET**

---

## Installation
```bash
npm install
```
*(This project is TypeScript-first. Use `npm run build` to compile to JS if needed.)*

---

## Configuration
Create a `.env` at the repo root (copy from `.env.example`) and fill in:

```dotenv
META_TOKEN=your_permanent_token
PHONE_NUMBER_ID=your_phone_number_id
APP_SECRET=your_app_secret               # used to verify POST signatures
WEBHOOK_SECRET=your_webhook_verify_token # used only for GET subscription
TEST_PHONE=5213300000000                 # your test number (E.164)

# Development-only helpers (optional)
# ALLOW_UNSIGNED_TESTS=true  # allow Meta UI "Test" events that might not include a signature
# DISABLE_SIGNATURE=true     # disable signature verification entirely (debug ONLY)
```

> **Important:**
> - **APP_SECRET** (from *Meta → Settings → Basic*) is the HMAC key for validating the `X-Hub-Signature-256` on **POST** `/webhook`.
> - **WEBHOOK_SECRET** is only the **verify token** used during **GET** subscription.

---

## Quick Start (2 terminals)

### Terminal 1 — Public tunnel
Use Localtunnel (free) to expose your local server:
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

> If you want the Meta UI **Test** button to reach your server even when it’s unsigned, set `ALLOW_UNSIGNED_TESTS=true` temporarily.

---

## API Reference

### `sendText(to: string, message: string): Promise<void>`
Sends a plain text message.

### `sendInteractive(to: string, body: string, buttons: ButtonOption[]): Promise<void>`
Sends a quick-reply interactive message.

```ts
interface ButtonOption { id: string; title: string }
```

### `sendTemplate(to: string, templateName: string, templateLanguage: string, components?: TemplateComponents[]): Promise<void>`
Sends a pre-approved template.

### `sendLocationRequest(to: string, bodyText: string): Promise<void>`
Sends an **interactive location request**. The user will see a native **Send location** button; upon sharing, you receive a `location` message via webhook.

### `sendLocation(to: string, latitude: number, longitude: number, name?: string, address?: string): Promise<void>`
Sends a **location pin** to the user.

### `startWebhookServer(
  port: number,
  onMessage?: (msg: Incoming) => Promise<void> | void,
  opts?: { allowUnsignedTests?: boolean }
): void`
Starts an Express server, verifies signatures by default, and calls `onMessage` for each inbound event.

```ts
// Returned by parseIncoming and delivered to onMessage
export type Incoming =
  | { from: string; type: 'text';     payload: string }
  | { from: string; type: 'button';   payload: string }
  | { from: string; type: 'location'; payload: {
      latitude: number; longitude: number; name?: string; address?: string; url?: string;
    }};
```

### `parseIncoming(body: any): Incoming`
Normalizes the WhatsApp payload. Supports `interactive.button_reply`, `interactive.list_reply`, **`location`**, and free text.

---

## Webhook & Security
- **GET** `/webhook` → verifies **WEBHOOK_SECRET** via `hub.verify_token`.
- **POST** `/webhook` → verifies **APP_SECRET** HMAC against `X-Hub-Signature-256` using the **raw** request body.
- For debugging Meta’s **Test** button (which may be unsigned), pass `{ allowUnsignedTests: true }` to `startWebhookServer` or set `ALLOW_UNSIGNED_TESTS=true`.

---

## Examples

### Ask the user for their location and handle the reply
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

### Send a location to the user
```ts
import { sendLocation } from '@alan/whatsapp-wrapper';

await sendLocation(process.env.TEST_PHONE!, 20.6736, -103.344, 'Our office', 'GDL, MX');
```

### Receive & Save Images

```ts
import { WhatsappWrapper, DiskStorageAdapter, S3StorageAdapter } from '@alan/whatsapp-wrapper';

const wa = new WhatsappWrapper({
  accessToken: process.env.WABA_TOKEN!,
  appSecret: process.env.APP_SECRET!,
  storage: new DiskStorageAdapter('./uploads'),
});

wa.onImage(async (ctx) => {
  console.log('Image from', ctx.from, 'id', ctx.image.mediaId);
  const saved = await ctx.save();
  console.log('Saved at', saved.location);
});

// Express
app.post('/webhook', async (req: any, res) => {
  await wa.handleWebhook({ headers: req.headers, rawBody: req.rawBody, json: req.body });
  res.sendStatus(200);
});

// Fastify
fastify.post('/webhook', async (req, res) => {
  await wa.handleWebhook({ headers: req.headers as any, rawBody: (req as any).rawBody, json: req.body });
  res.status(200).send();
});

// S3 adapter
const s3Adapter = new S3StorageAdapter({ bucket: 'my-bucket', prefix: 'wa/' });
const waS3 = new WhatsappWrapper({
  accessToken: process.env.WABA_TOKEN!,
  appSecret: process.env.APP_SECRET!,
  storage: s3Adapter,
});

```

> Security tip: Always validate the `X-Hub-Signature-256` header before trusting the payload. If signature verification fails, do not download or persist the media.


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
  - Free-text messages require an open 24h session. Use a **template** outside the session.

- **Location doesn’t show**
  - Make sure you’re using **WhatsApp on mobile**, not WhatsApp Web, when sharing a location.

- **Validate connectivity**
  - `GET /health` locally and via your tunnel.

---

## Folder Structure
```
whatsapp-wrapper/
├── README.md
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
