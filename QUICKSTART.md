# Guia de Início Rápido - Warm-up Bot POC

## Passo 1: Configurar Banco de Dados

1. Abra o MySQL e crie o banco:
```sql
CREATE DATABASE esquenta_chips CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Passo 2: Configurar Variáveis de Ambiente

Edite o arquivo `server/.env`:

```env
# Criptografia - GERE UMA CHAVE ALEATÓRIA DE 32 CARACTERES!
ENCRYPTION_KEY=sua_chave_aleatoria_32_caracteres

# MySQL (ajuste se necessário)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=esquenta_chips
DB_USER=root
DB_PASS=sua_senha_mysql
```

**Para gerar uma chave segura** (PowerShell):
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**IMPORTANTE**: As credenciais da APIBrasil e OpenAI agora são configuradas pela interface web (tela de Configurações) e ficam armazenadas criptografadas no banco de dados.

## Passo 3: Iniciar o Sistema

### Opção 1: Dev Mode (Recomendado para testar)

Abra um terminal e execute:
```bash
npm run dev
```

Isso iniciará:
- Backend em `http://localhost:3001`
- Frontend em `http://localhost:3000`

### Opção 2: Produção

```bash
npm run build
npm start
```

## Passo 4: Usar o Sistema

1. **Acesse o Dashboard**: Abra `http://localhost:3000` no navegador

2. **Configure Credenciais** (PRIMEIRA VEZ):
   - Vá em "Configurações" no menu lateral
   - **APIBrasil**: Digite email e senha da sua conta apibrasil.com.br
   - Clique em "Testar" para validar
   - **OpenAI**: Cole sua API Key do ChatGPT
   - Escolha o modelo (recomendado: gpt-4o-mini)
   - Salve tudo
   
   ⚠️ As credenciais são salvas **criptografadas** no banco de dados usando AES-256

3. **Criar Contatos de Aquecimento**:
   - Vá em "Contatos" no menu lateral
   - Clique em "+ Novo Contato"
   - Adicione números que participarão das conversas
   - Pode marcar como "bot" se for número automatizado

4. **Adicionar Instância WhatsApp**:
   - Vá em "Instâncias"
   - Clique em "+ Nova Instância"
   - Digite o telefone (ex: `5531999999999`)
   - Clique em "Criar"

5. **Conectar WhatsApp**:
   - Na instância criada, clique em "Conectar"
   - Escaneie o QR Code no WhatsApp:
     - Abra WhatsApp → Dispositivos Conectados → Conectar Dispositivo
   - Aguarde a conexão (indicador ficará verde)

6. **Iniciar Aquecimento**:
   - Clique em "Iniciar" na instância conectada
   - O sistema começará a executar o cronograma automaticamente
   - Acompanhe em "Cronograma" e "Dashboard"

## Cronograma Automático

O sistema executará automaticamente:
- **Dia 1**: 10 conversas, 1 por hora
- **Dia 2**: 20 conversas, 1 a cada 30min
- **Dia 3**: 30 conversas, 1 a cada 20min
- **Dia 4**: 40 conversas, 1 a cada 15min
- **Dia 5**: 50 conversas, 1 a cada 10min
- **Dia 6**: 60 conversas, 1 a cada 8min
- **Dia 7**: 70 conversas, 1 a cada 7min
- **Dia 8**: 80 conversas, 1 a cada 6min

## Funcionalidades do ChatGPT

O ChatGPT gera conversas realistas:
- Tópicos variados (futebol, trabalho, família, etc.)
- Gírias brasileiras naturais (blz, tmj, vlw, kk)
- Mix de tipos: 70% texto, 15% áudio, 10% imagem, 5% sticker
- Respostas contextuais às mensagens recebidas

## Troubleshooting

### Erro de conexão com MySQL
```bash
# Verifique se o MySQL está rodando
# Windows: Serviços → MySQL
# Verifique usuário/senha no .env
```

### Erro "Cannot find module"
```bash
# Reinstale dependências
npm install
```

### QR Code não aparece
```bash
# Verifique suas credenciais da APIBrasil em server/.env
# Veja logs do backend no terminal
```

### Backend não inicia
```bash
# Verifique se a porta 3001 está livre
# Ou altere PORT no .env
```

## Logs e Monitoramento

- **Backend logs**: Terminal onde rodou `npm run dev:server`
- **Frontend**: Console do navegador (F12)
- **Métricas**: Dashboard → Cards de estatísticas

## Próximos Passos

1. Testar com 1-2 contatos primeiro
2. Verificar se conversas estão sendo geradas
3. Aumentar gradualmente conforme confiança
4. Monitorar métricas BDI no Dashboard

## Suporte

- Documentação APIBrasil: https://doc.apibrasil.io
- Documentação OpenAI: https://platform.openai.com/docs
- Issues do projeto: GitHub (se aplicável)
