import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32chars!!',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'jwt-secret-change-in-production!',
    expiresIn: '7d',
  },
  
  // MySQL
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    name: process.env.DB_NAME || 'esquenta_chips',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  },
  
  // Server
  server: {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  // Webhook
  webhook: {
    url: process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks',
  },
};
