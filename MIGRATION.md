# Migration Guide & New Features

## Modular Submodules `(v1.2.0+)`

To reduce bundle size and external dependencies, we have modularized the package. While the main import is still backward compatible, we recommend importing specific modules if you only need certain functionality.

### Webhook Server
If you are using the built-in Express webhook server:

**Old:**
```typescript
import { startWebhookServer } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';
```

**New (Recommended):**
```typescript
import { startWebhookServer } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/webhook';
```
*Note: This submodule requires `express` and `body-parser`.*

### Storage Adapters
If you are using `DiskStorageAdapter` or `S3StorageAdapter`:

**Old:**
```typescript
import { DiskStorageAdapter, S3StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay';
```

**New (Recommended):**
```typescript
import { DiskStorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';
// or
import { S3StorageAdapter } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/storage';
```
*Note: `S3StorageAdapter` requires `@aws-sdk/client-s3`.*

---

## Testing Mode

You can now test your bot logic locally without sending real HTTP requests to Meta.

### Enable Mocking
In your test script or local development entry point:

```typescript
import { enableMocking, createConsole } from '@whatsapp-wrapper-ultraguay/whatsapp-wrapper-ultraguay/testing';

// 1. Enable Mocking (intercepts HTTP requests)
enableMocking();

// 2. Start the interactive console
createConsole({
  onInput: async (text) => {
    // Inject text into your bot logic here
    // e.g., call your handleMessage function
  }
}).start();
```

The console will intercept outgoing messages and display them in your terminal.
