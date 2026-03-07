import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { MediaCard } from "../components/MediaCard";
import { AddEntryForm } from "../components/AddEntryForm";
import { Plus, Gamepad2, FileSearch, Globe } from "lucide-react";
import { SystemAppPicker } from "../components/SystemAppPicker";
import { useTranslation } from "../hooks/useTranslation";

export interface KioskerItem {
    id: number;
    title: string;
    item_type: 'web' | 'exe';
    target_path: string;
    icon_url?: string;
    background_url?: string;
    description?: string;
    is_favorite?: boolean;
}

interface HomeGridProps {
    activeTab: string; // Will mainly be "home" now
}

export function HomeGrid({ activeTab }: HomeGridProps) {
    const { t } = useTranslation();
    const [items, setItems] = useState<KioskerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddWeb, setShowAddWeb] = useState(false);
    const [showSystemAppPicker, setShowSystemAppPicker] = useState(false);
    const [activeTargets, setActiveTargets] = useState<string[]>([]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const result = await invoke<KioskerItem[]>("get_items");
            setItems(result);
        } catch (error) {
            console.error("Failed to load items from backend:", error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const refreshActiveTargets = async () => {
        try {
            const targets = await invoke<string[]>("get_active_targets");
            setActiveTargets(targets);
        } catch (e) {
            console.error("Failed to poll active targets", e);
        }
    };

    useEffect(() => {
        fetchItems();
        refreshActiveTargets();
        
        const interval = setInterval(refreshActiveTargets, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleSystemAppSelect = async (app: { name: string; exec: string; icon?: string }) => {
        try {
            setShowSystemAppPicker(false);
            setLoading(true);
            
            type LocalExecMetadata = { title: string; icon_url: string | null };
            const metadata = await invoke<LocalExecMetadata>("get_executable_metadata", { path: app.exec });

            // On Windows this is solved by `get_executable_metadata`, on Linux we manually resolve the string icon
            let finalIconUrl = metadata.icon_url;
            if (!finalIconUrl && app.icon) {
                try {
                    finalIconUrl = await invoke<string | null>("resolve_system_app_icon", { iconName: app.icon });
                } catch(e) { console.error(e) }
            }

            await invoke("add_item", {
                title: app.name || metadata.title,
                itemType: "exe",
                targetPath: app.exec,
                iconUrl: finalIconUrl,
                backgroundUrl: null,
                description: "System Application"
            });
            fetchItems();
        } catch (e) {
            console.error("Error adding system app:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleKill = async (target: string) => {
        try {
            await invoke("kill_target", { target });
            refreshActiveTargets();
        } catch (e) {
            console.error("Kill failed:", e);
        }
    };

    const handlePickExecutable = async () => {
        try {
            setShowSystemAppPicker(false);
            const selected = await open({
                multiple: false,
                filters: [{ name: "Executáveis", extensions: ["exe", "lnk", "bat", "cmd"] }]
            });

            if (selected) {
                const metadata = await invoke<any>("get_executable_metadata", { path: selected as string });
                await invoke("add_item", {
                    title: metadata.title,
                    itemType: "exe",
                    targetPath: selected as string,
                    iconUrl: metadata.icon_url,
                    backgroundUrl: null,
                    description: "Manual Executable"
                });
                fetchItems();
            }
        } catch (error) {
            console.error("Failed to pick executable:", error);
        }
    };

    // Derived State Organization
    // 1. Favoritos: itens selecionados pelo usuário
    const favoriteItems = items.filter(i => i.is_favorite).sort((a,b) => a.title.localeCompare(b.title));
    // 2. Web Items Sorted Alphabetically
    const webItems = items.filter(i => i.item_type === 'web').sort((a,b) => a.title.localeCompare(b.title));
    // 3. Executable Items Sorted Alphabetically
    const appItems = items.filter(i => i.item_type === 'exe').sort((a,b) => a.title.localeCompare(b.title));

    if (activeTab !== "home") return null;

    return (
        <div className="flex flex-col w-full h-full p-8 md:p-12 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">


            {!loading && items.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full flex-1 text-dracula-fg/10 animate-fade-in">
                    <div className="w-24 h-24 mb-6 squircle-lg apple-glass flex items-center justify-center">
                        <Plus className="w-10 h-10 text-dracula-purple/40" />
                    </div>
                    <h2 className="text-2xl font-display font-black text-dracula-fg/40 mb-2">Biblioteca vazia</h2>
                    <p className="font-sans text-lg max-w-sm text-center text-dracula-fg/40 leading-relaxed italic mb-10">
                        Adicione serviços à sua interface utilizando os cartões de ação logo abaixo.
                    </p>
                    <div className="flex gap-4">
                        <button onClick={() => setShowAddWeb(true)} className="px-6 py-4 apple-glass squircle-md flex items-center gap-3 hover:bg-white/10 transition-colors group focus-ring">
                            <Globe className="text-dracula-cyan group-hover:scale-110 transition-transform"/> <span className="font-bold text-sm uppercase tracking-widest text-dracula-fg/70">Adicionar Site</span>
                        </button>
                        <button onClick={() => setShowSystemAppPicker(true)} className="px-6 py-4 apple-glass squircle-md flex items-center gap-3 hover:bg-white/10 transition-colors group focus-ring">
                            <Gamepad2 className="text-dracula-pink group-hover:scale-110 transition-transform"/> <span className="font-bold text-sm uppercase tracking-widest text-dracula-fg/70">Adicionar App</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col w-full pb-32 animate-fade-in-up space-y-16">
                    
                    {/* Favoritos Section - Standard scale */}
                    {favoriteItems.length > 0 && (
                        <section>
                            <h3 className="font-display font-black text-2xl tracking-tighter text-dracula-yellow/80 mb-6 flex items-center gap-3">
                                <span className="text-xl">⭐</span>
                                Favoritos
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-10 place-items-start">
                                {favoriteItems.map((item) => (
                                    <MediaCard
                                        key={`fav-${item.id}`}
                                        id={item.id}
                                        title={item.title}
                                        item_type={item.item_type}
                                        target_path={item.target_path}
                                        is_favorite={item.is_favorite}
                                        background_url={item.icon_url || item.background_url || ""}
                                        isRunning={activeTargets.includes(item.target_path)}
                                        onKill={() => handleKill(item.target_path)}
                                        onRefresh={fetchItems}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Web Section - Smaller scaled grid with "Add Action Card" at the end */}
                    {webItems.length > 0 && (
                        <section>
                            <h3 className="font-display font-black text-2xl tracking-tighter text-dracula-fg/60 mb-6 flex items-center gap-3">
                                <span className="opacity-50">#</span> {t('home.web')}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-8">
                                {webItems.map((item) => (
                                    <MediaCard
                                        key={`web-${item.id}`}
                                        id={item.id}
                                        title={item.title}
                                        item_type={item.item_type}
                                        target_path={item.target_path}
                                        is_favorite={item.is_favorite}
                                        background_url={item.icon_url || item.background_url || ""}
                                        isRunning={activeTargets.includes(item.target_path)}
                                        onKill={() => handleKill(item.target_path)}
                                        onRefresh={fetchItems}
                                    />
                                ))}
                                {/* Action Card para adicionar mais websites */}
                                <button 
                                    onClick={() => setShowAddWeb(true)} 
                                    className="focus-ring apple-glass squircle-md group flex flex-col items-center justify-center p-4 hover:border-dracula-cyan/50 hover:bg-dracula-cyan/5 transition-all text-dracula-fg/30 aspect-[2/3] md:aspect-square lg:aspect-[3/4]"
                                >
                                    <div className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform group-hover:border-dracula-cyan group-hover:text-dracula-cyan">
                                        <Plus size={24} />
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-widest text-center">Adicionar Site</span>
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Apps Section - Smaller scaled grid with "Add Action Card" at the end */}
                    {appItems.length > 0 && (
                        <section>
                            <h3 className="font-display font-black text-2xl tracking-tighter text-dracula-fg/60 mb-6 flex items-center gap-3">
                                <span className="opacity-50">#</span> {t('home.apps')}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-8">
                                {appItems.map((item) => (
                                    <MediaCard
                                        key={`app-${item.id}`}
                                        id={item.id}
                                        title={item.title}
                                        item_type={item.item_type}
                                        target_path={item.target_path}
                                        is_favorite={item.is_favorite}
                                        background_url={item.icon_url || item.background_url || ""}
                                        isRunning={activeTargets.includes(item.target_path)}
                                        onKill={() => handleKill(item.target_path)}
                                        onRefresh={fetchItems}
                                    />
                                ))}
                                {/* Action Card para adicionar mais aplicativos */}
                                <button 
                                    onClick={() => setShowSystemAppPicker(true)} 
                                    className="focus-ring apple-glass squircle-md group flex flex-col items-center justify-center p-4 hover:border-dracula-pink/50 hover:bg-dracula-pink/5 transition-all text-dracula-fg/30 aspect-[2/3] md:aspect-square lg:aspect-[3/4]"
                                >
                                    <div className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform group-hover:border-dracula-pink group-hover:text-dracula-pink">
                                        <Plus size={24} />
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-widest text-center">App Local</span>
                                </button>
                            </div>
                        </section>
                    )}

                    {/* When library is NOT fully empty, but sections are disjoint, add missing category action buttons */}
                    {items.length > 0 && (webItems.length === 0 || appItems.length === 0) && (
                        <section className="pt-8 border-t border-white/5 flex gap-4">
                           {webItems.length === 0 && (
                                <button onClick={() => setShowAddWeb(true)} className="px-5 py-3 bg-white/5 squircle-md text-xs font-bold uppercase tracking-widest text-dracula-fg/40 hover:text-dracula-fg hover:bg-dracula-cyan/20 transition-all focus-ring">
                                    + Adicionar Website
                                </button>
                           )}
                           {appItems.length === 0 && (
                                <button onClick={() => setShowSystemAppPicker(true)} className="px-5 py-3 bg-white/5 squircle-md text-xs font-bold uppercase tracking-widest text-dracula-fg/40 hover:text-dracula-fg hover:bg-dracula-pink/20 transition-all focus-ring">
                                    + Procurar Aplicativos
                                </button>
                           )}
                        </section>
                    )}

                </div>
            )}

            {/* Modal for Web Additions */}
            {showAddWeb && (
                <AddEntryForm onComplete={() => { setShowAddWeb(false); fetchItems(); }} />
            )}

            {/* System App Picker */}
            {showSystemAppPicker && (
                <SystemAppPicker 
                    onSelect={handleSystemAppSelect} 
                    onClose={() => setShowSystemAppPicker(false)} 
                />
            )}

            {/* Floating manual pick button when System Picker is open */}
            {showSystemAppPicker && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[70] flex justify-center">
                    <button 
                        onClick={handlePickExecutable}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-medium transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md hover:scale-105 active:scale-95"
                    >
                        <FileSearch size={18} />
                        Procurar arquivo manualmente...
                    </button>
                </div>
            )}
        </div>
    );
}
