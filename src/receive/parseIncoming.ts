export type Incoming =
  | { from: string; type: 'text';   payload: string }
  | { from: string; type: 'button'; payload: string };

export function parseIncoming(body: any): Incoming {
  const entry  = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value  = change?.value;
  const msg    = value?.messages?.[0];

  const from = String(msg?.from ?? '');

  // Interactive (formato actual)
  if (msg?.type === 'interactive') {
    const i = msg.interactive;
    // Button reply
    if (i?.type === 'button_reply' && i?.button_reply?.id) {
      return { from, type: 'button', payload: String(i.button_reply.id) };
    }
    // List reply
    if (i?.type === 'list_reply' && i?.list_reply?.id) {
      return { from, type: 'button', payload: String(i.list_reply.id) };
    }
  }

  // Fallback antiguo (algunas cuentas/envíos legacy aún lo mandan)
  if (msg?.button?.payload) {
    return { from, type: 'button', payload: String(msg.button.payload) };
  }

  // Texto libre
  const text = String(msg?.text?.body ?? '');
  return { from, type: 'text', payload: text };
}