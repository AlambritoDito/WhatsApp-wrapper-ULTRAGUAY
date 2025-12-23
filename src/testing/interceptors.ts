import { Utils } from 'handlebars';
import { httpClient } from '../http/httpClient';
import { MockAdapter } from './mockAdapter';

/**
 * Enables the mock adapter by attaching an Axios interceptor to the global httpClient.
 * This intercepts all outgoing POST requests and redirects them to the MockAdapter
 * instead of sending them over the network.
 */
export function enableMocking() {
    httpClient.interceptors.request.use(async (config) => {
        if (config.method?.toLowerCase() === 'post') {
            const body = config.data;

            // Determine type based on payload structure
            // This is a rough mapping based on WhatsApp Cloud API structure
            let type: 'text' | 'interactive' | 'location_request' | 'location' = 'text';

            if (body.type === 'text') {
                type = 'text';
            } else if (body.type === 'interactive') {
                type = 'interactive';
            } else if (body.type === 'location') {
                type = 'location';
            }

            // Emit to mock adapter
            MockAdapter.emitOutgoing({
                type: type as any, // Using 'any' briefly to map generic struct to specific Union
                to: body.to,
                body: body.text?.body || body.interactive?.body?.text || 'No Body',
                // Map other fields if necessary for console display
                ...extractExtraFields(body)
            });

            // Cancel the actual request by throwing a special error or returning a mock response
            // Axios adapters are the "correct" way, but interceptors are easier to inject.
            // To stop the request here, we can use the adapter property ONLY for this request
            // OR allow it to fail? 
            // Better: we can set the adapter on the config to a dummy one just for this request.
            config.adapter = async () => {
                return {
                    data: { success: true, mocked: true },
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    config
                };
            };
        }
        return config;
    });

    console.log('🧪 Mock Mode Enabled: Network requests are intercepted.');
}

function extractExtraFields(body: any): any {
    const extra: any = {};
    if (body.interactive) {
        if (body.interactive.action && body.interactive.action.buttons) {
            extra.buttons = body.interactive.action.buttons.map((b: any) => ({
                id: b.reply.id,
                title: b.reply.title
            }));
        }
    }
    if (body.type === 'location') {
        extra.lat = body.location.latitude;
        extra.long = body.location.longitude;
        extra.name = body.location.name;
        extra.address = body.location.address;
    }
    return extra;
}
