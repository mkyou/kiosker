import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { translations, Language } from '../translations';

interface TranslationContextType {
    language: Language;
    setLanguage: (lang: Language) => Promise<void>;
    t: (path: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLangState] = useState<Language>('pt');

    useEffect(() => {
        const loadLang = async () => {
            try {
                const savedLang = await invoke<string>("get_setting", { key: "language" });
                if (savedLang && (['pt', 'en', 'es', 'zh'].includes(savedLang))) {
                    setLangState(savedLang as Language);
                }
            } catch (e) {
                console.error("Failed to load language setting", e);
            }
        };
        loadLang();
    }, []);

    const setLanguage = async (newLang: Language) => {
        setLangState(newLang);
        try {
            await invoke("update_setting", { key: "language", value: newLang });
        } catch (e) {
            console.error("Failed to save language setting", e);
        }
    };

    const t = (path: string): string => {
        const keys = path.split('.');
        let current: any = translations[language];
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return path; // Fallback to path string
            }
        }
        return typeof current === 'string' ? current : path;
    };

    return (
        <TranslationContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) throw new Error("useTranslation must be used within a TranslationProvider");
    return context;
};
