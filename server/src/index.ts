import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { connectDatabase } from './config/database';

// Rotas
import authRouter from './routes/auth';
import instancesRouter from './routes/instances';
import contactsRouter from './routes/contacts';
import webhooksRouter from './routes/webhooks';
import metricsRouter from './routes/metrics';
import settingsRouter from './routes/settings';
import botsRouter from './routes/bots';
import attendancesRouter from './routes/attendances';
import attendantsRouter from './routes/attendants';
import sseRouter from './routes/sse';

// Middleware & Serviços
import { authMiddleware } from './middleware/auth';
import { statusMonitorService } from './services/status-monitor.service';
import { tunnelService } from './services/tunnel.service';
import { webhookLogger } from './services/webhook-logger.service';
import { Instance } from './models';
import apiBrasilService from './services/apibrasil.service';
import { setupSwagger } from './config/swagger';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function updateAllWebhooks(tunnelUrl: string) {
  try {
    const instances = await Instance.findAll({
      where: { deviceToken: { [require('sequelize').Op.ne]: null } },
    });

    if (instances.length === 0) {
      console.log('[Tunnel] Nenhuma instância com deviceToken para atualizar');
      return;
    }

    const webhookBase = `${tunnelUrl}/api/webhooks`;
    let updated = 0;

    for (const inst of instances) {
      try {
        const result = await apiBrasilService.updateDeviceWebhooks(
          inst.deviceToken!,
          {
            webhook_wh_message: `${webhookBase}/message`,
            webhook_wh_status: `${webhookBase}/status`,
            webhook_wh_connect: `${webhookBase}/connect`,
            webhook_wh_qrcode: `${webhookBase}/qrcode`,
          },
          {
            deviceKey: inst.deviceKey,
            deviceName: inst.name,
            serverSearch: inst.serverSearch,
          },
        );
        if (result) updated++;
      } catch (err: any) {
        console.warn(`[Tunnel] Falha ao atualizar webhook do device ${inst.deviceToken}: ${err.message}`);
      }
    }

    console.log(`[Tunnel] Webhooks atualizados: ${updated}/${instances.length} devices`);
  } catch (err: any) {
    console.error('[Tunnel] Erro ao atualizar webhooks:', err.message);
  }
}

// Swagger API Docs
setupSwagger(app);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tunnel info
app.get('/api/tunnel', async (_req, res) => {
  const settingsService = (await import('./services/settings.service')).default;
  
  // Priorizar URL customizada sobre Cloudflare
  const customUrl = await settingsService.getCustomWebhookUrl();
  const cloudflareUrl = tunnelService.getUrl();
  const url = customUrl || cloudflareUrl;
  
  res.json({
    url,
    active: !!url,
    isCustom: !!customUrl,
    cloudflareUrl,
    customUrl,
    webhookMessage: url ? `${url}/api/webhooks/message` : null,
    webhookStatus: url ? `${url}/api/webhooks/status` : null,
    webhookConnect: url ? `${url}/api/webhooks/connect` : null,
    webhookQrcode: url ? `${url}/api/webhooks/qrcode` : null,
  });
});

app.post('/api/tunnel/restart', authMiddleware, async (_req, res) => {
  try {
    await tunnelService.stop();
    const url = await tunnelService.start(config.server.port);
    await updateAllWebhooks(url);
    res.json({ url, message: 'Tunnel reiniciado e webhooks atualizados' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tunnel/logs', authMiddleware, (_req, res) => {
  res.json({ logs: webhookLogger.getLogs(), stats: webhookLogger.getStats() });
});

app.delete('/api/tunnel/logs', authMiddleware, (_req, res) => {
  webhookLogger.clear();
  res.json({ message: 'Logs limpos' });
});

app.post('/api/tunnel/update-webhooks', authMiddleware, async (_req, res) => {
  try {
    const settingsService = (await import('./services/settings.service')).default;
    
    // Priorizar URL customizada sobre Cloudflare
    const customUrl = await settingsService.getCustomWebhookUrl();
    const cloudflareUrl = tunnelService.getUrl();
    const url = customUrl || cloudflareUrl;
    
    if (!url) return res.status(400).json({ error: 'Nenhuma URL configurada (Cloudflare ou customizada)' });

    const instances = await Instance.findAll({
      where: { deviceToken: { [require('sequelize').Op.ne]: null } },
    });

    if (instances.length === 0) {
      return res.json({ message: 'Nenhuma instância com deviceToken para atualizar' });
    }

    const webhookBase = `${url}/api/webhooks`;
    const bearer = await apiBrasilService.getBearerToken();
    const secretKey = await require('./services/settings.service').default.getApibrasilSecretKey();
    let updated = 0;
    const errors: string[] = [];

    for (const inst of instances) {
      try {
        if (inst.deviceKey && inst.serverSearch && secretKey) {
          await apiBrasilService.updateDeviceWebhooks(
            inst.deviceToken!,
            {
              webhook_wh_message: `${webhookBase}/message`,
              webhook_wh_status: `${webhookBase}/status`,
              webhook_wh_connect: `${webhookBase}/connect`,
              webhook_wh_qrcode: `${webhookBase}/qrcode`
            },
            { deviceKey: inst.deviceKey, deviceName: inst.name, serverSearch: inst.serverSearch }
          );
          updated++;
        } else {
          errors.push(`${inst.name || inst.phone}: dados incompletos — recrie a instância para atualizar webhooks automaticamente`);
        }
      } catch (err: any) {
        errors.push(`${inst.name || inst.phone}: ${err.message}`);
      }
    }

    res.json({
      message: `Webhooks atualizados: ${updated}/${instances.length}`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rotas públicas
app.use('/api/auth', authRouter);
app.use('/api/webhooks', webhooksRouter);

// Rotas protegidas
app.use('/api/instances', authMiddleware, instancesRouter);
app.use('/api/contacts', authMiddleware, contactsRouter);
app.use('/api/metrics', authMiddleware, metricsRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/bots', authMiddleware, botsRouter);
app.use('/api/attendances', authMiddleware, attendancesRouter);
app.use('/api/attendants', authMiddleware, attendantsRouter);
app.use('/api/sse', sseRouter);

// Iniciar servidor 
async function start() {
  try {
    // Conectar ao banco de dados
    const dbConnected = await connectDatabase();
    
    if (!dbConnected) {
      console.error('Falha ao conectar ao banco de dados. Encerrando...');
      process.exit(1);
    }

    // Iniciar servidor HTTP
    app.listen(config.server.port, () => {
      console.log('');
      console.log(`🚀 Servidor rodando na porta ${config.server.port}`);
      console.log(`   http://localhost:${config.server.port}`);
      console.log('');
    });

    // Iniciar monitoramento de status em background
    statusMonitorService.start();

    // Iniciar Cloudflare Tunnel
    try {
      const tunnelUrl = await tunnelService.start(config.server.port);
      console.log(`🔗 Tunnel ativo: ${tunnelUrl}`);
      
      // Atualizar webhooks de todas as instâncias
      await updateAllWebhooks(tunnelUrl);
    } catch (error: any) {
      console.error('❌ Erro ao iniciar Cloudflare Tunnel:', error.message);
      console.log('   Continuando sem tunnel...');
    }

  } catch (error) {
    console.error('❌ Erro fatal ao iniciar servidor:', error);
    process.exit(1);
  }
}

start();
