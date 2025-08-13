import { parseIncoming } from '../src/receive/parseIncoming';

test('parseIncoming maps image message', () => {
  const body = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: 'wamid',
                  from: '123',
                  timestamp: '1700000000',
                  type: 'image',
                  image: { id: 'media123', mime_type: 'image/png', sha256: 'abc' },
                },
              ],
            },
          },
        ],
      },
    ],
  };
  const result = parseIncoming(body);
  expect(result).toEqual([
    {
      from: '123',
      timestamp: 1700000000,
      wamid: 'wamid',
      type: 'image',
      image: { mediaId: 'media123', mimeType: 'image/png', sha256: 'abc' },
    },
  ]);
});
