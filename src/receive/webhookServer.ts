import express from 'express';
import bodyParser from 'body-parser';
import { verifySignature } from '../utils/verifySignature';
import { parseIncoming } from './parseIncoming';

export function startWebhookServer(port: number) {
  const app = express();
  app.use(bodyParser.json({ verify: (req, res, buf) => ((req as any).rawBody = buf) }));

  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WEBHOOK_SECRET) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  });

  app.post('/webhook', verifySignature, (req, res) => {
    const incoming = parseIncoming(req.body);
    console.log('Incoming:', incoming);
    res.sendStatus(200);
  });

  app.listen(port, () => console.log(`Webhook listening on ${port}`));
}
