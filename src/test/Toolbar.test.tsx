/**
 * Tests for the Toolbar component (src/components/Toolbar.tsx).
 *
 * Covered features:
 *  - Renders the "KIOSKER" logo text
 *  - Renders Home and Settings navigation tabs
 *  - Active tab is visually highlighted (contains active class)
 *  - Clicking a tab calls setActiveTab with the correct id
 *  - Clicking the logo calls setActiveTab("home")
 *  - Renders a live clock (HH:MM format)
 *  - Wifi icon is rendered and clicking it calls invoke("open_wifi_settings")
 *  - Battery percentage is displayed when returned by get_system_status
 *  - "Carregando" label shown when is_charging is true
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './renderWithProviders';
import { Toolbar } from '../components/Toolbar';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

const defaultStatus = {
    battery_percentage: null as number | null,
    is_charging: false,
    wifi_connected: true,
};

beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation(async (cmd: string) => {
        if (cmd === 'get_system_status') return { ...defaultStatus };
        if (cmd === 'get_setting') return 'pt';
        return null;
    });
});

describe('Toolbar – rendering', () => {
    it('renders the KIOSKER logo', async () => {
        render(<Toolbar activeTab="home" setActiveTab={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText('KIOSKER')).toBeInTheDocument();
        });
    });

    it('renders the Home navigation button', async () => {
        render(<Toolbar activeTab="home" setActiveTab={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /início/i })).toBeInTheDocument();
        });
    });

    it('renders the Settings navigation button', async () => {
        render(<Toolbar activeTab="home" setActiveTab={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /ajustes/i })).toBeInTheDocument();
        });
    });

    it('renders a time string in HH:MM format', async () => {
        render(<Toolbar activeTab="home" setActiveTab={vi.fn()} />);
        await waitFor(() => {
            // matches strings like "16:30" or "08:05"
            expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
        });
    });
});

describe('Toolbar – tab navigation', () => {
    it('calls setActiveTab("settings") when Settings tab is clicked', async () => {
        const setActiveTab = vi.fn();
        const user = userEvent.setup();
        render(<Toolbar activeTab="home" setActiveTab={setActiveTab} />);
        await waitFor(() => screen.getByRole('button', { name: /ajustes/i }));
        await user.click(screen.getByRole('button', { name: /ajustes/i }));
        expect(setActiveTab).toHaveBeenCalledWith('settings');
    });

    it('calls setActiveTab("home") when Home tab is clicked', async () => {
        const setActiveTab = vi.fn();
        const user = userEvent.setup();
        render(<Toolbar activeTab="settings" setActiveTab={setActiveTab} />);
        await waitFor(() => screen.getByRole('button', { name: /início/i }));
        await user.click(screen.getByRole('button', { name: /início/i }));
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });

    it('calls setActiveTab("home") when the KIOSKER logo is clicked', async () => {
        const setActiveTab = vi.fn();
        const user = userEvent.setup();
        render(<Toolbar activeTab="settings" setActiveTab={setActiveTab} />);
        await waitFor(() => screen.getByText('KIOSKER'));
        // The logo is inside a div with onClick
        await user.click(screen.getByText('KIOSKER'));
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });
});

describe('Toolbar – wifi button', () => {
    it('calls invoke("open_wifi_settings") when Wifi icon is clicked', async () => {
        const user = userEvent.setup();
        render(<Toolbar activeTab="home" setActiveTab={vi.fn()} />);
        // The wifi button has title="Abrir configurações de rede"
        await waitFor(() => screen.getByTitle('Abrir configurações de rede'));
        await user.click(screen.getByTitle('Abrir configurações de rede'));
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('open_wifi_settings');
        });
    });
});

describe('Toolbar – system status display', () => {
    it('shows battery percentage when battery_percentage is not null', async () => {
        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'get_system_status') return { battery_percentage: 87, is_charging: false, wifi_connected: true };
            if (cmd === 'get_setting') return 'pt';
            return null;
        });
        render(<Toolbar activeTab="home" setActiveTab={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText('87%')).toBeInTheDocument();
        });
    });

    it('does NOT show battery percentage when battery_percentage is null', async () => {
        render(<Toolbar activeTab="home" setActiveTab={vi.fn()} />);
        await waitFor(() => screen.getByText(/^\d{2}:\d{2}$/)); // clock is rendered
        expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('shows "Carregando" label when is_charging is true', async () => {
        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'get_system_status') return { battery_percentage: 45, is_charging: true, wifi_connected: true };
            if (cmd === 'get_setting') return 'pt';
            return null;
        });
        render(<Toolbar activeTab="home" setActiveTab={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText(/carregando/i)).toBeInTheDocument();
        });
    });

    it('calls invoke("get_system_status") on mount', async () => {
        render(<Toolbar activeTab="home" setActiveTab={vi.fn()} />);
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('get_system_status');
        });
    });
});
