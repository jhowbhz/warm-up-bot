import { EventEmitter } from 'events';

export interface WebhookLogEntry {
  id: number;
  type: 'message' | 'status' | 'connect' | 'qrcode';
  timestamp: string;
  from?: string;
  preview?: string;
  ip?: string;
  success: boolean;
}

class WebhookLoggerService extends EventEmitter {
  private logs: WebhookLogEntry[] = [];
  private maxLogs = 100;
  private counter = 0;

  log(type: WebhookLogEntry['type'], body: any, ip?: string, success = true) {
    // Extrair preview antes de criar o log
    const preview = this.extractPreview(type, body);
    const from = this.extractFrom(body);
    
    // Filtrar mensagens vazias ou sem conteúdo relevante
    if (type === 'message') {
      // Não registrar se não tem preview ou se o preview está vazio/só tem "—"
      if (!preview || preview.trim() === '' || preview.trim() === '—' || preview.trim() === '-') {
        console.log('⏭️ Webhook de mensagem vazia ignorado');
        return null;
      }
    }
    
    const entry: WebhookLogEntry = {
      id: ++this.counter,
      type,
      timestamp: new Date().toISOString(),
      from,
      preview,
      ip,
      success,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.emit('new-log', entry);
    return entry;
  }

  getLogs(limit = 50): WebhookLogEntry[] {
    return this.logs.slice(0, limit);
  }

  getStats() {
    const now = Date.now();
    const last5min = this.logs.filter(l => now - new Date(l.timestamp).getTime() < 5 * 60 * 1000);
    const byType: Record<string, number> = {};
    for (const l of this.logs) {
      byType[l.type] = (byType[l.type] || 0) + 1;
    }
    return {
      total: this.logs.length,
      last5min: last5min.length,
      byType,
    };
  }

  clear() {
    this.logs = [];
    this.counter = 0;
  }

  private extractFrom(body: any): string | undefined {
    if (!body) return undefined;
    // WPP format
    if (body.response?.from) return body.response.from.replace('@c.us', '');
    // Evolution/Baileys format
    if (body.data?.key?.remoteJid) return body.data.key.remoteJid.replace('@s.whatsapp.net', '');
    // Cloud API
    if (body.messages?.[0]?.from) return body.messages[0].from;
    // Direct
    return body.from || body.sender || body.number || undefined;
  }

  private extractPreview(type: string, body: any): string {
    if (!body) return '';
    switch (type) {
      case 'message': {
        let preview = '';
        
        // WPP
        if (body.response?.body) preview = body.response.body;
        // Evolution
        else if (body.data?.message?.conversation) preview = body.data.message.conversation;
        else if (body.data?.message?.extendedTextMessage?.text) preview = body.data.message.extendedTextMessage.text;
        // Cloud API
        else if (body.messages?.[0]?.text?.body) preview = body.messages[0].text.body;
        // Direct
        else preview = body.message || body.body || body.text || '';
        
        // Limpar e truncar
        preview = preview.trim();
        
        // Ignorar mensagens vazias, apenas traços ou muito curtas
        if (!preview || preview === '—' || preview === '-' || preview.length < 2) {
          return '';
        }
        
        return preview.substring(0, 80);
      }
      case 'status':
        return body.status || body.state || body.response?.state || JSON.stringify(body).substring(0, 60);
      case 'connect':
        return body.connected ? 'Conectado' : body.disconnected ? 'Desconectado' : JSON.stringify(body).substring(0, 60);
      case 'qrcode':
        return body.qrcode || body.response?.qrcode ? 'QR Code recebido' : 'Evento QR Code';
      default:
        return JSON.stringify(body).substring(0, 60);
    }
  }
}

export const webhookLogger = new WebhookLoggerService();
