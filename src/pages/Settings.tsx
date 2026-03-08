import { useState, useEffect } from "react";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import { invoke } from "@tauri-apps/api/core";
import { Flame, Chrome, Loader2, Check, Download, Upload, Monitor, Command } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import { Language } from "../translations";

export function Settings() {
    const { t, language: currentLang, setLanguage } = useTranslation();
    const [autoStart, setAutoStart] = useState(false);
    const [preferredBrowser, setPreferredBrowser] = useState<string | null>(null);
    const [migrating, setMigrating] = useState(false);

    useEffect(() => {
        isEnabled().then(setAutoStart).catch(console.error);
        invoke<string | null>("get_setting", { key: "preferred_browser" })
            .then(setPreferredBrowser)
            .catch(console.error);
    }, []);

    const toggleAutoStart = async () => {
        try {
            if (autoStart) {
                await disable();
                setAutoStart(false);
            } else {
                await enable();
                setAutoStart(true);
            }
        } catch (e) {
            console.error("Failed to toggle autostart", e);
        }
    };

    const handleBrowserChange = async (browser: string) => {
        if (browser === preferredBrowser || migrating) return;
        setMigrating(true);
        try {
            await invoke("update_setting", { key: "preferred_browser", value: browser });
            await invoke("run_browser_migration", { browserType: browser });
            setPreferredBrowser(browser);
        } catch (e) {
            console.error("Browser change failed:", e);
        } finally {
            setMigrating(false);
        }
    };

    const handleExport = async () => {
        try {
            const result = await invoke<string>("export_database");
            alert(result);
        } catch (e) {
            console.error("Export failed:", e);
        }
    };

    const handleImport = async () => {
        try {
            const result = await invoke<string>("import_database");
            alert(result);
        } catch (e) {
            console.error("Import failed:", e);
        }
    };

    return (
        <div className="flex flex-col w-full h-full p-8 md:p-12 overflow-y-auto animate-fade-in-up [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* The Toolbar already indicates we are in Settings, so we skip the redundant header */}
            <div className="pt-4 w-full max-w-[1700px] grid grid-cols-1 xl:grid-cols-2 gap-8 pb-32">
                {/* Browser Selection */}
                <div className="apple-glass p-8 squircle-lg flex flex-col h-full relative overflow-hidden">
                    <div className="mb-10">
                        <div className="flex items-center gap-4 mb-4">
                            <Monitor className="text-dracula-cyan w-6 h-6" />
                            <h3 className="text-3xl font-display font-black">{t('settings.browser.title')}</h3>
                        </div>
                        <p className="text-dracula-fg/40 text-base leading-relaxed font-sans max-w-xl">
                            {t('settings.browser.desc')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-6 mt-auto">
                        <button
                            disabled={migrating}
                            onClick={() => handleBrowserChange("firefox")}
                            className={`flex flex-col gap-8 p-8 squircle-lg border transition-all relative overflow-hidden group/btn ${
                                preferredBrowser === "firefox"
                                    ? "bg-dracula-purple/10 border-dracula-purple/50 text-dracula-purple neon-glow-purple"
                                    : "bg-white/5 border-white/5 text-dracula-fg/30 hover:border-white/10 hover:bg-white/[0.08]"
                            }`}
                        >
                            <div className="flex justify-between items-start w-full">
                                <div className={`p-4 squircle-md ${preferredBrowser === "firefox" ? "bg-dracula-purple/20" : "bg-white/5"}`}>
                                    <Flame size={32} />
                                </div>
                                {preferredBrowser === "firefox" && !migrating && <Check size={28} className="text-dracula-green" />}
                                {preferredBrowser === "firefox" && migrating && <Loader2 size={28} className="animate-spin text-dracula-purple" />}
                            </div>
                            <div className="text-left">
                                <span className="font-black text-3xl block mb-1 tracking-tight">Firefox</span>
                                <span className="text-sm opacity-50 font-sans font-medium uppercase tracking-widest">{t('settings.browser.firefox_desc')}</span>
                            </div>
                        </button>

                        <button
                            disabled={migrating}
                            onClick={() => handleBrowserChange("chrome")}
                            className={`flex flex-col gap-8 p-8 squircle-lg border transition-all relative overflow-hidden group/btn ${
                                preferredBrowser === "chrome"
                                    ? "bg-dracula-cyan/10 border-dracula-cyan/50 text-dracula-cyan shadow-[0_0_30px_rgba(139,233,253,0.3)]"
                                    : "bg-white/5 border-white/5 text-dracula-fg/30 hover:border-white/10 hover:bg-white/[0.08]"
                            }`}
                        >
                            <div className="flex justify-between items-start w-full">
                                <div className={`p-4 squircle-md ${preferredBrowser === "chrome" ? "bg-dracula-cyan/20" : "bg-white/5"}`}>
                                    <Chrome size={32} />
                                </div>
                                {preferredBrowser === "chrome" && !migrating && <Check size={28} className="text-dracula-green" />}
                                {preferredBrowser === "chrome" && migrating && <Loader2 size={28} className="animate-spin text-dracula-cyan" />}
                            </div>
                            <div className="text-left">
                                <span className="font-black text-3xl block mb-1 tracking-tight">Chrome</span>
                                <span className="text-sm opacity-50 font-sans font-medium uppercase tracking-widest">{t('settings.browser.chrome_desc')}</span>
                            </div>
                        </button>

                        <button
                            disabled={migrating}
                            onClick={() => handleBrowserChange("edge")}
                            className={`flex flex-col gap-8 p-8 squircle-lg border transition-all relative overflow-hidden group/btn ${
                                preferredBrowser === "edge"
                                    ? "bg-dracula-green/10 border-dracula-green/50 text-dracula-green shadow-[0_0_30px_rgba(80,250,123,0.3)]"
                                    : "bg-white/5 border-white/5 text-dracula-fg/30 hover:border-white/10 hover:bg-white/[0.08]"
                            }`}
                        >
                            <div className="flex justify-between items-start w-full">
                                <div className={`p-4 squircle-md ${preferredBrowser === "edge" ? "bg-dracula-green/20" : "bg-white/5"}`}>
                                    <Monitor size={32} />
                                </div>
                                {preferredBrowser === "edge" && !migrating && <Check size={28} className="text-dracula-green" />}
                                {preferredBrowser === "edge" && migrating && <Loader2 size={28} className="animate-spin text-dracula-green" />}
                            </div>
                            <div className="text-left">
                                <span className="font-black text-3xl block mb-1 tracking-tight">Edge</span>
                                <span className="text-sm opacity-50 font-sans font-medium uppercase tracking-widest">Microsoft Edge</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Right side group */}
                <div className="space-y-8 flex flex-col h-full">
                    {/* Autostart */}
                    <div className="apple-glass p-8 squircle-lg border-white/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-10">
                            <div className="max-w-md">
                                <h3 className="text-3xl font-display font-black mb-3">{t('settings.startup.title')}</h3>
                                <p className="text-dracula-fg/40 text-lg font-sans leading-relaxed">{t('settings.startup.desc')}</p>
                            </div>

                            <button
                                onClick={toggleAutoStart}
                                className={`flex items-center gap-8 p-6 squircle-md border transition-all min-w-[280px] justify-between group ${
                                    autoStart ? 'bg-dracula-green/10 border-dracula-green/40 text-dracula-green neon-glow-green' : 'bg-white/5 border-white/5 text-dracula-fg/20 hover:border-white/10'
                                }`}
                            >
                                <span className="font-black uppercase tracking-[0.2em] text-xs">{t('settings.startup.autostart')}</span>
                                <div className={`w-14 h-7 rounded-full relative transition-colors duration-500 ${autoStart ? 'bg-dracula-green' : 'bg-white/10'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-lg transition-all duration-500 ${autoStart ? 'right-1' : 'left-1'}`}></div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Data Section */}
                    <div className="apple-glass p-8 squircle-lg flex-1">
                        <h3 className="text-3xl font-display font-black mb-3">{t('settings.data.title')}</h3>
                        <p className="text-dracula-fg/40 text-base mb-12 font-sans">{t('settings.data.desc')}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button 
                                onClick={handleExport}
                                className="flex items-center justify-between p-8 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 squircle-md text-dracula-fg/70 transition-all font-black group transition-all duration-500"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-dracula-cyan/10 text-dracula-cyan rounded-xl group-hover:scale-110 transition-transform"><Download size={20}/></div>
                                    <span className="tracking-tight uppercase text-xs">{t('settings.data.export')}</span>
                                </div>
                                <div className="text-dracula-fg/20 group-hover:text-dracula-fg group-hover:translate-x-1 transition-all">→</div>
                            </button>
                            <button 
                                onClick={handleImport}
                                className="flex items-center justify-between p-8 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 squircle-md text-dracula-fg/70 transition-all font-black group transition-all duration-500"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-dracula-purple/10 text-dracula-purple rounded-xl group-hover:scale-110 transition-transform"><Upload size={20}/></div>
                                    <span className="tracking-tight uppercase text-xs">{t('settings.data.import')}</span>
                                </div>
                                <div className="text-dracula-fg/20 group-hover:text-dracula-fg group-hover:-translate-y-1 transition-all">↑</div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Shortcuts Table */}
                <div className="apple-glass p-8 squircle-lg xl:col-span-2">
                    <div className="mb-12 flex items-center gap-4">
                        <Command className="text-dracula-pink w-8 h-8" />
                        <div>
                            <h3 className="text-4xl font-display font-black mb-2 tracking-tighter">{t('settings.commands.title')}</h3>
                            <p className="text-dracula-fg/40 text-xl font-sans">{t('settings.commands.desc')}</p>
                        </div>
                    </div>

                    <div className="overflow-hidden squircle-lg border border-white/5 bg-dracula-bg/40">
                        <table className="w-full text-left font-sans border-collapse">
                            <thead>
                                <tr className="bg-white/[0.03] text-[10px] uppercase tracking-[0.4em] font-black text-dracula-fg/20">
                                    <th className="px-10 py-8">{t('settings.commands.header_action')}</th>
                                    <th className="px-10 py-8">{t('settings.commands.header_keyboard')}</th>
                                    <th className="px-10 py-8">{t('settings.commands.header_mouse')}</th>
                                    <th className="px-10 py-8">{t('settings.commands.header_joystick')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <tr className="group/row hover:bg-dracula-purple/5 transition-all duration-300">
                                    <td className="px-10 py-10">
                                        <div className="flex flex-col">
                                            <span className="font-black text-dracula-fg text-2xl tracking-tight">{t('settings.commands.exit.title')}</span>
                                            <span className="text-sm text-dracula-fg/30 font-medium mt-1">{t('settings.commands.exit.desc')}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-10">
                                        <kbd className="bg-dracula-surface px-4 py-2 squircle-md border border-white/10 text-xs font-mono text-dracula-cyan shadow-xl tracking-wider">CTRL + SHIFT + Q</kbd>
                                    </td>
                                    <td className="px-10 py-10">
                                        <span className="text-xs font-black uppercase tracking-widest text-dracula-pink bg-dracula-pink/10 px-5 py-3 squircle-md border border-dracula-pink/20">{t('settings.commands.exit.mouse')}</span>
                                    </td>
                                    <td className="px-10 py-10">
                                        <div className="flex gap-3 items-center">
                                            <kbd className="bg-dracula-surface px-4 py-2 squircle-md border border-white/10 text-xs font-mono text-dracula-fg shadow-xl">L3</kbd>
                                            <span className="text-dracula-purple font-black">+</span>
                                            <kbd className="bg-dracula-surface px-4 py-2 squircle-md border border-white/10 text-xs font-mono text-dracula-fg shadow-xl">R3</kbd>
                                        </div>
                                    </td>
                                </tr>
                                <tr className="group/row hover:bg-dracula-cyan/5 transition-all duration-300">
                                    <td className="px-10 py-10">
                                        <div className="flex flex-col">
                                            <span className="font-black text-dracula-fg text-2xl tracking-tight">{t('settings.commands.manage.title')}</span>
                                            <span className="text-sm text-dracula-fg/30 font-medium mt-1">{t('settings.commands.manage.desc')}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-10">
                                        <div className="flex flex-col gap-3">
                                            <kbd className="w-fit bg-dracula-surface px-4 py-2 squircle-md border border-white/10 text-xs font-mono text-dracula-cyan shadow-xl tracking-wider">{t('settings.commands.manage.keyboard')}</kbd>
                                        </div>
                                    </td>
                                    <td className="px-10 py-10">
                                        <span className="text-xs font-black uppercase tracking-widest text-dracula-cyan bg-dracula-cyan/10 px-5 py-3 squircle-md border border-dracula-cyan/20">{t('settings.commands.manage.mouse')}</span>
                                    </td>
                                    <td className="px-10 py-10">
                                        <kbd className="bg-dracula-surface px-4 py-2 squircle-md border border-white/10 text-xs font-mono text-dracula-fg shadow-xl tracking-widest uppercase">X / Square</kbd>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Language Selection */}
                <div className="apple-glass p-8 squircle-lg xl:col-span-2 border-white/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-12">
                        <div className="max-w-xl">
                            <h3 className="text-4xl font-display font-black mb-4 tracking-tighter">{t('settings.language.title')}</h3>
                            <p className="text-dracula-fg/40 text-xl leading-relaxed font-sans">
                                {t('settings.language.desc')}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-shrink-0">
                            {(['pt', 'en', 'es', 'zh'] as Language[]).map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setLanguage(lang)}
                                    className={`flex flex-col items-center justify-center min-w-[140px] p-6 squircle-lg border transition-all duration-500 scale-100 active:scale-95 ${
                                        currentLang === lang
                                            ? "bg-dracula-purple/20 border-dracula-purple/50 text-dracula-purple font-black shadow-2xl neon-glow-purple"
                                            : "bg-white/5 border-white/5 text-dracula-fg/20 hover:border-white/20 hover:text-dracula-fg hover:bg-white/10"
                                    }`}
                                >
                                    <span className="uppercase text-2xl tracking-[0.3em] pl-1">{lang}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
