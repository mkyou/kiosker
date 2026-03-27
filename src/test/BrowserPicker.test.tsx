/**
 * Tests for the BrowserPicker component (src/components/BrowserPicker.tsx).
 *
 * Covered features:
 *  - Renders correctly (title, description, Firefox and Chrome buttons)
 *  - Buttons are disabled when loading is true
 *  - Clicking Firefox calls update_setting, run_browser_migration, and onComplete
 *  - Clicking Chrome calls update_setting, run_browser_migration, and onComplete
 *  - Displays loading state during migration
 *  - Displays error state if migration fails
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './renderWithProviders';
import { BrowserPicker } from '../components/BrowserPicker';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockImplementation(async (cmd: string) => {
        if (cmd === 'get_setting') return 'pt';
        if (cmd === 'update_setting') return null;
        if (cmd === 'run_browser_migration') return null;
        return null;
    });
});

describe('BrowserPicker – rendering', () => {
    it('renders the main title and description', () => {
        render(<BrowserPicker onComplete={vi.fn()} />);
        expect(screen.getByText('Prepare sua experiência')).toBeInTheDocument();
        expect(screen.getByText(/Escolha seu navegador principal/i)).toBeInTheDocument();
    });

    it('renders the Firefox button', () => {
        render(<BrowserPicker onComplete={vi.fn()} />);
        expect(screen.getByRole('button', { name: /firefox/i })).toBeInTheDocument();
    });

    it('renders the Chrome button', () => {
        render(<BrowserPicker onComplete={vi.fn()} />);
        expect(screen.getByRole('button', { name: /chromium/i })).toBeInTheDocument();
    });
});

describe('BrowserPicker – selection & loading', () => {
    it('calls update_setting and run_browser_migration when Firefox is selected', async () => {
        const onComplete = vi.fn();
        const user = userEvent.setup();
        render(<BrowserPicker onComplete={onComplete} />);
        
        await user.click(screen.getByRole('button', { name: /firefox/i }));
        
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('update_setting', { key: 'preferred_browser', value: 'firefox' });
            expect(mockInvoke).toHaveBeenCalledWith('run_browser_migration', { browserType: 'firefox' });
            expect(onComplete).toHaveBeenCalledWith('firefox');
        });
    });

    it('calls update_setting and run_browser_migration when Chrome is selected', async () => {
        const onComplete = vi.fn();
        const user = userEvent.setup();
        render(<BrowserPicker onComplete={onComplete} />);
        
        await user.click(screen.getByRole('button', { name: /chromium/i }));
        
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('update_setting', { key: 'preferred_browser', value: 'chrome' });
            expect(mockInvoke).toHaveBeenCalledWith('run_browser_migration', { browserType: 'chrome' });
            expect(onComplete).toHaveBeenCalledWith('chrome');
        });
    });

    it('shows loading indicator and disables buttons during migration', async () => {
        // Delay migration so we can assert loading state
        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'run_browser_migration') {
                return new Promise(resolve => setTimeout(resolve, 100));
            }
            if (cmd === 'get_setting') return 'pt';
            return null;
        });

        const user = userEvent.setup();
        render(<BrowserPicker onComplete={vi.fn()} />);
        
        await user.click(screen.getByRole('button', { name: /firefox/i }));
        
        // Assert state while waiting
        expect(screen.getByRole('button', { name: /firefox/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /chromium/i })).toBeDisabled();
        expect(screen.getByText(/migrando/i)).toBeInTheDocument();
        
        // Wait for it to finish gracefully
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('run_browser_migration', expect.anything());
        });
    });
});

describe('BrowserPicker – error handling', () => {
    it('displays error message if migration fails', async () => {
        const onComplete = vi.fn();
        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'run_browser_migration') throw new Error('Simulated failure');
            if (cmd === 'get_setting') return 'pt';
            return null;
        });

        const user = userEvent.setup();
        render(<BrowserPicker onComplete={onComplete} />);
        
        await user.click(screen.getByRole('button', { name: /firefox/i }));
        
        await waitFor(() => {
            expect(screen.getByText(/erro ao configurar o navegador/i)).toBeInTheDocument();
        });
        expect(onComplete).not.toHaveBeenCalled();
        
        // Buttons should be re-enabled
        expect(screen.getByRole('button', { name: /firefox/i })).not.toBeDisabled();
        expect(screen.getByRole('button', { name: /chromium/i })).not.toBeDisabled();
    });
});
