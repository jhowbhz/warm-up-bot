# Segurança - Warm-up Bot

## Criptografia de Dados Sensíveis

Este sistema implementa criptografia AES-256 para proteger credenciais armazenadas no banco de dados.

### Dados Criptografados

As seguintes informações são automaticamente criptografadas antes de serem salvas:

- Senha da APIBrasil
- Bearer Token da APIBrasil  
- API Key do OpenAI (ChatGPT)
- Senhas de proxy

### Como Funciona

1. **Ao salvar**: O sistema criptografa o valor usando AES-256-CBC
2. **Ao ler**: O sistema descriptografa automaticamente
3. **Chave de criptografia**: Armazenada em `ENCRYPTION_KEY` no `.env`

### Configuração da Chave de Criptografia

**IMPORTANTE**: A chave padrão é insegura! Siga estes passos:

#### 1. Gerar uma chave aleatória de 32 caracteres

**Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**Node.js:**
```javascript
require('crypto').randomBytes(16).toString('hex')
```

**Online** (use com cautela):
```
https://www.random.org/strings/?num=1&len=32&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain
```

#### 2. Atualizar o arquivo `.env`

```env
ENCRYPTION_KEY=sua_chave_aleatoria_de_32_caracteres
```

#### 3. Reiniciar o servidor

```bash
npm run dev
```

### Boas Práticas

1. **NUNCA** commite o arquivo `.env` no Git (já está no `.gitignore`)
2. **NUNCA** compartilhe a `ENCRYPTION_KEY`
3. Use **chaves diferentes** em desenvolvimento e produção
4. Guarde a chave em local seguro (gerenciador de senhas, vault)
5. Se mudar a chave, as credenciais antigas não poderão ser descriptografadas

### Migração de Chave

Se precisar mudar a chave de criptografia:

1. Exporte as credenciais atuais (descriptografadas)
2. Mude a `ENCRYPTION_KEY` no `.env`
3. Apague a tabela `settings` do banco
4. Reconfigure as credenciais pela interface

### Verificação

Para verificar se a criptografia está funcionando:

1. Configure credenciais pela interface
2. Acesse o banco de dados MySQL:
   ```sql
   SELECT * FROM settings WHERE settingKey LIKE '%password%' OR settingKey LIKE '%api_key%';
   ```
3. O campo `settingValue` deve estar em formato hex (ex: `a1b2c3d4:e5f6g7h8...`)
4. Se estiver em texto plano, a criptografia não está ativa

## Outras Medidas de Segurança

### Banco de Dados
- Use usuário MySQL com privilégios limitados
- Ative SSL/TLS para conexões MySQL em produção
- Faça backups regulares criptografados

### API
- Todas as rotas usam HTTPS em produção
- CORS configurado para domínios específicos
- Helmet.js ativo para headers de segurança

### Proxy
- Senhas de proxy também são criptografadas
- Isolamento por instância recomendado

### Logs
- Senhas e tokens NUNCA aparecem nos logs
- Use `console.log` com cautela em produção

## Em Caso de Comprometimento

Se suspeitar que as credenciais foram expostas:

1. **APIBrasil**: Troque a senha em `https://app.apibrasil.io`
2. **OpenAI**: Revogue a API Key e gere nova em `https://platform.openai.com/api-keys`
3. Mude a `ENCRYPTION_KEY`
4. Reconfigure tudo pela interface
5. Verifique logs de acesso não autorizado
