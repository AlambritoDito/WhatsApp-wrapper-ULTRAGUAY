import { sendText } from '../src/send/sendText';
import { httpClient } from '../src/http/httpClient';
jest.mock('../src/http/httpClient');

test('sendText posts correct payload', async () => {
  (httpClient.post as jest.Mock).mockResolvedValue({ status: 200 });
  await sendText('5211234567890', 'Hola');
  expect(httpClient.post).toHaveBeenCalledWith('', expect.objectContaining({ to: '5211234567890' }));
});
