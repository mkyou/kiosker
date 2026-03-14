/**
 * Tests for the Settings component (src/pages/Settings.tsx).
 *
 * Covered features:
 *  - Renders the Settings views (Browser, Autostart, Backup, Shortcuts, Language)
 *  - Toggles Autostart
 *  - Switches the browser selection and calls run_browser_migration
 *  - Prevents switching browser while migration is in progress
 *  - Calls export_database
 *  - Calls import_database
 *  - Changes language and translates elements
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './renderWithProviders';
import { Settings } from '../pages/Settings';
import { invoke } from '@tauri-apps/api/core';
import { isEnabled, enable, disable } from '@tauri-apps/plugin-autostart';

const mockInvoke = vi.mocked(invoke);
const mockIsEnabled = vi.mocked(isEnabled);
const mockEnable = vi.mocked(enable);
const mockDisable = vi.mocked(disable);


beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockInvoke.mockImplementation(async (cmd: string, args?: any) => {
        if (cmd === 'get_setting' && args?.key === 'preferred_browser') return 'firefox';
        if (cmd === 'get_setting' && args?.key === 'language') return 'pt';
        if (cmd === 'update_setting') return null;
        if (cmd === 'run_browser_migration') return null;
        if (cmd === 'export_database') return 'exported OK';
        if (cmd === 'import_database') return 'imported OK';
        return null; // fallback
    });
    mockIsEnabled.mockResolvedValue(false);
    mockEnable.mockResolvedValue(undefined);
    mockDisable.mockResolvedValue(undefined);
});

describe('Settings – rendering and initial state', () => {
    it('fetches preferred browser and autostart on mount', async () => {
        render(<Settings />);
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('get_setting', { key: 'preferred_browser' });
            expect(mockIsEnabled).toHaveBeenCalled();
        });
    });

    it('renders the browser section', () => {
        render(<Settings />);
        expect(screen.getByText(/Navegador de vídeo/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /firefox/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /chrome/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edge/i })).toBeInTheDocument();
    });

    it('renders the startup and data sections', () => {
        render(<Settings />);
        expect(screen.getByText(/Inicialização/i)).toBeInTheDocument();
        expect(screen.getByText(/Iniciar com o sistema/i)).toBeInTheDocument();
        expect(screen.getByText(/Exportar biblioteca/i)).toBeInTheDocument();
        expect(screen.getByText(/Importar snapshot/i)).toBeInTheDocument();
    });

    it('renders the shortcuts and language sections', () => {
        render(<Settings />);
        expect(screen.getByText('Guia de comandos')).toBeInTheDocument();
        expect(screen.getByText('Idioma')).toBeInTheDocument(); // translated
        expect(screen.getByRole('button', { name: /pt/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /en/i })).toBeInTheDocument();
    });
});

describe('Settings – autostart toggle', () => {
    it('calls enable() when autostart is false', async () => {
        const user = userEvent.setup();
        render(<Settings />);
        
        await waitFor(() => expect(mockIsEnabled).toHaveBeenCalled()); // Ensure initial load is done
        
        const toggleBtn = screen.getByRole('button', { name: /Iniciar com o sistema/i });
        await user.click(toggleBtn);
        
        await waitFor(() => {
            expect(mockEnable).toHaveBeenCalled();
            expect(mockDisable).not.toHaveBeenCalled();
        });
    });

    it('calls disable() when autostart is true', async () => {
        mockIsEnabled.mockResolvedValue(true);
        const user = userEvent.setup();
        render(<Settings />);
        
        await waitFor(() => expect(mockIsEnabled).toHaveBeenCalled());
        
        const toggleBtn = screen.getByRole('button', { name: /Iniciar com o sistema/i });
        await user.click(toggleBtn);
        
        await waitFor(() => {
            expect(mockDisable).toHaveBeenCalled();
            expect(mockEnable).not.toHaveBeenCalled();
        });
    });
});

describe('Settings – browser selection', () => {
    it('updates browser and runs migration if a different browser is clicked', async () => {
        const user = userEvent.setup();
        render(<Settings />);
        
        // Initial state is "firefox", click "chrome"
        await waitFor(() => screen.getByRole('button', { name: /chrome/i }));
        await user.click(screen.getByRole('button', { name: /chrome/i }));
        
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('update_setting', { key: 'preferred_browser', value: 'chrome' });
            expect(mockInvoke).toHaveBeenCalledWith('run_browser_migration', { browserType: 'chrome' });
        });
    });

    it('does nothing if the already selected browser is clicked', async () => {
        const user = userEvent.setup();
        render(<Settings />);
        
        // Initial state is "firefox", click "firefox"
        await waitFor(() => screen.getByRole('button', { name: /firefox/i }));
        await user.click(screen.getByRole('button', { name: /firefox/i }));
        
        expect(mockInvoke).not.toHaveBeenCalledWith('update_setting', expect.anything());
        expect(mockInvoke).not.toHaveBeenCalledWith('run_browser_migration', expect.anything());
    });

    it('disables browser buttons during migration', async () => {
        // Mock a slow migration
        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'run_browser_migration') {
                return new Promise(resolve => setTimeout(resolve, 100));
            }
            if (cmd === 'get_setting') return 'firefox';
            return null;
        });

        const user = userEvent.setup();
        render(<Settings />);
        
        await waitFor(() => screen.getByRole('button', { name: /chrome/i }));
        await user.click(screen.getByRole('button', { name: /chrome/i }));
        
        // Immediately, buttons should be disabled
        expect(screen.getByRole('button', { name: /chrome/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /firefox/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /edge/i })).toBeDisabled();
        
        // Wait for it to finish
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('run_browser_migration', { browserType: 'chrome' });
            expect(screen.getByRole('button', { name: /firefox/i })).not.toBeDisabled(); // back to normal
        });
    });
});

describe('Settings – export and import', () => {
    it('calls export_database and alerts the result', async () => {
        const user = userEvent.setup();
        render(<Settings />);
        
        await waitFor(() => screen.getByRole('button', { name: /Exportar/i }));
        // Note: The text in component is actually inside spans, like "Exportar biblioteca (.sqlite)"
        // Let's grab it by the exact text block
        const exportBtn = screen.getByText(/Exportar biblioteca/i).closest('button');
        
        await user.click(exportBtn!);
        
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('export_database');
            expect(screen.getByText('exported OK')).toBeInTheDocument();
        });
    });

    it('calls import_database and alerts the result', async () => {
        const user = userEvent.setup();
        render(<Settings />);
        
        await waitFor(() => screen.getByText(/Importar snapshot/i));
        const importBtn = screen.getByText(/Importar snapshot/i).closest('button');
        
        await user.click(importBtn!);
        
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('import_database');
            expect(screen.getByText('imported OK')).toBeInTheDocument();
        });
    });
});

describe('Settings – language change', () => {
    it('changes language to English on click and updates text', async () => {
        const user = userEvent.setup();
        render(<Settings />);
        
        await waitFor(() => screen.getByRole('button', { name: /en/i }));
        
        // Default language from mock is 'pt', Title should be "Navegador de vídeo"
        expect(screen.getByText(/Navegador de vídeo/i)).toBeInTheDocument();
        
        await user.click(screen.getByRole('button', { name: /en/i }));
        
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('update_setting', { key: 'language', value: 'en' });
            // English translation for the same key is typically "Video browser"
            // Let's assert the UI has updated immediately
            expect(screen.getByText(/Video browser/i)).toBeInTheDocument();
        });
    });
});
