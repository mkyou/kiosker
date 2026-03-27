/**
 * Tests for the SystemAppPicker component (src/components/SystemAppPicker.tsx).
 *
 * Covered features:
 *  - Renders correctly and fetches apps on mount
 *  - Shows loading state initially
 *  - Renders list of apps returned by get_system_apps
 *  - Filters apps based on search input
 *  - Shows empty state if no apps match search
 *  - Calls onSelect when an app is clicked
 *  - Calls onClose when X is clicked
 *  - Renders manual pick button if onManualPick is provided
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './renderWithProviders';
import { SystemAppPicker } from '../components/SystemAppPicker';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

const mockApps = [
    { name: 'Discord', exec: 'C:\\Programs\\Discord.exe', comment: 'Chat app' },
    { name: 'VLC Media Player', exec: 'C:\\Programs\\vlc.exe', comment: 'Video player' },
    { name: 'Steam', exec: 'C:\\Programs\\steam.exe' },
];

beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation(async (cmd: string) => {
        if (cmd === 'get_system_apps') return mockApps;
        if (cmd === 'get_setting') return 'pt';
        return null;
    });
});

describe('SystemAppPicker – rendering and loading', () => {
    it('fetches apps on mount and displays them', async () => {
        render(<SystemAppPicker onSelect={vi.fn()} onClose={vi.fn()} />);
        
        // Wait for apps to finish loading
        await waitFor(() => {
            expect(screen.getByText('Discord')).toBeInTheDocument();
            expect(screen.getByText('VLC Media Player')).toBeInTheDocument();
            expect(screen.getByText('Steam')).toBeInTheDocument();
        });
    });

    it('shows a loading indicator while fetching apps', async () => {
        // Delay fetch
        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'get_system_apps') {
                return new Promise(resolve => setTimeout(() => resolve(mockApps), 100));
            }
            return null;
        });

        render(<SystemAppPicker onSelect={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
        });
    });
});

describe('SystemAppPicker – search filtering', () => {
    it('filters the list based on search input (name)', async () => {
        const user = userEvent.setup();
        render(<SystemAppPicker onSelect={vi.fn()} onClose={vi.fn()} />);
        
        await waitFor(() => screen.getByText('Discord'));
        
        const searchInput = screen.getByPlaceholderText(/buscar/i);
        await user.type(searchInput, 'vlc');
        
        expect(screen.getByText('VLC Media Player')).toBeInTheDocument();
        expect(screen.queryByText('Discord')).not.toBeInTheDocument();
        expect(screen.queryByText('Steam')).not.toBeInTheDocument();
    });

    it('filters the list based on search input (exec path)', async () => {
        const user = userEvent.setup();
        render(<SystemAppPicker onSelect={vi.fn()} onClose={vi.fn()} />);
        
        await waitFor(() => screen.getByText('Discord'));
        
        const searchInput = screen.getByPlaceholderText(/buscar/i);
        await user.type(searchInput, 'steam.exe');
        
        expect(screen.getByText('Steam')).toBeInTheDocument();
        expect(screen.queryByText('Discord')).not.toBeInTheDocument();
    });

    it('shows empty state when no apps match', async () => {
        const user = userEvent.setup();
        render(<SystemAppPicker onSelect={vi.fn()} onClose={vi.fn()} />);
        
        await waitFor(() => screen.getByText('Discord'));
        
        const searchInput = screen.getByPlaceholderText(/buscar/i);
        await user.type(searchInput, 'xyz123');
        
        expect(screen.getByText(/Nenhum/i)).toBeInTheDocument();
        expect(screen.queryByText('Discord')).not.toBeInTheDocument();
    });
});

describe('SystemAppPicker – interactions', () => {
    it('calls onSelect with the correct app when clicked', async () => {
        const onSelect = vi.fn();
        const user = userEvent.setup();
        render(<SystemAppPicker onSelect={onSelect} onClose={vi.fn()} />);
        
        await waitFor(() => screen.getByText('Discord'));
        await user.click(screen.getByText('Discord'));
        
        expect(onSelect).toHaveBeenCalledWith(mockApps[0]);
    });

    it('calls onClose when the X button is clicked', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<SystemAppPicker onSelect={vi.fn()} onClose={onClose} />);
        
        // Find the X button. It's the only button in the header before the apps load
        const closeBtn = screen.getAllByRole('button')[0];
        await user.click(closeBtn);
        
        expect(onClose).toHaveBeenCalled();
    });

    it('renders and calls onManualPick when provided and clicked', async () => {
        const onManualPick = vi.fn();
        const user = userEvent.setup();
        render(<SystemAppPicker onSelect={vi.fn()} onClose={vi.fn()} onManualPick={onManualPick} />);
        
        const manualBtn = screen.getByRole('button', { name: /abrir/i });
        expect(manualBtn).toBeInTheDocument();
        
        await user.click(manualBtn);
        expect(onManualPick).toHaveBeenCalled();
    });

    it('does not render manual pick button if onManualPick is undefined', () => {
        render(<SystemAppPicker onSelect={vi.fn()} onClose={vi.fn()} />);
        expect(screen.queryByRole('button', { name: /abrir/i })).not.toBeInTheDocument();
    });
});
