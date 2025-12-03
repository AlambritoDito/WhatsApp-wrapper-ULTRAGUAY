import nock from 'nock';

import { MediaClient } from '../src/media/MediaClient';

describe('MediaClient', () => {
  const mc = new MediaClient({ accessToken: 'token' });

  test('getMediaMetadata retrieves url and mimeType', async () => {
    const scope = nock('https://graph.facebook.com')
      .get('/v20.0/123')
      .reply(200, { url: 'https://cdn.example.com/file', mime_type: 'image/png' });
    const meta = await mc.getMediaMetadata('123');
    expect(meta).toEqual({ url: 'https://cdn.example.com/file', mimeType: 'image/png' });
    scope.done();
  });

  test('downloadMedia downloads with auth header', async () => {
    nock('https://graph.facebook.com')
      .get('/v20.0/123')
      .reply(200, { url: 'https://cdn.example.com/file', mime_type: 'image/jpeg' });
    const downloadScope = nock('https://cdn.example.com', {
      reqheaders: { authorization: 'Bearer token' },
    })
      .get('/file')
      .reply(200, Buffer.from('hello'));
    const meta = await mc.getMediaMetadata('123');
    const buf = await mc.downloadMedia(meta.url);
    expect(buf.toString()).toBe('hello');
    downloadScope.done();
  });
});
