import dotenv from 'dotenv';
dotenv.config();

interface Environment {
    app: {
        env: string;
        port: number;
        host: string;
    };
    cors: {
        origin: string[];
    };
    whatsapp: {
        enabled: boolean;
    };
    gemini: {
        key: string;
        default: string;
    };
    mongo: {
        url: string;
    }
}

const environment: Environment = {
    app: {
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST || 'localhost'
    },
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*']
    },
    whatsapp: {
        enabled: !!process.env.ENABLE_WHATSAPP,
    },
    gemini: {
        key: process.env.GEMINI_API_KEY || 'AIzaSyBHo5R5xb8wG4L0XNzZML_jpO7G8P8euz0',
        default: process.env.DEFAULT_CONTEXT_ID || 'default'
    },
    mongo: {
        url: process.env.MONGODB_URI || ''
    }
};

export default environment; 