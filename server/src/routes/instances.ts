import { Router, Request, Response } from 'express';
import { Instance, WarmingSchedule, DailyMetric } from '../models';
import apiBrasilService from '../services/apibrasil.service';
import warmingService from '../services/warming.service';
import { tunnelService } from '../services/tunnel.service';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const instances = await Instance.findAll({
      include: [
        { model: WarmingSchedule, as: 'schedules' },
        { model: DailyMetric, as: 'metrics' },
      ],
    });
    res.json(instances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findByPk(req.params.id, {
      include: [
        { model: WarmingSchedule, as: 'schedules' },
        { model: DailyMetric, as: 'metrics' },
      ],
    });

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    res.json(instance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/servers/list', async (req: Request, res: Response) => {
  try {
    const servers = await apiBrasilService.listServers();
    res.json(servers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { phone, name, serverSearch, serverType, proxyHost, proxyPort, proxyUser, proxyPass } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Telefone é obrigatório' });
    }

    if (!serverSearch) {
      return res.status(400).json({ error: 'Servidor é obrigatório. Selecione um servidor da APIBrasil.' });
    }

    const resolvedServerType: 'whatsapp' | 'baileys' = serverType === 'baileys' ? 'baileys' : 'whatsapp';
    const deviceKey = `chip_${phone}_${Date.now()}`;
    const deviceName = name || `WhatsApp ${phone}`;

    // Priorizar URL customizada sobre Cloudflare
    const settingsService = (await import('../services/settings.service')).default;
    const customUrl = await settingsService.getCustomWebhookUrl();
    const cloudflareUrl = tunnelService.getUrl();
    const baseUrl = customUrl || cloudflareUrl || (process.env.WEBHOOK_URL || 'http://localhost:3001');
    const webhookBase = `${baseUrl}/api/webhooks`;

    const deviceResponse = await apiBrasilService.createDevice({
      type: 'cellphone',
      device_name: deviceName,
      device_key: deviceKey,
      device_ip: proxyHost || '0.0.0.0',
      server_search: serverSearch,
      webhook_wh_message: `${webhookBase}/message`,
      webhook_wh_status: `${webhookBase}/status`,
      webhook_wh_connect: `${webhookBase}/connect`,
      webhook_wh_qrcode: `${webhookBase}/qrcode`,
    });

    const deviceToken = deviceResponse.device?.device_token;

    if (!deviceToken) {
      return res.status(500).json({
        error: 'Dispositivo criado na APIBrasil mas device_token não retornado',
        apiResponse: deviceResponse,
      });
    }

    const instance = await Instance.create({
      phone,
      name: deviceName,
      deviceToken,
      deviceKey: deviceKey,
      serverSearch: serverSearch,
      serverType: resolvedServerType,
      proxyHost,
      proxyPort,
      proxyUser,
      proxyPass,
      status: 'disconnected',
      currentPhase: 'manual',
      currentDay: 0,
      warmingSpeed: 1,
    });

    res.status(201).json({
      ...instance.toJSON(),
      apibrasilMessage: deviceResponse.message,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/connect', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findByPk(req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    if (!instance.deviceToken) {
      return res.status(400).json({
        error: 'Instância sem deviceToken. Recrie a instância para registrar na APIBrasil.',
      });
    }

    await instance.update({ status: 'connecting' });

    const result = await apiBrasilService.connect(
      instance.deviceToken,
      instance.serverType,
      instance.name || `instance_${instance.id}`,
    );

    res.json({
      qrCode: result.qrCode,
      deviceToken: instance.deviceToken,
      serverType: instance.serverType,
      message: 'Escaneie o QR Code no WhatsApp',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findByPk(req.params.id);

    if (!instance || !instance.deviceToken) {
      return res.status(404).json({ error: 'Instância não encontrada ou não conectada' });
    }

    const status = await apiBrasilService.getConnectionState(instance.deviceToken, instance.serverType);
    const isConnected = apiBrasilService.parseIsConnected(status, instance.serverType);

    if (isConnected && instance.status !== 'connected') {
      await instance.update({ status: 'connected', currentDay: 1 });
    } else if (!isConnected && instance.status === 'connected') {
      await instance.update({ status: 'disconnected' });
    }

    res.json({ ...status, isConnected });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/start-warming', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findByPk(req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    await warmingService.startWarming(instance.id);

    res.json({ message: 'Aquecimento iniciado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/pause-warming', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findByPk(req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    await warmingService.pauseWarming(instance.id);

    res.json({ message: 'Aquecimento pausado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findByPk(req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    await instance.update(req.body);

    res.json(instance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const instance = await Instance.findByPk(req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    await warmingService.pauseWarming(instance.id);

    if (instance.deviceToken) {
      try {
        await apiBrasilService.destroyDevice(instance.deviceToken);
        console.log(`[APIBrasil] Device ${instance.deviceToken} removido com sucesso`);
      } catch (apiError: any) {
        console.warn(`[APIBrasil] Falha ao remover device: ${apiError.message} - continuando exclusão local`);
      }
    }

    await instance.destroy();

    res.json({ message: 'Instância deletada com sucesso (local e APIBrasil)' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
