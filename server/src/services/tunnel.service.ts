import { EventEmitter } from 'events';

class TunnelService extends EventEmitter {
  private url: string | null = null;
  private tunnelInstance: any = null;
  private stopping = false;
  private port = 3001;

  getUrl(): string | null {
    return this.url;
  }

  async start(port: number): Promise<string> {
    if (this.url) return this.url;
    this.port = port;
    this.stopping = false;

    const { Tunnel } = await import('cloudflared');

    console.log('[Tunnel] Iniciando Cloudflare Tunnel na porta', port, '...');

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: URL não recebida em 30s'));
      }, 30_000);

      try {
        const t = Tunnel.quick(`http://localhost:${port}`);
        this.tunnelInstance = t;

        t.once('url', (publicUrl: string) => {
          clearTimeout(timeout);
          this.url = publicUrl;
          console.log(`[Tunnel] URL pública: ${publicUrl}`);
          this.emit('connected', publicUrl);
          resolve(publicUrl);
        });

        t.on('error', (err: Error) => {
          console.error('[Tunnel] Erro:', err.message);
        });

        t.on('exit', (code: number | null) => {
          if (!this.stopping) {
            console.warn(`[Tunnel] Processo encerrado (code ${code}), reiniciando em 5s...`);
            this.url = null;
            this.tunnelInstance = null;
            setTimeout(() => this.start(this.port).catch(() => {}), 5000);
          }
        });
      } catch (err: any) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.tunnelInstance) {
      try {
        this.tunnelInstance.stop();
      } catch {}
    }
    this.tunnelInstance = null;
    this.url = null;
    console.log('[Tunnel] Encerrado');
  }
}

export const tunnelService = new TunnelService();
