import { Router, Request, Response } from 'express';
import { Bot, Instance } from '../models';
import settingsService from '../services/settings.service';
import OpenAI from 'openai';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const bots = await Bot.findAll({
      include: [{ model: Instance, as: 'instance', attributes: ['id', 'name', 'phone', 'status'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(bots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bot = await Bot.findByPk(req.params.id, {
      include: [{ model: Instance, as: 'instance', attributes: ['id', 'name', 'phone', 'status'] }],
    });
    if (!bot) return res.status(404).json({ error: 'Bot não encontrado' });
    res.json(bot);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, instanceId, systemPrompt, model, temperature, maxTokens, replyDelay, contextMessages, replyGroups } = req.body;

    if (!name || !systemPrompt) {
      return res.status(400).json({ error: 'Nome e prompt do sistema são obrigatórios' });
    }

    const bot = await Bot.create({
      name,
      instanceId: instanceId || null,
      systemPrompt,
      model: model || 'gpt-4o-mini',
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 500,
      active: false,
      replyDelay: replyDelay ?? 3,
      contextMessages: contextMessages ?? 10,
      replyGroups: replyGroups ?? false,
    });

    res.status(201).json(bot);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const bot = await Bot.findByPk(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot não encontrado' });

    await bot.update(req.body);
    res.json(bot);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const bot = await Bot.findByPk(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot não encontrado' });

    await bot.update({ active: !bot.active });
    res.json({ active: bot.active });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const bot = await Bot.findByPk(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot não encontrado' });

    await bot.destroy();
    res.json({ message: 'Bot removido' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const bot = await Bot.findByPk(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot não encontrado' });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });

    const apiKey = await settingsService.getOpenaiApiKey();
    if (!apiKey) return res.status(400).json({ error: 'API Key do OpenAI não configurada' });

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: bot.model,
      messages: [
        { role: 'system', content: bot.systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: bot.temperature,
      max_tokens: bot.maxTokens,
    });

    const reply = response.choices[0]?.message?.content || '';
    res.json({ reply, usage: response.usage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
