import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import Jimp from 'jimp';
import jsQR from 'jsqr';
// qrcode-reader has no types; import as any (fallback)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import QrCode from 'qrcode-reader';

import { WhatsappWrapper } from '../src/whatsappWrapper';
import { sendText } from '../src/send/sendText';

async function decodeQRFromBuffer(buf: Buffer): Promise<string | null> {
  // Load image with Jimp and optionally rescale/contrast for better detection
  const img = await Jimp.read(buf);
  const minWidth = 400;
  if (img.bitmap.width < minWidth) {
    img.resize(minWidth, Jimp.AUTO);
  }
  // Try jsQR first using RGBA pixel data
  const { data, width, height } = img.bitmap;
  const rgba = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const found = jsQR(rgba, width, height);
  if (found?.data) return found.data;

  // Fallback: qrcode-reader
  return new Promise((resolve) => {
    const qr = new QrCode();
    qr.callback = (_err: any, value: any) => {
      const result: string | undefined = value?.result ?? value?.data;
      resolve(result || null);
    };
    qr.decode(img.bitmap);
  });
}

const wa = new WhatsappWrapper({
  accessToken: process.env.META_TOKEN!,
  appSecret: process.env.APP_SECRET!,
});

wa.onImage(async (ctx) => {
  try {
    const buf = await ctx.download();
    const decoded = await decodeQRFromBuffer(buf);
    if (decoded) {
      await sendText(ctx.from, `QR content: ${decoded}`);
    } else {
      await sendText(ctx.from, 'No QR code detected in the image.');
    }
  } catch (e: any) {
    await sendText(ctx.from, `Failed to read QR: ${e?.message ?? e}`);
  }
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
  console.log(`QR Reader bot listening on port ${PORT}`);
  const to = process.env.TEST_PHONE;
  if (to) {
    sendText(to, 'Send me an image with a QR code; I will reply with its contents.').catch((err: any) => {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('Failed to send initial text', { status, data, message: err?.message });
      console.error('Check META_TOKEN and PHONE_NUMBER_ID in your .env');
    });
  }
});
