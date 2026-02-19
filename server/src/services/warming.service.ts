import { Instance, WarmingContact, Conversation, Message, WarmingSchedule, DailyMetric } from '../models';
import apiBrasilService from './apibrasil.service';
import chatgptService from './chatgpt.service';
import { Op } from 'sequelize';

// Cronograma baseado no PDF (Dias 1-8)
const WARMING_SCHEDULE = [
  { day: 1, maxConversations: 10, minIntervalMinutes: 60 },  // 1 por hora
  { day: 2, maxConversations: 20, minIntervalMinutes: 30 },  // 1 a cada 30min
  { day: 3, maxConversations: 30, minIntervalMinutes: 20 },  // 1 a cada 20min
  { day: 4, maxConversations: 40, minIntervalMinutes: 15 },  // 1 a cada 15min
  { day: 5, maxConversations: 50, minIntervalMinutes: 10 },  // 1 a cada 10min
  { day: 6, maxConversations: 60, minIntervalMinutes: 8 },   // 1 a cada 8min
  { day: 7, maxConversations: 70, minIntervalMinutes: 7 },   // 1 a cada 7min
  { day: 8, maxConversations: 80, minIntervalMinutes: 6 },   // 1 a cada 6min
];

class WarmingService {
  private activeInstances: Map<number, NodeJS.Timeout> = new Map();

  // Mapear tipos do ChatGPT (português) para types do banco (inglês)
  private mapMessageType(tipo: string): 'text' | 'image' | 'audio' | 'sticker' | 'video' | 'location' | 'contact' {
    const typeMap: { [key: string]: 'text' | 'image' | 'audio' | 'sticker' } = {
      'texto': 'text',
      'imagem': 'image',
      'audio': 'audio',
      'sticker': 'sticker',
    };
    return typeMap[tipo] || 'text';
  }

  async startWarming(instanceId: number): Promise<void> {
    try {
      const instance = await Instance.findByPk(instanceId);
      if (!instance) {
        throw new Error('Instância não encontrada');
      }

      if (instance.status !== 'connected') {
        throw new Error('Instância precisa estar conectada para iniciar aquecimento');
      }

      // Atualizar fase
      await instance.update({ currentPhase: 'auto_warming' });

      // Verificar se já está rodando
      if (this.activeInstances.has(instanceId)) {
        console.log(`Aquecimento já está ativo para instância ${instanceId}`);
        return;
      }

      // Inicializar cronograma se necessário
      await this.initializeSchedule(instanceId);

      // Iniciar loop de aquecimento
      this.runWarmingLoop(instanceId);

      console.log(`✓ Aquecimento iniciado para instância ${instanceId}`);
    } catch (error: any) {
      console.error('Erro ao iniciar aquecimento:', error.message);
      throw error;
    }
  }

  async pauseWarming(instanceId: number): Promise<void> {
    const timeout = this.activeInstances.get(instanceId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeInstances.delete(instanceId);
    }

    const instance = await Instance.findByPk(instanceId);
    if (instance) {
      await instance.update({ currentPhase: 'manual' });
    }

    console.log(`Aquecimento pausado para instância ${instanceId}`);
  }

  private async initializeSchedule(instanceId: number): Promise<void> {
    const existingSchedules = await WarmingSchedule.count({ where: { instanceId } });
    
    if (existingSchedules === 0) {
      // Criar cronograma dos 8 dias
      for (const day of WARMING_SCHEDULE) {
        await WarmingSchedule.create({
          instanceId,
          dayNumber: day.day,
          maxConversations: day.maxConversations,
          minIntervalMinutes: day.minIntervalMinutes,
          conversationsDone: 0,
          messagesDone: 0,
          status: 'pending',
        });
      }
    }
  }

  private async runWarmingLoop(instanceId: number): Promise<void> {
    try {
      const instance = await Instance.findByPk(instanceId);
      if (!instance || instance.currentPhase !== 'auto_warming') {
        return;
      }

      // Verificar horário (8h às 22h)
      if (!this.isBusinessHours()) {
        console.log(`Fora do horário de aquecimento (8h-22h). Aguardando...`);
        // Tentar novamente em 30 minutos
        const timeout = setTimeout(() => this.runWarmingLoop(instanceId), 30 * 60 * 1000);
        this.activeInstances.set(instanceId, timeout);
        return;
      }

      // Executar próxima conversa
      const executed = await this.executeNextConversation(instanceId);

      if (executed) {
        // Calcular próximo intervalo
        const schedule = await this.getCurrentDaySchedule(instanceId);
        if (schedule) {
          const delayMs = this.getRandomDelay(schedule.minIntervalMinutes);
          console.log(`Próxima conversa em ${Math.round(delayMs / 1000 / 60)} minutos`);
          
          const timeout = setTimeout(() => this.runWarmingLoop(instanceId), delayMs);
          this.activeInstances.set(instanceId, timeout);
        }
      } else {
        // Dia completo, tentar novamente em 1 hora
        const timeout = setTimeout(() => this.runWarmingLoop(instanceId), 60 * 60 * 1000);
        this.activeInstances.set(instanceId, timeout);
      }
    } catch (error: any) {
      console.error('Erro no loop de aquecimento:', error.message);
      
      // Tentar novamente em 5 minutos em caso de erro
      const timeout = setTimeout(() => this.runWarmingLoop(instanceId), 5 * 60 * 1000);
      this.activeInstances.set(instanceId, timeout);
    }
  }

  async executeNextConversation(instanceId: number): Promise<boolean> {
    try {
      const instance = await Instance.findByPk(instanceId);
      if (!instance || !instance.deviceToken) {
        return false;
      }

      const schedule = await this.getCurrentDaySchedule(instanceId);
      if (!schedule) {
        console.log('Cronograma não encontrado');
        return false;
      }

      // Verificar se já atingiu a meta do dia
      if (schedule.conversationsDone >= schedule.maxConversations) {
        if (schedule.status !== 'completed') {
          await schedule.update({ status: 'completed' });
          
          // Avançar para próximo dia
          const nextDay = schedule.dayNumber + 1;
          if (nextDay <= 8) {
            await instance.update({ currentDay: nextDay });
            console.log(`✓ Dia ${schedule.dayNumber} completo! Avançando para dia ${nextDay}`);
          } else {
            await instance.update({ currentPhase: 'sending' });
            console.log(`✓ Aquecimento completo! Pronto para envios em massa.`);
          }
        }
        return false;
      }

      // Buscar contato aleatório
      const contact = await this.getRandomContact();
      if (!contact) {
        console.log('Nenhum contato disponível para aquecimento');
        return false;
      }

      // Gerar conversa com ChatGPT
      const conversation = await chatgptService.generateConversation();
      
      // Criar conversa no banco
      const conv = await Conversation.create({
        instanceId: instance.id,
        contactId: contact.id,
        topic: conversation.topic,
        messagesCount: conversation.messages.length,
        startedAt: new Date(),
        status: 'in_progress',
      });

      console.log(`Iniciando conversa sobre: ${conversation.topic} com ${contact.name || contact.phone}`);

      // Enviar mensagens com delay entre elas
      for (const msg of conversation.messages) {
        if (msg.remetente === 'eu') {
          // Delay entre mensagens (10s a 60s)
          await this.sleep(this.getRandomNumber(10, 60) * 1000);

          let sent = false;
          
          try {
            switch (msg.tipo) {
              case 'texto':
                await apiBrasilService.sendText(instance.deviceToken!, instance.serverType, contact.phone, msg.conteudo);
                sent = true;
                break;
              
              case 'audio':
                await apiBrasilService.sendText(
                  instance.deviceToken!, 
                  instance.serverType,
                  contact.phone, 
                  `🎤 [Áudio: ${msg.conteudo}]`
                );
                sent = true;
                break;
              
              case 'imagem':
                await apiBrasilService.sendText(
                  instance.deviceToken!, 
                  instance.serverType,
                  contact.phone, 
                  `📷 [Imagem: ${msg.conteudo}]`
                );
                sent = true;
                break;
              
              case 'sticker':
                await apiBrasilService.sendText(
                  instance.deviceToken!, 
                  instance.serverType,
                  contact.phone, 
                  `😄 [Figurinha: ${msg.conteudo}]`
                );
                sent = true;
                break;
            }

            if (sent) {
              // Salvar mensagem no banco
              await Message.create({
                conversationId: conv.id,
                direction: 'sent',
                type: this.mapMessageType(msg.tipo),
                content: msg.conteudo,
                sentAt: new Date(),
                delivered: true,
                readByContact: false,
              });

              console.log(`  → Enviado: ${msg.conteudo.substring(0, 50)}...`);
            }
          } catch (error: any) {
            console.error(`Erro ao enviar mensagem: ${error.message}`);
          }
        } else {
          // Mensagem do contato (simular recebimento)
          await Message.create({
            conversationId: conv.id,
            direction: 'received',
            type: this.mapMessageType(msg.tipo),
            content: msg.conteudo,
            sentAt: new Date(),
            delivered: true,
            readByContact: true,
          });
          
          console.log(`  ← Recebido (simulado): ${msg.conteudo.substring(0, 50)}...`);
        }
      }

      // Marcar conversa como completa
      await conv.update({ 
        status: 'completed', 
        completedAt: new Date() 
      });

      // Atualizar métricas
      await this.updateMetrics(instanceId, conversation.messages.length);

      // Atualizar contador do cronograma
      await schedule.update({
        conversationsDone: schedule.conversationsDone + 1,
        messagesDone: schedule.messagesDone + conversation.messages.length,
        status: 'in_progress',
      });

      console.log(`✓ Conversa completa (${schedule.conversationsDone + 1}/${schedule.maxConversations})`);

      return true;
    } catch (error: any) {
      console.error('Erro ao executar conversa:', error.message);
      return false;
    }
  }

  private async getCurrentDaySchedule(instanceId: number): Promise<WarmingSchedule | null> {
    const instance = await Instance.findByPk(instanceId);
    if (!instance) return null;

    const currentDay = instance.currentDay || 1;
    
    return await WarmingSchedule.findOne({
      where: {
        instanceId,
        dayNumber: currentDay,
      },
    });
  }

  private async getRandomContact(): Promise<WarmingContact | null> {
    const contacts = await WarmingContact.findAll({
      where: { active: true },
    });

    if (contacts.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * contacts.length);
    return contacts[randomIndex];
  }

  private async updateMetrics(instanceId: number, messagesSent: number): Promise<void> {
    const today = new Date();

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
      messagesSent: metric.messagesSent + messagesSent,
    });
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 8 && hour < 22;
  }

  private getRandomDelay(baseMinutes: number): number {
    // Adiciona variação de ±20% ao intervalo base
    const variation = 0.2;
    const minDelay = baseMinutes * (1 - variation);
    const maxDelay = baseMinutes * (1 + variation);
    
    const randomMinutes = minDelay + Math.random() * (maxDelay - minDelay);
    return Math.round(randomMinutes * 60 * 1000); // Converter para ms
  }

  private getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new WarmingService();
