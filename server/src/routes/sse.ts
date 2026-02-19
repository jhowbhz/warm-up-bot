import { Router, Request, Response } from 'express';
import { statusMonitorService } from '../services/status-monitor.service';
import { tunnelService } from '../services/tunnel.service';
import { webhookLogger, WebhookLogEntry } from '../services/webhook-logger.service';

const router = Router();

const clients = new Set<Response>();

statusMonitorService.on('status-update', (updates) => {
  const data = JSON.stringify({ type: 'status-update', updates });
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
});

tunnelService.on('connected', (url: string) => {
  const data = JSON.stringify({ type: 'tunnel-connected', url });
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
});

webhookLogger.on('new-log', (entry: WebhookLogEntry) => {
  const data = JSON.stringify({ type: 'webhook-log', entry });
  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
});

router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});

export default router;
