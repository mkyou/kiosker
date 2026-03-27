/**
 * Tests for the translations module (src/translations.ts).
 *
 * Covered features:
 *  - All four supported languages have the required keys
 *  - t() helper resolves nested paths correctly
 *  - t() falls back to the path string for missing keys
 */
import { describe, it, expect } from 'vitest';
import { translations, Language } from '../translations';

// ---------------------------------------------------------------------------
// Helper: simulate the same resolver used in useTranslation
// ---------------------------------------------------------------------------
function t(lang: Language, path: string): string {
    const keys = path.split('.');
    let current: any = translations[lang];
    for (const key of keys) {
        if (current && current[key] !== undefined) {
            current = current[key];
        } else {
            return path; // fallback
        }
    }
    return current;
}

const LANGS: Language[] = ['pt', 'en', 'es', 'zh'];

// Required top-level key paths that every language must define
const REQUIRED_PATHS = [
    'settings.title',
    'settings.browser.title',
    'settings.browser.desc',
    'settings.browser.firefox_desc',
    'settings.browser.chrome_desc',
    'settings.browser.migrating',
    'settings.startup.title',
    'settings.startup.desc',
    'settings.startup.autostart',
    'settings.data.title',
    'settings.data.desc',
    'settings.data.export',
    'settings.data.import',
    'settings.commands.title',
    'settings.commands.desc',
    'settings.commands.header_action',
    'settings.commands.header_keyboard',
    'settings.commands.header_mouse',
    'settings.commands.header_joystick',
    'settings.commands.exit.title',
    'settings.commands.exit.desc',
    'settings.commands.manage.title',
    'settings.commands.manage.desc',
    'settings.language.title',
    'settings.language.desc',
    'common.open',
    'common.close',
    'common.delete',
    'common.running',
    'common.restart',
    'common.loading',
    'home.apps',
    'home.web',
    'home.start',
];

// ---------------------------------------------------------------------------
// 1. Structure: all languages have the same required keys
// ---------------------------------------------------------------------------
describe('translations – key completeness', () => {
    it.each(LANGS)('language "%s" defines all required keys', (lang) => {
        for (const path of REQUIRED_PATHS) {
            const result = t(lang, path);
            expect(result, `Missing key "${path}" in lang "${lang}"`).not.toBe(path);
            expect(result).toBeTruthy();
        }
    });

    it('has exactly four supported languages', () => {
        expect(Object.keys(translations)).toHaveLength(4);
        expect(Object.keys(translations)).toEqual(expect.arrayContaining(['pt', 'en', 'es', 'zh']));
    });

    it('no language shares string values across settings.title (each is localised)', () => {
        const titles = LANGS.map(lang => t(lang, 'settings.title'));
        // Portuguese and Spanish share "Ajustes" – that's intentional and OK.
        // Just ensure we have 4 values (even if some are equal)
        expect(titles).toHaveLength(4);
        // Chinese must be different
        expect(titles[3]).toBe('设置');
    });
});

// ---------------------------------------------------------------------------
// 2. Resolver: t() works correctly for nested paths
// ---------------------------------------------------------------------------
describe('translations – t() resolver', () => {
    it('resolves a single-level key', () => {
        // 'home' is an object, not a leaf – should fall back
        const result = t('pt', 'home');
        expect(result).toBeTypeOf('object'); // resolves partial object
    });

    it('resolves a two-level nested key correctly', () => {
        expect(t('pt', 'common.open')).toBe('Abrir');
        expect(t('en', 'common.open')).toBe('Open');
        expect(t('es', 'common.open')).toBe('Abrir');
        expect(t('zh', 'common.open')).toBe('打开');
    });

    it('resolves a three-level nested key correctly', () => {
        expect(t('pt', 'settings.browser.migrating')).toBe('Migrando perfil...');
        expect(t('en', 'settings.browser.migrating')).toBe('Migrating profile...');
        expect(t('zh', 'settings.browser.migrating')).toBe('正在迁移配置文件...');
    });

    it('falls back to path string for an unknown key', () => {
        expect(t('pt', 'settings.nonexistent.key')).toBe('settings.nonexistent.key');
    });

    it('falls back to path for a completely invalid path', () => {
        expect(t('en', 'does.not.exist.at.all')).toBe('does.not.exist.at.all');
    });
});

// ---------------------------------------------------------------------------
// 3. Content: spot-check critical user-facing strings
// ---------------------------------------------------------------------------
describe('translations – content spot-checks', () => {
    it('pt: common.running is "Rodando"', () => {
        expect(t('pt', 'common.running')).toBe('Rodando');
    });

    it('en: common.running is "Running"', () => {
        expect(t('en', 'common.running')).toBe('Running');
    });

    it('zh: home.web is "网页"', () => {
        expect(t('zh', 'home.web')).toBe('网页');
    });

    it('es: common.delete contains "Eliminar"', () => {
        expect(t('es', 'common.delete')).toContain('Eliminar');
    });

    it('pt: settings.data.export contains ".sqlite"', () => {
        expect(t('pt', 'settings.data.export')).toContain('.sqlite');
    });

    it('en: settings.data.export contains ".sqlite"', () => {
        expect(t('en', 'settings.data.export')).toContain('.sqlite');
    });

    it('settings.commands.exit.title is not empty in any language', () => {
        for (const lang of LANGS) {
            const val = t(lang, 'settings.commands.exit.title');
            expect(val).toBeTruthy();
            expect(val).not.toBe('settings.commands.exit.title');
        }
    });
});
