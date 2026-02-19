import { Instance, Conversation, Message, Bot, Attendance, AttendanceMessage } from '../models';
import chatgptService from './chatgpt.service';
import apiBrasilService from './apibrasil.service';
import settingsService from './settings.service';
import OpenAI from 'openai';
import { Op } from 'sequelize';
import { IncomingHttpHeaders } from 'http';

interface WebhookMessageData {
  from: string;
  message: string;
  type?: string;
  deviceToken?: string;
  isFromMe?: boolean;
  isGroup?: boolean;
}

class WebhookService {
  private mapMessageType(tipo: string): 'text' | 'image' | 'audio' | 'sticker' | 'video' | 'location' | 'contact' {
    const typeMap: Record<string, 'text' | 'image' | 'audio' | 'sticker'> = {
      'texto': 'text',
      'imagem': 'image',
      'audio': 'audio',
      'sticker': 'sticker',
    };
    return typeMap[tipo] || 'text';
  }

  /**
   * Gera um número de protocolo único no formato: ATD-YYYYMMDD-XXXXXX
   * Exemplo: ATD-20260218-000001
   */
  private generateProtocol(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    return `ATD-${year}${month}${day}-${random}`;
  }

  /**
   * Tenta extrair from/message/deviceToken de qualquer formato que a APIBrasil envie.
   * Suporta: WPP (wppconnect), Baileys (Evolution), e formato Cloud API.
   */
  parseWebhookPayload(body: any, headers?: IncomingHttpHeaders): WebhookMessageData | null {
    if (!body || typeof body !== 'object') return null;

    let from = '';
    let message = '';
    let type = 'text';
    let deviceToken = '';
    let isFromMe = false;
    let isGroup = false;

    if (headers) {
      deviceToken = (headers['devicetoken'] || headers['device-token'] || headers['x-device-token'] || '') as string;
    }

    // === Formato WPP (wppconnect) via APIBrasil ===
    if (body.event && body.response) {
      const resp = body.response;
      from = resp.from || resp.chatId || resp.sender?.id || '';
      message = resp.body || resp.caption || resp.content || '';
      type = resp.type || 'chat';
      isFromMe = resp.fromMe === true;
      isGroup = resp.isGroupMsg === true || from.includes('@g.us');
      deviceToken = deviceToken || body.device_token || body.deviceToken || resp.device_token || '';

      if (from && message && !isFromMe) {
        return { from: this.cleanPhone(from), message, type, deviceToken, isFromMe, isGroup };
      }
      return null;
    }

    // === Formato Baileys (Evolution API) via APIBrasil ===
    if (body.event === 'messages.upsert' && body.data) {
      const data = body.data;
      const key = data.key || {};
      from = key.remoteJid || '';
      isFromMe = key.fromMe === true;
      isGroup = from.includes('@g.us');
      deviceToken = deviceToken || body.device_token || body.deviceToken || '';

      const msg = data.message || {};
      message = msg.conversation
        || msg.extendedTextMessage?.text
        || msg.imageMessage?.caption
        || msg.videoMessage?.caption
        || msg.documentMessage?.caption
        || '';
      type = msg.imageMessage ? 'image' : msg.audioMessage ? 'audio' : msg.videoMessage ? 'video' : 'text';

      if (from && message && !isFromMe) {
        return { from: this.cleanPhone(from), message, type, deviceToken, isFromMe, isGroup };
      }
      return null;
    }

    // === Formato Evolution genérico ===
    if (body.data?.key?.remoteJid) {
      const key = body.data.key;
      from = key.remoteJid || '';
      isFromMe = key.fromMe === true;
      isGroup = from.includes('@g.us');
      deviceToken = deviceToken || body.device_token || body.deviceToken || '';

      const msg = body.data.message || {};
      message = msg.conversation
        || msg.extendedTextMessage?.text
        || msg.imageMessage?.caption
        || '';

      if (from && message && !isFromMe) {
        return { from: this.cleanPhone(from), message, type: 'text', deviceToken, isFromMe, isGroup };
      }
      return null;
    }

    // === Formato Cloud API (Meta) ===
    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
      const msg = body.messages[0];
      from = msg.from || '';
      message = msg.text?.body || msg.caption || '';
      type = msg.type || 'text';
      deviceToken = deviceToken || body.metadata?.phone_number_id || '';

      if (from && message) {
        return { from: this.cleanPhone(from), message, type, deviceToken, isGroup: false };
      }
      return null;
    }

    // === Fallback: campos diretos (formato simplificado) ===
    from = body.from || body.sender || body.number || body.phone || '';
    message = body.message || body.body || body.text || body.content || '';
    deviceToken = deviceToken || body.deviceToken || body.device_token || '';
    isFromMe = body.fromMe === true || body.isFromMe === true;
    isGroup = body.isGroupMsg === true || from.includes('@g.us');

    if (from && message && !isFromMe) {
      return { from: this.cleanPhone(from), message, type: 'text', deviceToken, isFromMe, isGroup };
    }

    return null;
  }

  private cleanPhone(phone: string): string {
    return phone
      .replace('@c.us', '')
      .replace('@s.whatsapp.net', '')
      .replace('@g.us', '')
      .replace(/[^0-9]/g, '');
  }

  async handleIncomingMessage(data: WebhookMessageData): Promise<void> {
    try {
      console.log(`📩 Mensagem parseada: from=${data.from} msg="${data.message.substring(0, 50)}" deviceToken=${data.deviceToken || '?'} grupo=${data.isGroup || false}`);

      const { from, message, type, deviceToken, isGroup } = data;

      if (!from || !message) {
        console.log('Mensagem sem remetente ou conteúdo, ignorando');
        return;
      }

      const instance = await this.findInstance(deviceToken, from);
      if (!instance) {
        console.log(`⚠️ Instância não encontrada (deviceToken=${deviceToken}, from=${from})`);
        return;
      }

      console.log(`✅ Instância encontrada: #${instance.id} (${instance.name || instance.phone}) serverType=${instance.serverType}`);

      // Verificar se é um atendimento ativo
      const openAttendance = await Attendance.findOne({
        where: {
          instanceId: instance.id,
          phone: from,
          status: { [Op.in]: ['waiting', 'in_progress'] },
        },
      });

      if (openAttendance) {
        // Salvar mensagem no histórico do atendimento
        await AttendanceMessage.create({
          attendanceId: openAttendance.id,
          direction: 'received',
          content: message,
          sentAt: new Date(),
        });
        console.log(`💬 Mensagem salva no atendimento #${openAttendance.id}`);
        return;
      }

      const activeConversation = await this.findActiveConversation(instance.id, from);

      if (activeConversation) {
        await Message.create({
          conversationId: activeConversation.id,
          direction: 'received',
          type: type === 'audio' ? 'audio' : type === 'image' ? 'image' : 'text',
          content: message,
          sentAt: new Date(),
          delivered: true,
          readByContact: true,
        });

        console.log(`Mensagem recebida na conversa #${activeConversation.id}: ${message}`);
        await this.generateAndSendReply(instance, activeConversation, from, message);
      } else {
        const botHandled = await this.handleBotReply(instance, from, message, isGroup);

        if (!botHandled) {
          console.log('Mensagem recebida mas não faz parte de conversa ativa nem bot');
        }

        await this.updateIncomingMetrics(instance.id);
      }
    } catch (error: any) {
      console.error('Erro ao processar webhook:', error.message);
    }
  }

  private async generateAndSendReply(
    instance: Instance,
    conversation: Conversation,
    to: string,
    receivedMessage: string
  ): Promise<void> {
    try {
      const recentMessages = await Message.findAll({
        where: { conversationId: conversation.id },
        order: [['createdAt', 'DESC']],
        limit: 5,
      });

      const context = recentMessages
        .reverse()
        .map(m => `${m.direction === 'sent' ? 'Eu' : 'Contato'}: ${m.content}`)
        .filter(Boolean);

      const reply = await chatgptService.generateReply(context, receivedMessage);

      const delayMs = this.getRandomDelay(30, 300);
      console.log(`Aguardando ${Math.round(delayMs / 1000)}s antes de responder...`);
      await this.sleep(delayMs);

      if (!instance.deviceToken) {
        console.log('Device token não disponível, não foi possível responder');
        return;
      }

      let sent = false;

      switch (reply.tipo) {
        case 'texto':
          await apiBrasilService.sendText(instance.deviceToken, instance.serverType, to, reply.conteudo);
          sent = true;
          break;

        case 'audio':
          await apiBrasilService.sendText(instance.deviceToken, instance.serverType, to, `🎤 [Áudio: ${reply.conteudo}]`);
          sent = true;
          break;

        case 'imagem':
          await apiBrasilService.sendText(instance.deviceToken, instance.serverType, to, `📷 [Imagem: ${reply.conteudo}]`);
          sent = true;
          break;

        case 'sticker':
          await apiBrasilService.sendText(instance.deviceToken, instance.serverType, to, `😄 [Figurinha: ${reply.conteudo}]`);
          sent = true;
          break;
      }

      if (sent) {
        await Message.create({
          conversationId: conversation.id,
          direction: 'sent',
          type: this.mapMessageType(reply.tipo),
          content: reply.conteudo,
          sentAt: new Date(),
          delivered: true,
          readByContact: false,
        });

        console.log(`✓ Resposta enviada: ${reply.conteudo.substring(0, 50)}...`);

        await conversation.update({
          messagesCount: conversation.messagesCount + 1,
        });
      }
    } catch (error: any) {
      console.error('Erro ao gerar/enviar resposta:', error.message);
    }
  }

  private async handleBotReply(instance: Instance, from: string, messageText: string, isGroup?: boolean): Promise<boolean> {
    try {
      // Verificar se existe atendimento ABERTO (não fechado) para este contato
      const openAttendance = await Attendance.findOne({
        where: {
          instanceId: instance.id,
          phone: from,
          status: { [Op.in]: ['waiting', 'in_progress'] },
        },
      });

      if (openAttendance) {
        console.log(`[Bot] Contato ${from} em atendimento humano (ID: ${openAttendance.id}, status: ${openAttendance.status}), ignorando`);
        return false;
      }

      console.log(`[Bot] Nenhum atendimento aberto para ${from}, processando com bot...`);

      const bot = await Bot.findOne({
        where: { instanceId: instance.id, active: true },
      });

      const activeBot = bot || await Bot.findOne({
        where: { instanceId: null, active: true },
      });

      if (!activeBot) {
        console.log(`[Bot] Nenhum bot ativo para instância #${instance.id}`);
        return false;
      }

      if (isGroup && !activeBot.replyGroups) {
        console.log(`[Bot "${activeBot.name}"] Mensagem de grupo ignorada (replyGroups=false)`);
        return false;
      }

      return this.executeBotReply(activeBot, instance, from, messageText);
    } catch (error: any) {
      console.error('[Bot] Erro ao buscar bot:', error.message);
      return false;
    }
  }

  private async executeBotReply(bot: Bot, instance: Instance, from: string, messageText: string): Promise<boolean> {
    try {
      if (!instance.deviceToken) {
        console.warn(`[Bot] Instância #${instance.id} sem deviceToken`);
        return false;
      }

      console.log(`[Bot "${bot.name}"] Processando mensagem de ${from}: ${messageText.substring(0, 50)}`);

      const apiKey = await settingsService.getOpenaiApiKey();
      if (!apiKey) {
        console.warn('[Bot] API Key do OpenAI não configurada');
        return false;
      }

      if (bot.replyDelay > 0) {
        console.log(`[Bot] Aguardando ${bot.replyDelay}s antes de responder...`);
        await this.sleep(bot.replyDelay * 1000);
      }

      const client = new OpenAI({ apiKey });
      
      // Injetar instrução para transferência de atendente no system prompt
      const enhancedSystemPrompt = `${bot.systemPrompt}

IMPORTANTE: Se o usuário pedir para falar com um atendente humano, responda normalmente confirmando a transferência e perguntando brevemente o motivo/assunto. Ao final da sua resposta, inclua EXATAMENTE o marcador [TRANSFERIR_ATENDENTE].`;

      const response = await client.chat.completions.create({
        model: bot.model,
        messages: [
          { role: 'system', content: enhancedSystemPrompt },
          { role: 'user', content: messageText },
        ],
        temperature: bot.temperature,
        max_tokens: bot.maxTokens,
      });

      const reply = response.choices[0]?.message?.content;
      if (!reply) {
        console.warn('[Bot] OpenAI retornou resposta vazia');
        return false;
      }

      // Verificar se o GPT incluiu o marcador de transferência
      const transferMarker = '[TRANSFERIR_ATENDENTE]';
      const shouldTransfer = reply.includes(transferMarker);
      
      // Remover o marcador da resposta antes de enviar
      const cleanReply = reply.replace(transferMarker, '').trim();

      console.log(`[Bot "${bot.name}"] Enviando resposta para ${from}...`);
      await apiBrasilService.sendText(instance.deviceToken, instance.serverType, from, cleanReply);
      console.log(`[Bot "${bot.name}"] ✅ Resposta enviada para ${from}: ${cleanReply.substring(0, 60)}...`);

      // Se deve transferir, criar atendimento
      if (shouldTransfer) {
        console.log(`[Bot] Criando atendimento para ${from}...`);
        
        // Extrair contexto da conversa (título e assunto)
        const title = `Solicitação de ${from}`;
        const subject = messageText.substring(0, 200);
        const context = JSON.stringify({
          userMessage: messageText,
          botResponse: cleanReply,
          timestamp: new Date().toISOString(),
        });

        await Attendance.create({
          protocol: this.generateProtocol(),
          instanceId: instance.id,
          botId: bot.id,
          phone: from,
          contactName: null,
          title,
          subject,
          context,
          status: 'waiting',
          closedAt: null,
          closedBy: null,
        });

        console.log(`[Bot] ✅ Atendimento criado para ${from} - Bot pausado para este contato`);
      }

      return true;
    } catch (error: any) {
      console.error(`[Bot] Erro ao processar resposta: ${error.message}`);
      if (error.response?.data) {
        console.error('[Bot] Detalhes do erro:', JSON.stringify(error.response.data));
      }
      return false;
    }
  }

  private async findInstance(deviceToken?: string, from?: string): Promise<Instance | null> {
    // 1. Buscar por deviceToken (mais confiável)
    if (deviceToken) {
      const instance = await Instance.findOne({ where: { deviceToken } });
      if (instance) return instance;
      console.log(`⚠️ deviceToken "${deviceToken}" não encontrado no banco`);
    }

    // 2. Buscar por número do from (ex: 5511999 está no phone da instância)
    if (from) {
      const cleanFrom = from.replace(/[^0-9]/g, '');
      const instances = await Instance.findAll({ where: { status: 'connected' } });

      for (const inst of instances) {
        const cleanPhone = inst.phone.replace(/[^0-9]/g, '');
        if (cleanFrom.includes(cleanPhone) || cleanPhone.includes(cleanFrom)) {
          return inst;
        }
      }
    }

    // 3. Fallback: pegar qualquer instância conectada (último recurso)
    const connected = await Instance.findOne({ where: { status: 'connected' } });
    if (connected) {
      console.log(`ℹ️ Usando instância conectada como fallback: #${connected.id}`);
    }
    return connected;
  }

  private async findActiveConversation(instanceId: number, contactPhone: string): Promise<Conversation | null> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const conversation = await Conversation.findOne({
      where: {
        instanceId,
        status: {
          [Op.in]: ['pending', 'in_progress'],
        },
        createdAt: {
          [Op.gte]: oneDayAgo,
        },
      },
      include: [
        {
          model: require('../models').WarmingContact,
          as: 'contact',
          where: {
            phone: contactPhone,
          },
        },
      ],
    });

    return conversation;
  }

  private async updateIncomingMetrics(instanceId: number): Promise<void> {
    const today = new Date();

    const DailyMetric = require('../models').DailyMetric;

    const [metric] = await DailyMetric.findOrCreate({
      where: {
        instanceId,
        date: today,
      },
      defaults: {
        instanceId,
        date: today,
        messagesSent: 0,
        messagesReceived: 0,
        responsesCount: 0,
        blocksCount: 0,
        reportsCount: 0,
        ignoredCount: 0,
      },
    });

    await metric.update({
      messagesReceived: metric.messagesReceived + 1,
    });
  }

  private getRandomDelay(minSeconds: number, maxSeconds: number): number {
    return (minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new WebhookService();
