// scripts/server.ts
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';

import { parseIncoming } from '../src/receive/parseIncoming';
import { sendText } from '../src/send/sendText';
import { verifySignature } from '../src/utils/verifySignature';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ALLOW_UNSIGNED = process.env.ALLOW_UNSIGNED_TESTS === 'true';
const DISABLE_SIGNATURE = process.env.DISABLE_SIGNATURE === 'true';

// Guarda el body crudo para calcular/verificar firma
app.use(bodyParser.json({
  verify: (req: any, _res, buf) => { req.rawBody = buf; }
}));

// Logger básico de requests
app.use((req, _res, next) => {
  const when = new Date().toISOString();
  const sig = req.headers['x-hub-signature-256'];
  console.log(`\n[${when}] ${req.method} ${req.url}`);
  console.log('Signature header present?:', Boolean(sig));
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Health-check para testear el túnel
app.get('/health', (_req, res) => res.send('ok'));

// Handshake GET (Verify & Save)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_SECRET) {
    console.log('✅ GET /webhook verified with correct token');
    return res.status(200).send(challenge as string);
  }
  console.warn('❌ GET /webhook verification failed (bad token or mode)');
  return res.sendStatus(403);
});

// Handler base: imprime crudo y parsea; puede enviar auto-replies
async function baseHandler(req: express.Request, res: express.Response) {
  try {
    const raw = (req as any).rawBody?.toString?.() ?? '<no raw body>';
    console.log('Incoming JSON (raw):', raw);
    console.log('Incoming JSON (parsed):', JSON.stringify(req.body, null, 2));

    // Intenta parsear como mensaje de WhatsApp (si aplica)
    try {
      const parsed = parseIncoming(req.body);
      console.log('Incoming parsed:', parsed);

      // Ejemplo de auto-reply solo para flujos reales (no esperes respuesta en “Probar”)
      if (parsed?.from) {
        if (parsed.type === 'button') {
          await sendText(parsed.from, `You clicked: ${parsed.payload}`);
        } else if (parsed.type === 'text' && parsed.payload) {
          await sendText(parsed.from, `You said: ${parsed.payload}`);
        }
      }
    } catch (e) {
      console.log('Not a standard WhatsApp message payload (that is OK for Meta UI tests).');
    }

    res.sendStatus(200);
  } catch (e: any) {
    console.error('Handler error:', e.message ?? e);
    res.sendStatus(500);
  }
}

// POST /webhook con lógica de firma flexible para “Probar”
app.post('/webhook', (req, res, next) => {
  const hasSig = Boolean(req.headers['x-hub-signature-256']);

  if (DISABLE_SIGNATURE) {
    console.warn('⚠️  Signature verification DISABLED (debug mode)');
    return baseHandler(req, res);
  }

  if (!hasSig && ALLOW_UNSIGNED) {
    console.warn('⚠️  No signature header; allowing because ALLOW_UNSIGNED_TESTS=true');
    return baseHandler(req, res);
  }

  // Verificar firma si está presente (o si no permitimos unsigned)
  (verifySignature as any)(req, res, (err?: any) => {
    if (err) return; // verifySignature ya respondió 401
    return baseHandler(req, res);
  });
});

app.listen(PORT, () => {
  console.log(`\n🔊 Webhook debug server listening on port ${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/health`);
  console.log(`   Webhook:   http://localhost:${PORT}/webhook`);
  console.log(`   Signature: ${DISABLE_SIGNATURE ? 'DISABLED' : (ALLOW_UNSIGNED ? 'ALLOW_UNSIGNED' : 'STRICT')}`);
});