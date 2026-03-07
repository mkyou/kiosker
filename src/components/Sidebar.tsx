import { Play, Gamepad2, Settings, Home } from "lucide-react";
import { cn } from "../lib/utils";
import { useTranslation } from "../hooks/useTranslation";

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
    const { t } = useTranslation();
    const menus = [
        { id: "home", icon: Home, label: t('home.start'), action: () => setActiveTab("home") },
        { id: "web", icon: Play, label: t('home.web'), action: () => setActiveTab("web") },
        { id: "apps", icon: Gamepad2, label: t('home.apps'), action: () => setActiveTab("apps") },
        { id: "settings", icon: Settings, label: t('settings.title'), action: () => setActiveTab("settings") },
    ];

    return (
        <aside className="group w-24 focus-within:w-72 hover:w-72 flex-shrink-0 apple-glass border-r border-white/5 flex flex-col items-center p-6 transition-all duration-700 cubic-bezier(0.23, 1, 0.32, 1) z-50 absolute left-0 top-0 bottom-0 pt-20 squircle-r-lg">

            <nav className="flex flex-col gap-8 w-full items-start overflow-hidden">
                {menus.map((m) => {
                    const Icon = m.icon;
                    const isActive = activeTab === m.id;
                    return (
                        <button
                            key={m.id}
                            onClick={m.action}
                            tabIndex={0}
                            className={cn(
                                "flex items-center gap-6 w-full p-4 rounded-3xl outline-none transition-all duration-500 apple-glass-hover focus-ring",
                                isActive
                                    ? "bg-dracula-purple/20 text-dracula-purple shadow-[0_0_20px_rgba(189,147,249,0.3)] border border-dracula-purple/30"
                                    : "text-dracula-fg/30 hover:text-dracula-cyan hover:bg-dracula-cyan/10 focus:bg-dracula-cyan/10 focus:text-dracula-cyan"
                            )}
                        >
                            <Icon className={cn("w-8 h-8 flex-shrink-0 transition-transform duration-500", isActive ? "scale-110" : "group-hover:scale-110")} />
                            <span className="font-sans text-xl font-bold opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-500 whitespace-nowrap tracking-tight">
                                {m.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
