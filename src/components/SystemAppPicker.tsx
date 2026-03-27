import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Search, X, Monitor, Loader2, Cpu, FileSearch } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

interface SystemApp {
    name: string;
    exec: string;
    icon?: string;
    comment?: string;
}

interface SystemAppPickerProps {
    onSelect: (app: SystemApp) => void;
    onClose: () => void;
    onManualPick?: () => void;
}

export function SystemAppPicker({ onSelect, onClose, onManualPick }: SystemAppPickerProps) {
    const { t } = useTranslation();
    const [apps, setApps] = useState<SystemApp[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApps = async () => {
            try {
                const result = await invoke<SystemApp[]>("get_system_apps");
                setApps(result);
            } catch (e) {
                console.error("Failed to load system apps:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchApps();
    }, []);

    const filteredApps = apps.filter(app => 
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.exec.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 bg-dracula-bg/60 backdrop-blur-[12px] animate-fade-in">
            <div className="relative w-full max-w-4xl apple-glass squircle-lg border-white/10 flex flex-col max-h-[90vh] overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.6)]">
                <header className="p-12 border-b border-white/5 flex flex-col gap-8 bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-dracula-cyan/10 text-dracula-cyan rounded-xl">
                                <Cpu className="w-6 h-6" />
                            </div>
                            <div>
                                    <h2 className="text-3xl font-display font-black text-dracula-fg tracking-tighter">{t('home.apps')}</h2>
                                    <p className="text-dracula-fg/30 text-sm font-sans">{t('home.apps_desc')}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-3 text-dracula-fg/30 hover:text-dracula-fg hover:bg-white/5 rounded-full transition-all active:scale-95"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="relative group/search">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-dracula-fg/20 group-focus-within/search:text-dracula-purple transition-colors" size={22} />
                        <input
                            autoFocus
                            type="text"
                            placeholder={t('home.search_placeholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-dracula-bg/40 border-2 border-white/5 focus:border-dracula-purple/30 squircle-md py-5 pl-16 pr-6 text-dracula-fg text-xl placeholder-dracula-fg/10 focus:outline-none transition-all font-sans"
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-96 text-dracula-fg/20 gap-6">
                            <Loader2 className="animate-spin text-dracula-purple" size={48} />
                            <p className="font-black uppercase tracking-[0.3em] text-xs">{t('common.loading')}</p>
                        </div>
                    ) : filteredApps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-96 text-dracula-fg/10">
                            <p className="text-2xl font-display font-black italic">Nenhum aplicativo encontrado.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredApps.map((app, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onSelect(app)}
                                    className="flex items-center gap-6 p-6 squircle-md apple-glass border-transparent hover:border-dracula-purple/30 hover:bg-dracula-purple/5 transition-all text-left group focus-ring outline-none"
                                >
                                    <div className="w-16 h-16 squircle-md bg-white/5 flex items-center justify-center text-dracula-fg/20 group-hover:text-dracula-purple group-hover:bg-dracula-purple/10 transition-all flex-shrink-0 group-hover:scale-110">
                                        <Monitor size={32} />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-dracula-fg text-xl font-black tracking-tight truncate group-hover:text-dracula-purple transition-colors">{app.name}</span>
                                        {app.comment && (
                                            <span className="text-xs text-dracula-fg/30 truncate leading-tight mt-1 font-sans">{app.comment}</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="p-8 border-t border-white/5 bg-dracula-bg/40 flex flex-col items-center gap-6">
                    {onManualPick && (
                        <button 
                            onClick={onManualPick}
                            className="flex items-center gap-3 px-8 py-4 bg-dracula-purple/10 hover:bg-dracula-purple/20 border border-dracula-purple/30 rounded-full text-dracula-purple text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg group"
                        >
                            <FileSearch size={18} className="group-hover:scale-110 transition-transform" />
                            {t('common.open')} (.exe)
                        </button>
                    )}
                    <p className="text-[10px] text-dracula-fg/10 font-black uppercase tracking-[0.4em] leading-relaxed text-center">
                        Os ícones serão extraídos automaticamente <br/> após a seleção do item.
                    </p>
                </footer>
            </div>
        </div>
    );
}
