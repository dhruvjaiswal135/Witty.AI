import qrcode from 'qrcode-terminal';
import { Client, LocalAuth, ClientOptions } from 'whatsapp-web.js';
import { WhatsAppService } from './utils';
import environment from '../../../config/environment';

// Check if WhatsApp should be enabled
const ENABLE_WHATSAPP = environment.whatsapp.enabled;

let client: Client | null = null;
let whatsappService: WhatsAppService | null = null;

const MAX_RECONNECT_ATTEMPTS = 3;
let reconnectAttempts = 0;

/**
 * Initializes the WhatsApp client and service. Call this after DB is connected.
 */
export async function initializeWhatsAppService() {
    if (!ENABLE_WHATSAPP) {
        console.log('WhatsApp integration is disabled via environment variable');
        return null;
    }
    const clientOptions: ClientOptions = {
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--mute-audio',
                '--no-zygote',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-blink-features=AutomationControlled',
                '--disable-accelerated-2d-canvas'
            ],
            timeout: 60000,
            executablePath: process.platform === 'darwin' ? 
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 
                undefined
        }
    };

    function setupClient() {
        client = new Client(clientOptions);
        // Set up event listeners
        client.on('qr', (qr: string) => {
            console.log('QR Code received, please scan:');
            qrcode.generate(qr, {small: true});
            reconnectAttempts = 0;
        });
        client.on('ready', () => {
            console.log('WhatsApp Client is ready!');
            reconnectAttempts = 0;
        });
        client.on('authenticated', () => {
            console.log('WhatsApp Client is authenticated!');
            reconnectAttempts = 0;
        });
        client.on('auth_failure', (msg: string) => {
            console.error('WhatsApp authentication failed:', msg);
            reconnectAttempts = 0;
        });
        client.on('disconnected', (reason: string) => {
            console.log('WhatsApp Client was disconnected:', reason);
            if (reason === 'LOGOUT') {
                console.log('User logged out. Clearing authentication data.');
                if (client) {
                    client.destroy();
                    client = null;
                    whatsappService = null;
                }
                return;
            }
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
                reconnectAttempts++;
                if (client) {
                    client.destroy();
                    client = null;
                    whatsappService = null;
                }
                setTimeout(() => {
                    setupClient();
                }, 5000);
            } else {
                console.error('Max reconnection attempts reached. WhatsApp client will remain disconnected.');
            }
        });
        client.on('error', (error: Error) => {
            console.error('WhatsApp Client error:', error);
            if (error.message.includes('Execution context was destroyed')) {
                console.log('Execution context destroyed, attempting to reinitialize...');
                if (client) {
                    client.destroy();
                    client = null;
                    whatsappService = null;
                }
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    setTimeout(() => {
                        setupClient();
                    }, 3000);
                }
            }
        });
        whatsappService = new WhatsAppService(client);
        client.initialize().then(() => {
            console.log('WhatsApp initialized successfully');
        }).catch((err: Error) => {
            console.error('Failed to initialize WhatsApp client:', err.message);
            if (err.message.includes('Execution context was destroyed') || 
                err.message.includes('navigation')) {
                console.log('Attempting to reinitialize due to context error...');
                if (client) {
                    client.destroy();
                    client = null;
                    whatsappService = null;
                }
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    setTimeout(() => {
                        setupClient();
                    }, 3000);
                }
            } else {
                console.log('WhatsApp functionality will be disabled for this session');
                client = null;
                whatsappService = null;
            }
        });
    }

    setupClient();
    return whatsappService;
}

export { whatsappService, WhatsAppService };