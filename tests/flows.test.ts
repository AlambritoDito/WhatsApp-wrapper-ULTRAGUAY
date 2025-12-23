import { sendFlow } from '../src/send/sendFlow';
import { parseIncoming, InboundFlowMessage } from '../src/receive/parseIncoming';
import { httpClient } from '../src/http/httpClient';

// Mock httpClient
jest.mock('../src/http/httpClient', () => ({
    httpClient: {
        post: jest.fn(),
    },
}));

describe('Flows Support', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('sendFlow', () => {
        it('should send a correctly formatted flow message', async () => {
            const to = '1234567890';
            const options = {
                header: 'Sign Up',
                body: 'Please complete the registration.',
                footer: 'Acme Corp',
                flowId: 'flow_123',
                flowToken: 'token_abc',
                ctaText: 'Register Now',
                screen: 'SIGNUP_SCREEN',
                data: { promo: '123' },
            };

            await sendFlow(to, options);

            expect(httpClient.post).toHaveBeenCalledWith('', {
                messaging_product: 'whatsapp',
                to,
                type: 'interactive',
                interactive: {
                    type: 'flow',
                    header: { type: 'text', text: 'Sign Up' },
                    body: { text: 'Please complete the registration.' },
                    footer: { text: 'Acme Corp' },
                    action: {
                        name: 'flow',
                        parameters: {
                            mode: 'published',
                            flow_message_version: '3',
                            flow_token: 'token_abc',
                            flow_id: 'flow_123',
                            flow_cta: 'Register Now',
                            flow_action: 'navigate',
                            flow_action_payload: {
                                screen: 'SIGNUP_SCREEN',
                                data: { promo: '123' },
                            },
                        },
                    },
                },
            });
        });

        it('should use default values for optional parameters', async () => {
            const to = '1234567890';
            const options = {
                body: 'Simple Flow',
                flowId: 'flow_999',
                flowToken: 'token_999',
                ctaText: 'Click Me',
            };

            await sendFlow(to, options);

            expect(httpClient.post).toHaveBeenCalledWith('', expect.objectContaining({
                interactive: expect.objectContaining({
                    body: { text: 'Simple Flow' },
                    action: expect.objectContaining({
                        parameters: expect.objectContaining({
                            mode: 'published',
                            flow_action: 'navigate',
                            flow_action_payload: {
                                screen: 'WELCOME_SCREEN',
                            },
                        }),
                    }),
                }),
            }));
        });
    });

    describe('parseIncoming - Flow Response', () => {
        it('should correctly parse an nfm_reply (Flow Response)', () => {
            const mockWebhookPayload = {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            from: '1234567890',
                                            id: 'wamid.HBgLM...',
                                            timestamp: '1700000000',
                                            type: 'interactive',
                                            interactive: {
                                                type: 'nfm_reply',
                                                nfm_reply: {
                                                    response_json: '{"name":"Alan","age":30}',
                                                    body: 'Sent',
                                                    name: 'flow',
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            };

            const result = parseIncoming(mockWebhookPayload);

            expect(result).toHaveLength(1);
            const msg = result[0] as InboundFlowMessage;
            expect(msg.type).toBe('flow_response');
            expect(msg.response.json).toEqual({ name: 'Alan', age: 30 });
            expect(msg.response.body).toBe('Sent');
        });

        it('should handle invalid JSON in nfm_reply gracefully', () => {
            const mockWebhookPayload = {
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            from: '1234567890',
                                            id: 'wamid.HBgLM...',
                                            timestamp: '1700000000',
                                            type: 'interactive',
                                            interactive: {
                                                type: 'nfm_reply',
                                                nfm_reply: {
                                                    response_json: '{invalid-json}',
                                                    body: 'Error',
                                                    name: 'flow',
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            };

            const result = parseIncoming(mockWebhookPayload);

            expect(result).toHaveLength(1);
            const msg = result[0] as InboundFlowMessage;
            expect(msg.type).toBe('flow_response');
            expect(msg.response.json).toEqual({});
        });
    });
});
