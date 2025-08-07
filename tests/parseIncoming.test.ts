import { parseIncoming } from '../src/receive/parseIncoming';

test('parseIncoming extracts button payload', () => {
  const mock = { entry: [{ changes: [{ value: { messages: [{ from: '521', button: { payload: 'ok' } }] } }] }] };
  const result = parseIncoming(mock);
  expect(result).toEqual({ from: '521', type: 'button', payload: 'ok' });
});