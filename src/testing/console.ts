
import readline from 'readline';
import { MockAdapter, OutgoingMessage } from './mockAdapter';

export interface ConsoleOptions {
    onInput: (text: string) => Promise<void> | void;
    mode?: 'pretty' | 'raw';
}

export class WhatsAppConsole {
    private rl: readline.Interface;
    private mode: 'pretty' | 'raw';
    private options: ConsoleOptions;
    private optionsMap: Record<string, string> = {};

    constructor(options: ConsoleOptions) {
        this.options = options;
        this.mode = options.mode || 'pretty';
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });

        // Initialize Listener
        MockAdapter.on('outgoing', (msg) => this.display(msg));
    }

    start() {
        console.clear();
        this.printBanner();
        this.ask();
    }

    private printBanner() {
        console.log('╔══════════════════════════════════════════════════════════════╗');
        console.log('║             🧪  WHATSAPP WRAPPER DEV CONSOLE  🧪             ║');
        console.log('║                                                              ║');
        console.log('║  Commands:                                                   ║');
        console.log('║    .mode raw      - Show raw JSON logs                       ║');
        console.log('║    .mode pretty   - Show formatted UI (default)              ║');
        console.log('║    menu           - Reset to main menu (app specific)        ║');
        console.log('║    exit           - Quit                                     ║');
        console.log('╚══════════════════════════════════════════════════════════════╝\n');
    }

    private display(msg: OutgoingMessage) {
        if (this.mode === 'raw') {
            console.log('[RAW OUTGOING]', JSON.stringify(msg, null, 2));
            return;
        }

        const line = '─'.repeat(50);
        console.log(`\n\x1b[36m${line}\x1b[0m`); // Cyan lines

        if (msg.type === 'text') {
            console.log(`🤖 \x1b[1mBOT SAYS:\x1b[0m\n${msg.body}`);
        } else if (msg.type === 'interactive') {
            console.log(`🤖 \x1b[1mBOT SAYS:\x1b[0m\n${msg.body}`);
            console.log(`\n\x1b[33mOPTIONS:\x1b[0m`);
            this.optionsMap = {};
            msg.buttons.forEach((btn, idx) => {
                const key = (idx + 1).toString();
                this.optionsMap[key] = btn.id;
                console.log(`  [\x1b[1m${key}\x1b[0m] ${btn.title}`);
            });
            console.log(`\n(Type the number to select)`);
        } else if (msg.type === 'location_request') {
            console.log(`📍 \x1b[1mLOCATION REQUEST:\x1b[0m\n${msg.body}`);
        } else if (msg.type === 'location') {
            console.log(`🗺️ \x1b[1mLOCATION SENT:\x1b[0m\nName: ${msg.name}\nCoords: ${msg.lat}, ${msg.long}`);
        }

        console.log(`\x1b[36m${line}\x1b[0m\n`);
        this.prompt();
    }

    private prompt() {
        process.stdout.write('wa-dev> ');
    }

    private ask() {
        this.prompt();
        this.rl.on('line', async (line) => {
            const text = line.trim();

            if (text === 'exit') {
                console.log('Bye!');
                process.exit(0);
            }

            if (!text) {
                this.prompt();
                return;
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

            // Numeric Selection Logic
            if (this.optionsMap[text]) {
                const payload = this.optionsMap[text];
                console.log(`[USER] Selected Option ${text} -> Payload: ${payload}`);
                try {
                    // Send as button payload BUT we need to format it for the consumer
                    // The consumer expects just "TEXT" or objects? 
                    // To keep it simple, we pass the "simulated payload" as a special string convention
                    // OR we let the consumer deal with it?
                    // Let's pass "BTN:payload" convention to consumer if they expect typical text, 
                    // OR better, we simply callback with the Intent.
                    // But WAIT, the `onInput` signature is string.
                    // Let's enforce the "BTN:" convention in the library so consumer doesn't have to guess?
                    // NO, better to send the raw string "BTN:payload" and let consumer parse it? 
                    // Actually, the original local-repl logic handled "BTN:" parsing inside `ask`.
                    // Let's replicate that. We send "BTN:payload" to `onInput`.
                    await this.options.onInput(`BTN:${payload}`);
                } catch (err) {
                    console.error('Error:', err);
                }
            } else {
                // Just text
                await this.options.onInput(text);
            }
            // this.prompt(); // prompt is called after async op usually? 
            // Better to just prompt again immediately or wait? 
            // In the original, ask() recursed. Here dealing with 'line' event.
            this.prompt();
        });
    }
}

export function createConsole(options: ConsoleOptions) {
    return new WhatsAppConsole(options);
}
