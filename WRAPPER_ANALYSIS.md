# 🔍 Análisis Completo: whatsapp-wrapper-ultraguay

**Fecha:** 2026-02-16  
**Versión analizada:** 1.2.0  
**Autor del wrapper:** Alan Pérez Fernández (Brito)  
**Contexto:** Evaluar si vale la pena mantener como librería reutilizable para múltiples bots de WhatsApp (Activachip Copernicus, futuro bot de procesos Perfer, etc.)

---

## 📐 1. Arquitectura

### Estructura de carpetas
```
src/
├── config/       → metaConfig.ts (variables de entorno globales)
├── http/         → httpClient.ts + retryInterceptor.ts (Axios singleton)
├── types/        → WhatsApp.ts + Errors.ts (tipos de mensajes)
├── send/         → sendText, sendInteractive, sendTemplate, sendLocation, sendLocationRequest, sendFlow
├── receive/      → webhookServer.ts (Express) + parseIncoming.ts (parser de mensajes entrantes)
├── media/        → MediaClient.ts (descarga de media del Graph API)
├── storage/      → StorageAdapter (interfaz) + Disk + S3 implementaciones
├── errors/       → WhatsAppError, StorageNotConfiguredError
├── utils/        → verifySignature, formatPhone, logger
├── testing/      → mockAdapter, interceptors, console (REPL local)
└── whatsappWrapper.ts → Clase principal (orquesta media + storage + webhook)
```

### Separación de responsabilidades

**Lo bueno:**
- Los módulos de envío (`send/`) están bien aislados — cada tipo de mensaje tiene su propio archivo
- El patrón `StorageAdapter` con interfaz + implementaciones concretas (Disk, S3) es sólido
- `parseIncoming` está completamente separado del servidor web
- El subpath exports (`/webhook`, `/storage`, `/testing`) es un buen patrón para tree-shaking

**Lo problemático:**
- **Singleton global en `httpClient.ts`**: El módulo crea una instancia global de Axios que lee `META_TOKEN` y `PHONE_NUMBER_ID` de variables de entorno *al importar*. Esto es el problema más grave de toda la librería. Significa que:
  - No puedes usar dos números de WhatsApp en el mismo proceso
  - No puedes inyectar configuración — la config viene de `process.env` y se resuelve en tiempo de importación
  - Los tests necesitan mockear el módulo entero (`jest.mock('../src/http/httpClient')`)
- **Dos APIs paralelas**: La clase `WhatsappWrapper` y las funciones sueltas (`sendText`, `sendInteractive`, etc.) son dos formas diferentes de usar la librería que no se hablan entre sí. `WhatsappWrapper` acepta `accessToken` como parámetro, pero las funciones sueltas usan el singleton global.
- **`metaConfig.ts` con dotenv.config()**: Ejecutar `dotenv.config()` como efecto secundario al importar un módulo de configuración es un anti-patrón en librerías — solo deberían hacerlo las aplicaciones.

### Veredicto de arquitectura: 5/10
Funcional para un solo bot, pero la dependencia en singletons y variables de entorno globales impide la reutilización real como librería.

---

## 📡 2. Cobertura del API de WhatsApp Cloud

### ✅ Lo que cubre

| Feature | Estado | Notas |
|---------|--------|-------|
| Envío de texto | ✅ | Simple y funcional |
| Botones interactivos (reply buttons) | ✅ | Hasta 3 botones |
| Templates | ✅ | Con componentes |
| Envío de ubicación | ✅ | Con nombre y dirección |
| Solicitud de ubicación | ✅ | Interactive location_request_message |
| Flows (WhatsApp Flows) | ✅ | Envío + parseo de nfm_reply |
| Recepción de texto | ✅ | Via parseIncoming |
| Recepción de botones | ✅ | button_reply + list_reply |
| Recepción de ubicación | ✅ | Con todos los campos |
| Recepción de imágenes | ✅ | Con descarga y almacenamiento |
| Recepción de flows | ✅ | nfm_reply con JSON parsing |
| Descarga de media | ✅ | Via MediaClient |
| Upload de media | ❌ | Solo descarga |
| Verificación HMAC | ✅ | SHA-256 correctamente implementado |
| Webhook server (Express) | ✅ | Con health check |

### ❌ Lo que falta

| Feature | Importancia | Notas |
|---------|-------------|-------|
| **Envío de imágenes/video/audio/documentos** | 🔴 Alta | Solo recibe imágenes, no envía ningún tipo de media |
| **Listas interactivas (list messages)** | 🔴 Alta | Parsea list_reply pero NO puede ENVIAR listas |
| **Upload de media** | 🔴 Alta | No puede subir archivos al Graph API |
| **Reactions (emojis)** | 🟡 Media | Útil para confirmaciones |
| **Stickers** | 🟡 Media | Popular en WhatsApp |
| **Contacts (vCards)** | 🟡 Media | Útil para negocios |
| **Mark as read** | 🔴 Alta | Esencial para UX profesional |
| **Recepción de audio/video/documentos** | 🔴 Alta | Solo parsea imágenes |
| **Status updates (Stories)** | 🟢 Baja | Menos común en bots |
| **Business Profile management** | 🟢 Baja | Se puede hacer vía dashboard |
| **Catalog/Product messages** | 🟡 Media | Relevante para e-commerce |
| **Rate limiting inteligente** | 🟡 Media | El retry es genérico, no respeta rate limits |

### Veredicto de cobertura: 4/10
Cubre lo básico para un chatbot simple (texto + botones + ubicación + flows), pero le falta mucho para ser una librería completa. La ausencia de envío de media es sorprendente para una v1.2.0.

---

## 🧱 3. Abstracciones

### ¿Son útiles o estorban?

**Útiles:**
- `parseIncoming()` — Normaliza el payload crudo de Meta a tipos limpios. Esto es genuinamente valioso porque el formato del webhook de Meta es verboso y anidado (`entry[0].changes[0].value.messages[0]`).
- `StorageAdapter` — El patrón strategy para almacenamiento es limpio y extensible.
- `WhatsAppError` con `statusCode`, `details`, y `retryAfter` — Buena estructura para errores.
- `FlowOptions` — Buena interfaz que simplifica la complejidad del payload de Flows.

**Que estorban:**
- Las funciones `sendText()`, `sendInteractive()`, etc. son tan delgadas que casi no agregan valor sobre hacer el POST directo con fetch/axios. Solo construyen el JSON y hacen `httpClient.post('', payload)`. La "abstracción" es ~5 líneas que podrían ser un objeto literal.
- `WhatsappWrapper` class mezcla dos responsabilidades: verificación de webhook + descarga/almacenamiento de imágenes. No maneja envío de mensajes, así que necesitas usar AMBOS: la clase para recibir, y las funciones sueltas para enviar. Diseño fracturado.
- El `WhatsAppConsole` (testing/console.ts) tiene lógica hardcodeada como `BTN:` prefix convention — es un acoplamiento innecesario.

### ¿Demasiado opinionado?
No es demasiado opinionado — más bien es **insuficientemente opinionado**. No establece un patrón claro de uso. ¿Usas la clase o las funciones? ¿Cómo manejas estado de conversación? ¿Cómo registras handlers para diferentes tipos de mensajes? Todo eso queda en el aire.

### Veredicto de abstracciones: 5/10
`parseIncoming` y `StorageAdapter` son las únicas abstracciones que genuinamente ahorran trabajo. El resto es thin wrapper que no justifica la dependencia.

---

## ⚠️ 4. Manejo de Errores

### Retry
- `retryInterceptor.ts` implementa retry con delay fijo (no exponential backoff)
- Retries **todo tipo de error** — no distingue entre 400 (error del dev), 429 (rate limit), y 500 (error de Meta)
- No respeta `Retry-After` header en el interceptor (lo captura en `WhatsAppError` pero no lo usa para esperar)
- No hay circuit breaker

### Error types
- `WhatsAppError` — Limpio, con `statusCode`, `details`, `retryAfter`
- `StorageNotConfiguredError` — Específico y claro
- Pero las funciones de envío (`sendText`, etc.) no capturan errores — dejan que Axios explote. El consumidor recibe `AxiosError` crudo, no `WhatsAppError`

### Failure modes no manejados
- Timeout del token de media (los URLs de descarga de Meta expiran)
- PHONE_NUMBER_ID inválido (falla silenciosamente al construir la URL)
- Rate limiting de la Cloud API (250 msgs/sec por defecto)
- Token expirado
- Webhook timeout (Meta espera respuesta en 20 segundos, pero el handler puede tardar más)

### Veredicto de manejo de errores: 3/10
El retry genérico hace más daño que bien (reintenta errores 400 que nunca van a pasar). `WhatsAppError` es bueno pero solo se usa en `MediaClient`, no en las funciones de envío.

---

## 🖼️ 5. Manejo de Media

### Lo que hace bien
- `MediaClient` es la parte mejor diseñada: acepta `accessToken` por constructor, tiene su propio axios instance, configurable
- Flujo de descarga: `getMediaMetadata(mediaId)` → `downloadMedia(url)` — sigue el patrón correcto de la API de Meta
- `StorageAdapter` interfaz con `DiskStorageAdapter` y `S3StorageAdapter` — patrón strategy limpio
- `WhatsappWrapper.onImage()` provee un callback con `download()` y `save()` pre-configurados — buena DX

### Lo que falta
- **No hay upload de media** — No puede subir imágenes/documentos para enviarlos
- **No hay envío de media** — No hay `sendImage()`, `sendVideo()`, `sendDocument()`, `sendAudio()`
- Solo soporta imágenes en recepción — audio, video, documentos, y stickers se ignoran
- `DiskStorageAdapter.extFromMime()` solo reconoce PNG y JPG — no maneja video, audio, PDF, etc.
- No hay validación de tamaño de archivo (Meta tiene límites: 16MB para media general, 100MB para video)

### Veredicto de media: 4/10
La descarga funciona bien. Pero una librería de WhatsApp que no puede *enviar* media es como un carro sin reversa.

---

## 🔐 6. Manejo de Webhooks

### Verificación de firma
- ✅ HMAC-SHA256 implementado correctamente con `crypto.createHmac`
- ✅ Compara signature como string (vulnerable a timing attack, pero aceptable para este caso)
- ✅ GET verification para suscripción de webhook
- ✅ Opción `allowUnsignedTests` para desarrollo
- ⚠️ `verifySignature.ts` exporta una función que usa `APP_SECRET` del singleton global Y una `createSignatureVerifier` que acepta parámetro — dualidad confusa

### Parseo de mensajes
- ✅ Maneja: text, button_reply, list_reply, location, image, nfm_reply (flows)
- ✅ Fallback a text si no reconoce el tipo
- ❌ No parsea: audio, video, document, sticker, contacts, order, system, referral, ads
- ❌ No extrae metadata de contacto (nombre, profile picture)
- ❌ No maneja statuses (delivered, read, failed) — importante para tracking
- ❌ No maneja errores de entrega

### Event types soportados
```
✅ messages.text
✅ messages.interactive.button_reply
✅ messages.interactive.list_reply
✅ messages.interactive.nfm_reply
✅ messages.location
✅ messages.image
✅ messages.button (legacy quick reply)
❌ messages.audio
❌ messages.video
❌ messages.document
❌ messages.sticker
❌ messages.contacts
❌ messages.order
❌ messages.system
❌ messages.referral
❌ statuses (delivered/read/failed/deleted)
❌ errors
```

### Veredicto de webhooks: 6/10
La verificación de firma está bien. El parseo cubre los tipos más comunes pero ignora statuses, que son cruciales para saber si los mensajes llegaron.

---

## 🧪 7. Testing

### Tests existentes (6 archivos)

| Test | Qué prueba | Calidad |
|------|-----------|---------|
| `whatsappWrapper.test.ts` | handleWebhook con firma válida, callback de imagen | ⭐⭐⭐ Bueno |
| `storageAdapters.test.ts` | DiskStorage escribe archivo, S3Storage sube objeto | ⭐⭐⭐⭐ Muy bueno |
| `sendText.test.ts` | Payload correcto para envío de texto | ⭐⭐ Básico |
| `parseIncoming.test.ts` | Parseo de mensaje de imagen | ⭐⭐ Solo un caso |
| `mediaClient.test.ts` | Metadata + descarga con nock | ⭐⭐⭐⭐ Muy bueno |
| `flows.test.ts` | Envío de flow + parseo de nfm_reply + JSON inválido | ⭐⭐⭐⭐ Muy bueno |

### Mock Adapter
- `enableMocking()` intercepta requests de Axios y las redirige a `MockAdapter` (EventEmitter)
- `WhatsAppConsole` muestra mensajes salientes en terminal — útil para desarrollo local
- Patrón de "BTN:payload" para simular button clicks — funcional pero hacky

### Cobertura
- **Falta mucho**: No hay tests para `sendInteractive`, `sendTemplate`, `sendLocation`, `sendLocationRequest`, `retryInterceptor`, `webhookServer`, `verifySignature`
- `parseIncoming` solo tiene 1 test (imagen) — debería tener tests para texto, botón, ubicación, flow, edge cases
- No hay integration tests
- No hay test de firma inválida rechazada

### Veredicto de testing: 5/10
Los tests que existen están bien escritos (uso de nock, aws-sdk-client-mock), pero la cobertura es baja. Los flujos más críticos (verificación de firma, retry) no tienen tests.

---

## 📤 8. Capacidades de Envío

| Tipo de mensaje | Soportado | Calidad |
|----------------|-----------|---------|
| Texto simple | ✅ | Bien, pero no soporta preview_url ni formatting |
| Botones (reply buttons) | ✅ | Funcional, max 3 botones |
| Listas (list messages) | ❌ | **NO soportado** — es muy importante |
| Templates | ✅ | Funcional, con componentes |
| Ubicación (pin) | ✅ | Con nombre y dirección |
| Solicitud de ubicación | ✅ | Interactive location_request |
| WhatsApp Flows | ✅ | Con navigate action |
| Imagen | ❌ | No |
| Video | ❌ | No |
| Audio | ❌ | No |
| Documento | ❌ | No |
| Sticker | ❌ | No |
| Contacto (vCard) | ❌ | No |
| Reaction | ❌ | No |
| Mark as read | ❌ | No |

### Notas
- Ninguna función de envío retorna el `wamid` del mensaje — pierdes la referencia para tracking
- No hay opción para `context.message_id` (reply/quote a un mensaje específico)
- No soporta `preview_url: true` para links en texto

### Veredicto de envío: 4/10
Cubre texto, botones, templates, ubicación y flows. Pero la ausencia de listas y media es grave para bots en producción.

---

## 🔒 9. Type Safety

### Lo bueno
- TypeScript strict mode activado
- `InboundMessage` es un discriminated union por `type` — buen patrón
- `FlowOptions` tipado correctamente
- `StorageAdapter` interfaz genérica

### Lo problemático
- **`InteractiveMessage`** usa `any` para `parameters` en el tipo flow — pierde type safety justo donde más importa
- **`TemplateComponents`** tiene `[key: string]: any` — básicamente `any`
- **`WebhookEntry`** tiene `messages?: any[]` — el tipo más importante del webhook es `any`
- `parseIncoming` acepta `body: any` — no hay validación de schema
- `WhatsappWrapper.handleWebhook` acepta `headers: any`
- Las funciones de envío no tipan la respuesta — todas retornan `Promise<void>` cuando deberían retornar el `wamid`

### Tipos que faltan
- No hay tipos para la respuesta del API de Meta (message ID, error responses)
- No hay tipos para template components específicos (header image, body parameters, button URLs)
- No hay Zod/io-ts/ajv para validación runtime del webhook payload

### Veredicto de type safety: 4/10
Los tipos internos están bien, pero los tipos del API (lo que realmente importa para los consumidores) son mayormente `any`. Esto anula gran parte del beneficio de usar TypeScript.

---

## 🔧 10. Extensibilidad

### Agregar un nuevo tipo de mensaje de envío
**Dificultad: Fácil** (3-5 minutos)
1. Crear `src/send/sendNewType.ts`
2. Importar `httpClient`, construir payload, hacer POST
3. Exportar desde `src/index.ts`
4. Problema: queda acoplado al singleton global

### Agregar un nuevo tipo de mensaje de recepción
**Dificultad: Fácil** (5-10 minutos)
1. Agregar nueva interfaz a `parseIncoming.ts`
2. Agregar al union type `InboundMessage`
3. Agregar case en `parseSingle()`
4. Problema: si quieres handler en `WhatsappWrapper`, solo hay `onImage()` — necesitarías agregar `onAudio()`, `onDocument()`, etc.

### Agregar un nuevo storage adapter
**Dificultad: Trivial** (5 minutos)
Implementar la interfaz `StorageAdapter` — bien diseñado.

### Problema fundamental de extensibilidad
La dualidad entre funciones sueltas (singleton) y la clase `WhatsappWrapper` hace que extender sea confuso. ¿Dónde va la nueva funcionalidad? Si la pones en la clase, no funciona con las funciones sueltas. Si la pones como función suelta, no funciona con la clase. No hay un camino claro.

### Veredicto de extensibilidad: 6/10
Agregar cosas es fácil mecánicamente, pero el diseño dual genera confusión sobre dónde poner nueva funcionalidad.

---

## ♻️ 11. Evaluación de Reutilización

### ¿Es genérico para diferentes proyectos de bot?
**No completamente.** Los problemas principales:

1. **Singleton de config**: `httpClient.ts` y `metaConfig.ts` leen de `process.env` al importar. Si dos bots en el mismo proceso necesitan diferentes tokens o phone number IDs, no funciona.

2. **Express hardcodeado**: `webhookServer.ts` crea su propia app de Express. Si tu bot ya tiene un server (Fastify, Hono, Koa, Next.js API routes), no puedes reusar el webhook handler fácilmente — tendrías que usar `parseIncoming` directo.

3. **Sin middleware de conversación**: No hay concepto de estado de conversación, routing de mensajes, o middleware. Cada bot tiene que implementar su propia lógica de "en qué paso de la conversación está el usuario". Esto es lo que más tiempo consume en un bot.

4. **Acoplamiento a Axios**: Toda la librería depende de Axios. En 2026, con `fetch` nativo estable en Node.js 18+, Axios es overhead innecesario.

### Suposiciones que podrían no aplicar
- Asume un solo número de WhatsApp por proceso
- Asume que quieres Express para el webhook
- Asume que las imágenes son el único tipo de media importante
- Asume que no necesitas tracking de mensajes (no retorna wamid)
- Asume que retry de errores 4xx es deseable

### Comparación con librerías existentes

| Feature | wrapper-ultra | whatsapp-web.js | Baileys | @vercel/whatsapp |
|---------|---------------|-----------------|---------|------------------|
| API type | Cloud API ✅ | Web scraping ❌ | Web scraping ❌ | Cloud API ✅ |
| Estabilidad | Estable (oficial API) | Frágil (puede romper) | Frágil | Estable |
| Message types | ~6 | Todos | Todos | ~10 |
| Media send | ❌ | ✅ | ✅ | ✅ |
| Session state | ❌ | ❌ | ❌ | ❌ |
| Multi-number | ❌ | ✅ | ✅ | ✅ |
| TypeScript | ✅ | Parcial | ✅ | ✅ |
| Test utilities | ✅ (REPL) | ❌ | ❌ | ❌ |
| Mantenimiento | 1 dev | Comunidad | Comunidad | Vercel |

**Ventaja clave del wrapper-ultra**: Usa la Cloud API oficial, que es la opción correcta para bots en producción / negocio. `whatsapp-web.js` y Baileys usan web scraping que Meta puede bloquear en cualquier momento.

**Desventaja clave**: Le falta demasiada funcionalidad comparado con lo que la Cloud API realmente ofrece.

---

## 🎯 12. Recomendación Final

### Opción recomendada: **C) Enfoque Híbrido** 🔀

No recomiendo ni mantenerlo tal como está, ni abandonarlo completamente. La mejor ruta es:

### Lo que vale la pena CONSERVAR (y portar a una v2):

1. **`parseIncoming()`** — Es la pieza de mayor valor. Normalizar el webhook de Meta ahorra horas de debugging. Expandirlo para cubrir TODOS los tipos de mensaje + statuses.

2. **`StorageAdapter` pattern** — Bien diseñado, reutilizable. Solo falta expandir para más MIME types.

3. **Verificación de firma HMAC** — Funcional y correcta. `verifyPayloadSignature()` es útil standalone.

4. **`WhatsAppError`** — Buena estructura de error, vale la pena mantener.

5. **Testing utilities (MockAdapter + Console)** — Idea buena que ninguna otra librería tiene. Vale la pena pulir.

### Lo que hay que REESCRIBIR para una v2:

1. **Eliminar el singleton global**. Todo debe ser instanciable:
   ```typescript
   const wa = new WhatsAppClient({
     accessToken: 'xxx',
     phoneNumberId: '123',
     appSecret: 'yyy',
   });
   await wa.sendText('5211234567890', 'Hola');
   const msg = await wa.sendInteractive(...); // retorna wamid
   ```

2. **Una sola API unificada** — eliminar la dualidad funciones/clase. Todo vía la instancia.

3. **Cubrir envío de media**: `sendImage()`, `sendVideo()`, `sendAudio()`, `sendDocument()`, `sendSticker()`, más `uploadMedia()`.

4. **Cubrir recepción completa**: audio, video, documento, sticker, contacto, order, status updates.

5. **Retornar `wamid`** de todas las funciones de envío.

6. **Listas interactivas** (`sendList()`): esencial para bots de catálogo/menú.

7. **`markAsRead(wamid)`**: básico para UX profesional.

8. **Reemplazar Axios con `fetch` nativo** o al menos hacer el HTTP client inyectable.

9. **Quitar `dotenv.config()` de la librería** — eso es responsabilidad de la app.

10. **Retry inteligente**: Solo reintentar 429 y 5xx, con exponential backoff y respetando `Retry-After`.

### Lo que sería PERDER al ir 100% nativo:

- `parseIncoming()` — Tendrías que reescribir el parseo del webhook cada vez
- `StorageAdapter` — Tendrías que reimplementar el flujo descarga → almacenamiento
- `verifyPayloadSignature()` — No es difícil pero es fácil equivocarse
- Testing REPL — Ninguna librería nativa tiene esto
- Tipos de TypeScript — Tendrías que definirlos desde cero

### Estimación de esfuerzo para v2:

| Tarea | Tiempo estimado |
|-------|----------------|
| Refactor a client instanciable (eliminar singleton) | 4-6 horas |
| Agregar todos los tipos de envío de media | 3-4 horas |
| Expandir parseIncoming para todos los tipos | 3-4 horas |
| Agregar markAsRead + reactions | 1-2 horas |
| Agregar sendList | 1-2 horas |
| Retornar wamid de todas las funciones | 1-2 horas |
| Mejorar tipos TypeScript (eliminar `any`) | 3-4 horas |
| Retry inteligente | 2-3 horas |
| Tests completos | 4-6 horas |
| **Total** | **~22-33 horas** |

### Para el bot de Perfer (corto plazo):

Mientras no exista la v2, para el bot de procesos de Perfer recomiendo:

1. **Usar `parseIncoming()` y `verifyPayloadSignature()`** del wrapper actual — son las piezas de mayor valor
2. **Hacer los sends directamente con fetch** al Cloud API — las funciones de envío del wrapper son tan delgadas que no ahorran nada
3. **Copiar `StorageAdapter` + `DiskStorageAdapter`** si necesitas almacenar media
4. Esto te da lo mejor de ambos mundos sin las limitaciones del singleton

### TL;DR

El wrapper tiene buenas ideas (parseIncoming, StorageAdapter, testing REPL) pero mala ejecución arquitectónica (singletons, dualidad de APIs, cobertura incompleta). **Vale la pena hacer una v2** con diseño instanciable si planeas tener 3+ bots de WhatsApp. Si solo vas a hacer 1-2 bots, es más rápido ir nativo y copiar las piezas útiles.

---

## 📊 Resumen de Calificaciones

| Aspecto | Calificación | Notas |
|---------|-------------|-------|
| Arquitectura | 5/10 | Singleton global mata la reutilización |
| Cobertura API | 4/10 | Falta media, listas, statuses |
| Abstracciones | 5/10 | parseIncoming bueno, sendX demasiado thin |
| Manejo de errores | 3/10 | Retry genérico, errores de envío no capturados |
| Media | 4/10 | Descarga bien, envío inexistente |
| Webhooks | 6/10 | Firma correcta, parseo incompleto |
| Testing | 5/10 | Buenos tests donde existen, cobertura baja |
| Envío | 4/10 | Sin media, sin listas, sin wamid |
| Type safety | 4/10 | Demasiado `any` en los tipos del API |
| Extensibilidad | 6/10 | Fácil mecánicamente, confuso por diseño dual |
| **Promedio** | **4.6/10** | **Prototipo funcional, no librería production-ready** |
