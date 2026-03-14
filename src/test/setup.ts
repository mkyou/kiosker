/**
 * Global test setup for Vitest + React Testing Library.
 * Runs before every test file.
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @tauri-apps/api/core – the invoke() bridge to the Rust backend.
// Tests run in jsdom and cannot call native Tauri commands, so we replace the
// entire module with a controllable vi.fn() that returns a resolved Promise.
// Individual test files can override this with vi.mocked(invoke).mockResolvedValue(...)
// ---------------------------------------------------------------------------
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue(null),
}));

// Mock Tauri autostart plugin
vi.mock('@tauri-apps/plugin-autostart', () => ({
    isEnabled: vi.fn().mockResolvedValue(false),
    enable:    vi.fn().mockResolvedValue(undefined),
    disable:   vi.fn().mockResolvedValue(undefined),
}));

// Mock Tauri dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn().mockResolvedValue(null),
}));

// Mock framer-motion to avoid JSDOM animation issues
vi.mock('framer-motion', async (importOriginal) => {
    const actual = await importOriginal<typeof import('framer-motion')>();
    return {
        ...actual,
        motion: {
            ...actual.motion,
            // Render motion.button as a plain <button>
            button: ({ children, ...props }: React.ComponentProps<'button'>) =>
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require('react').createElement('button', props, children),
            div: ({ children, ...props }: React.ComponentProps<'div'>) =>
                require('react').createElement('div', props, children),
        },
        AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    };
});

// Silence known Tauri-specific console errors in tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
    if (
        typeof args[0] === 'string' &&
        (args[0].includes('Tauri') || args[0].includes('invoke'))
    ) return;
    originalConsoleError(...args);
};
