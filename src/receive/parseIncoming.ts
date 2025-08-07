export type Incoming =
  | { from: string; type: 'text';     payload: string }
  | { from: string; type: 'button';   payload: string }
  | {
      from: string; type: 'location';
      payload: {
        latitude: number;
        longitude: number;
        name?: string;
        address?: string;
        url?: string;
      }
    };

export function parseIncoming(body: any): Incoming {
  const entry  = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value  = change?.value;
  const msg    = value?.messages?.[0];

  const from = String(msg?.from ?? '');

  // 1) Interactive (button/list reply)
  if (msg?.type === 'interactive') {
    const i = msg.interactive;
    if (i?.type === 'button_reply' && i?.button_reply?.id) {
      return { from, type: 'button', payload: String(i.button_reply.id) };
    }
    if (i?.type === 'list_reply' && i?.list_reply?.id) {
      return { from, type: 'button', payload: String(i.list_reply.id) };
    }
  }

  // 2) Ubicación (cuando el usuario comparte)
  if (msg?.type === 'location' && msg.location) {
    const loc = msg.location;
    return {
      from,
      type: 'location',
      payload: {
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        name: loc.name,
        address: loc.address,
        url:     (loc as any).url, // algunos proveedores lo incluyen
      },
    };
  }

  // 3) Fallback antiguo (algunos payloads legacy)
  if (msg?.button?.payload) {
    return { from, type: 'button', payload: String(msg.button.payload) };
  }

  // 4) Texto libre
  const text = String(msg?.text?.body ?? '');
  return { from, type: 'text', payload: text };
}