import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { config } from '../config/env';
import settingsService from '../services/settings.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const API_BASE = 'https://gateway.apibrasil.io';

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const response = await axios.post(`${API_BASE}/api/v2/auth/login`, { email, password });

    if (response.data?.error) {
      return res.status(401).json({ error: response.data.message || 'Credenciais inválidas' });
    }

    const bearerToken = response.data?.authorization?.token;
    if (!bearerToken) {
      return res.status(401).json({ error: 'Falha ao obter token da APIBrasil' });
    }

    await settingsService.setSetting('apibrasil_email', email, 'Email da conta APIBrasil');
    await settingsService.setSetting('apibrasil_password', password, 'Senha da conta APIBrasil');
    await settingsService.setSetting('apibrasil_bearer_token', bearerToken, 'Bearer Token (auto-gerado no login)');

    const token = jwt.sign(
      { email, bearerToken } as { email: string; bearerToken: string },
      config.jwt.secret,
      { expiresIn: '7d' },
    );

    res.json({
      token,
      user: { email },
    });
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    res.status(500).json({ error: 'Erro ao conectar com APIBrasil: ' + error.message });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ user: { email: req.user!.email } });
});

export default router;
