import { WhatsappWrapper, DiskStorageAdapter } from '@alan/whatsapp-wrapper';
import express from 'express';

const app = express();
app.use(express.json({ verify: (req: any, _res, buf) => { (req as any).rawBody = buf; } }));

const wa = new WhatsappWrapper({
  accessToken: process.env.WABA_TOKEN!,
  appSecret: process.env.APP_SECRET!,
  storage: new DiskStorageAdapter('./uploads'),
});

wa.onImage(async (ctx) => {
  const saved = await ctx.save();
  console.log('Saved image at', saved.location);
});

app.post('/webhook', async (req: any, res) => {
  await wa.handleWebhook({ headers: req.headers, rawBody: req.rawBody, json: req.body });
  res.sendStatus(200);
});

app.listen(3000);
