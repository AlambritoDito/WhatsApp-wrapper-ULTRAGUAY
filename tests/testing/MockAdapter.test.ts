import { describe, it, expect, vi } from 'vitest';
import { MockAdapter } from '../../src/testing/MockAdapter';

describe('MockAdapter', () => {
  it('should record messages', () => {
    const mock = new MockAdapter();

    mock.record('POST', '/messages', { to: '555', type: 'text' });
    mock.record('POST', '/messages', { to: '666', type: 'image' });

    expect(mock.messages).toHaveLength(2);
  });

  it('should return lastMessage', () => {
    const mock = new MockAdapter();

    mock.record('POST', '/messages', { to: '555', type: 'text' });
    mock.record('POST', '/messages', { to: '666', type: 'image' });

    expect(mock.lastMessage?.body).toEqual({ to: '666', type: 'image' });
  });

  it('should return undefined for lastMessage when empty', () => {
    const mock = new MockAdapter();
    expect(mock.lastMessage).toBeUndefined();
  });

  it('should clear messages', () => {
    const mock = new MockAdapter();
    mock.record('POST', '/messages', { to: '555' });
    expect(mock.messages).toHaveLength(1);

    mock.clear();
    expect(mock.messages).toHaveLength(0);
  });

  it('should filter messagesTo()', () => {
    const mock = new MockAdapter();
    mock.record('POST', '/messages', { to: '555', type: 'text' });
    mock.record('POST', '/messages', { to: '666', type: 'text' });
    mock.record('POST', '/messages', { to: '555', type: 'image' });

    const to555 = mock.messagesTo('555');
    expect(to555).toHaveLength(2);
  });

  it('should filter messagesOfType()', () => {
    const mock = new MockAdapter();
    mock.record('POST', '/messages', { to: '555', type: 'text' });
    mock.record('POST', '/messages', { to: '666', type: 'image' });
    mock.record('POST', '/messages', { to: '555', type: 'text' });

    const texts = mock.messagesOfType('text');
    expect(texts).toHaveLength(2);
  });

  it('should emit "outgoing" event', () => {
    const mock = new MockAdapter();
    const handler = vi.fn();
    mock.on('outgoing', handler);

    mock.record('POST', '/messages', { to: '555' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toMatchObject({
      method: 'POST',
      path: '/messages',
    });
  });
});
