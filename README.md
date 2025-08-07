# whatsapp-wrapper

**Modular TypeScript wrapper for Meta's WhatsApp Cloud API**

This project provides a set of typed and reusable tools to:

- **Send messages** (text, buttons, templates, images, documents).
- **Receive** and **parse** webhook events (text and button messages).
- **Verify webhook security** with HMAC signature.
- **Handle errors** from the WhatsApp API in a clear and consistent way.

---

## 📦 Main Features

- ✅ **sendText(to, message)**  
  Sends a plain text message.

- ✅ **sendInteractive(to, body, buttons)**  
  Sends a message with interactive "quick reply" buttons.

- ✅ **sendTemplate(to, name, lang, components?)**  
  Sends pre‑approved templates.

- ✅ **sendImage(to, imageUrl, caption?)**  
  Sends an image from a public URL.

- ✅ **sendDocument(to, fileUrl, filename)**  
  Sends documents (PDF, Word, etc.).

- 🔁 **startWebhookServer(port)**  
  Spins up an Express server that:
  - Verifies the subscription token on GET `/webhook`.
  - Verifies the HMAC‑256 signature on POST `/webhook`.
  - Automatically parses the body and emits the cleaned message.

- 🧩 **parseIncoming(body)**  
  Normalizes the webhook payload and returns:

  ```ts
  { from: string; type: 'text' | 'button'; payload: string }
  ```

- 🔐 **verifySignature(req, res, next)**  
  Express middleware to validate `X-Hub-Signature-256`.

- 🔧 **formatPhone(phone: string)**  
  Cleans and converts a number to international format (digits only).

- 📋 **WhatsAppError**  
  Custom error class encapsulating `statusCode` and details.

---

## 🚀 Installation

1. Clone the repository:

   ```bash
   git clone git@github.com:AlambritoDito/WhatsApp-wrapper-ULTRAGUAY.git
   cd WhatsApp-wrapper-ULTRAGUAY
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy and edit the example environment file:

   ```bash
   cp .env.example .env
   # Fill in META_TOKEN, PHONE_NUMBER_ID, WEBHOOK_SECRET and TEST_PHONE...
   ```

4. To run a TypeScript example (see next section):

   ```bash
   npx ts-node demo.ts
   ```

5. To compile to JavaScript:

   ```bash
   npm run build
   ```

6. To run tests:

   ```bash
   npm test
   ```

7. In the `scripts/` folder you'll find utilities to send test messages.  
   These scripts use the `TEST_PHONE` variable from your `.env` to determine
   the recipient. Keeping the test number in an environment variable prevents
   sharing it or accidentally committing it to the repository – a good practice
   for future tests and validation scripts for the wrapper.

---

## ▶️ Running an Example

1. Create a `demo.ts` file at the root of the repository:

   ```ts
   import { sendText, startWebhookServer } from './src';

   async function main() {
     await sendText('5213312345678', 'Hello from the wrapper');
     startWebhookServer(3000);
   }

   main();
   ```

2. Execute the script above with:

   ```bash
   npx ts-node demo.ts
   ```

   This sends a message to the specified number and starts a webhook
   server on port `3000`. Make sure you configured your `.env` file first.

---

## ⚙️ Configuration

Define the following in your `.env` file:

```bash
META_TOKEN=your_permanent_token
PHONE_NUMBER_ID=your_phone_number_id
WEBHOOK_SECRET=your_webhook_verify_token
TEST_PHONE=5213300000000
```

- **META_TOKEN** – your permanent token from the WhatsApp Cloud API.
- **PHONE_NUMBER_ID** – the ID of the WhatsApp number configured in Meta.
- **WEBHOOK_SECRET** – the same value registered when configuring your webhook in Meta.
- **TEST_PHONE** – WhatsApp test number used by the scripts in the `scripts/` folder. Defining it as an environment variable avoids exposing it accidentally in the repository.

### Generate the `WEBHOOK_SECRET`

To generate a secure `WEBHOOK_SECRET` using Node.js, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This returns a 64‑character hexadecimal string (256 bits), for example:

`3f1a8e4c9d2b7f6e5a4c3b2d1f0e9a8c7b6d5e4f3a2b1c0d...`

Copy that string into your `.env` file as the value of `WEBHOOK_SECRET`:

```bash
WEBHOOK_SECRET=3f1a8e4c9d2b7f6e5a4c3b2d1f0e9a8c7b6d5e4f3a2b1c0d
```

---

## 📖 Usage Examples

### 1. Send a text message

```ts
import { sendText } from '@alan/whatsapp-wrapper';

await sendText('5213312345678', 'Hello from my wrapper!');
```

### 2. Send interactive buttons

```ts
import { sendInteractive } from '@alan/whatsapp-wrapper';

await sendInteractive(
  '5213312345678',
  'What would you like to do?',
  [
    { id: 'view_rooms', title: 'View rooms' },
    { id: 'schedule_visit', title: 'Schedule visit' },
  ],
);
```

### 3. Start the webhook server

```ts
import { startWebhookServer } from '@alan/whatsapp-wrapper';

startWebhookServer(3000);
// GET /webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// POST /webhook with JSON from Meta
```

### 4. Process incoming messages

```ts
import express from 'express';
import { startWebhookServer, parseIncoming } from '@alan/whatsapp-wrapper';

const app = express();
startWebhookServer(3000);

app.post('/webhook', (req, res) => {
  const { from, type, payload } = parseIncoming(req.body);
  if (type === 'button') {
    // payload == button id
  } else {
    // payload == free text
  }
  res.sendStatus(200);
});
```

---

## 🛠️ Folder Structure

```
whatsapp-wrapper/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── config/         # Environment loading and base URLs
│   ├── http/           # Axios client and retry interceptor
│   ├── types/          # TypeScript interfaces and types
│   ├── send/           # Functions to send messages
│   ├── receive/        # Webhook server and payload parser
│   ├── utils/          # Formatting, signature, logger
│   └── errors/         # Custom error classes
└── tests/              # Unit tests with Jest
```

---

## 📈 Integrating into your projects

1. Publish to a private registry or use the Git URL:

   ```bash
   npm install git+ssh://git@github.com:AlambritoDito/WhatsApp-wrapper-ULTRAGUAY.git
   ```

2. In your code:

   ```ts
   import {
     sendText,
     sendInteractive,
     startWebhookServer,
     parseIncoming
   } from '@alan/whatsapp-wrapper';
   ```

3. That's it! You now have a light and robust abstraction layer over the WhatsApp API.

---

## 🤝 Contributions

Contributions are welcome! If you want to improve the wrapper:

1. Fork the repo and create your feature branch: `git checkout -b feature/new-feature`
2. Make sure to add tests.
3. Submit your pull request.

