import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { MediaCard } from "../components/MediaCard";
import { AddEntryForm } from "../components/AddEntryForm";
import { Plus, Gamepad2, Globe } from "lucide-react";
import { SystemAppPicker } from "../components/SystemAppPicker";
import { useTranslation } from "../hooks/useTranslation";
import { motion, AnimatePresence } from "framer-motion";

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
    items: KioskerItem[];
    loading: boolean;
    onRefresh: () => void;
    activeTargets?: string[];
    onRefreshTargets?: () => void;
}

export function HomeGrid({ items, loading, onRefresh, activeTargets = [], onRefreshTargets = () => {} }: HomeGridProps) {
    const { t } = useTranslation();
    const [showAddWeb, setShowAddWeb] = useState(false);
    const [showSystemAppPicker, setShowSystemAppPicker] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<KioskerItem | null>(null);

    const handleSystemAppSelect = async (app: { name: string; exec: string; icon?: string }) => {
        try {
            setShowSystemAppPicker(false);
            
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
            onRefresh();
        } catch (e) {
            console.error("Error adding system app:", e);
        }
    };

    const handleKill = async (target: string) => {
        try {
            await invoke("kill_target", { target });
            onRefreshTargets();
        } catch (e) {
            console.error("Kill failed:", e);
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await invoke("delete_item", { id: itemToDelete.id });
            setItemToDelete(null);
            onRefresh();
        } catch (e) {
            console.error("Delete failed:", e);
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
                onRefresh();
            }
        } catch (error) {
            console.error("Failed to pick executable:", error);
        }
    };

    // Derived State Organization
    const favoriteItems = items.filter(i => i.is_favorite).sort((a,b) => a.title.localeCompare(b.title));
    const webItems = items.filter(i => i.item_type === 'web').sort((a,b) => a.title.localeCompare(b.title));
    const appItems = items.filter(i => i.item_type === 'exe').sort((a,b) => a.title.localeCompare(b.title));

    return (
        <div className="flex flex-col w-full h-full p-8 md:p-12 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

            {!loading && items.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full flex-1 text-dracula-fg/10 animate-fade-in">
                    <div className="w-24 h-24 mb-6 squircle-lg apple-glass flex items-center justify-center">
                        <Plus className="w-10 h-10 text-dracula-purple/40" />
                    </div>
                    <h2 className="text-2xl font-display font-black text-dracula-fg/40 mb-2">{t('home.empty_title')}</h2>
                    <p className="font-sans text-lg max-w-sm text-center text-dracula-fg/40 leading-relaxed italic mb-10">
                        {t('home.empty_desc')}
                    </p>
                    <div className="flex gap-4">
                        <button onClick={() => setShowAddWeb(true)} className="px-6 py-4 apple-glass squircle-md flex items-center gap-3 hover:bg-white/10 transition-colors group focus-ring">
                            <Globe className="text-dracula-cyan group-hover:scale-110 transition-transform"/> <span className="font-bold text-sm uppercase tracking-widest text-dracula-fg/70">{t('home.add_site')}</span>
                        </button>
                        <button onClick={() => setShowSystemAppPicker(true)} className="px-6 py-4 apple-glass squircle-md flex items-center gap-3 hover:bg-white/10 transition-colors group focus-ring">
                            <Gamepad2 className="text-dracula-pink group-hover:scale-110 transition-transform"/> <span className="font-bold text-sm uppercase tracking-widest text-dracula-fg/70">{t('home.add_app')}</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col w-full pb-32 animate-fade-in-up space-y-16">
                    
                    {/* Favoritos Section */}
                    {favoriteItems.length > 0 && (
                        <section>
                            <h3 className="font-display font-black text-2xl tracking-tighter text-dracula-yellow/80 mb-6 flex items-center gap-3">
                                <span className="text-xl">⭐</span>
                                {t('home.favorites')}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-10 place-items-start">
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
                                        onRefresh={onRefresh}
                                        onDeleteRequest={() => setItemToDelete(item)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Web Section */}
                    {webItems.length > 0 && (
                        <section>
                            <h3 className="font-display font-black text-2xl tracking-tighter text-dracula-fg/80 mb-6 flex items-center gap-3">
                                <span className="opacity-50 text-xl">#</span> {t('home.web')}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-10 place-items-start">
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
                                        onRefresh={onRefresh}
                                        onDeleteRequest={() => setItemToDelete(item)}
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
                                    <span className="font-black text-xs uppercase tracking-widest text-center">{t('home.add_site')}</span>
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Apps Section */}
                    {appItems.length > 0 && (
                        <section>
                            <h3 className="font-display font-black text-2xl tracking-tighter text-dracula-fg/80 mb-6 flex items-center gap-3">
                                <span className="opacity-50 text-xl">#</span> {t('home.apps')}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-10 place-items-start">
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
                                        onRefresh={onRefresh}
                                        onDeleteRequest={() => setItemToDelete(item)}
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
                                    <span className="font-black text-xs uppercase tracking-widest text-center">{t('home.apps_local')}</span>
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Missing categories action buttons */}
                    {items.length > 0 && (webItems.length === 0 || appItems.length === 0) && (
                        <section className="pt-8 border-t border-white/5 flex gap-4">
                           {webItems.length === 0 && (
                                <button onClick={() => setShowAddWeb(true)} className="px-5 py-3 bg-white/5 squircle-md text-xs font-bold uppercase tracking-widest text-dracula-fg/40 hover:text-dracula-fg hover:bg-dracula-cyan/20 transition-all focus-ring">
                                    + {t('home.add_site')}
                                </button>
                           )}
                           {appItems.length === 0 && (
                                <button onClick={() => setShowSystemAppPicker(true)} className="px-5 py-3 bg-white/5 squircle-md text-xs font-bold uppercase tracking-widest text-dracula-fg/40 hover:text-dracula-fg hover:bg-dracula-pink/20 transition-all focus-ring">
                                    + {t('home.add_app')}
                                </button>
                           )}
                        </section>
                    )}

                </div>
            )}

            {/* Modals */}
            {showAddWeb && (
                <AddEntryForm onClose={() => setShowAddWeb(false)} onRefresh={onRefresh} />
            )}

            {showSystemAppPicker && (
                <SystemAppPicker 
                    onSelect={handleSystemAppSelect} 
                    onClose={() => setShowSystemAppPicker(false)} 
                    onManualPick={handlePickExecutable}
                />
            )}

            {/* Confirm Delete Modal - Centralized for Stacking Context Safety */}
            <AnimatePresence>
                {itemToDelete && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-dracula-bg/90 backdrop-blur-md p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-dracula-surface p-10 squircle-lg border border-dracula-red/30 shadow-2xl max-w-md w-full text-center"
                        >
                            <div className="w-20 h-20 bg-dracula-red/10 text-dracula-red rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(255,85,85,0.2)]">
                                <span className="text-4xl">🗑</span>
                            </div>
                            <h3 className="text-2xl font-display font-black text-white mb-3 uppercase tracking-tight leading-tight">
                                {t('common.confirm_delete')}
                            </h3>
                            <p className="text-dracula-fg/40 text-lg mb-10 font-sans italic">
                                "{itemToDelete.title}"
                            </p>
                            <div className="flex gap-6">
                                <button 
                                    autoFocus
                                    onClick={() => setItemToDelete(null)}
                                    className="flex-1 py-5 px-6 rounded-2xl bg-white/5 text-dracula-fg font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all border border-white/5 focus-ring"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button 
                                    onClick={confirmDelete}
                                    className="flex-1 py-5 px-6 rounded-2xl bg-dracula-red text-white font-black uppercase tracking-widest text-xs hover:bg-dracula-red/80 transition-all border border-dracula-red/50 shadow-[0_5px_40px_rgba(255,85,85,0.4)] focus-ring"
                                >
                                    {t('common.confirm')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Indicator */}
            <AnimatePresence>
                {loading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[5000] flex items-center justify-center bg-dracula-bg/40 backdrop-blur-sm pointer-events-none"
                    >
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                <motion.div 
                                    className="w-20 h-20 rounded-full border-2 border-dracula-purple/20 border-t-dracula-purple shadow-[0_0_20px_rgba(189,147,249,0.1)]"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-dracula-purple animate-pulse" />
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-dracula-purple animate-pulse">{t('common.loading')}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
