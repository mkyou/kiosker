import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";

interface MediaCardProps {
    id: number;
    title: string;
    target_path: string;
    item_type: string;
    background_url: string;
    onRefresh?: () => void;
}

export function MediaCard({ id, title, target_path, item_type, background_url, onRefresh }: MediaCardProps) {
    const [showMenu, setShowMenu] = useState(false);

    const handleAction = async () => {
        try {
            if (item_type === "web") {
                await invoke("launch_kiosk", { url: target_path });
            } else {
                await invoke("launch_executable", { path: target_path });
            }
        } catch (err) {
            console.error("Launch error:", err);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await invoke("delete_item", { id });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Delete error:", err);
        }
        setShowMenu(false);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowMenu(true);
    };

    return (
        <div className="relative w-full aspect-[4/3] group/container" onMouseLeave={() => setShowMenu(false)}>
            <motion.button
                tabIndex={0}
                onClick={handleAction}
                onContextMenu={handleContextMenu}
                whileHover={{ y: -5 }}
                whileFocus={{ y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="focus-ring relative group outline-none w-full h-full rounded-3xl overflow-hidden glass-panel flex flex-col block text-left border border-white/5 transition-all shadow-xl"
            >
                {/* Background Blur Layer */}
                <div className="absolute inset-0 w-full h-full bg-zinc-900 border-white/5 border overflow-hidden">
                    <img src={background_url} alt="" className="w-full h-full object-cover opacity-30 blur-2xl scale-150 group-focus:opacity-40 group-hover:opacity-40 transition-all duration-700" />
                </div>

                {/* Crisp Logo Layer */}
                <div className="absolute inset-0 w-full h-full flex items-center justify-center p-8 pb-16">
                    <img src={background_url} alt={title} className="w-full h-full object-contain drop-shadow-2xl group-focus:scale-110 group-hover:scale-110 transition-transform duration-500" />
                </div>

                {/* Gradient Overlay ensuring text is readable */}
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/60 to-transparent p-6 pb-8 flex flex-col justify-end opacity-100 transition-opacity duration-300">
                    <h3 className="text-white font-display font-bold text-2xl leading-normal line-clamp-2 drop-shadow-md">{title}</h3>
                </div>
            </motion.button>

            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[140px]"
                    >
                        <button onClick={(e) => { e.stopPropagation(); handleAction(); setShowMenu(false); }} className="px-4 py-2 text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-colors text-left flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Abrir
                        </button>
                        <button onClick={handleDelete} className="px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-medium transition-colors text-left flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Excluir
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
