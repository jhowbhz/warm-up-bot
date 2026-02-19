import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32chars!!'; // 32 chars
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  if (!text) return '';
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error: any) {
    console.error('Erro ao criptografar:', error.message);
    throw new Error('Falha na criptografia');
  }
}

export function decrypt(text: string): string {
  if (!text) return '';
  
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato inválido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    console.error('Erro ao descriptografar:', error.message);
    throw new Error('Falha na descriptografia');
  }
}

// Lista de chaves que devem ser criptografadas
const SENSITIVE_KEYS = [
  'apibrasil_password',
  'apibrasil_bearer_token',
  'apibrasil_secret_key',
  'openai_api_key',
  'proxy_password',
];

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.some(sensitiveKey => key.includes(sensitiveKey));
}
