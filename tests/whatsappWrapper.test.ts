import crypto from 'crypto';
import { WhatsappWrapper } from '../src/whatsappWrapper';

test('handleWebhook triggers image callback without crashing on multiple messages', async () => {
  const wrapper = new WhatsappWrapper({ accessToken: 'token', appSecret: 'secret' });
  let called = 0;
  wrapper.onImage(() => { called++; });
  const body = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                { id: '1', from: '111', timestamp: '1', type: 'image', image: { id: 'm1', mime_type: 'image/jpeg' } },
                { id: '2', from: '111', timestamp: '1', type: 'text', text: { body: 'hi' } },
              ],
            },
          },
        ],
      },
    ],
  };
  const raw = Buffer.from(JSON.stringify(body));
  const sig = 'sha256=' + crypto.createHmac('sha256', 'secret').update(raw).digest('hex');
  await wrapper.handleWebhook({ headers: { 'x-hub-signature-256': sig }, rawBody: raw, json: body });
  await new Promise((r) => setImmediate(r));
  expect(called).toBe(1);
});
