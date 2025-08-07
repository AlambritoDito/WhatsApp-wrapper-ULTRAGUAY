import { httpClient } from '../http/httpClient';
import { TemplateComponents } from '../types/WhatsApp';

export async function sendTemplate(
  to: string,
  templateName: string,
  templateLanguage: string,
  components?: TemplateComponents[]
): Promise<void> {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components: components || []
    }
  };
  await httpClient.post('', payload);
}
