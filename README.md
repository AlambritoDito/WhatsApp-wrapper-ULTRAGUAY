# @brito/whatsapp-wrapper-ultra v2

General-purpose TypeScript wrapper for the **WhatsApp Cloud API** (Meta).

Instanciable, zero singletons, zero global state, native `fetch`, fully typed.

## Features

- **Instanciable client** — multiple WhatsApp numbers in the same process
- **Full send support** — text, buttons, lists, images, video, audio, documents, stickers, location, templates, flows, reactions
- **Full receive support** — parse all message types, status updates, signature verification
- **Native `fetch`** — no Axios, no dependencies for HTTP
- **Smart retry** — exponential backoff on 429/5xx, respects `Retry-After`
- **Media handling** — upload and download media files
- **Storage adapters** — pluggable storage (disk, S3, or custom)
- **Testing utilities** — MockClient, test factories, REPL console
- **TypeScript strict** — no `any`, full type safety, JSDoc on public API
- **Zero config opinions** — no dotenv, no singletons, no Express requirement

## Quick Start

```typescript
import { WhatsAppClient } from '@brito/whatsapp-wrapper-ultra';

const client = new WhatsAppClient({
  accessToken: process.env.META_TOKEN!,
  phoneNumberId: process.env.PHONE_NUMBER_ID!,
  appSecret: process.env.APP_SECRET,
});

// Send messages
await client.sendText('5211234567890', 'Hello!');
await client.sendButtons('5211234567890', 'Pick one:', [
  { id: 'yes', title: 'Yes' },
  { id: 'no', title: 'No' },
]);

// Receive messages
client.on('message:text', async (msg) => {
  console.log(`${msg.from}: ${msg.text}`);
  await msg.reply('Got it!');
  await msg.markRead();
});

client.on('status', (status) => {
  console.log(`Message ${status.messageId}: ${status.status}`);
});
```

## Installation

```bash
npm install @brito/whatsapp-wrapper-ultra
```

Requires **Node.js 18+** (for native `fetch`).

## API Reference

### Client Configuration

```typescript
const client = new WhatsAppClient({
  accessToken: 'xxx',           // Required: Meta access token
  phoneNumberId: '123',         // Required: WhatsApp phone number ID
  appSecret: 'yyy',             // Optional: for webhook signature verification
  webhookVerifyToken: 'zzz',    // Optional: for webhook GET verification
  apiVersion: 'v20.0',          // Optional: Graph API version (default: v20.0)
  timeoutMs: 30000,             // Optional: request timeout (default: 30s)
  retry: {                      // Optional: retry configuration
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
  },
  storage: new DiskStorageAdapter('./media'), // Optional: media storage
  logger: console,              // Optional: logger (default: silent)
});
```

### Sending Messages

All send methods return `{ messageId: string }`.

```typescript
// Text
await client.sendText(to, 'Hello!', { previewUrl: true, replyTo: 'wamid...' });

// Interactive buttons (max 3)
await client.sendButtons(to, 'Choose:', [
  { id: 'opt_1', title: 'Option 1' },
  { id: 'opt_2', title: 'Option 2' },
], { header: 'Title', footer: 'Footer' });

// Interactive list
await client.sendList(to, {
  body: 'Select an item:',
  buttonText: 'View Options',
  sections: [{
    title: 'Category',
    rows: [
      { id: 'item_1', title: 'Item 1', description: 'Description' },
    ],
  }],
});

// Media (by URL or uploaded media ID)
await client.sendImage(to, { url: 'https://...' }, 'Caption');
await client.sendVideo(to, { id: 'media-id' }, 'Caption');
await client.sendAudio(to, { url: 'https://...' });
await client.sendDocument(to, { url: 'https://...' }, { filename: 'report.pdf', caption: 'Q4' });
await client.sendSticker(to, { url: 'https://...' });

// Location
await client.sendLocation(to, { latitude: 20.67, longitude: -103.35, name: 'Office' });
await client.requestLocation(to, 'Share your location');

// Templates
await client.sendTemplate(to, 'hello_world', 'en', [
  { type: 'body', parameters: [{ type: 'text', text: 'John' }] },
]);

// Reactions
await client.sendReaction(to, messageId, '👍');
await client.removeReaction(to, messageId);

// Mark as read
await client.markAsRead(messageId);

// Flows
await client.sendFlow(to, {
  body: 'Complete the form',
  flowId: 'flow-123',
  flowToken: 'token',
  ctaText: 'Start',
});
```

### Receiving Messages

#### Event-based (recommended)

```typescript
client.on('message', (msg) => { /* any message */ });
client.on('message:text', (msg) => { /* text only */ });
client.on('message:image', (msg) => { /* image only */ });
client.on('message:button_reply', (msg) => { /* button clicks */ });
client.on('message:list_reply', (msg) => { /* list selections */ });
client.on('message:reaction', (msg) => { /* reactions */ });
client.on('status', (event) => { /* delivery/read/failed */ });
client.on('error', (err) => { /* processing errors */ });

// Process webhook payloads
client.processWebhook(req.body);
```

#### Message helpers

Every incoming message has convenience methods:

```typescript
client.on('message:text', async (msg) => {
  await msg.reply('Thanks!');         // sends text back to sender
  await msg.react('👍');              // reacts to the message
  await msg.markRead();               // blue checkmarks
  const buf = await msg.downloadMedia(); // for media messages
});
```

#### Framework-agnostic parsing

```typescript
import { parseWebhookBody, verifyPayloadSignature } from '@brito/whatsapp-wrapper-ultra';

// Verify signature
const isValid = verifyPayloadSignature(rawBody, signature, appSecret);

// Parse without a client
const { messages, statuses } = parseWebhookBody(body);
```

#### Express middleware

```typescript
const middleware = client.webhookMiddleware();
app.get('/webhook', middleware.handleGet);
app.post('/webhook', middleware.handlePost);
// or
middleware.mount(app, '/webhook');
```

### Media

```typescript
// Download
const buffer = await client.downloadMedia(mediaId);

// Upload
const mediaId = await client.uploadMedia(buffer, 'image/png', 'photo.png');

// Then send using the ID
await client.sendImage(to, { id: mediaId });
```

### Storage Adapters

```typescript
import { DiskStorageAdapter, S3StorageAdapter } from '@brito/whatsapp-wrapper-ultra';

// Disk storage
const disk = new DiskStorageAdapter('./media');

// S3 storage (requires @aws-sdk/client-s3 as peer dep)
const s3 = new S3StorageAdapter({
  bucket: 'my-bucket',
  prefix: 'whatsapp/',
  s3: { region: 'us-east-1' },
});

// Custom storage
const custom: StorageAdapter = {
  async save({ data, mimeType, suggestedName }) {
    // your logic
    return { location: 'path/to/file' };
  },
};
```

### Testing

```typescript
import { createTestClient, makeTextWebhook } from '@brito/whatsapp-wrapper-ultra/testing';

const { client, mock } = createTestClient();

// Test your handlers
client.on('message:text', async (msg) => {
  await msg.reply('Echo: ' + msg.text);
});

client.processWebhook(makeTextWebhook('Hello'));

// Inspect what was sent
expect(mock.messages).toHaveLength(1);
expect(mock.lastMessage?.body).toMatchObject({
  type: 'text',
  text: { body: 'Echo: Hello' },
});

// Filter recorded messages
mock.messagesTo('5511999999999');
mock.messagesOfType('text');
mock.clear();
```

Available test webhook factories:
- `makeTextWebhook(text, from?, messageId?)`
- `makeImageWebhook(mediaId, mimeType?, from?)`
- `makeButtonReplyWebhook(buttonId, buttonTitle, from?)`
- `makeStatusWebhook(messageId, status, recipientId?)`

### Error Handling

```typescript
import { WhatsAppError } from '@brito/whatsapp-wrapper-ultra';

try {
  await client.sendText(to, text);
} catch (err) {
  if (err instanceof WhatsAppError) {
    console.log(err.statusCode);  // HTTP status (400, 429, 500, etc.)
    console.log(err.errorCode);   // Meta error code string
    console.log(err.details);     // Full API error response
    console.log(err.retryAfter);  // Seconds (from Retry-After header)
    console.log(err.isRetryable); // true for 429 and 5xx
  }
}
```

## Project Structure

```
src/
├── client/       → WhatsAppClient (main entry point)
├── send/         → sendText, sendButtons, sendList, sendMedia, etc.
├── receive/      → parseIncoming, webhookMiddleware, webhookServer
├── media/        → MediaClient (upload/download)
├── storage/      → StorageAdapter, DiskStorageAdapter, S3StorageAdapter
├── http/         → FetchClient (native fetch + retry)
├── errors/       → WhatsAppError
├── types/        → All TypeScript interfaces and types
├── testing/      → MockAdapter, createTestClient, WhatsAppConsole
└── utils/        → verifySignature, formatPhone, mimeToExt
```

## License

MIT
