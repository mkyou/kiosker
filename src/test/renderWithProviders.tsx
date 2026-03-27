/**
 * Custom render wrapper that wraps components inside TranslationProvider
 * so that any component using useTranslation() works in tests.
 */
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { TranslationProvider } from '../hooks/useTranslation';

const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TranslationProvider>{children}</TranslationProvider>
);

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
    render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
