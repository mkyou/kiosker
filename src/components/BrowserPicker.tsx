import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Chrome, Flame, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

interface BrowserPickerProps {
    onComplete: (browser: string) => void;
}

export function BrowserPicker({ onComplete }: BrowserPickerProps) {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSelect = async (browser: string) => {
        setSelected(browser);
        setLoading(true);
        setError(null);

        try {
            await invoke("update_setting", { key: "preferred_browser", value: browser });
            await invoke("run_browser_migration", { browserType: browser });
            onComplete(browser);
        } catch (e: any) {
            console.error("Migration failed:", e);
            setError(t('settings.browser.error') || "Ocorreu um erro ao configurar o navegador. Tente novamente.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-dracula-bg/60 backdrop-blur-[80px] animate-fade-in px-6">
            <div className="max-w-3xl w-full p-12 apple-glass squircle-lg relative overflow-hidden flex flex-col items-center">
                {/* Decorative background element */}
                <div className="absolute -top-20 -right-20 p-8 opacity-[0.03] pointer-events-none rotate-12">
                    <Flame size={400} />
                </div>

                <header className="mb-14 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-dracula-purple/10 border border-dracula-purple/20 text-dracula-purple text-[10px] font-black uppercase tracking-[0.3em] mb-6">
                        Welcome to Kiosker
                    </div>
                    <h1 className="text-5xl font-display font-black text-dracula-fg mb-4 tracking-tighter">Prepare sua experiência</h1>
                    <p className="text-dracula-fg/40 text-xl max-w-lg mx-auto font-sans leading-relaxed">
                        Escolha seu navegador principal para que possamos importar seus logins e configurações de streaming.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full relative z-10">
                    <button
                        onClick={() => handleSelect("firefox")}
                        disabled={loading}
                        className={`group relative flex flex-col items-center p-10 squircle-lg border transition-all duration-700 outline-none focus-ring ${
                            selected === "firefox" 
                            ? "bg-dracula-purple/10 border-dracula-purple shadow-[0_0_40px_rgba(189,147,249,0.2)]" 
                            : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                    >
                        <div className={`p-6 squircle-md mb-6 transition-all duration-500 scale-100 group-hover:scale-110 ${selected === "firefox" ? "bg-dracula-purple/20" : "bg-white/5"}`}>
                            <Flame className={`w-14 h-14 ${selected === "firefox" ? "text-dracula-purple" : "text-dracula-fg/20"}`} />
                        </div>
                        <h3 className="text-2xl font-black text-dracula-fg mb-3 tracking-tight">Firefox</h3>
                        <p className="text-sm text-center text-dracula-fg/30 mb-6 font-sans leading-relaxed">
                            {t('settings.browser.firefox_desc')}
                        </p>
                        <div className="mt-auto px-5 py-2 rounded-full bg-dracula-purple/10 text-dracula-purple text-[10px] font-black uppercase tracking-widest border border-dracula-purple/20">
                            Recomendado
                        </div>
                    </button>

                    <button
                        onClick={() => handleSelect("chrome")}
                        disabled={loading}
                        className={`group relative flex flex-col items-center p-10 squircle-lg border transition-all duration-700 outline-none focus-ring ${
                            selected === "chrome" 
                            ? "bg-dracula-cyan/10 border-dracula-cyan shadow-[0_0_40px_rgba(139,233,253,0.2)]" 
                            : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                    >
                        <div className={`p-6 squircle-md mb-6 transition-all duration-500 scale-100 group-hover:scale-110 ${selected === "chrome" ? "bg-dracula-cyan/20" : "bg-white/5"}`}>
                            <Chrome className={`w-14 h-14 ${selected === "chrome" ? "text-dracula-cyan" : "text-dracula-fg/20"}`} />
                        </div>
                        <h3 className="text-2xl font-black text-dracula-fg mb-3 tracking-tight">Chromium</h3>
                        <p className="text-sm text-center text-dracula-fg/30 mb-6 font-sans leading-relaxed">
                            {t('settings.browser.chrome_desc')}
                        </p>
                    </button>
                </div>

                {loading && (
                    <div className="mt-14 flex flex-col items-center animate-fade-in">
                        <Loader2 className="w-10 h-10 text-dracula-purple animate-spin mb-4" />
                        <p className="text-dracula-fg/40 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">
                            {t('settings.browser.migrating')}
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mt-10 p-5 bg-dracula-red/10 border border-dracula-red/20 rounded-2xl flex items-center gap-4 text-dracula-red text-sm font-bold">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <footer className="mt-16 pt-10 border-t border-white/5 w-full text-center">
                    <p className="text-dracula-fg/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3">
                        <CheckCircle2 size={16} className="text-dracula-green/50" /> 
                        Your data stays local and secure
                    </p>
                </footer>
            </div>
        </div>
    );
}
