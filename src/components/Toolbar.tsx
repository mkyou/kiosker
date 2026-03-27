import { useState, useEffect } from "react";
import { Wifi, Home, Settings } from "lucide-react";
import { cn } from "../lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "../hooks/useTranslation";

interface ToolbarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function Toolbar({ activeTab, setActiveTab }: ToolbarProps) {
    const { t } = useTranslation();
    const [time, setTime] = useState(new Date());
    const [sysStatus, setSysStatus] = useState({ battery_percentage: null as number | null, is_charging: false, wifi_connected: true });

    useEffect(() => {
        const fetchStatus = async () => {
             try {
                 const status = await invoke<typeof sysStatus>("get_system_status");
                 if (status) setSysStatus(status);
             } catch (e) {
                 console.error("Failed to load generic system status", e);
             }
        };

        fetchStatus();
        const timeInterval = setInterval(() => setTime(new Date()), 1000);
        const statusInterval = setInterval(fetchStatus, 30000); // Check status every 30s

        return () => {
            clearInterval(timeInterval);
            clearInterval(statusInterval);
        };
    }, []);

    const handleWifiClick = async () => {
        try {
            await invoke("open_wifi_settings");
        } catch (e) {
            console.error("Failed to open network settings natively", e);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const menus = [
        { id: "home", icon: Home, label: t('home.start') },
        { id: "settings", icon: Settings, label: t('settings.title') },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 h-20 px-8 md:px-12 z-[200] pointer-events-none select-none">
            {/* Ambient Background Gradient for the bar */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#383448] via-[#383448]/80 to-transparent h-32" />
            
            <div className="relative h-full w-full flex items-center justify-between">
                {/* Logo Part - Flexible Width */}
                <div className="flex-1 flex items-center justify-start overflow-hidden relative z-10 pointer-events-auto cursor-pointer group" onClick={() => setActiveTab("home")}>
                    <span className="font-display font-black text-2xl tracking-tighter text-dracula-fg opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        KIOSKER<span className="hidden lg:inline text-dracula-purple ml-1">.</span>
                    </span>
                    <div className="ml-6 px-4 py-1.5 bg-dracula-purple/10 border border-dracula-purple/20 rounded-full flex items-center gap-2 animate-fade-in">
                        <div className="w-1.5 h-1.5 rounded-full bg-dracula-purple animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dracula-purple/80" data-testid="active-section-label">
                            {activeTab === "home" ? t('home.start') : t('settings.title')}
                        </span>
                    </div>
                </div>

                {/* Navigation Tabs (Centered in own space) */}
                <nav className="flex items-center gap-2 p-1.5 apple-glass squircle-md relative z-10 pointer-events-auto mx-4 shrink-0">
                    {menus.map((m) => {
                        const Icon = m.icon;
                        const isActive = activeTab === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => setActiveTab(m.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        setActiveTab(m.id);
                                    }
                                }}
                                className={cn(
                                    "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-2.5 rounded-2xl transition-all duration-500 outline-none font-sans font-bold text-xs md:text-sm tracking-wide",
                                    isActive
                                        ? "bg-dracula-surface text-dracula-fg shadow-xl"
                                        : "text-dracula-fg/30 hover:text-dracula-fg/60 focus:bg-white/5"
                                )}
                            >
                                <Icon size={18} className={cn("transition-transform duration-500", isActive ? "text-dracula-purple" : "")} />
                                <span className={cn(activeTab !== m.id && "hidden sm:inline")}>{m.label}</span>
                            </button>
                        );
                    })}
                </nav>
                
                {/* Status & Clock - Flexible Width */}
                <div data-nav-exclude className="flex-1 flex items-center justify-end gap-4 md:gap-10 relative z-10 pointer-events-auto overflow-hidden">
                    <div className="flex items-center gap-4 md:gap-6 text-dracula-fg/30">
                        <button onClick={handleWifiClick} className="flex items-center gap-2 hover:text-dracula-cyan transition-colors" title="Abrir configurações de rede">
                            <Wifi size={20} strokeWidth={2.5} className={sysStatus?.wifi_connected ? "text-dracula-green/60" : "text-dracula-pink/60"} />
                        </button>
                        <div className="flex items-center gap-1 md:gap-2 pointer-events-none opacity-50 px-1 md:px-2 font-display">
                            {sysStatus.battery_percentage !== null && (
                                <span className="font-bold text-sm md:text-lg tracking-wider">{sysStatus.battery_percentage}%</span>
                            )}
                            {sysStatus.is_charging && (
                                <span className="text-dracula-green font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px] ml-1 hidden xs:inline">Carregando</span>
                            )}
                        </div>
                    </div>

                    <div className="text-dracula-fg font-display font-black text-sm md:text-xl tracking-widest drop-shadow-2xl whitespace-nowrap">
                        {formatTime(time)}
                    </div>
                </div>
            </div>
        </header>
    );
}
