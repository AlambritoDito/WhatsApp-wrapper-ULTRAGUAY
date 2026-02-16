# WhatsApp Wrapper ULTRAGUAY v2

> Instanciable, type‑safe TypeScript wrapper for the **WhatsApp Cloud API** (Meta).  
> Zero business logic — pure protocol wrapper.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

## Highlights

- **Instanciable** — create multiple clients for different phone numbers / tokens.
- **Complete send API** — text, image, video, audio, document, sticker, location, location‑request, template, reaction, contacts, interactive (buttons, lists, flows, CTA).
- **Full inbound parsing** — text, image, video, audio, document, sticker, location, contacts, interactive replies, reactions, flow replies, orders, system messages, referrals.
- **Media management** — upload, download, get URL, delete.
- **Event‑driven** — `client.on('message:text', …)` with fully typed events.
- **Retry with backoff** — automatic retry on 429 / 5xx with exponential backoff + jitter.
- **Native `fetch`** — zero HTTP dependencies. Node ≥ 18 required.
- **Strict TypeScript** — no `any`, full JSDoc, comprehensive exported types.
- **Subpath exports** — import only what you need: `./webhook`, `./storage`, `./testing`.

## Install

```bash
npm install @whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay
```

## Quick Start

```typescript
import { WhatsAppClient } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';

const client = new WhatsAppClient({
  accessToken: process.env.WA_TOKEN!,
  phoneNumberId: process.env.WA_PHONE_ID!,
  appSecret: process.env.WA_APP_SECRET, // optional, for webhook verification
});

// Send a text message
const { wamid } = await client.sendText('5215512345678', 'Hello from v2! 🚀');

// Send an image
await client.sendImage('5215512345678', { url: 'https://example.com/photo.jpg' }, {
  caption: 'Check this out!',
});

// Send a reaction
await client.sendReaction('5215512345678', wamid, '🔥');

// Mark as read
await client.markAsRead(wamid);
```

## Configuration

```typescript
const client = new WhatsAppClient({
  accessToken: string,        // Required: Meta access token
  phoneNumberId: string,      // Required: WhatsApp phone number ID
  appSecret?: string,         // For webhook signature verification
  apiVersion?: string,        // Default: 'v21.0'
  storage?: StorageAdapter,   // For media persistence (disk, S3, custom)
  http?: {
    timeoutMs?: number,       // Default: 30000
    maxRetries?: number,      // Default: 3 (only 429 & 5xx)
    backoffMs?: number,       // Default: 1000 (exponential with jitter)
  },
});
```

## Send Methods

All send methods return `Promise<{ wamid: string }>`.

### Text

```typescript
await client.sendText(to, 'Hello!', {
  previewUrl: true,       // Enable link previews
  replyTo: 'wamid.xxx',  // Quote a message
});
```

### Media (Image, Video, Audio, Document, Sticker)

Send by URL or by previously uploaded media ID:

```typescript
// By URL
await client.sendImage(to, { url: 'https://example.com/photo.jpg' }, { caption: 'Nice!' });

// By media ID
await client.sendImage(to, { id: 'media-id-from-upload' });

// Video
await client.sendVideo(to, { url: 'https://example.com/video.mp4' }, { caption: 'Watch this' });

// Audio
await client.sendAudio(to, { url: 'https://example.com/audio.ogg' });

// Document
await client.sendDocument(to, { url: 'https://example.com/doc.pdf' }, {
  filename: 'invoice.pdf',
  caption: 'Your invoice',
});

// Sticker
await client.sendSticker(to, { url: 'https://example.com/sticker.webp' });
```

### Location

```typescript
await client.sendLocation(to, {
  latitude: 19.4326,
  longitude: -99.1332,
  name: 'Mexico City',
  address: 'CDMX, Mexico',
});

// Request user's location
await client.sendLocationRequest(to, 'Please share your location');
```

### Template

```typescript
await client.sendTemplate(to, 'hello_world', {
  language: 'es_MX',
  components: [
    {
      type: 'body',
      parameters: [{ type: 'text', text: 'World' }],
    },
  ],
});
```

### Reaction

```typescript
// Add reaction
await client.sendReaction(to, messageId, '👍');

// Remove reaction
await client.sendReaction(to, messageId, '');
```

### Contacts

```typescript
await client.sendContacts(to, [
  {
    name: { formatted_name: 'Jane Doe', first_name: 'Jane', last_name: 'Doe' },
    phones: [{ phone: '+15551234567', type: 'CELL' }],
  },
]);
```

### Interactive (Buttons, Lists, Flows)

```typescript
// Buttons
await client.sendInteractive(to, {
  type: 'button',
  body: { text: 'Choose an option:' },
  action: {
    buttons: [
      { type: 'reply', reply: { id: 'opt_a', title: 'Option A' } },
      { type: 'reply', reply: { id: 'opt_b', title: 'Option B' } },
    ],
  },
});

// List
await client.sendInteractive(to, {
  type: 'list',
  body: { text: 'Select from the menu:' },
  action: {
    button: 'View Menu',
    sections: [
      {
        title: 'Drinks',
        rows: [
          { id: 'coffee', title: 'Coffee', description: 'Hot coffee' },
          { id: 'tea', title: 'Tea', description: 'Green tea' },
        ],
      },
    ],
  },
});
```

### Mark as Read

```typescript
await client.markAsRead(messageId);
```

## Media Management

```typescript
// Upload
const { id } = await client.uploadMedia(fileBuffer, 'image/jpeg', 'photo.jpg');

// Get URL
const { url, mime_type, file_size } = await client.getMediaUrl(mediaId);

// Download
const buffer = await client.downloadMedia(mediaId);

// Delete
await client.deleteMedia(mediaId);

// Download and save (requires storage adapter)
const { location } = await client.downloadAndSave(mediaId, 'my-photo');
```

## Webhook / Inbound Messages

### Using the client's event system

```typescript
client.on('message', (msg) => {
  console.log(`${msg.type} from ${msg.from}`);
});

client.on('message:text', (msg) => {
  console.log(`Text: ${msg.text}`);
});

client.on('message:image', (msg) => {
  console.log(`Image: ${msg.image.mediaId}`);
});

client.on('status', (status) => {
  console.log(`${status.id}: ${status.status}`);
});

client.on('error', (err) => {
  console.error('Webhook error:', err);
});

// In your webhook handler:
client.handleWebhook({
  rawBody: req.body,        // Raw body for signature verification
  signature: req.headers['x-hub-signature-256'],
  body: JSON.parse(req.body),
});
```

### Standalone parsing

```typescript
import { parseIncoming, parseStatuses } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';

const messages = parseIncoming(webhookBody);
const statuses = parseStatuses(webhookBody);
```

### Express middleware helper

```typescript
import express from 'express';
import { createExpressMiddleware } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/webhook';

const app = express();
app.use('/webhook', express.raw({ type: '*/*' }), createExpressMiddleware({
  appSecret: process.env.APP_SECRET!,
  verifyToken: process.env.VERIFY_TOKEN!,
  onMessage: (msg) => console.log('Message:', msg),
  onStatus: (status) => console.log('Status:', status),
  onError: (err) => console.error('Error:', err),
}));
```

### Inbound message types

| Type | Description |
|------|-------------|
| `text` | Plain text message |
| `image` | Image with optional caption |
| `video` | Video with optional caption |
| `audio` | Audio message (includes voice notes) |
| `document` | Document with filename |
| `sticker` | Sticker (static or animated) |
| `location` | Shared location |
| `contacts` | Shared contacts |
| `interactive_reply` | Button or list reply |
| `reaction` | Emoji reaction |
| `flow_reply` | WhatsApp Flow response |
| `order` | Product order |
| `system` | System message (number change, etc.) |
| `referral` | Click‑to‑WhatsApp ad referral |
| `unsupported` | Unknown message type |

## Storage Adapters

```typescript
import { DiskStorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';

const client = new WhatsAppClient({
  accessToken: '...',
  phoneNumberId: '...',
  storage: new DiskStorageAdapter('/tmp/wa-media'),
});

// Download and persist in one call
const { location } = await client.downloadAndSave(mediaId);
```

### S3 Storage

```bash
npm install @aws-sdk/client-s3  # peer dependency
```

```typescript
import { S3StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';

const client = new WhatsAppClient({
  accessToken: '...',
  phoneNumberId: '...',
  storage: new S3StorageAdapter({
    bucket: 'my-bucket',
    prefix: 'whatsapp-media/',
    s3: { region: 'us-east-1' },
  }),
});
```

### Custom storage

```typescript
import type { StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';

class MyStorageAdapter implements StorageAdapter {
  async save(input: { data: Buffer; mimeType: string; suggestedName?: string }) {
    // Your logic here
    return { location: 'custom://path' };
  }
}
```

## Testing Utilities

```typescript
import { MockWhatsAppClient, createMockWebhookPayload } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/testing';

// Mock client records all calls
const mock = new MockWhatsAppClient();
await mock.sendText('123', 'hello');
console.log(mock.calls);       // [{ method: 'sendText', args: [...], timestamp: ... }]
console.log(mock.callsFor('sendText')); // filter by method

// Generate test webhook payloads
const payload = createMockWebhookPayload('text', { text: { body: 'Test!' } });
const imagePayload = createMockWebhookPayload('image');
const statusPayload = createMockWebhookPayload('status', { status: 'delivered' });
```

## Package Exports

| Subpath | What it includes |
|---------|-----------------|
| `.` (main) | `WhatsAppClient`, `parseIncoming`, `verifyWebhookSignature`, all types, errors |
| `./webhook` | `parseIncoming`, `parseStatuses`, `verifyWebhookSignature`, `createExpressMiddleware` |
| `./storage` | `DiskStorageAdapter`, `S3StorageAdapter`, `StorageAdapter` interface |
| `./testing` | `MockWhatsAppClient`, `createMockWebhookPayload` |

## Migration from v1

See [MIGRATION.md](MIGRATION.md) for a detailed guide.

**Key changes:**
- `new WhatsAppClient(config)` replaces global config via `.env`
- All send methods return `{ wamid: string }` (were `void`)
- Native `fetch` replaces `axios`
- `parseIncoming` now returns all message types (was only text/image/button/location/flow)
- Removed: `dotenv`, `axios`, `express`, `jimp`, `jsqr`, `qrcode-reader` dependencies

## Requirements

- **Node.js ≥ 18** (for native `fetch` and `FormData`)
- **TypeScript ≥ 5.0** (recommended)

## License

[MIT](LICENSE)
