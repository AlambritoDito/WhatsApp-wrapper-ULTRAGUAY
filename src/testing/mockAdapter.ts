
import { EventEmitter } from 'events';

export type OutgoingMessage =
    | { type: 'text'; to: string; body: string }
    | { type: 'interactive'; to: string; body: string; buttons: { id: string; title: string }[] }
    | { type: 'location_request'; to: string; body: string }
    | { type: 'location'; to: string; lat: number; long: number; name?: string; address?: string };

class MockAdapterService extends EventEmitter {
    emitOutgoing(msg: OutgoingMessage) {
        this.emit('outgoing', msg);
    }
}

export const MockAdapter = new MockAdapterService();
