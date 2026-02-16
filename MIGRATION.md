# Migration Guide: v1 → v2

> **v2 is a complete rewrite.** This guide covers every breaking change with before/after code examples so you can migrate with confidence.

## Table of Contents

- [Requirements](#requirements)
- [1. Installation](#1-installation)
- [2. Imports — No More Standalone Functions](#2-imports--no-more-standalone-functions)
- [3. Configuration — No More dotenv](#3-configuration--no-more-dotenv)
- [4. Creating a Client](#4-creating-a-client)
- [5. Sending Messages](#5-sending-messages)
  - [sendText](#sendtext)
  - [sendInteractive (Buttons)](#sendinteractive-buttons)
  - [sendInteractive (Lists)](#sendinteractive-lists)
  - [sendTemplate](#sendtemplate)
  - [sendLocation / sendLocationRequest](#sendlocation--sendlocationrequest)
  - [sendFlow](#sendflow)
  - [New: Media Messages](#new-media-messages)
  - [New: Reactions](#new-reactions)
  - [New: Contacts](#new-contacts)
  - [New: markAsRead](#new-markasread)
- [6. Send Method Return Values](#6-send-method-return-values)
- [7. Webhook Handling](#7-webhook-handling)
  - [Old: WhatsappWrapper + onImage](#old-whatsappwrapper--onimage)
  - [New: Event System](#new-event-system)
  - [Express Middleware](#express-middleware)
  - [Standalone Parsing](#standalone-parsing)
- [8. Inbound Message Types](#8-inbound-message-types)
- [9. Storage Adapters](#9-storage-adapters)
- [10. Testing / Mocking](#10-testing--mocking)
- [11. Dependencies Removed](#11-dependencies-removed)
- [12. Files Removed](#12-files-removed)
- [13. TypeScript Types](#13-typescript-types)
- [14. Quick Migration Checklist](#14-quick-migration-checklist)

---

## Requirements

| | v1 | v2 |
|---|---|---|
| **Node.js** | ≥ 16 | **≥ 18** |
| **TypeScript** | ≥ 4.7 | ≥ 5.0 (recommended) |
| **HTTP client** | `axios` (bundled) | Native `fetch` (no dep) |

**Why Node 18?** v2 uses native `fetch`, `FormData`, and `AbortController` which are stable from Node 18+.

---

## 1. Installation

No change — same package name:

```bash
npm install @whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay
```

If you use S3 storage:

```bash
npm install @aws-sdk/client-s3  # now an optional peer dep
```

**Remove** these from your project if they were only used via this library:

```bash
npm uninstall axios dotenv jimp jsqr qrcode-reader
```

---

## 2. Imports — No More Standalone Functions

**v1** exported standalone functions you called directly:

```typescript
// v1 ❌
import {
  sendText,
  sendInteractive,
  sendTemplate,
  sendLocation,
  sendLocationRequest,
  startWebhookServer,
  parseIncoming,
} from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';
```

**v2** exports a client class and organizes helpers into subpath exports:

```typescript
// v2 ✅
import { WhatsAppClient, parseIncoming } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';

// Webhook helpers (optional subpath)
import { createExpressMiddleware } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/webhook';

// Storage adapters (optional subpath)
import { DiskStorageAdapter, S3StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';

// Testing utilities (optional subpath)
import { MockWhatsAppClient, createMockWebhookPayload } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/testing';
```

---

## 3. Configuration — No More dotenv

**v1** read config from environment variables via a `.env` file:

```env
# v1 ❌ — .env file
META_TOKEN=your-token
PHONE_NUMBER_ID=123456
APP_SECRET=your-secret
```

```typescript
// v1 — config loaded automatically from .env
import { sendText } from '...';
await sendText('123', 'Hello');
```

**v2** requires explicit config passed to the constructor:

```typescript
// v2 ✅ — you control where config comes from
const client = new WhatsAppClient({
  accessToken: process.env.META_TOKEN!,       // or from a secret manager, DB, etc.
  phoneNumberId: process.env.PHONE_NUMBER_ID!,
  appSecret: process.env.APP_SECRET,           // optional — for webhook verification
});
```

**Why?** This allows multiple clients (e.g., different phone numbers) and eliminates the hidden dependency on `dotenv`.

---

## 4. Creating a Client

**v1:**

```typescript
// v1 ❌ — no client needed, just import functions
import { sendText } from '...';
await sendText('123', 'Hello');
```

**v2:**

```typescript
// v2 ✅ — create a client instance
import { WhatsAppClient } from '...';

const client = new WhatsAppClient({
  accessToken: 'your-token',
  phoneNumberId: 'your-phone-id',
  appSecret: 'your-app-secret',  // optional
  apiVersion: 'v21.0',           // optional, default v21.0
  http: {
    timeoutMs: 30000,   // optional, default 30s
    maxRetries: 3,       // optional, default 3
    backoffMs: 1000,     // optional, default 1s
  },
});

await client.sendText('123', 'Hello');
```

You can create multiple clients for different phone numbers:

```typescript
const clientA = new WhatsAppClient({ accessToken: tokenA, phoneNumberId: phoneA });
const clientB = new WhatsAppClient({ accessToken: tokenB, phoneNumberId: phoneB });
```

---

## 5. Sending Messages

### sendText

```typescript
// v1 ❌
import { sendText } from '...';
await sendText('123', 'Hello');

// v2 ✅
const { wamid } = await client.sendText('123', 'Hello');
// Now with options:
await client.sendText('123', 'Check this link', { previewUrl: true, replyTo: 'wamid.xxx' });
```

### sendInteractive (Buttons)

```typescript
// v1 ❌ — simplified arguments
import { sendInteractive } from '...';
await sendInteractive('123', 'Choose:', [
  { id: 'opt_a', title: 'Option A' },
  { id: 'opt_b', title: 'Option B' },
]);

// v2 ✅ — full WhatsApp API shape
await client.sendInteractive('123', {
  type: 'button',
  body: { text: 'Choose:' },
  action: {
    buttons: [
      { type: 'reply', reply: { id: 'opt_a', title: 'Option A' } },
      { type: 'reply', reply: { id: 'opt_b', title: 'Option B' } },
    ],
  },
});
```

### sendInteractive (Lists)

```typescript
// v1 ❌ — no list support

// v2 ✅
await client.sendInteractive('123', {
  type: 'list',
  body: { text: 'Select from the menu:' },
  action: {
    button: 'View Menu',
    sections: [{
      title: 'Drinks',
      rows: [
        { id: 'coffee', title: 'Coffee', description: 'Hot coffee' },
        { id: 'tea', title: 'Tea', description: 'Green tea' },
      ],
    }],
  },
});
```

### sendTemplate

```typescript
// v1 ❌
import { sendTemplate } from '...';
await sendTemplate('123', 'hello_world', 'en_US');

// v2 ✅
await client.sendTemplate('123', 'hello_world', {
  language: 'en_US',
  components: [{
    type: 'body',
    parameters: [{ type: 'text', text: 'World' }],
  }],
});
```

### sendLocation / sendLocationRequest

```typescript
// v1 ❌
import { sendLocation, sendLocationRequest } from '...';
await sendLocation('123', 19.43, -99.13, 'CDMX', 'Mexico City');
await sendLocationRequest('123', 'Share your location');

// v2 ✅
await client.sendLocation('123', {
  latitude: 19.43,
  longitude: -99.13,
  name: 'CDMX',
  address: 'Mexico City',
});
await client.sendLocationRequest('123', 'Share your location');
```

### sendFlow

```typescript
// v1 ❌
import { sendFlow } from '...';
await sendFlow('123', { /* custom shape */ });

// v2 ✅ — flows are a type of interactive message
await client.sendInteractive('123', {
  type: 'flow',
  body: { text: 'Complete this form' },
  action: {
    name: 'flow',
    parameters: { flow_id: 'FLOW_ID', flow_cta: 'Open Form' },
  },
});
```

### New: Media Messages

These are **new in v2** — v1 had no direct media send methods:

```typescript
await client.sendImage('123', { url: 'https://example.com/photo.jpg' }, { caption: 'Nice!' });
await client.sendVideo('123', { url: 'https://example.com/video.mp4' });
await client.sendAudio('123', { url: 'https://example.com/audio.ogg' });
await client.sendDocument('123', { url: 'https://example.com/doc.pdf' }, { filename: 'invoice.pdf' });
await client.sendSticker('123', { url: 'https://example.com/sticker.webp' });
```

### New: Reactions

```typescript
await client.sendReaction('123', messageId, '🔥');   // add
await client.sendReaction('123', messageId, '');      // remove
```

### New: Contacts

```typescript
await client.sendContacts('123', [{
  name: { formatted_name: 'Jane Doe', first_name: 'Jane', last_name: 'Doe' },
  phones: [{ phone: '+15551234567', type: 'CELL' }],
}]);
```

### New: markAsRead

```typescript
await client.markAsRead(wamid);  // sends blue check marks
```

---

## 6. Send Method Return Values

**v1:** Send methods returned `void` — you had no way to track the message.

```typescript
// v1 ❌
await sendText('123', 'Hello');  // returns void
```

**v2:** All send methods return `Promise<{ wamid: string }>`:

```typescript
// v2 ✅
const { wamid } = await client.sendText('123', 'Hello');
console.log(`Message sent: ${wamid}`);

// Use the wamid for reactions, replies, or tracking
await client.sendReaction('123', wamid, '✅');
await client.sendText('123', 'Follow-up', { replyTo: wamid });
```

---

## 7. Webhook Handling

### Old: WhatsappWrapper + onImage

```typescript
// v1 ❌
import { WhatsappWrapper } from '...';
const wrapper = new WhatsappWrapper({
  accessToken: '...',
  appSecret: '...',
});
wrapper.onImage((ctx) => {
  console.log('Got image from', ctx.from);
});
await wrapper.handleWebhook({ headers, rawBody, json });
```

### New: Event System

```typescript
// v2 ✅
const client = new WhatsAppClient({
  accessToken: '...',
  phoneNumberId: '...',
  appSecret: '...',
});

// Listen for ANY message
client.on('message', (msg) => {
  console.log(`${msg.type} from ${msg.from}`);
});

// Listen for specific types
client.on('message:text', (msg) => console.log(msg.text));
client.on('message:image', (msg) => console.log(msg.image.mediaId));
client.on('message:interactive_reply', (msg) => console.log(msg.interactive.id));

// Listen for delivery statuses
client.on('status', (status) => console.log(`${status.id}: ${status.status}`));

// Listen for errors
client.on('error', (err) => console.error(err));

// Process a webhook payload
client.handleWebhook({
  rawBody: req.body,                              // for signature verification
  signature: req.headers['x-hub-signature-256'],  // optional
  body: JSON.parse(req.body),                     // parsed payload
});
```

### Express Middleware

```typescript
// v1 ❌
import { startWebhookServer } from '...';
startWebhookServer(3000);

// v2 ✅
import express from 'express';
import { createExpressMiddleware } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/webhook';

const app = express();
app.use('/webhook', express.raw({ type: '*/*' }), createExpressMiddleware({
  appSecret: process.env.APP_SECRET!,
  verifyToken: process.env.VERIFY_TOKEN!,
  onMessage: (msg) => console.log('Message:', msg),
  onStatus: (status) => console.log('Status:', status),
  onError: (err) => console.error(err),
}));
app.listen(3000);
```

### Standalone Parsing

If you just want to parse webhook bodies without the event system:

```typescript
import { parseIncoming, parseStatuses } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';

const messages = parseIncoming(webhookBody);  // InboundMessage[]
const statuses = parseStatuses(webhookBody);  // StatusUpdate[]
```

---

## 8. Inbound Message Types

**v1** supported 5 types: `text`, `button`, `location`, `image`, `flow_response`.

**v2** supports 15 types with richer data:

| v1 type | v2 type | Notes |
|---|---|---|
| `text` | `text` | Same concept, richer type |
| `button` | `interactive_reply` | Renamed; includes `subType: 'button_reply' \| 'list_reply'` |
| `location` | `location` | Same concept |
| `image` | `image` | Now includes `mediaId`, `mimeType`, `sha256`, `caption` |
| `flow_response` | `flow_reply` | Renamed; `responseJson` is parsed object |
| — | `video` | **New** |
| — | `audio` | **New** (includes `voice` flag for voice notes) |
| — | `document` | **New** |
| — | `sticker` | **New** (includes `animated` flag) |
| — | `contacts` | **New** |
| — | `reaction` | **New** |
| — | `order` | **New** (product orders) |
| — | `system` | **New** (number changes, etc.) |
| — | `referral` | **New** (click‑to‑WhatsApp ads) |
| — | `unsupported` | **New** (graceful fallback) |

### Key type change: `button` → `interactive_reply`

```typescript
// v1 ❌
if (msg.type === 'button') {
  console.log(msg.button_reply.id);
}

// v2 ✅
if (msg.type === 'interactive_reply') {
  console.log(msg.interactive.subType);  // 'button_reply' or 'list_reply'
  console.log(msg.interactive.id);
  console.log(msg.interactive.title);
}
```

---

## 9. Storage Adapters

The `StorageAdapter` interface is the same, but import paths changed:

```typescript
// v1 ❌
import { DiskStorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';
import { S3StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';

// v2 ✅
import { DiskStorageAdapter, S3StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';
```

Usage in v2:

```typescript
import { DiskStorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';

const client = new WhatsAppClient({
  accessToken: '...',
  phoneNumberId: '...',
  storage: new DiskStorageAdapter('/tmp/wa-media'),
});

// Download + save in one call
const { location } = await client.downloadAndSave(mediaId, 'my-photo');
```

**Custom adapters** implement the same interface:

```typescript
import type { StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';

class MyStorageAdapter implements StorageAdapter {
  async save(input: { data: Buffer; mimeType: string; suggestedName?: string }) {
    // your logic
    return { location: 'custom://path' };
  }
}
```

---

## 10. Testing / Mocking

**v1** had `enableMocking` interceptors and `MockAdapter`:

```typescript
// v1 ❌
import { enableMocking, MockAdapter } from '...';
const mock = new MockAdapter();
enableMocking(mock);
await sendText('123', 'hello');  // intercepted by mock
```

**v2** has a dedicated `MockWhatsAppClient` that mirrors the real client API:

```typescript
// v2 ✅
import { MockWhatsAppClient, createMockWebhookPayload } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/testing';

// Mock client records all calls without HTTP requests
const mock = new MockWhatsAppClient();
await mock.sendText('123', 'hello');
console.log(mock.calls);                   // [{ method: 'sendText', args: [...], timestamp: ... }]
console.log(mock.callsFor('sendText'));     // filter by method
mock.reset();                               // clear recorded calls

// Generate realistic webhook payloads for testing
const textPayload = createMockWebhookPayload('text', { text: { body: 'Test!' } });
const imagePayload = createMockWebhookPayload('image');
const statusPayload = createMockWebhookPayload('status', { status: 'delivered' });
```

---

## 11. Dependencies Removed

| Dependency | v1 | v2 | Migration |
|---|---|---|---|
| `axios` | Direct dep | **Removed** | Native `fetch` — no action needed |
| `dotenv` | Direct dep | **Removed** | Pass config to constructor |
| `express` | Direct dep | **Optional peer dep** | Only needed if using `createExpressMiddleware` |
| `jimp` | Direct dep | **Removed** | Not needed; image processing is user‑land |
| `jsqr` | Direct dep | **Removed** | Not needed |
| `qrcode-reader` | Direct dep | **Removed** | Not needed |
| `@aws-sdk/client-s3` | Direct dep | **Optional peer dep** | Install if using `S3StorageAdapter` |

**Clean up** your `package.json`:

```bash
npm uninstall axios dotenv jimp jsqr qrcode-reader
```

---

## 12. Files Removed

If you reference any of these in your project, update accordingly:

| Removed | Replacement |
|---|---|
| `.env.example` | Pass config to constructor |
| `DOCUMENTATION.md` | Content merged into `README.md` |
| `scripts/*` | Removed (debug scripts, bots) |
| `examples/*` | See README for examples |
| `src/config/metaConfig.ts` | Config passed to `WhatsAppClient` constructor |
| `src/send/*.ts` | Methods on `WhatsAppClient` |
| `src/receive/*.ts` | `src/parse-incoming.ts` + `src/webhook/index.ts` |
| `src/media/MediaClient.ts` | Methods on `WhatsAppClient` |
| `src/utils/*` | Removed (`formatPhone`, `logger`, `verifySignature`) |
| `src/whatsappWrapper.ts` | `src/client.ts` (`WhatsAppClient`) |
| `src/testing/console.ts` | Removed |
| `src/testing/interceptors.ts` | `MockWhatsAppClient` from `./testing` |
| `src/testing/mockAdapter.ts` | `MockWhatsAppClient` from `./testing` |

---

## 13. TypeScript Types

All types are exported from the main entry point:

```typescript
import type {
  WhatsAppClientConfig,
  SendResponse,
  MediaRef,
  InboundMessage,
  InboundText,
  InboundImage,
  StatusUpdate,
  WhatsAppEvents,
  // ... 60+ types available
} from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';
```

The `StorageAdapter` interface type is also exported from main:

```typescript
import type { StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';
```

---

## 14. Quick Migration Checklist

- [ ] Update Node.js to ≥ 18
- [ ] Update the package: `npm install @whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay@latest`
- [ ] Remove unused deps: `npm uninstall axios dotenv jimp jsqr qrcode-reader`
- [ ] Replace standalone function imports with `WhatsAppClient` methods
- [ ] Create a client instance with explicit config (no more `.env`)
- [ ] Update send calls to use new signatures (see examples above)
- [ ] Capture `{ wamid }` return values from send methods
- [ ] Replace `WhatsappWrapper` / `onImage` with the event system (`client.on(...)`)
- [ ] Replace `startWebhookServer` with `createExpressMiddleware` (or handle manually)
- [ ] Update storage imports to use `./storage` subpath
- [ ] Replace `enableMocking` / `MockAdapter` with `MockWhatsAppClient` from `./testing`
- [ ] Update `parseIncoming` consumers for new type names (`button` → `interactive_reply`, `flow_response` → `flow_reply`)
- [ ] Test thoroughly — v2 is a complete rewrite!
