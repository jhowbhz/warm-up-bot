import { Router, Request, Response } from 'express';
import { WarmingContact } from '../models';

const router = Router();

// Listar todos os contatos
router.get('/', async (req: Request, res: Response) => {
  try {
    const contacts = await WarmingContact.findAll();
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar contato por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const contact = await WarmingContact.findByPk(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }
    
    res.json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo contato
router.post('/', async (req: Request, res: Response) => {
  try {
    const { phone, name, isBot, category } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Telefone é obrigatório' });
    }

    const contact = await WarmingContact.create({
      phone,
      name,
      isBot: isBot || false,
      category: category || 'random',
      active: true,
    });

    res.status(201).json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar contato
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const contact = await WarmingContact.findByPk(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    await contact.update(req.body);

    res.json(contact);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar contato
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const contact = await WarmingContact.findByPk(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    await contact.destroy();

    res.json({ message: 'Contato deletado com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
