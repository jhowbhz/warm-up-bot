import { Router, Request, Response } from 'express';
import { Attendant } from '../models';

const router = Router();

// Listar todos os atendentes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const where: any = {};

    if (active !== undefined) {
      where.active = active === 'true';
    }

    const attendants = await Attendant.findAll({
      where,
      order: [['name', 'ASC']],
    });

    res.json(attendants);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar atendente por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const attendant = await Attendant.findByPk(req.params.id);
    
    if (!attendant) {
      return res.status(404).json({ error: 'Atendente não encontrado' });
    }

    res.json(attendant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo atendente
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, sector, email, active } = req.body;

    if (!name || !sector) {
      return res.status(400).json({ error: 'Nome e setor são obrigatórios' });
    }

    const attendant = await Attendant.create({
      name,
      sector,
      email: email || null,
      active: active !== undefined ? active : true,
    });

    res.status(201).json(attendant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar atendente
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const attendant = await Attendant.findByPk(req.params.id);

    if (!attendant) {
      return res.status(404).json({ error: 'Atendente não encontrado' });
    }

    const { name, sector, email, active } = req.body;

    await attendant.update({
      name: name !== undefined ? name : attendant.name,
      sector: sector !== undefined ? sector : attendant.sector,
      email: email !== undefined ? email : attendant.email,
      active: active !== undefined ? active : attendant.active,
    });

    res.json(attendant);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar atendente
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const attendant = await Attendant.findByPk(req.params.id);

    if (!attendant) {
      return res.status(404).json({ error: 'Atendente não encontrado' });
    }

    await attendant.destroy();
    res.json({ message: 'Atendente deletado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
