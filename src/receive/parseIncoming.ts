export interface InboundBaseMessage {
  from: string;
  timestamp: number;
  wamid: string;
}

export interface InboundTextMessage extends InboundBaseMessage {
  type: 'text';
  text: string;
}

export interface InboundButtonReplyMessage extends InboundBaseMessage {
  type: 'button';
  buttonId: string;
}

export interface InboundLocationMessage extends InboundBaseMessage {
  type: 'location';
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    url?: string;
  };
}

export interface InboundImageMessage extends InboundBaseMessage {
  type: 'image';
  image: {
    mediaId: string;
    mimeType: string;
    sha256?: string;
  };
}

export type InboundMessage =
  | InboundTextMessage
  | InboundButtonReplyMessage
  | InboundLocationMessage
  | InboundImageMessage;

function parseSingle(msg: any): InboundMessage {
  const base: InboundBaseMessage = {
    from: String(msg?.from ?? ''),
    timestamp: Number(msg?.timestamp ?? 0),
    wamid: String(msg?.id ?? ''),
  };

  if (msg?.type === 'interactive') {
    const i = msg.interactive;
    if (i?.type === 'button_reply' && i?.button_reply?.id) {
      return { ...base, type: 'button', buttonId: String(i.button_reply.id) };
    }
    if (i?.type === 'list_reply' && i?.list_reply?.id) {
      return { ...base, type: 'button', buttonId: String(i.list_reply.id) };
    }
  }

  if (msg?.type === 'location' && msg.location) {
    const loc = msg.location;
    return {
      ...base,
      type: 'location',
      location: {
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        name: loc.name,
        address: loc.address,
        url: (loc as any).url,
      },
    };
  }

  if (msg?.type === 'image' && msg.image) {
    return {
      ...base,
      type: 'image',
      image: {
        mediaId: String(msg.image.id),
        mimeType: String(msg.image.mime_type ?? 'image/jpeg'),
        sha256: msg.image.sha256,
      },
    };
  }

  if (msg?.button?.payload) {
    return { ...base, type: 'button', buttonId: String(msg.button.payload) };
  }

  return { ...base, type: 'text', text: String(msg?.text?.body ?? '') };
}

export function parseIncoming(body: any): InboundMessage[] {
  const messages: any[] =
    body?.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
  return messages.map(parseSingle);
}
