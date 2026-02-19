import { Router, Request, Response } from 'express';
import { Settings } from '../models';
import settingsService from '../services/settings.service';
import apiBrasilService from '../services/apibrasil.service';

const router = Router();

// Listar todas as configurações
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await settingsService.getAllSettings();
    
    // Mascarar valores sensíveis
    const maskedSettings = settings.map(s => ({
      ...s.toJSON(),
      settingValue: s.settingKey.includes('password') || s.settingKey.includes('api_key') || s.settingKey.includes('token')
        ? '***HIDDEN***'
        : s.settingValue,
    }));
    
    res.json(maskedSettings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar credenciais para exibição (descriptografadas para edição)
router.get('/credentials/current', async (req: Request, res: Response) => {
  try {
    const email = await settingsService.getApibrasilEmail();
    const password = await settingsService.getApibrasilPassword();
    const secretKey = await settingsService.getApibrasilSecretKey();
    const apiType = await settingsService.getSetting('apibrasil_api_type');
    const apiKey = await settingsService.getOpenaiApiKey();
    const model = await settingsService.getOpenaiModel();

    res.json({
      apibrasil: {
        email: email || '',
        password: password || '',
        secretKey: secretKey || '',
        apiType: apiType || '',
        hasCredentials: !!(email && password),
      },
      openai: {
        apiKey: apiKey || '',
        model: model || 'gpt-4o-mini',
        hasCredentials: !!apiKey,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar configuração específica
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const value = await settingsService.getSetting(req.params.key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }
    
    res.json({ key: req.params.key, value });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar/criar configuração
router.post('/', async (req: Request, res: Response) => {
  try {
    const { key, value, description } = req.body;

    if (!key || !value) {
      return res.status(400).json({ error: 'Key e value são obrigatórios' });
    }

    await settingsService.setSetting(key, value, description);

    res.json({ message: 'Configuração salva com sucesso', key, value });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Configurar credenciais APIBrasil
router.post('/apibrasil', async (req: Request, res: Response) => {
  try {
    const { email, password, secretKey, apiType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password são obrigatórios' });
    }

    await settingsService.setApibrasilCredentials(email, password, secretKey);

    if (apiType) {
      await settingsService.setSetting('apibrasil_api_type', apiType, 'Tipo da API (whatsapp ou baileys)');
    }

    // Tentar fazer login para validar
    try {
      const bearer = await apiBrasilService.login();
      res.json({ 
        message: 'Credenciais APIBrasil configuradas e validadas com sucesso',
        bearerToken: bearer,
      });
    } catch (loginError: any) {
      res.status(400).json({ 
        error: 'Credenciais salvas mas falha no login: ' + loginError.message 
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Configurar credenciais OpenAI
router.post('/openai', async (req: Request, res: Response) => {
  try {
    const { apiKey, model } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API Key é obrigatória' });
    }

    await settingsService.setOpenaiCredentials(apiKey, model);

    res.json({ message: 'Credenciais OpenAI configuradas com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Detectar tipo de API pela SecretKey
router.post('/apibrasil/detect-type', async (req: Request, res: Response) => {
  try {
    const { secretKey } = req.body;

    if (!secretKey) {
      return res.status(400).json({ error: 'SecretKey é obrigatória' });
    }

    const result = await apiBrasilService.detectApiTypeBySecretKey(secretKey);

    if (!result) {
      return res.status(404).json({
        error: 'SecretKey não encontrada nas APIs do usuário',
        detectedType: null,
      });
    }

    const apiType = result.type === 'baileys' ? 'baileys' : 'whatsapp';
    await settingsService.setSetting('apibrasil_api_type', apiType, 'Tipo da API detectado pela SecretKey');

    res.json({
      detectedType: apiType,
      apiName: result.name,
      rawType: result.type,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Testar credenciais APIBrasil
router.post('/apibrasil/test', async (req: Request, res: Response) => {
  try {
    const bearer = await apiBrasilService.login();
    res.json({ 
      success: true,
      message: 'Login realizado com sucesso',
      bearerToken: bearer,
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false,
      error: error.message,
    });
  }
});

// Testar credenciais OpenAI
router.post('/openai/test', async (req: Request, res: Response) => {
  try {
    const apiKey = await settingsService.getOpenaiApiKey();
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API Key do OpenAI não configurada',
      });
    }

    // Importar OpenAI e fazer uma chamada de teste
    const OpenAI = require('openai').default;
    const client = new OpenAI({ apiKey });
    
    const model = await settingsService.getOpenaiModel();
    
    // Fazer uma chamada simples de teste
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'user', content: 'Responda apenas: OK' }
      ],
      max_tokens: 10,
    });

    const testResponse = response.choices[0]?.message?.content || '';

    res.json({ 
      success: true,
      message: `Conexão OK! Modelo: ${model}`,
      testResponse,
    });
  } catch (error: any) {
    let errorMessage = error.message;
    
    // Mensagens de erro mais amigáveis
    if (error.status === 401) {
      errorMessage = 'API Key inválida ou expirada';
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'API Key inválida';
    } else if (error.code === 'insufficient_quota') {
      errorMessage = 'Sem créditos na conta OpenAI';
    }

    res.status(400).json({ 
      success: false,
      error: errorMessage,
    });
  }
});

// Obter configuração de exibir nome do atendente
router.get('/attendance/show-name', async (req: Request, res: Response) => {
  try {
    const showName = await settingsService.getShowAttendantName();
    res.json({ showAttendantName: showName });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar configuração de exibir nome do atendente
router.post('/attendance/show-name', async (req: Request, res: Response) => {
  try {
    const { showAttendantName } = req.body;
    
    if (typeof showAttendantName !== 'boolean') {
      return res.status(400).json({ error: 'showAttendantName deve ser um boolean' });
    }
    
    await settingsService.setShowAttendantName(showAttendantName);
    res.json({ message: 'Configuração atualizada com sucesso', showAttendantName });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obter URL customizada de webhook
router.get('/webhook/custom-url', async (req: Request, res: Response) => {
  try {
    const customUrl = await settingsService.getCustomWebhookUrl();
    res.json({ customUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Definir URL customizada de webhook
router.post('/webhook/custom-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    // Validar formato da URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'URL inválida' });
    }
    
    await settingsService.setCustomWebhookUrl(url);
    res.json({ message: 'URL customizada salva com sucesso', url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Limpar URL customizada de webhook (volta a usar Cloudflare)
router.delete('/webhook/custom-url', async (req: Request, res: Response) => {
  try {
    await settingsService.clearCustomWebhookUrl();
    res.json({ message: 'URL customizada removida. Voltando a usar Cloudflare Tunnel.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obter mensagens de atendimento
router.get('/attendance/messages', async (req: Request, res: Response) => {
  try {
    const welcomeMessage = await settingsService.getWelcomeMessage();
    const closingMessage = await settingsService.getClosingMessage();
    res.json({ welcomeMessage, closingMessage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar mensagem de boas-vindas
router.post('/attendance/welcome-message', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    await settingsService.setWelcomeMessage(message);
    res.json({ message: 'Mensagem de boas-vindas atualizada com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar mensagem de encerramento
router.post('/attendance/closing-message', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }
    
    await settingsService.setClosingMessage(message);
    res.json({ message: 'Mensagem de encerramento atualizada com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
