import { describe, it, expect } from 'vitest';
import express from 'express';

describe('Backend', () => {
  it('deve importar o express sem erros', () => {
    expect(express).toBeDefined();
    expect(typeof express).toBe('function');
  });

  it('deve criar uma instância do app express', () => {
    const app = express();
    expect(app).toBeDefined();
    expect(typeof app.get).toBe('function');
    expect(typeof app.post).toBe('function');
    expect(typeof app.use).toBe('function');
  });

  it('deve registrar a rota /health', () => {
    const app = express();

    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    const layers = app._router.stack.filter(
      (layer: any) => layer.route?.path === '/health'
    );
    expect(layers.length).toBe(1);
    expect(layers[0].route.methods.get).toBe(true);
  });

  it('deve configurar middlewares básicos sem erro', () => {
    const app = express();
    expect(() => {
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
    }).not.toThrow();
  });
});

describe('Dependências críticas', () => {
  it('deve importar cors', async () => {
    const cors = await import('cors');
    expect(cors).toBeDefined();
  });

  it('deve importar helmet', async () => {
    const helmet = await import('helmet');
    expect(helmet).toBeDefined();
  });

  it('deve importar jsonwebtoken', async () => {
    const jwt = await import('jsonwebtoken');
    expect(jwt).toBeDefined();
    expect(typeof jwt.sign).toBe('function');
    expect(typeof jwt.verify).toBe('function');
  });

  it('deve importar sequelize', async () => {
    const { Sequelize } = await import('sequelize');
    expect(Sequelize).toBeDefined();
    expect(typeof Sequelize).toBe('function');
  });

  it('deve importar openai', async () => {
    const { default: OpenAI } = await import('openai');
    expect(OpenAI).toBeDefined();
  });
});
