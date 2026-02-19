import { Settings } from '../models';
import { encrypt, decrypt, isSensitiveKey } from '../utils/crypto';

class SettingsService {
  async getSetting(key: string): Promise<string | null> {
    const setting = await Settings.findOne({ where: { settingKey: key } });
    
    if (!setting?.settingValue) {
      return null;
    }

    // Descriptografar se for dado sensível
    if (isSensitiveKey(key)) {
      try {
        return decrypt(setting.settingValue);
      } catch (error) {
        console.error(`Erro ao descriptografar ${key}, retornando valor criptografado`);
        return setting.settingValue;
      }
    }

    return setting.settingValue;
  }

  async setSetting(key: string, value: string, description?: string): Promise<void> {
    // Criptografar se for dado sensível
    const valueToStore = isSensitiveKey(key) ? encrypt(value) : value;

    const [setting] = await Settings.findOrCreate({
      where: { settingKey: key },
      defaults: {
        settingKey: key,
        settingValue: valueToStore,
        description,
      },
    });

    await setting.update({ settingValue: valueToStore, description });
  }

  async getAllSettings(): Promise<Settings[]> {
    return await Settings.findAll();
  }

  async getApibrasilEmail(): Promise<string> {
    return (await this.getSetting('apibrasil_email')) || '';
  }

  async getApibrasilPassword(): Promise<string> {
    return (await this.getSetting('apibrasil_password')) || '';
  }

  async getApibrasilBearerToken(): Promise<string> {
    return (await this.getSetting('apibrasil_bearer_token')) || '';
  }

  async getOpenaiApiKey(): Promise<string> {
    return (await this.getSetting('openai_api_key')) || '';
  }

  async getOpenaiModel(): Promise<string> {
    return (await this.getSetting('openai_model')) || 'gpt-4o-mini';
  }

  async getApibrasilSecretKey(): Promise<string> {
    return (await this.getSetting('apibrasil_secret_key')) || '';
  }

  async setApibrasilCredentials(email: string, password: string, secretKey?: string, bearerToken?: string): Promise<void> {
    await this.setSetting('apibrasil_email', email, 'Email da conta APIBrasil');
    await this.setSetting('apibrasil_password', password, 'Senha da conta APIBrasil');
    if (secretKey) {
      await this.setSetting('apibrasil_secret_key', secretKey, 'SecretKey da conta APIBrasil');
    }
    if (bearerToken) {
      await this.setSetting('apibrasil_bearer_token', bearerToken, 'Bearer Token (válido 1 ano)');
    }
  }

  async setOpenaiCredentials(apiKey: string, model?: string): Promise<void> {
    await this.setSetting('openai_api_key', apiKey, 'API Key do OpenAI (ChatGPT)');
    if (model) {
      await this.setSetting('openai_model', model, 'Modelo do ChatGPT (ex: gpt-4o-mini)');
    }
  }

  async getShowAttendantName(): Promise<boolean> {
    const value = await this.getSetting('show_attendant_name');
    return value === 'true' || value === null; // Default: true (mostra o nome)
  }

  async setShowAttendantName(show: boolean): Promise<void> {
    await this.setSetting('show_attendant_name', show.toString(), 'Mostrar nome do atendente nas mensagens');
  }

  // Webhook URLs customizadas
  async getCustomWebhookUrl(): Promise<string | null> {
    return await this.getSetting('custom_webhook_url');
  }

  async setCustomWebhookUrl(url: string): Promise<void> {
    await this.setSetting('custom_webhook_url', url, 'URL customizada para webhooks (substitui Cloudflare)');
  }

  async clearCustomWebhookUrl(): Promise<void> {
    const setting = await Settings.findOne({ where: { settingKey: 'custom_webhook_url' } });
    if (setting) {
      await setting.destroy();
    }
  }

  // Mensagens de atendimento com variáveis
  async getWelcomeMessage(): Promise<string> {
    return (await this.getSetting('attendance_welcome_message')) || 
      '🟢 *Atendimento Iniciado*\n\nOlá! Seu atendimento foi aceito por *{atendente}*.\n\n*Protocolo:* {protocolo}\n\nEm breve você será atendido. Aguarde! 😊';
  }

  async getClosingMessage(): Promise<string> {
    return (await this.getSetting('attendance_closing_message')) || 
      '✅ *Atendimento Finalizado*\n\n*Protocolo:* {protocolo}\n\nSeu atendimento foi concluído.\nObrigado pelo contato! 🙏\n\nSe precisar de algo mais, estamos à disposição.';
  }

  async setWelcomeMessage(message: string): Promise<void> {
    await this.setSetting('attendance_welcome_message', message, 'Mensagem de boas-vindas do atendimento');
  }

  async setClosingMessage(message: string): Promise<void> {
    await this.setSetting('attendance_closing_message', message, 'Mensagem de encerramento do atendimento');
  }

  // Substituir variáveis na mensagem
  replaceMessageVariables(template: string, variables: {
    atendente?: string;
    protocolo?: string;
    cliente?: string;
    telefone?: string;
    data?: string;
    hora?: string;
    assunto?: string;
  }): string {
    let message = template;

    if (variables.atendente) message = message.replace(/{atendente}/g, variables.atendente);
    if (variables.protocolo) message = message.replace(/{protocolo}/g, variables.protocolo);
    if (variables.cliente) message = message.replace(/{cliente}/g, variables.cliente);
    if (variables.telefone) message = message.replace(/{telefone}/g, variables.telefone);
    if (variables.data) message = message.replace(/{data}/g, variables.data);
    if (variables.hora) message = message.replace(/{hora}/g, variables.hora);
    if (variables.assunto) message = message.replace(/{assunto}/g, variables.assunto);

    return message;
  }
}

export default new SettingsService();
