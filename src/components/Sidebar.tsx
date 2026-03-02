import { Play, Gamepad2, Settings, Home } from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
    const menus = [
        { id: "home", icon: Home, label: "Início", action: () => setActiveTab("home") },
        { id: "web", icon: Play, label: "Web", action: () => setActiveTab("web") },
        { id: "apps", icon: Gamepad2, label: "Aplicações", action: () => setActiveTab("apps") },
        { id: "settings", icon: Settings, label: "Ajustes", action: () => setActiveTab("settings") },
    ];

    return (
        <aside className="group w-20 focus-within:w-64 hover:w-64 flex-shrink-0 bg-black/80 backdrop-blur-md border-r border-white/5 flex flex-col items-center p-4 transition-all duration-500 ease-out z-50 absolute left-0 top-0 bottom-0 pt-12">

            <nav className="flex flex-col gap-6 w-full items-start overflow-hidden">
                {menus.map((m) => {
                    const Icon = m.icon;
                    const isActive = activeTab === m.id;
                    return (
                        <button
                            key={m.id}
                            onClick={m.action}
                            tabIndex={0}
                            className={cn(
                                "flex items-center gap-6 w-full p-3 rounded-2xl outline-none transition-all duration-300",
                                isActive
                                    ? "bg-white/10 text-white scale-110 shadow-lg"
                                    : "text-white/50 hover:text-white hover:bg-white/5 focus:bg-white/10 focus:text-white focus:scale-110 focus:shadow-lg"
                            )}
                        >
                            <Icon className={cn("w-7 h-7 flex-shrink-0", isActive ? "text-white" : "")} />
                            <span className="font-sans text-lg font-medium opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                {m.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
