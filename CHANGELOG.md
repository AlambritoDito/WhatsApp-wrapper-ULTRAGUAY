# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0] — 2026-02-16

### ⚠️ Breaking Changes

- **Node ≥ 18 required** (was ≥ 16). Native `fetch` and `FormData` are used throughout.
- **Global singleton replaced by instanciable class.** `new WhatsAppClient(config)` replaces `.env`-based global config.
- **All standalone send functions removed.** Use `client.sendText()`, `client.sendImage()`, etc.
- **All send methods now return `{ wamid: string }`.** Previously returned `void`.
- **`sendInteractive` signature changed.** Now accepts a full `Interactive` type union instead of simplified arguments.
- **`parseIncoming` type field `button` renamed to `interactive_reply`** with a `subType` discriminator (`button_reply` | `list_reply`).
- **`WhatsappWrapper` class removed.** Replaced by `WhatsAppClient`.
- **`startWebhookServer` removed.** Replaced by `createExpressMiddleware` from `./webhook` subpath.
- **`enableMocking` / `MockAdapter` removed.** Replaced by `MockWhatsAppClient` from `./testing` subpath.
- **`WhatsAppConsole` removed.** No replacement; use the mock client for testing.
- **`formatPhone` utility removed.** Format phone numbers in user‑land.
- **`logger` utility removed.** Bring your own logger.
- **Storage adapter import paths changed.** `DiskStorageAdapter` and `S3StorageAdapter` now come from `./storage` subpath.
- **`express` is no longer a direct dependency.** It's an optional peer dependency for `createExpressMiddleware`.

### Added

- **`WhatsAppClient` class** — instanciable, event‑driven, fully typed.
- **Complete send API** — `sendText`, `sendImage`, `sendVideo`, `sendAudio`, `sendDocument`, `sendSticker`, `sendLocation`, `sendLocationRequest`, `sendTemplate`, `sendReaction`, `sendContacts`, `sendInteractive`.
- **`markAsRead(wamid)`** — send read receipts (blue ticks).
- **Media management** — `uploadMedia`, `getMediaUrl`, `downloadMedia`, `deleteMedia`, `downloadAndSave`.
- **Full inbound parsing** — `parseIncoming` handles 15 message types: `text`, `image`, `video`, `audio`, `document`, `sticker`, `location`, `contacts`, `interactive_reply`, `reaction`, `flow_reply`, `order`, `system`, `referral`, `unsupported`.
- **`parseStatuses`** — extract delivery receipt status updates from webhook payloads.
- **Event system** — `client.on('message', …)`, `client.on('message:text', …)`, `client.on('status', …)`, `client.on('error', …)` with full TypeScript typing.
- **`handleWebhook`** — verify signature + parse + emit events in one call.
- **`createExpressMiddleware`** (from `./webhook`) — handles GET verification and POST notifications.
- **`MockWhatsAppClient`** (from `./testing`) — records all calls, returns mock wamids.
- **`createMockWebhookPayload`** (from `./testing`) — generates realistic test payloads for all message types.
- **Automatic retry with exponential backoff** — retries on 429 / 5xx with ±25% jitter, configurable via `http.maxRetries` and `http.backoffMs`.
- **Request timeout via `AbortController`** — configurable `http.timeoutMs` (default 30s).
- **Subpath exports** — `./webhook`, `./storage`, `./testing` for tree‑shaking.
- **Comprehensive TypeScript types** — 60+ exported types, no `any`, full JSDoc.
- **`StorageNotConfiguredError`** — descriptive error when calling `downloadAndSave` without a storage adapter.
- **`WhatsAppError`** — includes `statusCode`, `details`, and optional `retryAfter`.

### Changed

- **Native `fetch`** replaces `axios` — zero HTTP dependencies.
- **S3 adapter** uses dynamic `import()` so `@aws-sdk/client-s3` is tree‑shakeable.
- **`DiskStorageAdapter`** maps 20+ MIME types to file extensions (was limited).
- **Webhook signature verification** uses `crypto.timingSafeEqual` for constant‑time comparison.
- **`express`** moved from dependency to optional peer dependency.

### Removed

- `dotenv` dependency
- `axios` dependency
- `express` as a direct dependency
- `jimp`, `jsqr`, `qrcode-reader` dependencies
- `.env.example` file
- `DOCUMENTATION.md` (content merged into README)
- `scripts/` directory (debug scripts, bots, quickstart)
- `examples/` directory
- `src/config/metaConfig.ts` — global config singleton
- `src/http/httpClient.ts` and `src/http/retryInterceptor.ts` — replaced by `src/http.ts`
- `src/send/` directory — all send functions replaced by `WhatsAppClient` methods
- `src/receive/` directory — replaced by `src/parse-incoming.ts` and `src/webhook/index.ts`
- `src/media/MediaClient.ts` — media methods now live on `WhatsAppClient`
- `src/utils/` directory (`formatPhone`, `logger`, `verifySignature`)
- `src/whatsappWrapper.ts` — replaced by `src/client.ts`
- `src/testing/console.ts`, `src/testing/interceptors.ts`, `src/testing/mockAdapter.ts`
- `src/types/WhatsApp.ts`, `src/types/Errors.ts` — replaced by `src/types.ts` and `src/errors.ts`
- `src/errors/WhatsAppError.ts`, `src/errors/StorageNotConfiguredError.ts` — merged into `src/errors.ts`

---

## [1.2.0] — 2025-12-15

### Added

- `S3StorageAdapter` for cloud storage.
- `WhatsappWrapper` class with `onImage` callback.
- `WhatsAppConsole` for local dev/testing.
- `MockAdapter` for intercepting outgoing messages.
- `sendFlow` for WhatsApp Flows.
- `sendLocation` and `sendLocationRequest`.

### Changed

- Improved error handling with `WhatsAppError` class.

## [1.1.0] — 2025-10-01

### Added

- `parseIncoming` for webhook message parsing.
- `verifySignature` middleware.
- `DiskStorageAdapter`.
- `MediaClient` for downloading images.

## [1.0.0] — 2025-08-15

### Added

- Initial release.
- `sendText`, `sendInteractive`, `sendTemplate`.
- Basic webhook server.
- TypeScript support.
