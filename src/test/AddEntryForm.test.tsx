/**
 * Tests for AddEntryForm component (src/components/AddEntryForm.tsx).
 *
 * Covered features:
 *  - Renders correctly (URL textarea, submit button)
 *  - Submit button is disabled when textarea is empty
 *  - Auto-prefixes URLs without protocol with https://
 *  - Calls invoke('check_links_health') and invoke('add_item') on submit
 *  - Shows failed URLs when health check returns fewer URLs than submitted
 *  - "Adicionar mesmo assim" force-adds a failed URL
 *  - Ctrl+Enter shortcut triggers submission
 *  - Closes form when X button is clicked
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from './renderWithProviders';
import { AddEntryForm } from '../components/AddEntryForm';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
    vi.clearAllMocks();
    // Default: health check passes all URLs, fetch_site_metadata returns empty, add_item succeeds
    mockInvoke.mockImplementation(async (cmd: string, args?: any) => {
        if (cmd === 'check_links_health') return (args as any).urls as string[];
        if (cmd === 'fetch_site_metadata') return { title: 'Test Site', icon_url: null, description: null };
        if (cmd === 'add_item') return null;
        if (cmd === 'get_setting') return 'pt';
        return null;
    });
});

describe('AddEntryForm – rendering', () => {
    it('renders the URL textarea', () => {
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        const textarea = screen.getByRole('textbox');
        expect(textarea).toBeInTheDocument();
    });

    it('renders the submit button', () => {
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        const btn = screen.getByRole('button', { name: /confirmar/i });
        expect(btn).toBeInTheDocument();
    });

    it('renders the close (X) button', () => {
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        // The X button has no text, but its aria area contains an SVG; query by its parent via test hint
        const buttons = screen.getAllByRole('button');
        // Close button is the first button rendered (top-right X)
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
});

describe('AddEntryForm – submit button disabled state', () => {
    it('is disabled when textarea is empty', () => {
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        const btn = screen.getByRole('button', { name: /confirmar/i });
        expect(btn).toBeDisabled();
    });

    it('becomes enabled after typing a URL', async () => {
        const user = userEvent.setup();
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        const textarea = screen.getByRole('textbox');
        await user.type(textarea, 'https://netflix.com');
        const btn = screen.getByRole('button', { name: /confirmar/i });
        expect(btn).not.toBeDisabled();
    });

    it('is disabled again when textarea is cleared', async () => {
        const user = userEvent.setup();
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        const textarea = screen.getByRole('textbox');
        await user.type(textarea, 'https://x.com');
        await user.clear(textarea);
        const btn = screen.getByRole('button', { name: /confirmar/i });
        expect(btn).toBeDisabled();
    });
});

describe('AddEntryForm – URL auto-prefixing (protocol injection)', () => {
    it('calls check_links_health with https:// prefix when URL has no protocol', async () => {
        const user = userEvent.setup();
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        await user.type(screen.getByRole('textbox'), 'youtube.com');
        await user.click(screen.getAllByRole('button', { name: /confirmar/i })[0]);
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('check_links_health', {
                urls: ['https://youtube.com'],
            });
        });
    });

    it('does NOT double-prefix a URL that already has https://', async () => {
        const user = userEvent.setup();
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        await user.type(screen.getByRole('textbox'), 'https://youtube.com');
        await user.click(screen.getAllByRole('button', { name: /confirmar/i })[0]);
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('check_links_health', {
                urls: ['https://youtube.com'],
            });
        });
    });

    it('does NOT double-prefix a URL that already has http://', async () => {
        const user = userEvent.setup();
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        await user.type(screen.getByRole('textbox'), 'http://local.dev');
        await user.click(screen.getAllByRole('button', { name: /confirmar/i })[0]);
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('check_links_health', {
                urls: ['http://local.dev'],
            });
        });
    });
});

describe('AddEntryForm – multiple URLs at once', () => {
    it('splits textarea by newline and processes each line', async () => {
        const user = userEvent.setup();
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        // userEvent.type doesn't support {Enter} for newlines in textarea, use fireEvent instead
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'https://netflix.com\nhttps://youtube.com' } });
        await user.click(screen.getAllByRole('button', { name: /confirmar/i })[0]);
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('check_links_health', {
                urls: ['https://netflix.com', 'https://youtube.com'],
            });
        });
    });

    it('ignores blank/empty lines in the textarea', async () => {
        const user = userEvent.setup();
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'https://a.com\n\n  \nhttps://b.com' } });
        await user.click(screen.getByRole('button', { name: /confirmar/i }));
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('check_links_health', {
                urls: ['https://a.com', 'https://b.com'],
            });
        });
    });
});

describe('AddEntryForm – failed URL handling', () => {
    it('shows failed URLs when health check returns fewer URLs than submitted', async () => {
        // health check returns only the first URL (second fails)
        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'check_links_health') return ['https://netflix.com'];
            if (cmd === 'fetch_site_metadata') return { title: null, icon_url: null, description: null };
            if (cmd === 'add_item') return null;
            if (cmd === 'get_setting') return 'pt';
            return null;
        });
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'https://netflix.com\nhttps://broken-site-xyz.com' } });
        await userEvent.setup().click(screen.getAllByRole('button', { name: /confirmar/i })[0]);
        await waitFor(() => {
            expect(screen.getByText('https://broken-site-xyz.com')).toBeInTheDocument();
            expect(screen.getAllByRole('button', { name: /confirmar/i }).length).toBeGreaterThan(0);
        });
    });

    it('calls onRefresh immediately when at least one URL is healthy, even if others fail', async () => {
        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'check_links_health') return ['https://netflix.com'];
            if (cmd === 'fetch_site_metadata') return { title: null, icon_url: null, description: null };
            if (cmd === 'add_item') return null;
            if (cmd === 'get_setting') return 'pt';
            return null;
        });
        const onRefresh = vi.fn();
        render(<AddEntryForm onClose={vi.fn()} onRefresh={onRefresh} />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'https://netflix.com\nhttps://broken-site-xyz.com' } });
        await userEvent.setup().click(screen.getAllByRole('button', { name: /confirmar/i })[0]);
        await waitFor(() => {
            expect(onRefresh).toHaveBeenCalledTimes(1);
            expect(screen.getByText('https://broken-site-xyz.com')).toBeInTheDocument();
        });
    });

    it('calls add_item with force-add URL when "Adicionar mesmo assim" is clicked', async () => {
        mockInvoke.mockImplementation(async (cmd: string) => {
            if (cmd === 'check_links_health') return []; // all fail
            if (cmd === 'fetch_site_metadata') return { title: null, icon_url: null, description: null };
            if (cmd === 'add_item') return null;
            if (cmd === 'get_setting') return 'pt';
            return null;
        });
        const onClose = vi.fn();
        const onRefresh = vi.fn();
        const user = userEvent.setup();
        render(<AddEntryForm onClose={onClose} onRefresh={onRefresh} />);
        
        const textarea = screen.getByRole('textbox');
        await user.type(textarea, 'https://example.com');
        
        // Submit first time
        const initialBtn = screen.getByRole('button', { name: /confirmar/i });
        await user.click(initialBtn);
        
        // Wait for failed URL list to appear
        await waitFor(() => {
            expect(screen.getByText('https://example.com')).toBeInTheDocument();
        });
        
        // Now there should be the "Force Add" button. 
        // We find the one that is inside the list item.
        const forceAddBtn = screen.getAllByRole('button', { name: /confirmar/i })[0];
        await user.click(forceAddBtn);
        
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('add_item', expect.objectContaining({
                targetPath: 'https://example.com',
                itemType: 'web',
            }));
        });
    });
});

describe('AddEntryForm – Ctrl+Enter shortcut', () => {
    it('submits the form when Ctrl+Enter is pressed in the textarea', async () => {
        render(<AddEntryForm onClose={vi.fn()} onRefresh={vi.fn()} />);
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'https://twitch.tv' } });
        fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('check_links_health', expect.any(Object));
        });
    });
});

describe('AddEntryForm – close button', () => {
    it('calls onClose when the X button is clicked', async () => {
        const onClose = vi.fn();
        render(<AddEntryForm onClose={onClose} onRefresh={vi.fn()} />);
        // The X button is the first button in the component
        const closeBtn = screen.getAllByRole('button')[0];
        await userEvent.setup().click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
