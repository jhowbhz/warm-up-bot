import { Router, Request, Response } from 'express';
import { DailyMetric, Instance } from '../models';
import { Op } from 'sequelize';

const router = Router();

// Buscar métricas por instância
router.get('/instance/:instanceId', async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    const { days = 7 } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    const metrics = await DailyMetric.findAll({
      where: {
        instanceId,
        date: {
          [Op.gte]: daysAgo,
        },
      },
      order: [['date', 'ASC']],
    });

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar métricas de hoje de todas as instâncias
router.get('/today', async (req: Request, res: Response) => {
  try {
    const today = new Date();

    const metrics = await DailyMetric.findAll({
      where: {
        date: today,
      },
      include: [
        {
          model: Instance,
          as: 'instance',
        },
      ],
    });

    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas gerais
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const instances = await Instance.count();
    const connected = await Instance.count({ where: { status: 'connected' } });
    const warming = await Instance.count({ where: { currentPhase: 'auto_warming' } });
    
    const today = new Date();
    const todayMetrics = await DailyMetric.findAll({ where: { date: today } });

    const totalSent = todayMetrics.reduce((sum, m) => sum + m.messagesSent, 0);
    const totalReceived = todayMetrics.reduce((sum, m) => sum + m.messagesReceived, 0);
    const totalBlocks = todayMetrics.reduce((sum, m) => sum + m.blocksCount, 0);

    res.json({
      instances: {
        total: instances,
        connected,
        warming,
      },
      today: {
        messagesSent: totalSent,
        messagesReceived: totalReceived,
        blocksCount: totalBlocks,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
