/**
 * Tests for MediaCard component (src/components/MediaCard.tsx).
 *
 * Covered features:
 *  - Renders title text
 *  - Shows fallback initial letter when no background_url
 *  - Shows "Rodando" badge when isRunning=true
 *  - Does NOT show "Rodando" badge when isRunning=false
 *  - Calls invoke('launch_kiosk') for web items on click
 *  - Opens context menu on right-click
 *  - Context menu calls invoke('delete_item') on delete
 *  - Context menu calls invoke('toggle_favorite') on favorite/unfavorite
 *  - Context menu calls onKill when item is running and "Fechar" is clicked
 *  - Edit mode: inline input appears and saves on Enter
 *  - Edit mode: inline input cancels on Escape
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './renderWithProviders';
import { MediaCard } from '../components/MediaCard';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

const baseProps = {
    id: 1,
    title: 'Netflix',
    target_path: 'https://netflix.com',
    item_type: 'web',
    background_url: '',
    is_favorite: false,
    isRunning: false,
    onKill: vi.fn(),
    onRefresh: vi.fn(),
};

beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation(async (cmd: string) => {
        if (cmd === 'get_setting') return 'pt';
        return null;
    });
});

describe('MediaCard – rendering', () => {
    it('renders the card title', () => {
        render(<MediaCard {...baseProps} />);
        expect(screen.getByText('Netflix')).toBeInTheDocument();
    });

    it('shows the first letter of title as fallback when background_url is empty', () => {
        render(<MediaCard {...baseProps} background_url="" />);
        expect(screen.getByText('N')).toBeInTheDocument();
    });

    it('does NOT show fallback letter when background_url is provided', () => {
        render(<MediaCard {...baseProps} background_url="https://example.com/icon.png" />);
        expect(screen.queryByText('N')).not.toBeInTheDocument();
    });
});

describe('MediaCard – running badge', () => {
    it('shows "RODANDO" badge when isRunning is true', () => {
        render(<MediaCard {...baseProps} isRunning={true} />);
        expect(screen.getByText(/rodando/i)).toBeInTheDocument();
    });

    it('does NOT show "RODANDO" badge when isRunning is false', () => {
        render(<MediaCard {...baseProps} isRunning={false} />);
        expect(screen.queryByText(/rodando/i)).not.toBeInTheDocument();
    });
});

describe('MediaCard – launch actions', () => {
    it('calls invoke("launch_kiosk") with the URL when a web card is clicked', async () => {
        const user = userEvent.setup();
        render(<MediaCard {...baseProps} item_type="web" target_path="https://netflix.com" />);
        await user.click(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('launch_kiosk', { url: 'https://netflix.com' });
        });
    });

    it('calls onRefresh after a successful launch', async () => {
        const onRefresh = vi.fn();
        const user = userEvent.setup();
        render(<MediaCard {...baseProps} onRefresh={onRefresh} />);
        await user.click(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    });
});

describe('MediaCard – context menu', () => {
    it('opens the context menu on right-click at specific coordinates', async () => {
        render(<MediaCard {...baseProps} />);
        const card = screen.getByRole('button', { name: /netflix/i });
        fireEvent.contextMenu(card, { clientX: 500, clientY: 400 });
        await waitFor(() => {
            const menu = screen.getByRole('menu');
            expect(menu).toBeInTheDocument();
            // jsdom viewport 1024×768: y(400)+MENU_H(360)=760 > 758 → flips above: top=40
            // x(500)+MENU_W(176)=676 < 1014 → no flip: left=500
            expect(menu).toHaveStyle({ left: '500px', top: '40px' });
        });
    });

    it('shows "ABRIR" option in the context menu', async () => {
        render(<MediaCard {...baseProps} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(screen.getByText(/abrir/i)).toBeInTheDocument();
        });
    });

    it('shows "REINICIAR" instead of "ABRIR" when item is running', async () => {
        render(<MediaCard {...baseProps} isRunning={true} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(screen.getByText(/reiniciar/i)).toBeInTheDocument();
            expect(screen.queryByText(/^abrir$/i)).not.toBeInTheDocument();
        });
    });

    it('shows "Fechar" button only when isRunning is true', async () => {
        render(<MediaCard {...baseProps} isRunning={true} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(screen.getByText(/fechar/i)).toBeInTheDocument();
        });
    });

    it('does NOT show "Fechar" button when isRunning is false', async () => {
        render(<MediaCard {...baseProps} isRunning={false} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(screen.queryByText(/fechar/i)).not.toBeInTheDocument();
        });
    });
});

describe('MediaCard – delete action', () => {
    it('calls onDeleteRequest when "EXCLUIR" is clicked', async () => {
        const onDeleteRequest = vi.fn();
        render(<MediaCard {...baseProps} onDeleteRequest={onDeleteRequest} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/excluir da biblioteca/i));
        await userEvent.setup().click(screen.getByText(/excluir da biblioteca/i));
        expect(onDeleteRequest).toHaveBeenCalledTimes(1);
    });
});

describe('MediaCard – favorite toggle', () => {
    it('shows "FAVORITAR" when is_favorite is false', async () => {
        render(<MediaCard {...baseProps} is_favorite={false} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(screen.getByText(/favoritar/i)).toBeInTheDocument();
        });
    });

    it('shows "REMOVER FAVORITO" when is_favorite is true', async () => {
        render(<MediaCard {...baseProps} is_favorite={true} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(screen.getByText(/remover favorito/i)).toBeInTheDocument();
        });
    });

    it('calls invoke("toggle_favorite", { id, isFavorite: true }) when favoriting', async () => {
        const onRefresh = vi.fn();
        render(<MediaCard {...baseProps} id={7} is_favorite={false} onRefresh={onRefresh} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/favoritar/i));
        await userEvent.setup().click(screen.getByText(/favoritar/i));
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('toggle_favorite', { id: 7, isFavorite: true });
        });
    });

    it('calls invoke("toggle_favorite", { id, isFavorite: false }) when un-favoriting', async () => {
        const onRefresh = vi.fn();
        render(<MediaCard {...baseProps} id={7} is_favorite={true} onRefresh={onRefresh} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/remover favorito/i));
        await userEvent.setup().click(screen.getByText(/remover favorito/i));
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('toggle_favorite', { id: 7, isFavorite: false });
        });
    });
});

describe('MediaCard – kill action', () => {
    it('calls onKill when "Fechar" is clicked on a running item', async () => {
        const onKill = vi.fn();
        render(<MediaCard {...baseProps} isRunning={true} onKill={onKill} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/fechar/i));
        await userEvent.setup().click(screen.getByText(/fechar/i));
        expect(onKill).toHaveBeenCalledTimes(1);
    });
});

describe('MediaCard – inline edit mode', () => {
    it('shows an input when "EDITAR" is clicked in context menu', async () => {
        render(<MediaCard {...baseProps} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/editar/i));
        await userEvent.setup().click(screen.getByText(/editar/i));
        await waitFor(() => {
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });
    });

    it('saves the new title when Enter is pressed in edit input', async () => {
        const onRefresh = vi.fn();
        const user = userEvent.setup();
        render(<MediaCard {...baseProps} id={1} title="Netflix" onRefresh={onRefresh} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/editar/i));
        await user.click(screen.getByText(/editar/i));
        const input = await screen.findByRole('textbox');
        await user.clear(input);
        await user.type(input, 'Netflix HD');
        await user.keyboard('{Enter}');
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('update_item', { id: 1, title: 'Netflix HD' });
        });
    });

    it('cancels edit mode on Escape without calling invoke("update_item")', async () => {
        const user = userEvent.setup();
        render(<MediaCard {...baseProps} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/editar/i));
        await user.click(screen.getByText(/editar/i));
        await user.keyboard('{Escape}');
        await waitFor(() => {
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
        expect(mockInvoke).not.toHaveBeenCalledWith('update_item', expect.anything());
    });

    it('empty title cancels edit without calling invoke("update_item")', async () => {
        const user = userEvent.setup();
        render(<MediaCard {...baseProps} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/editar/i));
        await user.click(screen.getByText(/editar/i));
        const input = await screen.findByRole('textbox');
        await user.clear(input);
        await user.keyboard('{Enter}');
        await waitFor(() => {
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
        expect(mockInvoke).not.toHaveBeenCalledWith('update_item', expect.anything());
    });

    it('same title as original cancels edit without calling invoke("update_item")', async () => {
        const user = userEvent.setup();
        render(<MediaCard {...baseProps} title="Netflix" />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/editar/i));
        await user.click(screen.getByText(/editar/i));
        // Press Enter without changing the title
        await user.keyboard('{Enter}');
        await waitFor(() => {
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
        expect(mockInvoke).not.toHaveBeenCalledWith('update_item', expect.anything());
    });

    it('blur on the edit input saves the new title', async () => {
        const onRefresh = vi.fn();
        const user = userEvent.setup();
        render(<MediaCard {...baseProps} id={1} title="Netflix" onRefresh={onRefresh} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByText(/editar/i));
        await user.click(screen.getByText(/editar/i));
        const input = await screen.findByRole('textbox');
        await user.clear(input);
        await user.type(input, 'Netflix 4K');
        fireEvent.blur(input);
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('update_item', { id: 1, title: 'Netflix 4K' });
        });
    });
});

describe('MediaCard – additional interactions', () => {
    it('calls invoke("launch_executable") with path when an exe card is clicked', async () => {
        const user = userEvent.setup();
        render(<MediaCard {...baseProps} item_type="exe" target_path={'C:\\Games\\app.exe'} />);
        await user.click(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('launch_executable', { path: 'C:\\Games\\app.exe' });
        });
    });

    it('Shift+F10 opens the context menu on the focused button', async () => {
        render(<MediaCard {...baseProps} />);
        const button = screen.getByRole('button', { name: /netflix/i });
        button.focus();
        fireEvent.keyDown(button, { key: 'F10', shiftKey: true });
        await waitFor(() => {
            expect(screen.getByRole('menu')).toBeInTheDocument();
        });
    });

    it('context menu closes on blur when focus leaves the card', async () => {
        const { container } = render(<MediaCard {...baseProps} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => screen.getByRole('menu'));
        // Fire blur on the outer container with relatedTarget outside
        const outerDiv = container.firstChild as HTMLElement;
        fireEvent.blur(outerDiv, { relatedTarget: document.body });
        await waitFor(() => {
            expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        });
    });

    it('shows ★ icon in favorite button when is_favorite is true', async () => {
        render(<MediaCard {...baseProps} is_favorite={true} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(screen.getByText('★')).toBeInTheDocument();
        });
    });

    it('shows ☆ icon in favorite button when is_favorite is false', async () => {
        render(<MediaCard {...baseProps} is_favorite={false} />);
        fireEvent.contextMenu(screen.getByRole('button', { name: /netflix/i }));
        await waitFor(() => {
            expect(screen.getByText('☆')).toBeInTheDocument();
        });
    });
});
