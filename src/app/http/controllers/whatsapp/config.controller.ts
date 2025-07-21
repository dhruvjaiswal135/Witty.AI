import {Request, Response} from 'express';
import {sendSuccessResponse, sendErrorResponse} from '../../../traits/response.traits';
import {whatsappService} from '../../../services';
import QRCode from 'qrcode';
import * as console from "node:console";

interface WhatsAppStatus {
    auth?: boolean;
    status: 'DISABLED' | 'INITIALIZING' | 'AUTHENTICATED' | 'QR_READY' | 'ERROR';
    qrCode?: string;
    message: string;
    timestamp: Date;
}

class WhatsAppConfigController {
    private qrCodeTimeout: NodeJS.Timeout | null = null;
    private qrCodeGenerated: boolean = false;
    private currentQRCode: string = '';

    constructor() {
        // Bind methods to preserve context
        this.init = this.init.bind(this);
        this.debug = this.debug.bind(this);
        this.setupQRCodeListener = this.setupQRCodeListener.bind(this);
    }

    /**
     * Single endpoint to initialize WhatsApp, return status or QR code HTML
     */
    async init(req: Request, res: Response): Promise<void> {
        if (this.qrCodeTimeout) {
            clearTimeout(this.qrCodeTimeout);
            this.qrCodeTimeout = null;
        }
        const {html} = req.query;
        try {
            // Check if WhatsApp is enabled
            if (!whatsappService) {
                const status: WhatsAppStatus = {
                    auth: false,
                    status: 'DISABLED',
                    message: 'WhatsApp service is not available or disabled',
                    timestamp: new Date()
                };
                return sendSuccessResponse(res, status, 200);
            }

            // Check if client is ready
            if (whatsappService.isClientReady()) {
                const status: WhatsAppStatus = {
                    auth: true,
                    status: 'AUTHENTICATED',
                    message: 'WhatsApp is already authenticated and ready',
                    timestamp: new Date()
                };
                return sendSuccessResponse(res, status, 200);
            }

            // Check if client is initializing
            if (!whatsappService.clientInstance?.pupPage) {
                const status: WhatsAppStatus = {
                    auth: false,
                    status: 'INITIALIZING',
                    message: 'WhatsApp is initializing, please wait...',
                    timestamp: new Date()
                };
                return sendSuccessResponse(res, status, 200);
            }

            // Set up QR code listener
            this.setupQRCodeListener();

            // If QR code is available, return HTML page
            if (this.qrCodeGenerated && this.currentQRCode) {
                // Check if user wants HTML (via query parameter or Accept header)

                if (html) {
                    return await this.sendQRHTML(res);
                } else {
                    // Return JSON for API calls
                    const status: WhatsAppStatus = {
                        auth: false,
                        status: 'QR_READY',
                        qrCode: this.currentQRCode,
                        message: 'QR Code is ready for scanning',
                        timestamp: new Date()
                    };
                    return sendSuccessResponse(res, status, 200);
                }
            }

            // If a client exists but not ready, it means we need QR code
            // Return a status indicating we're waiting for QR
            const status: WhatsAppStatus = {
                auth: false,
                status: 'INITIALIZING',
                message: 'Client not authenticated. Waiting for QR code...',
                timestamp: new Date()
            };
            return sendSuccessResponse(res, status, 200);
        } catch (error) {
            console.error('WhatsApp init error:', error);
            const status: WhatsAppStatus = {
                auth: false,
                status: 'ERROR',
                message: 'Internal server error during WhatsApp initialization',
                timestamp: new Date()
            };
            return sendErrorResponse(res, status, 500);
        }
    }

    /**
     * Send QR code HTML page
     */
    private async sendQRHTML(res: Response): Promise<void> {
        try {
            const qrImageDataUrl = await QRCode.toDataURL(this.currentQRCode);

            const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WhatsApp QR Code Scanner</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    text-align: center;
                    background-color: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #25D366;
                    margin-bottom: 20px;
                }
                .qr-container {
                    margin: 30px 0;
                    padding: 20px;
                    border: 2px dashed #25D366;
                    border-radius: 10px;
                    background: #f8f9fa;
                }
                .qr-code {
                    max-width: 300px;
                    height: auto;
                    margin: 0 auto;
                    display: block;
                }
                .instructions {
                    margin: 20px 0;
                    color: #666;
                    line-height: 1.6;
                }
                .status {
                    background: #e8f5e8;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #25D366;
                }
                .refresh-btn {
                    background: #25D366;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px;
                }
                .refresh-btn:hover {
                    background: #128C7E;
                }
                .auto-refresh {
                    margin-top: 20px;
                    font-size: 14px;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📱 WhatsApp QR Code Scanner</h1>
                
                <div class="status">
                    <strong>Status:</strong> QR Code Ready for Scanning
                </div>
                
                <div class="qr-container">
                    <img src="${qrImageDataUrl}" alt="WhatsApp QR Code" class="qr-code">
                </div>
                
                <div class="instructions">
                    <h3>How to scan:</h3>
                    <ol style="text-align: left; display: inline-block;">
                        <li>Open WhatsApp on your phone</li>
                        <li>Go to Settings > Linked Devices</li>
                        <li>Tap "Link a Device"</li>
                        <li>Point your camera at the QR code above</li>
                        <li>Wait for authentication to complete</li>
                    </ol>
                </div>
                
                <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Page</button>
                <button class="refresh-btn" onclick="checkStatus()">📊 Check Status</button>
                
                <div class="auto-refresh">
                    <p>This page will automatically refresh every 30 seconds to check for authentication.</p>
                </div>
            </div>
            
            <script>
                // Auto-refresh every 30 seconds
                setInterval(() => {
                    location.reload();
                }, 30000);
                
                // Function to check status via API
                async function checkStatus() {
                    try {
                        const response = await fetch('/v1/config/setup/init');
                        const data = await response.json();
                        
                        if (data.status === 'AUTHENTICATED') {
                            alert('WhatsApp is now authenticated! You can close this page.');
                            location.reload();
                        } else if (data.status === 'QR_READY') {
                            alert('QR Code is still available. Please scan it.');
                        } else {
                            alert('Status: ' + data.message);
                        }
                    } catch (error) {
                        alert('Error checking status: ' + error.message);
                    }
                }
            </script>
        </body>
        </html>
      `;

            res.send(html);

        } catch (error) {
            console.error('QR HTML generation error:', error);
            res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error</h1>
            <p>Failed to generate QR code display: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>
      `);
        }
    }

    /**
     * Debug endpoint to show detailed status
     */
    async debug(req: Request, res: Response): Promise<void> {
        try {
            if (!whatsappService) {
                sendSuccessResponse(res, {
                    message: 'WhatsApp service is not available',
                    hasWhatsApp: false,
                    hasService: false
                }, 200);
                return;
            }

            const detailedStatus = whatsappService.getDetailedStatus();

            sendSuccessResponse(res, {
                message: 'WhatsApp debug information',
                hasWhatsApp: !!whatsappService,
                hasService: !!whatsappService,
                detailedStatus,
                qrCodeGenerated: this.qrCodeGenerated,
                currentQRCode: this.currentQRCode ? 'Available' : 'Not available',
                timestamp: new Date()
            }, 200);

        } catch (error) {
            console.error('WhatsApp debug error:', error);
            sendErrorResponse(res, {message: 'Error getting debug information'}, 500);
        }
    }

    /**
     * Setup QR code listener
     */
    setupQRCodeListener(): void {
        if (!whatsappService) return;

        // Clear any existing timeout
        if (this.qrCodeTimeout) {
            clearTimeout(this.qrCodeTimeout);
        }

        // Set up QR code event listener
        whatsappService.clientInstance?.on('qr', (qr: string) => {
            console.log('QR Code received for scanning');
            this.qrCodeGenerated = true;
            this.currentQRCode = qr;

            // Set timeout for QR code (5 minutes)
            this.qrCodeTimeout = setTimeout(() => {
                console.log('QR Code timeout - user did not scan within 5 minutes');
                this.qrCodeGenerated = false;
                this.currentQRCode = '';
            }, 5 * 60 * 1000);
        });

        // Clear QR code when authenticated
        whatsappService.clientInstance?.on('authenticated', () => {
            console.log('WhatsApp authenticated - clearing QR code');
            this.qrCodeGenerated = false;
            this.currentQRCode = '';
            if (this.qrCodeTimeout) {
                clearTimeout(this.qrCodeTimeout);
                this.qrCodeTimeout = null;
            }
        });

        // Clear QR code when ready
        whatsappService.clientInstance?.on('ready', () => {
            console.log('WhatsApp ready - clearing QR code');
            this.qrCodeGenerated = false;
            this.currentQRCode = '';
            if (this.qrCodeTimeout) {
                clearTimeout(this.qrCodeTimeout);
                this.qrCodeTimeout = null;
            }
        });

        // Clear QR code on disconnect
        whatsappService.clientInstance?.on('disconnected', () => {
            console.log('WhatsApp disconnected - clearing QR code');
            this.qrCodeGenerated = false;
            this.currentQRCode = '';
            if (this.qrCodeTimeout) {
                clearTimeout(this.qrCodeTimeout);
                this.qrCodeTimeout = null;
            }
        });
    }
}

export default new WhatsAppConfigController();
