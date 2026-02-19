import OpenAI from 'openai';
import settingsService from './settings.service';

interface ConversationMessage {
  remetente: 'eu' | 'contato';
  tipo: 'texto' | 'audio' | 'imagem' | 'sticker';
  conteudo: string;
}

interface GeneratedConversation {
  topic: string;
  messages: ConversationMessage[];
}

const SYSTEM_PROMPT = `Você é um simulador de conversas reais de WhatsApp entre amigos/conhecidos brasileiros.

REGRAS IMPORTANTES:
- Gere mensagens curtas e naturais (como gente real fala no WhatsApp)
- Use gírias brasileiras, abreviações (vc, tb, blz, kk, rs, tmj, flw, vlw)
- Varie o tom: às vezes animado, às vezes neutro, às vezes com pressa
- Use emojis com moderação (como pessoa real) - não abuse
- Alterne entre: perguntas, respostas, piadas, reclamações do dia-a-dia, novidades
- NUNCA repita a mesma estrutura de conversa
- Mensagens devem ter entre 3 a 40 palavras (maioria entre 5-15 palavras)
- Seja natural, espontâneo e brasileiro

TÓPICOS COMUNS:
- Trabalho, futebol, família, comida, clima, fofoca, planos de fim de semana
- Netflix/séries, jogos, academia, saúde, viagem, problemas cotidianos
- Pedir/dar conselhos, marcar compromissos, dividir novidades

DISTRIBUIÇÃO DE TIPOS DE MENSAGEM:
- 70% texto simples
- 15% áudio (descreva brevemente o que seria falado)
- 10% imagem (descreva o que seria a imagem/foto)
- 5% sticker/figurinha (descreva qual seria)

IMPORTANTE: Cada conversa deve ter entre 5 a 10 mensagens trocadas (bate-bola real).

FORMATO DE SAÍDA: JSON puro, sem markdown, sem comentários.`;

class ChatGPTService {
  private client: OpenAI | null = null;

  private async getClient(): Promise<OpenAI> {
    if (!this.client) {
      const apiKey = await settingsService.getOpenaiApiKey();
      
      if (!apiKey) {
        throw new Error('API Key do OpenAI não configurada. Configure em Configurações.');
      }

      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  async generateConversation(
    topic?: string,
    messageCount: number = 8,
    style: 'casual' | 'formal' | 'friendly' = 'casual'
  ): Promise<GeneratedConversation> {
    try {
      const client = await this.getClient();
      const model = await settingsService.getOpenaiModel();
      const topicToUse = topic || await this.generateRandomTopic();
      
      const userPrompt = `Gere uma conversa de ${messageCount} mensagens sobre: "${topicToUse}".
Estilo: ${style}.
Retorne apenas JSON no formato:
{
  "topic": "titulo do assunto",
  "messages": [
    {"remetente": "eu", "tipo": "texto", "conteudo": "mensagem aqui"},
    {"remetente": "contato", "tipo": "texto", "conteudo": "resposta aqui"}
  ]
}`;

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.2,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      // Remove markdown se houver
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const result = JSON.parse(jsonContent);
      return result;
    } catch (error: any) {
      console.error('Erro ao gerar conversa:', error.message);
      
      // Fallback: conversa simples
      return {
        topic: topic || 'Conversa casual',
        messages: [
          { remetente: 'eu', tipo: 'texto', conteudo: 'E aí, tudo bem?' },
          { remetente: 'contato', tipo: 'texto', conteudo: 'Tudo certo! E com vc?' },
          { remetente: 'eu', tipo: 'texto', conteudo: 'Tranquilo, só trabalhando' },
          { remetente: 'contato', tipo: 'texto', conteudo: 'Eu também kk' },
          { remetente: 'eu', tipo: 'texto', conteudo: 'Bora tomar uma depois?' },
          { remetente: 'contato', tipo: 'texto', conteudo: 'Bora sim! Que horas?' },
        ],
      };
    }
  }

  async generateReply(context: string[], lastMessage: string): Promise<ConversationMessage> {
    try {
      const client = await this.getClient();
      const model = await settingsService.getOpenaiModel();
      const contextText = context.slice(-5).join('\n');
      
      const userPrompt = `Contexto das últimas mensagens:
${contextText}

Última mensagem recebida: "${lastMessage}"

Gere UMA resposta natural e contextual para esta mensagem.
Retorne apenas JSON:
{
  "remetente": "eu",
  "tipo": "texto",
  "conteudo": "sua resposta aqui"
}`;

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.1,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const result = JSON.parse(jsonContent);
      return result;
    } catch (error: any) {
      console.error('Erro ao gerar resposta:', error.message);
      
      // Fallback
      return {
        remetente: 'eu',
        tipo: 'texto',
        conteudo: 'Entendi! Vlw',
      };
    }
  }

  async generateRandomTopic(): Promise<string> {
    const topics = [
      'churrasco no fim de semana',
      'jogo do Flamengo/Corinthians ontem',
      'série nova na Netflix',
      'problemas no trabalho',
      'academia e dieta',
      'viagem nas férias',
      'fofoca da vizinha',
      'almoço de família',
      'promoção no mercado',
      'tempo/clima hoje',
      'aniversário do amigo',
      'carro na oficina',
      'conta de luz cara',
      'planos pro feriado',
      'receita de bolo',
      'problema com internet',
      'show/evento legal',
      'novo celular',
      'vaga de emprego',
      'casamento do primo',
    ];

    return topics[Math.floor(Math.random() * topics.length)];
  }

  getMessageTypeDistribution(): 'texto' | 'audio' | 'imagem' | 'sticker' {
    const random = Math.random();
    
    if (random < 0.70) return 'texto';      // 70%
    if (random < 0.85) return 'audio';      // 15%
    if (random < 0.95) return 'imagem';     // 10%
    return 'sticker';                        // 5%
  }
}

export default new ChatGPTService();
