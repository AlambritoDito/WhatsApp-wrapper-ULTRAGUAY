# Migration Guide: v1 → v2

## Overview

v2 is a complete rewrite. The core philosophy changed from "global singleton with standalone functions" to "instanciable client class with comprehensive API coverage".

## Breaking Changes

### 1. Configuration

**v1:**
```typescript
// Required .env file with META_TOKEN, PHONE_NUMBER_ID, etc.
import { sendText } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';
await sendText('123', 'Hello');
```

**v2:**
```typescript
import { WhatsAppClient } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';

const client = new WhatsAppClient({
  accessToken: process.env.META_TOKEN!,
  phoneNumberId: process.env.PHONE_NUMBER_ID!,
});

await client.sendText('123', 'Hello');
```

### 2. Send Methods Return `{ wamid: string }`

**v1:** `sendText()` returned `void`.  
**v2:** All send methods return `Promise<{ wamid: string }>`.

### 3. Interactive Messages

**v1:**
```typescript
import { sendInteractive } from '...';
await sendInteractive('123', 'Choose:', [{ id: 'a', title: 'A' }]);
```

**v2:**
```typescript
await client.sendInteractive('123', {
  type: 'button',
  body: { text: 'Choose:' },
  action: {
    buttons: [{ type: 'reply', reply: { id: 'a', title: 'A' } }],
  },
});
```

### 4. Webhook Handling

**v1:**
```typescript
import { WhatsappWrapper } from '...';
const wrapper = new WhatsappWrapper({ accessToken: '...', appSecret: '...' });
wrapper.onImage((ctx) => { /* only images */ });
await wrapper.handleWebhook({ headers, rawBody, json });
```

**v2:**
```typescript
const client = new WhatsAppClient({ accessToken: '...', phoneNumberId: '...', appSecret: '...' });
client.on('message:image', (msg) => { /* typed image message */ });
client.on('message:text', (msg) => { /* typed text message */ });
client.on('message', (msg) => { /* any message type */ });
client.handleWebhook({ rawBody, signature, body: parsedJson });
```

### 5. parseIncoming Returns More Types

**v1:** Returned `text | button | location | image | flow_response`.  
**v2:** Returns 15 types including `video`, `audio`, `document`, `sticker`, `contacts`, `interactive_reply`, `reaction`, `flow_reply`, `order`, `system`, `referral`, `unsupported`.

Also, `button` is now `interactive_reply` with a `subType` field.

### 6. Imports Changed

**v1:**
```typescript
import { sendText, sendInteractive, parseIncoming, startWebhookServer } from '...';
```

**v2:**
```typescript
// Main
import { WhatsAppClient, parseIncoming } from '...';

// Webhook subpath
import { createExpressMiddleware, verifyWebhookSignature } from '.../webhook';

// Storage subpath
import { DiskStorageAdapter, S3StorageAdapter } from '.../storage';

// Testing subpath
import { MockWhatsAppClient, createMockWebhookPayload } from '.../testing';
```

### 7. Removed Dependencies

These are no longer included and should be removed from your project if only used via this library:
- `axios` → native `fetch`
- `dotenv` → pass config directly
- `express` → optional peer dep (only if using `createExpressMiddleware`)
- `jimp`, `jsqr`, `qrcode-reader` → removed entirely

### 8. Node.js Version

**v1:** Node ≥ 16  
**v2:** Node ≥ 18 (required for native `fetch` and `FormData`)
