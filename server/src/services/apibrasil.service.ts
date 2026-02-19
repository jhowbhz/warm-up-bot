import axios, { AxiosInstance } from 'axios';
import settingsService from './settings.service';

const API_BASE_URL = 'https://gateway.apibrasil.io';

type ServerType = 'whatsapp' | 'baileys';

interface LoginResponse {
  error?: boolean;
  message?: string;
  user?: any;
  authorization?: {
    token?: string;
    expires_in?: number;
  };
}

interface DeviceData {
  type: string;
  device_name: string;
  device_key: string;
  device_ip?: string;
  server_search: string;
  webhook_wh_message?: string;
  webhook_wh_status?: string;
  webhook_wh_connect?: string;
  webhook_wh_qrcode?: string;
}

interface DeviceResponse {
  error: boolean;
  message: string;
  device: {
    type: string;
    search: string;
    device_name: string;
    server_search: string;
    device_key: string;
    device_token: string;
    device_ip: string;
    webhook_wh_message: string | null;
    webhook_wh_status: string | null;
    webhook_wh_connect: string | null;
    webhook_wh_qr_code: string | null;
    status: string;
    status_situation: string;
  };
}

interface ConnectResult {
  qrCode: string;
  raw?: any;
}

class ApiBrasilService {
  private client: AxiosInstance;
  private bearerToken: string = '';

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });
  }

  private async authHeaders(deviceToken?: string): Promise<Record<string, string>> {
    const bearer = await this.getBearerToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
    };
    if (deviceToken) {
      headers.DeviceToken = deviceToken;
    }
    return headers;
  }

  async login(): Promise<string> {
    try {
      const email = await settingsService.getApibrasilEmail();
      const password = await settingsService.getApibrasilPassword();

      if (!email || !password) {
        throw new Error('Credenciais da APIBrasil não configuradas. Configure em Configurações.');
      }

      const response = await this.client.post<LoginResponse>('/api/v2/auth/login', {
        email,
        password,
      });

      if (response.data?.error) {
        throw new Error(response.data.message || 'Erro no login');
      }

      const bearer = response.data?.authorization?.token;

      if (!bearer) {
        throw new Error('Bearer token não retornado no login');
      }

      this.bearerToken = bearer;
      await settingsService.setSetting('apibrasil_bearer_token', bearer, 'Bearer Token (auto-gerado no login)');
      console.log('[APIBrasil] Login realizado com sucesso');

      return bearer;
    } catch (error: any) {
      console.error('[APIBrasil] Erro no login:', error.message);
      throw error;
    }
  }

  async getBearerToken(): Promise<string> {
    if (this.bearerToken) {
      return this.bearerToken;
    }

    const savedToken = await settingsService.getApibrasilBearerToken();
    if (savedToken) {
      this.bearerToken = savedToken;
      return savedToken;
    }

    return await this.login();
  }

  async createDevice(deviceData: DeviceData): Promise<DeviceResponse> {
    try {
      const bearer = await this.getBearerToken();
      const secretKey = await settingsService.getApibrasilSecretKey();

      if (!secretKey) {
        throw new Error('SecretKey da APIBrasil não configurada. Configure em Configurações.');
      }

      const response = await this.client.post<DeviceResponse>('/api/v2/devices/store', deviceData, {
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
          SecretKey: secretKey,
        },
      });

      if (response.data?.error) {
        throw new Error(response.data.message || 'Erro ao criar dispositivo');
      }

      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      console.error('[APIBrasil] Erro ao criar device:', msg);
      throw new Error(msg);
    }
  }

  async destroyDevice(deviceToken: string): Promise<any> {
    try {
      const bearer = await this.getBearerToken();

      const response = await this.client.delete('/api/v2/devices/destroy', {
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
        data: { search: deviceToken },
      });

      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      console.error('[APIBrasil] Erro ao deletar device:', msg);
      throw new Error(msg);
    }
  }

  async listServers(): Promise<any[]> {
    try {
      const bearer = await this.getBearerToken();

      const response = await this.client.get('/api/v2/servers', {
        headers: { Authorization: `Bearer ${bearer}` },
      });

      return response.data;
    } catch (error: any) {
      console.error('[APIBrasil] Erro ao listar servidores:', error.message);
      throw error;
    }
  }

  async listUserApis(): Promise<any[]> {
    try {
      const bearer = await this.getBearerToken();
      const response = await this.client.get('/api/v2/apis/list', {
        headers: { Authorization: `Bearer ${bearer}` },
      });
      return response.data?.apis || response.data || [];
    } catch (error: any) {
      console.error('[APIBrasil] Erro ao listar APIs do usuário:', error.message);
      throw error;
    }
  }

  async detectApiTypeBySecretKey(secretKey: string): Promise<{ type: string; name: string } | null> {
    try {
      const apis = await this.listUserApis();
      const match = apis.find(
        (api: any) => api.secretkey === secretKey || api.secretKey === secretKey,
      );
      if (match) {
        return { type: match.type, name: match.name };
      }
      return null;
    } catch (error: any) {
      console.error('[APIBrasil] Erro ao detectar tipo da API:', error.message);
      throw error;
    }
  }

  async updateDeviceWebhooks(
    deviceToken: string,
    webhooks: {
      webhook_wh_message?: string;
      webhook_wh_status?: string;
      webhook_wh_connect?: string;
      webhook_wh_qrcode?: string;
    },
    deviceMeta?: { deviceKey?: string; deviceName?: string; serverSearch?: string },
  ): Promise<any> {
    const bearer = await this.getBearerToken();
    const secretKey = await settingsService.getApibrasilSecretKey();

    // Estratégia 1: usar devices/store se temos os metadados completos
    if (secretKey && deviceMeta?.deviceKey && deviceMeta?.serverSearch) {
      try {
        const response = await this.client.post('/api/v2/devices/store', {
          type: 'cellphone',
          device_name: deviceMeta.deviceName || `device_${deviceToken}`,
          device_key: deviceMeta.deviceKey,
          server_search: deviceMeta.serverSearch,
          ...webhooks,
        }, {
          headers: {
            Authorization: `Bearer ${bearer}`,
            'Content-Type': 'application/json',
            SecretKey: secretKey,
          },
        });
        console.log(`[APIBrasil] Webhooks atualizados via store para device ${deviceToken}`);
        return response.data;
      } catch (error: any) {
        console.warn(`[APIBrasil] Falha no store, tentando search: ${error.response?.data?.message || error.message}`);
      }
    }

    // Estratégia 2: buscar device e re-registrar
    try {
      const searchRes = await this.client.post('/api/v2/devices/search', {
        search: deviceToken,
      }, {
        headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      });

      const device = searchRes.data?.device || searchRes.data?.data || searchRes.data;
      
      if (device && secretKey) {
        const dKey = device.device_key || deviceMeta?.deviceKey;
        const dName = device.device_name || deviceMeta?.deviceName || `device_${deviceToken}`;
        const sSearch = device.server_search || deviceMeta?.serverSearch;
        
        if (dKey && sSearch) {
          const response = await this.client.post('/api/v2/devices/store', {
            type: device.type || 'cellphone',
            device_name: dName,
            device_key: dKey,
            server_search: sSearch,
            ...webhooks,
          }, {
            headers: {
              Authorization: `Bearer ${bearer}`,
              'Content-Type': 'application/json',
              SecretKey: secretKey,
            },
          });
          console.log(`[APIBrasil] Webhooks atualizados via search+store para device ${deviceToken}`);
          return response.data;
        }
      }

      console.warn(`[APIBrasil] Não foi possível atualizar webhooks do device ${deviceToken} - dados insuficientes`);
      return null;
    } catch (error: any) {
      const raw = error.response?.data;
      const msg = raw?.message || (typeof raw === 'object' ? JSON.stringify(raw) : raw) || error.message;
      console.error('[APIBrasil] Erro ao atualizar webhooks:', msg);
      throw new Error(msg);
    }
  }

  // ─── WhatsApp WPP ─────────────────────────────────────────

  async wppStartSession(deviceToken: string): Promise<any> {
    const headers = await this.authHeaders(deviceToken);
    const response = await this.client.post('/api/v2/whatsapp/start', {}, { headers });
    return response.data;
  }

  async wppGetQrCode(deviceToken: string): Promise<string> {
    const headers = await this.authHeaders(deviceToken);
    const response = await this.client.post('/api/v2/whatsapp/qrcode', {}, { headers });
    return response.data?.qrcode || response.data?.data?.qrcode || response.data;
  }

  async wppGetConnectionState(deviceToken: string): Promise<any> {
    const headers = await this.authHeaders(deviceToken);
    const response = await this.client.post('/api/v2/whatsapp/getConnectionState', {}, { headers });
    return response.data;
  }

  // ─── Baileys (Evolution API) ──────────────────────────────

  async baileysCreateInstance(deviceToken: string, instanceName: string): Promise<any> {
    const headers = await this.authHeaders(deviceToken);
    const response = await this.client.post('/api/v2/evolution/instance/create', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }, { headers });
    return response.data;
  }

  async baileysConnect(deviceToken: string): Promise<any> {
    const headers = await this.authHeaders(deviceToken);
    const response = await this.client.get('/api/v2/evolution/instance/connect', { headers });
    return response.data;
  }

  async baileysGetConnectionState(deviceToken: string): Promise<any> {
    const headers = await this.authHeaders(deviceToken);
    const response = await this.client.get('/api/v2/evolution/instance/connectionState', { headers });
    return response.data;
  }

  // ─── Métodos unificados (roteiam por serverType) ──────────

  async connect(deviceToken: string, serverType: ServerType, instanceName?: string): Promise<ConnectResult> {
    try {
      if (serverType === 'baileys') {
        const name = instanceName || `instance_${Date.now()}`;
        const result = await this.baileysCreateInstance(deviceToken, name);

        const qrData = result?.response?.qrcode;
        let qrCode = '';

        if (qrData?.base64) {
          qrCode = qrData.base64;
        } else if (qrData?.code) {
          qrCode = qrData.code;
        } else if (typeof qrData === 'string') {
          qrCode = qrData;
        }

        if (!qrCode) {
          const connectResult = await this.baileysConnect(deviceToken);
          qrCode = connectResult?.base64 || connectResult?.code || JSON.stringify(connectResult);
        }

        return { qrCode, raw: result };
      } else {
        await this.wppStartSession(deviceToken);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const qrCode = await this.wppGetQrCode(deviceToken);
        return { qrCode };
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message;
      console.error(`[APIBrasil] Erro ao conectar (${serverType}):`, msg);
      throw new Error(msg);
    }
  }

  async getConnectionState(deviceToken: string, serverType: ServerType): Promise<any> {
    try {
      if (serverType === 'baileys') {
        return await this.baileysGetConnectionState(deviceToken);
      } else {
        return await this.wppGetConnectionState(deviceToken);
      }
    } catch (error: any) {
      console.error('[APIBrasil] Erro ao verificar status:', error.message);
      throw error;
    }
  }

  parseIsConnected(statusResponse: any, serverType: ServerType): boolean {
    if (serverType === 'baileys') {
      const state = statusResponse?.response?.instance?.state;
      return state === 'open' || state === 'connected';
    } else {
      const data = statusResponse?.response?.data || statusResponse?.data || statusResponse;
      const state = data?.state || data?.status;
      return state === 'CONNECTED' || state === 'isLogged';
    }
  }

  async sendText(deviceToken: string, serverType: ServerType, number: string, text: string, options?: any): Promise<any> {
    const headers = await this.authHeaders(deviceToken);
    const cleanNumber = number.replace('@c.us', '').replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');

    console.log(`[APIBrasil] sendText: serverType=${serverType}, number=${cleanNumber}, text="${text.substring(0, 40)}..."`);

    if (serverType === 'baileys') {
      const response = await this.client.post('/api/v2/evolution/message/sendText', {
        number: cleanNumber,
        text,
        options: {
          delay: options?.delay || 1,
          presence: 'composing',
        },
      }, { headers });
      return response.data;
    } else {
      const response = await this.client.post('/api/v2/whatsapp/sendText', {
        number: cleanNumber,
        text,
        time_typing: options?.timeTyping || 0,
        options: {
          createChat: options?.createChat !== false,
          delay: options?.delay || 0,
          detectMentioned: options?.detectMentioned || false,
          markIsRead: options?.markIsRead || false,
          waitForAck: options?.waitForAck || false,
        },
      }, { headers });
      return response.data;
    }
  }

  async sendImage(deviceToken: string, serverType: ServerType, number: string, imageUrl: string, caption?: string): Promise<any> {
    const headers = await this.authHeaders(deviceToken);

    if (serverType === 'baileys') {
      const response = await this.client.post('/api/v2/evolution/message/sendMedia', {
        number,
        mediatype: 'image',
        media: imageUrl,
        caption: caption || '',
      }, { headers });
      return response.data;
    } else {
      const response = await this.client.post('/api/v2/whatsapp/sendFile', {
        number,
        path: imageUrl,
        caption: caption || '',
      }, { headers });
      return response.data;
    }
  }

  async sendAudio(deviceToken: string, serverType: ServerType, number: string, audioUrl: string): Promise<any> {
    const headers = await this.authHeaders(deviceToken);

    if (serverType === 'baileys') {
      const response = await this.client.post('/api/v2/evolution/message/sendWhatsAppAudio', {
        number,
        audio: audioUrl,
      }, { headers });
      return response.data;
    } else {
      const response = await this.client.post('/api/v2/whatsapp/sendAudio', {
        number,
        path: audioUrl,
      }, { headers });
      return response.data;
    }
  }

  async sendSticker(deviceToken: string, serverType: ServerType, number: string, stickerUrl: string): Promise<any> {
    const headers = await this.authHeaders(deviceToken);

    if (serverType === 'baileys') {
      const response = await this.client.post('/api/v2/evolution/message/sendSticker', {
        number,
        sticker: stickerUrl,
      }, { headers });
      return response.data;
    } else {
      const response = await this.client.post('/api/v2/whatsapp/sendFile', {
        number,
        path: stickerUrl,
        isSticker: true,
      }, { headers });
      return response.data;
    }
  }

  // Métodos legados mantidos para compatibilidade
  async startSession(deviceToken: string): Promise<any> {
    return this.wppStartSession(deviceToken);
  }

  async getQrCode(deviceToken: string): Promise<string> {
    return this.wppGetQrCode(deviceToken);
  }
}

export default new ApiBrasilService();
