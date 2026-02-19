import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Frontend', () => {
  it('deve importar o componente App sem erros', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('deve renderizar o App sem crashar', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('deve exibir a tela de login quando não autenticado', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { name: /entrar/i });
    expect(heading).toBeInTheDocument();
    const emailInput = screen.getByPlaceholderText(/email/i);
    expect(emailInput).toBeInTheDocument();
  });
});
