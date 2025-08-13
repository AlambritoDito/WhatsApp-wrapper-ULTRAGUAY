import dotenv from 'dotenv';
import express from 'express';

import { sendText } from '../send/sendText';
import { httpClient } from '../http/httpClient';
import { WhatsappWrapper } from '../whatsappWrapper';

dotenv.config();

async function sendImage(to: string, mediaId: string): Promise<void> {
  await httpClient.post('', {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { id: mediaId }
  });
}

const wa = new WhatsappWrapper({
  accessToken: process.env.META_TOKEN!,
  appSecret: process.env.APP_SECRET!
});

wa.onImage(async (ctx) => {
  await sendImage(ctx.from, ctx.image.mediaId);
});

const app = express();
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WEBHOOK_SECRET) {
    return res.status(200).send(challenge as string);
  }
  return res.sendStatus(403);
});

app.post('/webhook', async (req: any, res) => {
  try {
    await wa.handleWebhook({ headers: req.headers, rawBody: req.rawBody, json: req.body });
    res.sendStatus(200);
  } catch (e) {
    console.error('webhook error', e);
    res.sendStatus(500);
  }
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
  const to = process.env.TO_PHONE;
  if (to) {
    sendText(to, 'Send me an image and I will send it back!');
  }
});
