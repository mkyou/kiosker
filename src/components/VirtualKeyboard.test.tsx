import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualKeyboard } from './VirtualKeyboard';

describe('VirtualKeyboard', () => {
  it('should render the keyboard with all keys', () => {
    const onKeyPress = vi.fn();
    const onClose = vi.fn();

    render(<VirtualKeyboard onKeyPress={onKeyPress} onClose={onClose} />);

    // Verificar se o título aparece
    expect(screen.getByText('Teclado Virtual')).toBeInTheDocument();

    // Verificar se o botão de fechar aparece
    expect(screen.getByText('Fechar')).toBeInTheDocument();
  });

  it('should call onKeyPress with correct key when button is clicked', () => {
    const onKeyPress = vi.fn();
    const onClose = vi.fn();

    render(<VirtualKeyboard onKeyPress={onKeyPress} onClose={onClose} />);

    // Clicar na tecla 'a'
    fireEvent.click(screen.getByText('a'));
    expect(onKeyPress).toHaveBeenCalledWith('a');

    // Clicar na tecla '1'
    fireEvent.click(screen.getByText('1'));
    expect(onKeyPress).toHaveBeenCalledWith('1');

    // Clicar na tecla Shift
    fireEvent.click(screen.getByText('Shift'));
    // A tecla Shift não chama onKeyPress
  });

  it('should handle special keys correctly', () => {
    const onKeyPress = vi.fn();
    const onClose = vi.fn();

    render(<VirtualKeyboard onKeyPress={onKeyPress} onClose={onClose} />);

    // Backspace
    fireEvent.click(screen.getByText('⌫'));
    expect(onKeyPress).toHaveBeenCalledWith('Backspace');

    // Enter
    fireEvent.click(screen.getByText('Enter'));
    expect(onKeyPress).toHaveBeenCalledWith('Enter');

    // Espaço — getByText normaliza espaços por padrão, então desabilitamos a normalização
    fireEvent.click(screen.getByText(' ', { normalizer: (s) => s }));
    expect(onKeyPress).toHaveBeenCalledWith(' ');

    // Esc
    fireEvent.click(screen.getByText('Esc'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should handle shift key toggling', () => {
    const onKeyPress = vi.fn();
    const onClose = vi.fn();

    render(<VirtualKeyboard onKeyPress={onKeyPress} onClose={onClose} />);

    // Clicar na tecla 'a' sem shift (minúscula)
    fireEvent.click(screen.getByText('a'));
    expect(onKeyPress).toHaveBeenCalledWith('a');

    // Ativar shift
    fireEvent.click(screen.getByText('Shift'));

    // Clicar na tecla 'a' com shift (maiúscula)
    fireEvent.click(screen.getByText('a'));
    expect(onKeyPress).toHaveBeenCalledWith('A');

    // Desativar shift
    fireEvent.click(screen.getByText('Shift'));

    // Clicar novamente em 'a' (minúscula)
    fireEvent.click(screen.getByText('a'));
    expect(onKeyPress).toHaveBeenCalledWith('a');
  });

  it('should handle multiple key presses', () => {
    const onKeyPress = vi.fn();
    const onClose = vi.fn();

    render(<VirtualKeyboard onKeyPress={onKeyPress} onClose={onClose} />);

    // Digitar "hello"
    fireEvent.click(screen.getByText('h'));
    fireEvent.click(screen.getByText('e'));
    fireEvent.click(screen.getByText('l'));
    fireEvent.click(screen.getByText('l'));
    fireEvent.click(screen.getByText('o'));

    expect(onKeyPress).toHaveBeenNthCalledWith(1, 'h');
    expect(onKeyPress).toHaveBeenNthCalledWith(2, 'e');
    expect(onKeyPress).toHaveBeenNthCalledWith(3, 'l');
    expect(onKeyPress).toHaveBeenNthCalledWith(4, 'l');
    expect(onKeyPress).toHaveBeenNthCalledWith(5, 'o');
  });
});
