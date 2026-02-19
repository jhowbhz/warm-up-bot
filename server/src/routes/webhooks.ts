import { Router, Request, Response } from 'express';
import webhookService from '../services/webhook.service';
import { webhookLogger } from '../services/webhook-logger.service';

const router = Router();

router.post('/message', async (req: Request, res: Response) => {
  try {
    console.log('📩 [RAW WEBHOOK /message] Headers:', JSON.stringify({
      'content-type': req.headers['content-type'],
      'devicetoken': req.headers['devicetoken'],
      'device-token': req.headers['device-token'],
    }));
    console.log('📩 [RAW WEBHOOK /message] Body:', JSON.stringify(req.body, null, 2));

    webhookLogger.log('message', req.body, req.ip);
    const parsed = webhookService.parseWebhookPayload(req.body, req.headers);
    if (parsed) {
      await webhookService.handleIncomingMessage(parsed);
    } else {
      console.log('⚠️  Webhook /message: payload não reconhecido, ignorando');
    }
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro no webhook de mensagem:', error.message);
    webhookLogger.log('message', req.body, req.ip, false);
    res.status(200).json({ success: true });
  }
});

router.post('/status', async (req: Request, res: Response) => {
  try {
    webhookLogger.log('status', req.body, req.ip);
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(200).json({ success: true });
  }
});

router.post('/connect', async (req: Request, res: Response) => {
  try {
    webhookLogger.log('connect', req.body, req.ip);
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(200).json({ success: true });
  }
});

router.post('/qrcode', async (req: Request, res: Response) => {
  try {
    webhookLogger.log('qrcode', req.body, req.ip);
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(200).json({ success: true });
  }
});

export default router;
