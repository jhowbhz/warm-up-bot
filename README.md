<img width="1085" height="324" alt="image" src="https://github.com/user-attachments/assets/484087ac-957a-416f-a992-ef0c8c988cac" />

# 🤖 Warm-up Bot

[![CI](https://github.com/jhowbhz/warm-up-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/jhowbhz/warm-up-bot/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-ChatGPT-412991?logo=openai&logoColor=white)](https://openai.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**POC** — Sistema de aquecimento automatizado de chips WhatsApp com conversas geradas por IA.

O Warm-up Bot automatiza o processo de aquecimento de contas WhatsApp enviando conversas progressivas ao longo de 8 dias, aumentando gradualmente o volume para reduzir risco de banimento. As conversas são geradas pelo ChatGPT com linguagem natural em português brasileiro.

---

## Funcionalidades

- **Aquecimento automatizado em 8 fases** — progressão de 10 a 80 conversas/dia com intervalos decrescentes
- **Conversas geradas por IA** — ChatGPT produz diálogos realistas com gírias brasileiras e tópicos variados
- **Gerenciamento de instâncias WhatsApp** — criar, conectar via QR Code e monitorar múltiplas instâncias
- **Dashboard com métricas em tempo real** — acompanhamento via Server-Sent Events (SSE) e gráficos
- **Sistema de atendimento** — bots automatizados com handoff para atendentes humanos
- **Túnel Cloudflare** — exposição automática de webhooks sem port forwarding
- **Suporte multi-servidor** — WPP e Baileys via APIBrasil com roteamento automático

## Docker start dev

```
docker compose -f docker-compose.dev.yml up -d
```

```
docker compose -f docker-compose.dev.yml logs -f
```

```
docker compose -f docker-compose.dev.yml down
```

```
docker compose -f docker-compose.dev.yml up -d --build
```

## Tech Stack

| Camada    | Tecnologias                                                  |
|-----------|--------------------------------------------------------------|
| Frontend  | React 18, TypeScript, Vite, TailwindCSS, Recharts            |
| Backend   | Node.js, Express, TypeScript, Sequelize ORM                  |
| Banco     | MySQL (utf8mb4)                                              |
| IA        | OpenAI SDK (ChatGPT)                                         |
| WhatsApp  | APIBrasil (WPP / Baileys)                                    |
| Infra     | Cloudflare Tunnel, APIBrasil, Helmet.js, node-cron           |

## Pré-requisitos

- **Node.js** 18+
- **MySQL** 8.0+
- Conta na **[APIBrasil](https://apibrasil.com.br)** com Wpp ou Baileys
- **API Key** da [OpenAI](https://platform.openai.com/api-keys)

## Instalação manual

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o banco de dados

```sql
CREATE DATABASE esquenta_chips CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e edite:

```bash
cp server/.env.example server/.env
```

Preencha o `server/.env`:

```env
ENCRYPTION_KEY=sua_chave_aleatoria_32_caracteres
DB_HOST=localhost
DB_PORT=3306
DB_NAME=esquenta_chips
DB_USER=root
DB_PASS=sua_senha
PORT=3001
NODE_ENV=development
WEBHOOK_URL=http://localhost:3001/api/webhooks
```

### 4. Executar migrações

```bash
cd server
npm run migrate
```

### 5. Iniciar

```bash
npm run dev
```

| Serviço  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000       |
| Backend  | http://localhost:3001       |

### 6. Configuração inicial (primeira vez)

1. Acesse http://localhost:3000 e vá em **Configurações**
2. Informe email/senha da APIBrasil e a SecretKey
3. Cole sua API Key da OpenAI e escolha o modelo (recomendado: `gpt-4o-mini`)
4. Salve — as credenciais ficam criptografadas no banco

## Cronograma de Aquecimento

O sistema executa automaticamente entre **08h e 22h** com variação aleatória de ±20% nos intervalos:

| Dia | Conversas | Intervalo |
|-----|-----------|-----------|
| 1   | 10        | 60 min    |
| 2   | 20        | 30 min    |
| 3   | 30        | 20 min    |
| 4   | 40        | 15 min    |
| 5   | 50        | 10 min    |
| 6   | 60        | 8 min     |
| 7   | 70        | 7 min     |
| 8   | 80        | 6 min     |

## Geração de Conversas (ChatGPT)

As conversas são geradas com as seguintes características:

- **Tópicos variados** — futebol, trabalho, família, viagens, comida etc.
- **Linguagem natural** — gírias brasileiras (blz, tmj, vlw, kk)
- **Mix de tipos** — 70% texto, 15% áudio, 10% imagem, 5% sticker
- **Respostas contextuais** — responde com base nas mensagens recebidas

## 🎥 Demonstração

<p align="center">
  <img src="./demo.gif" width="100%" />
</p>

## Screenshot API

<img width="1241" height="762" alt="image" src="https://github.com/user-attachments/assets/1691e5f0-7079-41ab-bbe5-adeb4f0f1271" />

## Licença

MIT
