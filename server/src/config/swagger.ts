import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Warm-up Bot API',
    version: '1.0.0',
    description: 'API do sistema de aquecimento automatizado de chips WhatsApp com conversas geradas por IA (ChatGPT).',
    contact: {
      name: 'Warm-up Bot',
      url: 'https://github.com/warm-up-bot',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Desenvolvimento',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação via APIBrasil + JWT' },
    { name: 'Instances', description: 'Gerenciamento de instâncias WhatsApp' },
    { name: 'Contacts', description: 'Contatos de aquecimento' },
    { name: 'Bots', description: 'Bots de atendimento com IA' },
    { name: 'Attendances', description: 'Sessões de atendimento ao cliente' },
    { name: 'Attendants', description: 'Atendentes humanos' },
    { name: 'Metrics', description: 'Métricas e estatísticas diárias' },
    { name: 'Settings', description: 'Configurações e credenciais' },
    { name: 'Tunnel', description: 'Cloudflare Tunnel e webhooks' },
    { name: 'Webhooks', description: 'Endpoints de webhook (público)' },
    { name: 'SSE', description: 'Server-Sent Events (tempo real)' },
    { name: 'Health', description: 'Health check' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido via POST /api/auth/login. Expira em 7 dias.',
      },
    },
    schemas: {
      Instance: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          phone: { type: 'string', example: '5531999999999' },
          name: { type: 'string', example: 'Meu WhatsApp', nullable: true },
          deviceToken: { type: 'string', nullable: true },
          deviceKey: { type: 'string', nullable: true },
          serverSearch: { type: 'string', nullable: true },
          serverType: { type: 'string', enum: ['whatsapp', 'baileys'], default: 'whatsapp' },
          proxyHost: { type: 'string', nullable: true },
          proxyPort: { type: 'integer', nullable: true },
          proxyUser: { type: 'string', nullable: true },
          proxyPass: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['disconnected', 'connecting', 'connected', 'banned'], default: 'disconnected' },
          currentPhase: { type: 'string', enum: ['manual', 'auto_warming', 'sending'], default: 'manual' },
          currentDay: { type: 'integer', default: 0 },
          warmingSpeed: { type: 'integer', default: 1 },
          profilePhoto: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          schedules: { type: 'array', items: { $ref: '#/components/schemas/WarmingSchedule' } },
          metrics: { type: 'array', items: { $ref: '#/components/schemas/DailyMetric' } },
        },
      },
      InstanceCreate: {
        type: 'object',
        required: ['phone', 'serverSearch'],
        properties: {
          phone: { type: 'string', example: '5531999999999', description: 'Número com DDI+DDD' },
          name: { type: 'string', example: 'Meu WhatsApp' },
          serverSearch: { type: 'string', description: 'UUID do servidor APIBrasil' },
          serverType: { type: 'string', enum: ['whatsapp', 'baileys'], default: 'whatsapp' },
          proxyHost: { type: 'string' },
          proxyPort: { type: 'string' },
          proxyUser: { type: 'string' },
          proxyPass: { type: 'string' },
        },
      },
      WarmingContact: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          phone: { type: 'string', example: '5531988887777' },
          name: { type: 'string', example: 'João', nullable: true },
          isBot: { type: 'boolean', default: false },
          category: { type: 'string', enum: ['friend', 'family', 'work', 'random'], default: 'random' },
          active: { type: 'boolean', default: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ContactCreate: {
        type: 'object',
        required: ['phone'],
        properties: {
          phone: { type: 'string', example: '5531988887777' },
          name: { type: 'string', example: 'João' },
          isBot: { type: 'boolean', default: false },
          category: { type: 'string', enum: ['friend', 'family', 'work', 'random'] },
        },
      },
      Bot: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'bot-vendas' },
          instanceId: { type: 'integer', nullable: true },
          systemPrompt: { type: 'string', example: 'Você é um assistente de vendas...' },
          model: { type: 'string', default: 'gpt-4o-mini' },
          temperature: { type: 'number', format: 'float', default: 0.7 },
          maxTokens: { type: 'integer', default: 500 },
          active: { type: 'boolean', default: false },
          replyDelay: { type: 'integer', default: 3, description: 'Delay em segundos antes de responder' },
          contextMessages: { type: 'integer', default: 10, description: 'Quantidade de mensagens de contexto' },
          replyGroups: { type: 'boolean', default: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          instance: { $ref: '#/components/schemas/Instance' },
        },
      },
      BotCreate: {
        type: 'object',
        required: ['name', 'systemPrompt'],
        properties: {
          name: { type: 'string', example: 'bot-vendas' },
          instanceId: { type: 'integer', description: 'ID da instância vinculada' },
          systemPrompt: { type: 'string', example: 'Você é um especialista em suporte técnico...' },
          model: { type: 'string', default: 'gpt-4o-mini' },
          temperature: { type: 'number', format: 'float', default: 0.7, minimum: 0, maximum: 2 },
          maxTokens: { type: 'integer', default: 500, minimum: 1, maximum: 4096 },
          replyDelay: { type: 'integer', default: 3 },
          contextMessages: { type: 'integer', default: 10 },
          replyGroups: { type: 'boolean', default: false },
        },
      },
      Attendance: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          protocol: { type: 'string', example: 'ATD-20260218-001' },
          instanceId: { type: 'integer' },
          botId: { type: 'integer', nullable: true },
          phone: { type: 'string', example: '5531999999999' },
          contactName: { type: 'string', nullable: true },
          title: { type: 'string', example: 'Dúvida sobre produto' },
          subject: { type: 'string', example: 'Suporte' },
          context: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['waiting', 'in_progress', 'closed'], default: 'waiting' },
          attendantId: { type: 'integer', nullable: true },
          attendantName: { type: 'string', nullable: true },
          closedAt: { type: 'string', format: 'date-time', nullable: true },
          closedBy: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          instance: { $ref: '#/components/schemas/Instance' },
          bot: { $ref: '#/components/schemas/Bot' },
          attendant: { $ref: '#/components/schemas/Attendant' },
        },
      },
      AttendanceMessage: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          attendanceId: { type: 'integer' },
          direction: { type: 'string', enum: ['received', 'sent'] },
          content: { type: 'string' },
          senderName: { type: 'string', nullable: true },
          sentAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Attendant: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Maria Silva' },
          sector: { type: 'string', example: 'Suporte' },
          email: { type: 'string', format: 'email', nullable: true },
          active: { type: 'boolean', default: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AttendantCreate: {
        type: 'object',
        required: ['name', 'sector'],
        properties: {
          name: { type: 'string', example: 'Maria Silva' },
          sector: { type: 'string', example: 'Suporte' },
          email: { type: 'string', format: 'email' },
          active: { type: 'boolean', default: true },
        },
      },
      WarmingSchedule: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          instanceId: { type: 'integer' },
          dayNumber: { type: 'integer', example: 1 },
          maxConversations: { type: 'integer', example: 10 },
          minIntervalMinutes: { type: 'integer', example: 60 },
          conversationsDone: { type: 'integer', default: 0 },
          messagesDone: { type: 'integer', default: 0 },
          date: { type: 'string', format: 'date', nullable: true },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'skipped'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      DailyMetric: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          instanceId: { type: 'integer' },
          date: { type: 'string', format: 'date' },
          messagesSent: { type: 'integer', default: 0 },
          messagesReceived: { type: 'integer', default: 0 },
          responsesCount: { type: 'integer', default: 0 },
          blocksCount: { type: 'integer', default: 0 },
          reportsCount: { type: 'integer', default: 0 },
          ignoredCount: { type: 'integer', default: 0 },
          bdiScore: { type: 'number', format: 'float', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          instanceId: { type: 'integer' },
          contactId: { type: 'integer' },
          topic: { type: 'string', nullable: true },
          messagesCount: { type: 'integer', default: 0 },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          conversationId: { type: 'integer' },
          direction: { type: 'string', enum: ['sent', 'received'] },
          type: { type: 'string', enum: ['text', 'image', 'audio', 'sticker', 'video', 'location', 'contact'] },
          content: { type: 'string', nullable: true },
          mediaUrl: { type: 'string', nullable: true },
          scheduledAt: { type: 'string', format: 'date-time', nullable: true },
          sentAt: { type: 'string', format: 'date-time', nullable: true },
          delivered: { type: 'boolean', default: false },
          readByContact: { type: 'boolean', default: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Settings: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          settingKey: { type: 'string', example: 'apibrasil_email' },
          settingValue: { type: 'string', description: 'Valores sensíveis são mascarados na leitura' },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Mensagem de erro' },
        },
      },
    },
  },
  paths: {
    // ==================== HEALTH ====================
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Servidor operacional',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== AUTH ====================
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login com credenciais APIBrasil',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'usuario@email.com' },
                  password: { type: 'string', example: 'senha123' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login bem-sucedido',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string', description: 'JWT token (expira em 7 dias)' },
                    user: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Credenciais inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Obter usuário autenticado',
        operationId: 'getMe',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Dados do usuário',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Não autenticado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ==================== INSTANCES ====================
    '/api/instances': {
      get: {
        tags: ['Instances'],
        summary: 'Listar todas as instâncias',
        operationId: 'listInstances',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Lista de instâncias com schedules e métricas',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Instance' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Instances'],
        summary: 'Criar nova instância WhatsApp',
        operationId: 'createInstance',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InstanceCreate' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Instância criada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Instance' } } },
          },
          '400': { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/instances/servers/list': {
      get: {
        tags: ['Instances'],
        summary: 'Listar servidores disponíveis na APIBrasil',
        operationId: 'listServers',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Lista de servidores',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
    '/api/instances/{id}': {
      get: {
        tags: ['Instances'],
        summary: 'Obter instância por ID',
        operationId: 'getInstance',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Instância encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Instance' } } } },
          '404': { description: 'Instância não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Instances'],
        summary: 'Atualizar instância',
        operationId: 'updateInstance',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/InstanceCreate' } } },
        },
        responses: {
          '200': { description: 'Instância atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Instance' } } } },
          '404': { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Instances'],
        summary: 'Excluir instância',
        operationId: 'deleteInstance',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Excluída', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '404': { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/instances/{id}/connect': {
      post: {
        tags: ['Instances'],
        summary: 'Conectar instância (gerar QR Code)',
        operationId: 'connectInstance',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'QR Code gerado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    qrCode: { type: 'string', description: 'QR Code em base64' },
                    deviceToken: { type: 'string' },
                    serverType: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/instances/{id}/status': {
      get: {
        tags: ['Instances'],
        summary: 'Verificar status de conexão',
        operationId: 'getInstanceStatus',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'Status da conexão',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isConnected: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/instances/{id}/start-warming': {
      post: {
        tags: ['Instances'],
        summary: 'Iniciar aquecimento',
        operationId: 'startWarming',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Aquecimento iniciado', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '404': { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/instances/{id}/pause-warming': {
      post: {
        tags: ['Instances'],
        summary: 'Pausar aquecimento',
        operationId: 'pauseWarming',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Aquecimento pausado', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '404': { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ==================== CONTACTS ====================
    '/api/contacts': {
      get: {
        tags: ['Contacts'],
        summary: 'Listar contatos de aquecimento',
        operationId: 'listContacts',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Lista de contatos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WarmingContact' } } } } },
        },
      },
      post: {
        tags: ['Contacts'],
        summary: 'Criar contato',
        operationId: 'createContact',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ContactCreate' } } },
        },
        responses: {
          '201': { description: 'Contato criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/WarmingContact' } } } },
          '400': { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/contacts/{id}': {
      get: {
        tags: ['Contacts'],
        summary: 'Obter contato por ID',
        operationId: 'getContact',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Contato encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/WarmingContact' } } } },
          '404': { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Contacts'],
        summary: 'Atualizar contato',
        operationId: 'updateContact',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ContactCreate' } } },
        },
        responses: {
          '200': { description: 'Atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/WarmingContact' } } } },
          '404': { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Contacts'],
        summary: 'Excluir contato',
        operationId: 'deleteContact',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Excluído', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '404': { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ==================== BOTS ====================
    '/api/bots': {
      get: {
        tags: ['Bots'],
        summary: 'Listar bots',
        operationId: 'listBots',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Lista de bots', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Bot' } } } } },
        },
      },
      post: {
        tags: ['Bots'],
        summary: 'Criar bot',
        operationId: 'createBot',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BotCreate' } } } },
        responses: {
          '201': { description: 'Bot criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bot' } } } },
          '400': { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/bots/{id}': {
      get: {
        tags: ['Bots'],
        summary: 'Obter bot por ID',
        operationId: 'getBot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Bot encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bot' } } } },
          '404': { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Bots'],
        summary: 'Atualizar bot',
        operationId: 'updateBot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BotCreate' } } } },
        responses: {
          '200': { description: 'Atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bot' } } } },
          '404': { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Bots'],
        summary: 'Excluir bot',
        operationId: 'deleteBot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Excluído', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },
    '/api/bots/{id}/toggle': {
      patch: {
        tags: ['Bots'],
        summary: 'Ativar/desativar bot',
        operationId: 'toggleBot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'Status alterado',
            content: { 'application/json': { schema: { type: 'object', properties: { active: { type: 'boolean' } } } } },
          },
          '404': { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/bots/{id}/test': {
      post: {
        tags: ['Bots'],
        summary: 'Testar bot com uma mensagem',
        operationId: 'testBot',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: { message: { type: 'string', example: 'Olá, preciso de ajuda' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Resposta do bot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reply: { type: 'string' },
                    usage: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== ATTENDANCES ====================
    '/api/attendances': {
      get: {
        tags: ['Attendances'],
        summary: 'Listar atendimentos',
        operationId: 'listAttendances',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['waiting', 'in_progress', 'closed'] }, description: 'Filtrar por status' },
        ],
        responses: {
          '200': { description: 'Lista de atendimentos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Attendance' } } } } },
        },
      },
    },
    '/api/attendances/{id}': {
      get: {
        tags: ['Attendances'],
        summary: 'Obter atendimento por ID',
        operationId: 'getAttendance',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Atendimento encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Attendance' } } } },
          '404': { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Attendances'],
        summary: 'Excluir atendimento',
        operationId: 'deleteAttendance',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Excluído', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },
    '/api/attendances/{id}/status': {
      patch: {
        tags: ['Attendances'],
        summary: 'Atualizar status do atendimento',
        description: 'Altera o status e notifica o cliente via WhatsApp quando fechado.',
        operationId: 'updateAttendanceStatus',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['waiting', 'in_progress', 'closed'] },
                  closedBy: { type: 'string', description: 'Quem fechou (bot ou atendente)' },
                  attendantName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Attendance' } } } },
        },
      },
    },
    '/api/attendances/{id}/messages': {
      get: {
        tags: ['Attendances'],
        summary: 'Listar mensagens do atendimento',
        operationId: 'listAttendanceMessages',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Lista de mensagens', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AttendanceMessage' } } } } },
        },
      },
      post: {
        tags: ['Attendances'],
        summary: 'Enviar mensagem no atendimento',
        description: 'Envia uma mensagem de texto via WhatsApp na sessão de atendimento.',
        operationId: 'sendAttendanceMessage',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: { content: { type: 'string', example: 'Olá, como posso ajudar?' } },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Mensagem enviada', content: { 'application/json': { schema: { $ref: '#/components/schemas/AttendanceMessage' } } } },
        },
      },
    },

    // ==================== ATTENDANTS ====================
    '/api/attendants': {
      get: {
        tags: ['Attendants'],
        summary: 'Listar atendentes',
        operationId: 'listAttendants',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'active', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'Filtrar por status ativo' },
        ],
        responses: {
          '200': { description: 'Lista de atendentes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Attendant' } } } } },
        },
      },
      post: {
        tags: ['Attendants'],
        summary: 'Criar atendente',
        operationId: 'createAttendant',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AttendantCreate' } } } },
        responses: {
          '201': { description: 'Atendente criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Attendant' } } } },
          '400': { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/attendants/{id}': {
      get: {
        tags: ['Attendants'],
        summary: 'Obter atendente por ID',
        operationId: 'getAttendant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Atendente encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Attendant' } } } },
          '404': { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Attendants'],
        summary: 'Atualizar atendente',
        operationId: 'updateAttendant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AttendantCreate' } } } },
        responses: {
          '200': { description: 'Atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Attendant' } } } },
          '404': { description: 'Não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Attendants'],
        summary: 'Excluir atendente',
        operationId: 'deleteAttendant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Excluído', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },

    // ==================== METRICS ====================
    '/api/metrics/stats': {
      get: {
        tags: ['Metrics'],
        summary: 'Estatísticas gerais',
        operationId: 'getStats',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Estatísticas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    instances: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        connected: { type: 'integer' },
                        warming: { type: 'integer' },
                      },
                    },
                    today: {
                      type: 'object',
                      properties: {
                        messagesSent: { type: 'integer' },
                        messagesReceived: { type: 'integer' },
                        blocksCount: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/metrics/today': {
      get: {
        tags: ['Metrics'],
        summary: 'Métricas de hoje',
        operationId: 'getTodayMetrics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Métricas do dia', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DailyMetric' } } } } },
        },
      },
    },
    '/api/metrics/instance/{instanceId}': {
      get: {
        tags: ['Metrics'],
        summary: 'Métricas por instância',
        operationId: 'getInstanceMetrics',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'instanceId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 7 }, description: 'Quantidade de dias para buscar' },
        ],
        responses: {
          '200': { description: 'Métricas da instância', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DailyMetric' } } } } },
        },
      },
    },

    // ==================== SETTINGS ====================
    '/api/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Listar configurações',
        description: 'Valores sensíveis (senhas, tokens) são mascarados.',
        operationId: 'listSettings',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Lista de configurações', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Settings' } } } } },
        },
      },
      post: {
        tags: ['Settings'],
        summary: 'Criar/atualizar configuração',
        operationId: 'upsertSetting',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['key', 'value'],
                properties: {
                  key: { type: 'string', example: 'apibrasil_email' },
                  value: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Configuração salva', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, key: { type: 'string' }, value: { type: 'string' } } } } } },
        },
      },
    },
    '/api/settings/credentials/current': {
      get: {
        tags: ['Settings'],
        summary: 'Obter credenciais atuais',
        operationId: 'getCurrentCredentials',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Credenciais',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    apibrasil: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                        password: { type: 'string' },
                        secretKey: { type: 'string' },
                        apiType: { type: 'string' },
                        hasCredentials: { type: 'boolean' },
                      },
                    },
                    openai: {
                      type: 'object',
                      properties: {
                        apiKey: { type: 'string' },
                        model: { type: 'string' },
                        hasCredentials: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/settings/{key}': {
      get: {
        tags: ['Settings'],
        summary: 'Obter configuração por chave',
        operationId: 'getSetting',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Valor da configuração', content: { 'application/json': { schema: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } } } } } },
          '404': { description: 'Chave não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/settings/apibrasil': {
      post: {
        tags: ['Settings'],
        summary: 'Configurar credenciais APIBrasil',
        description: 'Salva email/senha/SecretKey criptografados e valida login na APIBrasil.',
        operationId: 'configureApibrasil',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  secretKey: { type: 'string' },
                  apiType: { type: 'string', enum: ['whatsapp', 'baileys'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Credenciais salvas', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, bearerToken: { type: 'string' } } } } } },
        },
      },
    },
    '/api/settings/openai': {
      post: {
        tags: ['Settings'],
        summary: 'Configurar credenciais OpenAI',
        operationId: 'configureOpenai',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['apiKey'],
                properties: {
                  apiKey: { type: 'string' },
                  model: { type: 'string', default: 'gpt-4o-mini' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Credenciais salvas', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },
    '/api/settings/apibrasil/detect-type': {
      post: {
        tags: ['Settings'],
        summary: 'Detectar tipo de API pela SecretKey',
        operationId: 'detectApiType',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['secretKey'], properties: { secretKey: { type: 'string' } } } } },
        },
        responses: {
          '200': {
            description: 'Tipo detectado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    detectedType: { type: 'string' },
                    apiName: { type: 'string' },
                    rawType: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/settings/apibrasil/test': {
      post: {
        tags: ['Settings'],
        summary: 'Testar conexão APIBrasil',
        operationId: 'testApibrasil',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Resultado do teste', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, bearerToken: { type: 'string' } } } } } },
        },
      },
    },
    '/api/settings/openai/test': {
      post: {
        tags: ['Settings'],
        summary: 'Testar conexão OpenAI',
        operationId: 'testOpenai',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Resultado do teste', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, testResponse: { type: 'string' } } } } } },
        },
      },
    },
    '/api/settings/webhook/custom-url': {
      get: {
        tags: ['Settings'],
        summary: 'Obter URL de webhook customizada',
        operationId: 'getCustomWebhookUrl',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'URL customizada', content: { 'application/json': { schema: { type: 'object', properties: { customUrl: { type: 'string', nullable: true } } } } } },
        },
      },
      post: {
        tags: ['Settings'],
        summary: 'Definir URL de webhook customizada',
        operationId: 'setCustomWebhookUrl',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', format: 'uri' } } } } },
        },
        responses: {
          '200': { description: 'URL definida', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, url: { type: 'string' } } } } } },
        },
      },
      delete: {
        tags: ['Settings'],
        summary: 'Remover URL customizada (usar Cloudflare)',
        operationId: 'deleteCustomWebhookUrl',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'URL removida', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },
    '/api/settings/attendance/show-name': {
      get: {
        tags: ['Settings'],
        summary: 'Obter config de exibição do nome do atendente',
        operationId: 'getShowAttendantName',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Configuração', content: { 'application/json': { schema: { type: 'object', properties: { showAttendantName: { type: 'boolean' } } } } } },
        },
      },
      post: {
        tags: ['Settings'],
        summary: 'Definir exibição do nome do atendente',
        operationId: 'setShowAttendantName',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['showAttendantName'], properties: { showAttendantName: { type: 'boolean' } } } } },
        },
        responses: {
          '200': { description: 'Atualizado', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, showAttendantName: { type: 'boolean' } } } } } },
        },
      },
    },
    '/api/settings/attendance/messages': {
      get: {
        tags: ['Settings'],
        summary: 'Obter mensagens de atendimento (boas-vindas e encerramento)',
        operationId: 'getAttendanceMessages',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Mensagens',
            content: { 'application/json': { schema: { type: 'object', properties: { welcomeMessage: { type: 'string' }, closingMessage: { type: 'string' } } } } },
          },
        },
      },
    },
    '/api/settings/attendance/welcome-message': {
      post: {
        tags: ['Settings'],
        summary: 'Atualizar mensagem de boas-vindas',
        operationId: 'setWelcomeMessage',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } } } },
        },
        responses: {
          '200': { description: 'Atualizado', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },
    '/api/settings/attendance/closing-message': {
      post: {
        tags: ['Settings'],
        summary: 'Atualizar mensagem de encerramento',
        operationId: 'setClosingMessage',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } } } },
        },
        responses: {
          '200': { description: 'Atualizado', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },

    // ==================== TUNNEL ====================
    '/api/tunnel': {
      get: {
        tags: ['Tunnel'],
        summary: 'Obter informações do tunnel e webhooks',
        operationId: 'getTunnelInfo',
        responses: {
          '200': {
            description: 'Informações do tunnel',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', nullable: true },
                    active: { type: 'boolean' },
                    isCustom: { type: 'boolean' },
                    cloudflareUrl: { type: 'string', nullable: true },
                    customUrl: { type: 'string', nullable: true },
                    webhookMessage: { type: 'string', nullable: true },
                    webhookStatus: { type: 'string', nullable: true },
                    webhookConnect: { type: 'string', nullable: true },
                    webhookQrcode: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/tunnel/restart': {
      post: {
        tags: ['Tunnel'],
        summary: 'Reiniciar Cloudflare Tunnel',
        operationId: 'restartTunnel',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Tunnel reiniciado', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' }, message: { type: 'string' } } } } } },
        },
      },
    },
    '/api/tunnel/logs': {
      get: {
        tags: ['Tunnel'],
        summary: 'Obter logs de webhook',
        operationId: 'getTunnelLogs',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logs e estatísticas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    logs: { type: 'array', items: { type: 'object' } },
                    stats: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Tunnel'],
        summary: 'Limpar logs de webhook',
        operationId: 'clearTunnelLogs',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logs limpos', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },
    '/api/tunnel/update-webhooks': {
      post: {
        tags: ['Tunnel'],
        summary: 'Atualizar webhooks de todas as instâncias',
        operationId: 'updateWebhooks',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Webhooks atualizados',
            content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, errors: { type: 'array', items: { type: 'string' } } } } } },
          },
        },
      },
    },

    // ==================== WEBHOOKS ====================
    '/api/webhooks/message': {
      post: {
        tags: ['Webhooks'],
        summary: 'Webhook de mensagem recebida',
        description: 'Endpoint público chamado pela APIBrasil quando uma mensagem é recebida.',
        operationId: 'webhookMessage',
        parameters: [
          { name: 'devicetoken', in: 'header', schema: { type: 'string' }, description: 'Token do dispositivo' },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', description: 'Payload do webhook da APIBrasil' } } },
        },
        responses: {
          '200': { description: 'Processado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
        },
      },
    },
    '/api/webhooks/status': {
      post: {
        tags: ['Webhooks'],
        summary: 'Webhook de status',
        operationId: 'webhookStatus',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Processado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } } },
      },
    },
    '/api/webhooks/connect': {
      post: {
        tags: ['Webhooks'],
        summary: 'Webhook de conexão',
        operationId: 'webhookConnect',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Processado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } } },
      },
    },
    '/api/webhooks/qrcode': {
      post: {
        tags: ['Webhooks'],
        summary: 'Webhook de QR Code',
        operationId: 'webhookQrcode',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Processado', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } } },
      },
    },

    // ==================== SSE ====================
    '/api/sse/stream': {
      get: {
        tags: ['SSE'],
        summary: 'Stream de eventos em tempo real',
        description: 'Conexão Server-Sent Events para receber atualizações de status, conexão do tunnel e logs de webhook em tempo real.',
        operationId: 'sseStream',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Event stream',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                  description: 'Eventos: status-update, tunnel-connected, webhook-log',
                },
              },
            },
          },
        },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Warm-up Bot - API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
      },
    })
  );

  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerDocument);
  });
}
