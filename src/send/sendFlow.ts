import { httpClient } from '../http/httpClient';
import { InteractiveMessage } from '../types/WhatsApp';

export interface FlowOptions {
    header?: string;
    body: string;
    footer?: string;
    flowId: string;
    flowToken: string;
    ctaText: string;
    mode?: 'draft' | 'published';
    screen?: string;
    data?: Record<string, any>;
}

export async function sendFlow(
    to: string,
    options: FlowOptions
): Promise<void> {
    const payload: InteractiveMessage = {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
            type: 'flow',
            body: { text: options.body },
            action: {
                name: 'flow',
                parameters: {
                    mode: options.mode ?? 'published',
                    flow_message_version: '3',
                    flow_token: options.flowToken,
                    flow_id: options.flowId,
                    flow_cta: options.ctaText,
                    flow_action: 'navigate',
                    flow_action_payload: {
                        screen: options.screen ?? 'WELCOME_SCREEN',
                        data: options.data,
                    },
                },
            },
        },
    };

    if (options.header) {
        (payload.interactive as any).header = { type: 'text', text: options.header };
    }
    if (options.footer) {
        (payload.interactive as any).footer = { text: options.footer };
    }

    await httpClient.post('', payload);
}
