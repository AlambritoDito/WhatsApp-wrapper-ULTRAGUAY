import { httpClient } from '../http/httpClient';

export async function sendLocation(
  to: string,
  latitude: number,
  longitude: number,
  name?: string,
  address?: string
) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'location',
    location: { latitude, longitude, name, address }
  };

  await httpClient.post('', payload); // usa baseURL del httpClient
}