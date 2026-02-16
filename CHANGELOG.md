# Changelog

## [2.0.0-alpha.1] — 2026-02-16

### 🚀 Complete rewrite (v2)

This is a ground‑up rewrite of the library. The public API has changed significantly.

#### Added

- **Instanciable `WhatsAppClient` class** — no more global singleton config. Create as many clients as you need.
- **Send methods** — `sendText`, `sendImage`, `sendVideo`, `sendAudio`, `sendDocument`, `sendSticker`, `sendLocation`, `sendLocationRequest`, `sendTemplate`, `sendReaction`, `sendContacts`, `sendInteractive`. All return `{ wamid: string }`.
- **`markAsRead`** — send read receipts (blue ticks).
- **Media management** — `uploadMedia`, `getMediaUrl`, `downloadMedia`, `deleteMedia`, `downloadAndSave`.
- **Complete inbound parsing** — `parseIncoming` now handles: text, image, video, audio, document, sticker, location, contacts, interactive_reply (button + list), reaction, flow_reply, order, system, referral, unsupported.
- **`parseStatuses`** — extract delivery receipt status updates from webhook payloads.
- **Event system** — `client.on('message', …)`, `client.on('message:text', …)`, `client.on('status', …)`, `client.on('error', …)`.
- **`handleWebhook`** — verify signature + parse + emit events in one call.
- **Express middleware helper** — `createExpressMiddleware` from `./webhook` subpath. Handles GET verification challenge and POST notifications.
- **Testing utilities** — `MockWhatsAppClient` (records all calls) and `createMockWebhookPayload` (generates test payloads) from `./testing` subpath.
- **Retry with backoff** — automatic retry on 429 and 5xx with exponential backoff and ±25% jitter. Configurable via `http.maxRetries` and `http.backoffMs`.
- **Timeout via `AbortController`** — configurable `http.timeoutMs`.
- **Comprehensive TypeScript types** — all types exported for consumers. Strict mode, no `any`.
- **Full JSDoc** on every public method and type.

#### Changed

- **Node ≥ 18** required (was ≥ 16). Needed for native `fetch` and `FormData`.
- **Native `fetch`** replaces `axios` — zero HTTP dependencies.
- Consumer passes config directly — **no more `dotenv`**.
- **S3 adapter** now uses dynamic `import()` — `@aws-sdk/client-s3` is an optional peer dependency.
- `DiskStorageAdapter` now maps many more MIME types to file extensions.
- Webhook signature verification uses `crypto.timingSafeEqual` for constant‑time comparison.

#### Removed

- `dotenv` dependency
- `axios` dependency
- `express` as a direct dependency (now optional peer dep)
- `jimp`, `jsqr`, `qrcode-reader` dependencies
- Global `httpClient` singleton
- Standalone `sendText`, `sendInteractive`, `sendTemplate`, `sendLocation`, `sendLocationRequest`, `sendFlow` functions
- `WhatsappWrapper` class (replaced by `WhatsAppClient`)
- `WhatsAppConsole` dev console
- `MockAdapter` event emitter (replaced by `MockWhatsAppClient`)
- `enableMocking` interceptor approach (replaced by `MockWhatsAppClient`)
- `startWebhookServer` (replaced by `createExpressMiddleware`)
- `formatPhone` utility
- `logger` utility

---

## [1.2.0] — 2025-12-15

### Added
- S3StorageAdapter for cloud storage
- WhatsappWrapper class with onImage callback
- WhatsAppConsole for local dev/testing
- MockAdapter for intercepting outgoing messages
- sendFlow for WhatsApp Flows
- sendLocation and sendLocationRequest

### Changed
- Improved error handling with WhatsAppError class

## [1.1.0] — 2025-10-01

### Added
- parseIncoming for webhook message parsing
- verifySignature middleware
- DiskStorageAdapter
- MediaClient for downloading images

## [1.0.0] — 2025-08-15

### Added
- Initial release
- sendText, sendInteractive, sendTemplate
- Basic webhook server
- TypeScript support
