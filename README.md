# whatsapp-wrapper

**Modular TypeScript wrapper for Meta’s WhatsApp Cloud API**

A strongly-typed, lightweight toolkit to:

- **Send** messages (text, interactive buttons, templates, images, documents)
- **Receive & parse** inbound webhooks (text and button replies)
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

### `startWebhookServer(
  port: number,
  onMessage?: (msg: Incoming) => Promise<void> | void,
  opts?: { allowUnsignedTests?: boolean }
): void`
Starts an Express server, verifies signatures by default, and calls `onMessage` for each inbound event.

```ts
// Returned by parseIncoming and delivered to onMessage
export type Incoming =
  | { from: string; type: 'text';   payload: string }
  | { from: string; type: 'button'; payload: string };
```

### `parseIncoming(body: any): Incoming`
Normalizes the WhatsApp payload. Supports `interactive.button_reply`, `interactive.list_reply`, and free text.

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
  - Free-text messages require an open 24h session. Use a **template** outside the session.

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
│   ├── send/         # sendText, sendInteractive, sendTemplate, etc.
│   ├── receive/      # webhookServer, parseIncoming
│   ├── utils/        # verifySignature (APP_SECRET), formatPhone, logger
│   └── errors/       # WhatsAppError
├── scripts/          # quickStart, server debug scripts
└── tests/            # Jest unit tests
```

---

## License
MIT © Alan Pérez Fernández
