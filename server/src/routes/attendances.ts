import { Router, Request, Response } from 'express';
import { Attendance, Instance, Bot, AttendanceMessage } from '../models';
import { Op } from 'sequelize';
import apiBrasilService from '../services/apibrasil.service';
import settingsService from '../services/settings.service';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }

    const attendances = await Attendance.findAll({
      where,
      include: [
        { model: Instance, as: 'instance', attributes: ['id', 'name', 'phone'] },
        { model: Bot, as: 'bot', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(attendances);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id, {
      include: [
        { model: Instance, as: 'instance', attributes: ['id', 'name', 'phone'] },
        { model: Bot, as: 'bot', attributes: ['id', 'name'] },
      ],
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }

    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, closedBy, attendantName } = req.body;

    if (!['waiting', 'in_progress', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const attendance = await Attendance.findByPk(req.params.id, {
      include: [{ model: Instance, as: 'instance', attributes: ['id', 'deviceToken', 'serverType'] }],
    });
    
    if (!attendance) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }

    const updates: any = { status };
    
    if (status === 'in_progress' && attendantName) {
      updates.attendantName = attendantName;
    }
    
    if (status === 'closed') {
      updates.closedAt = new Date();
      updates.closedBy = closedBy || 'Sistema';
    } else if (status === 'waiting') {
      // Ao reabrir, limpar dados de fechamento
      updates.closedAt = null;
      updates.closedBy = null;
      updates.attendantName = null;
    }

    await attendance.update(updates);

    // Enviar mensagem automática via WhatsApp
    const instance = (attendance as any).instance;
    if (instance && instance.deviceToken) {
      try {
        let messageTemplate = '';
        const protocol = (attendance as any).protocol || 'N/A';
        const attendantDisplayName = attendantName || 'um atendente';
        const now = new Date();
        
        if (status === 'in_progress') {
          messageTemplate = await settingsService.getWelcomeMessage();
        } else if (status === 'closed') {
          messageTemplate = await settingsService.getClosingMessage();
        }

        if (messageTemplate) {
          // Substituir variáveis
          const message = settingsService.replaceMessageVariables(messageTemplate, {
            atendente: attendantDisplayName,
            protocolo: protocol,
            telefone: attendance.phone,
            data: now.toLocaleDateString('pt-BR'),
            hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            assunto: attendance.subject || 'N/A',
          });

          await apiBrasilService.sendText(
            instance.deviceToken,
            instance.serverType,
            attendance.phone,
            message,
          );
          console.log(`📧 Notificação de status "${status}" enviada para ${attendance.phone}`);
        }
      } catch (error: any) {
        console.error('Erro ao enviar notificação de status:', error.message);
        // Não bloqueia a atualização do status se o envio falhar
      }
    }

    res.json(attendance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id);
    if (!attendance) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }

    await attendance.destroy();
    res.json({ message: 'Atendimento removido' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mensagens do atendimento
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const messages = await AttendanceMessage.findAll({
      where: { attendanceId: req.params.id },
      order: [['sentAt', 'ASC']],
    });
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar mensagem
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' });
    }

    const attendance = await Attendance.findByPk(req.params.id, {
      include: [{ model: Instance, as: 'instance', attributes: ['id', 'deviceToken', 'serverType'] }],
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }

    const instance = (attendance as any).instance;
    if (!instance || !instance.deviceToken) {
      return res.status(400).json({ error: 'Instância não disponível' });
    }

    // Verificar configuração de exibir nome do atendente
    const showAttendantName = await settingsService.getShowAttendantName();
    
    // Formatar mensagem com ou sem nome do atendente
    const attendantName = (attendance as any).attendantName || 'Atendente';
    const formattedMessage = showAttendantName 
      ? `*${attendantName}:*\n${content}`
      : content;

    // Enviar mensagem via API Brasil
    await apiBrasilService.sendText(
      instance.deviceToken,
      instance.serverType,
      attendance.phone,
      formattedMessage,
    );

    // Salvar mensagem no histórico
    const message = await AttendanceMessage.create({
      attendanceId: attendance.id,
      direction: 'sent',
      content,
      senderName: showAttendantName ? attendantName : null,
      sentAt: new Date(),
    });

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
