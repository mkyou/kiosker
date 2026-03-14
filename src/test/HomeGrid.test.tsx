/**
 * Tests for the HomeGrid component (src/pages/HomeGrid.tsx).
 *
 * Covered features:
 *  - Renders empty state correctly with Add Site / Add App buttons
 *  - Renders MediaCards grouped by Favorites, Web, and Apps
 *  - Does not render empty state when items are present
 *  - Opens Add Web modal on click
 *  - Opens SystemAppPicker modal on click
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './renderWithProviders';
import { HomeGrid, KioskerItem } from '../pages/HomeGrid';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

const mockItems: KioskerItem[] = [
    { id: 1, title: 'Netflix', item_type: 'web', target_path: 'https://netflix.com', is_favorite: true },
    { id: 2, title: 'YouTube', item_type: 'web', target_path: 'https://youtube.com', is_favorite: false },
    { id: 3, title: 'Steam', item_type: 'exe', target_path: 'C:\\Steam.exe', is_favorite: false },
];

beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation(async (cmd: string) => {
        if (cmd === 'get_active_targets') return ['https://youtube.com']; // YouTube is running
        if (cmd === 'get_setting') return 'pt';
        if (cmd === 'get_system_apps') return [];
        return null;
    });
});

describe('HomeGrid – rendering', () => {
    it('renders empty state when there are no items and not loading', () => {
        render(<HomeGrid items={[]} loading={false} onRefresh={vi.fn()} />);
        expect(screen.getByText(/Biblioteca vazia/i)).toBeInTheDocument();
        // The two fallback add buttons
        expect(screen.getByRole('button', { name: /Adicionar Site/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Adicionar App/i })).toBeInTheDocument();
    });

    it('renders favorite, web, and app items grouped correctly', () => {
        render(<HomeGrid items={mockItems} loading={false} onRefresh={vi.fn()} />);
        // Ensure section titles are present
        expect(screen.getByText(/Favoritos/i)).toBeInTheDocument();
        
        // Items render their titles
        const cards = screen.getAllByRole('button', { name: /(Netflix|YouTube|Steam)/i });
        // Since Netflix is favorite + web, it only renders in the list once based on the original code logic?
        // Wait, HomeGrid renders Favorites, Web and Apps. If an item is favorite AND web, does it render twice?
        // In the code: favoriteItems displays all is_favorite. webItems displays all web items. 
        // Yes, it will render twice (once under Favorites, once under Web)
        expect(cards.length).toBeGreaterThan(0);
        expect(screen.getAllByText('Netflix').length).toBe(2); // One in favs, one in web
        expect(screen.getAllByText('YouTube').length).toBe(1);
        expect(screen.getAllByText('Steam').length).toBe(1);
    });

    it('does not render empty state when items are present', () => {
        render(<HomeGrid items={mockItems} loading={false} onRefresh={vi.fn()} />);
        expect(screen.queryByText(/Biblioteca vazia/i)).not.toBeInTheDocument();
    });
});

describe('HomeGrid – modals', () => {
    it('opens AddEntryForm when "Adicionar Site" is clicked', async () => {
        const user = userEvent.setup();
        render(<HomeGrid items={mockItems} loading={false} onRefresh={vi.fn()} />);
        
        const addWebCard = screen.getAllByRole('button', { name: /Adicionar Site/i })[0];
        await user.click(addWebCard);
        
        expect(screen.getByRole('textbox')).toBeInTheDocument(); // Textarea inside AddEntryForm
    });

    it('opens SystemAppPicker when "Adicionar App" is clicked', async () => {
        const user = userEvent.setup();
        render(<HomeGrid items={mockItems} loading={false} onRefresh={vi.fn()} />);
        
        // Note: the component renders an action card with text "App Local"
        const addAppCard = screen.getByRole('button', { name: /App Local/i });
        await user.click(addAppCard);
        
        expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
    });
});
