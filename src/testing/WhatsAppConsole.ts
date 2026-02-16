/**
 * Interactive REPL console for local WhatsApp bot development.
 * Displays outgoing messages in a human-readable format and lets you
 * type incoming messages (text or button selections) from the terminal.
 */

import readline from 'readline';
import { MockAdapter, RecordedMessage } from './MockAdapter.js';

/** Options for the WhatsApp console. */
export interface WhatsAppConsoleOptions {
  /** Callback invoked when the user types a message. */
  onInput: (text: string, meta: { isButtonReply: boolean; buttonId?: string }) => Promise<void> | void;
  /** Display mode: 'pretty' for formatted UI, 'raw' for JSON. */
  mode?: 'pretty' | 'raw';
  /** Mock adapter to listen to outgoing messages. */
  mock: MockAdapter;
}

/**
 * Interactive development console.
 * Shows what your bot sends and lets you type responses.
 *
 * @example
 * ```ts
 * const { client, mock } = createTestClient();
 * const console = new WhatsAppConsole({
 *   mock,
 *   onInput: async (text) => {
 *     client.processWebhook(makeTextWebhook(text));
 *   },
 * });
 * console.start();
 * ```
 */
export class WhatsAppConsole {
  private rl: readline.Interface | undefined;
  private mode: 'pretty' | 'raw';
  private readonly options: WhatsAppConsoleOptions;
  private optionsMap: Record<string, { id: string; title: string }> = {};

  constructor(options: WhatsAppConsoleOptions) {
    this.options = options;
    this.mode = options.mode ?? 'pretty';

    // Listen to outgoing messages from the mock adapter
    options.mock.on('outgoing', (msg: RecordedMessage) => this.display(msg));
  }

  /** Start the interactive console. */
  start(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    console.clear();
    this.printBanner();
    this.listen();
  }

  /** Stop the console and clean up. */
  stop(): void {
    this.rl?.close();
    this.rl = undefined;
  }

  private printBanner(): void {
    const line = '═'.repeat(56);
    console.log(`╔${line}╗`);
    console.log(`║       🧪  WHATSAPP WRAPPER v2 DEV CONSOLE  🧪        ║`);
    console.log(`║                                                        ║`);
    console.log(`║  Commands:                                              ║`);
    console.log(`║    .mode raw    — Show raw JSON                         ║`);
    console.log(`║    .mode pretty — Show formatted UI (default)           ║`);
    console.log(`║    exit         — Quit                                  ║`);
    console.log(`╚${line}╝\n`);
  }

  private display(recorded: RecordedMessage): void {
    const body = recorded.body as Record<string, unknown>;

    if (this.mode === 'raw') {
      console.log('\n[RAW OUTGOING]', JSON.stringify(body, null, 2));
      this.prompt();
      return;
    }

    const line = '─'.repeat(50);
    console.log(`\n\x1b[36m${line}\x1b[0m`);

    const type = body?.type as string;

    switch (type) {
      case 'text': {
        const text = (body.text as Record<string, unknown>)?.body ?? '';
        console.log(`🤖 \x1b[1mBOT:\x1b[0m ${text}`);
        break;
      }

      case 'interactive': {
        const interactive = body.interactive as Record<string, unknown>;
        const interactiveType = interactive?.type as string;
        const bodyText = (interactive?.body as Record<string, unknown>)?.text ?? '';

        console.log(`🤖 \x1b[1mBOT:\x1b[0m ${bodyText}`);

        if (interactiveType === 'button') {
          const action = interactive.action as Record<string, unknown>;
          const buttons = (action?.buttons as Array<Record<string, unknown>>) ?? [];
          this.optionsMap = {};

          console.log(`\n\x1b[33mBUTTONS:\x1b[0m`);
          buttons.forEach((btn, idx) => {
            const reply = btn.reply as Record<string, string>;
            const key = String(idx + 1);
            this.optionsMap[key] = { id: reply.id, title: reply.title };
            console.log(`  [\x1b[1m${key}\x1b[0m] ${reply.title}`);
          });
          console.log('  (Type the number to select)');
        } else if (interactiveType === 'list') {
          const action = interactive.action as Record<string, unknown>;
          const sections = (action?.sections as Array<Record<string, unknown>>) ?? [];
          this.optionsMap = {};
          let idx = 1;

          console.log(`\n\x1b[33mLIST:\x1b[0m`);
          for (const section of sections) {
            console.log(`  \x1b[4m${section.title}\x1b[0m`);
            const rows = (section.rows as Array<Record<string, string>>) ?? [];
            for (const row of rows) {
              const key = String(idx);
              this.optionsMap[key] = { id: row.id, title: row.title };
              console.log(`    [\x1b[1m${key}\x1b[0m] ${row.title}${row.description ? ` — ${row.description}` : ''}`);
              idx++;
            }
          }
          console.log('  (Type the number to select)');
        } else if (interactiveType === 'location_request_message') {
          console.log(`📍 (Location request)`);
        }
        break;
      }

      case 'location': {
        const loc = body.location as Record<string, unknown>;
        console.log(`🗺️ \x1b[1mLOCATION:\x1b[0m ${loc?.name ?? ''} (${loc?.latitude}, ${loc?.longitude})`);
        break;
      }

      case 'image':
      case 'video':
      case 'audio':
      case 'document':
      case 'sticker': {
        const media = body[type] as Record<string, unknown>;
        const caption = media?.caption ?? '';
        console.log(`📎 \x1b[1m${type.toUpperCase()}:\x1b[0m ${media?.link ?? media?.id ?? ''}${caption ? ` — ${caption}` : ''}`);
        break;
      }

      case 'reaction': {
        const reaction = body.reaction as Record<string, unknown>;
        console.log(`${reaction?.emoji ?? '❓'} (reaction to ${reaction?.message_id})`);
        break;
      }

      default:
        console.log(`📨 [${type}]`, JSON.stringify(body, null, 2));
    }

    console.log(`\x1b[36m${line}\x1b[0m\n`);
    this.prompt();
  }

  private prompt(): void {
    process.stdout.write('wa-dev> ');
  }

  private listen(): void {
    this.prompt();

    this.rl?.on('line', async (line) => {
      const text = line.trim();
      if (!text) {
        this.prompt();
        return;
      }

      if (text === 'exit') {
        console.log('Bye!');
        process.exit(0);
      }

      if (text === '.mode raw') {
        this.mode = 'raw';
        console.log('Switched to RAW mode.');
        this.prompt();
        return;
      }

      if (text === '.mode pretty') {
        this.mode = 'pretty';
        console.log('Switched to PRETTY mode.');
        this.prompt();
        return;
      }

      // Check if it's a numeric selection for buttons/lists
      if (this.optionsMap[text]) {
        const selected = this.optionsMap[text];
        console.log(`[USER] Selected: ${selected.title} (${selected.id})`);
        try {
          await this.options.onInput(selected.id, { isButtonReply: true, buttonId: selected.id });
        } catch (err) {
          console.error('Error:', err);
        }
      } else {
        // Plain text input
        try {
          await this.options.onInput(text, { isButtonReply: false });
        } catch (err) {
          console.error('Error:', err);
        }
      }

      this.prompt();
    });
  }
}
