import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../hooks/useTranslation";

interface MediaCardProps {
    id: number;
    title: string;
    target_path: string;
    item_type: string;
    background_url: string;
    is_favorite?: boolean;
    isRunning?: boolean;
    onKill?: () => void;
    onRefresh?: () => void;
    onDeleteRequest?: () => void;
}

export function MediaCard({ id, title, target_path, item_type, background_url, is_favorite, isRunning, onKill, onRefresh, onDeleteRequest }: MediaCardProps) {
    const { t } = useTranslation();
    const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
    const showMenu = menuPos !== null;
    const [isEditing, setIsEditing] = useState(false);
    const [newTitle, setNewTitle] = useState(title);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (showMenu && menuRef.current) {
            const firstBtn = menuRef.current.querySelector("button");
            // Dá um micro-delay para a animação renderizar o botão 
            setTimeout(() => firstBtn?.focus(), 50);
        }
    }, [showMenu]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleBlur = (e: React.FocusEvent) => {
        if (showMenu && !e.currentTarget.contains(e.relatedTarget as Node)) {
            setMenuPos(null);
        }
    };

    const handleAction = async () => {
        try {
            if (item_type === "web") {
                await invoke("launch_kiosk", { url: target_path });
            } else {
                await invoke("launch_executable", { path: target_path });
            }
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Launch error:", err);
        }
    };

    const handleKill = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (onKill) onKill();
        setMenuPos(null);
    }

    const handleToggleFavorite = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            await invoke("toggle_favorite", { id, isFavorite: !is_favorite });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Favorite error:", err);
        }
        setMenuPos(null);
    };

    const handleUpdateTitle = async () => {
        if (newTitle.trim() === "" || newTitle === title) {
            setIsEditing(false);
            return;
        }
        try {
            await invoke("update_item", { id, title: newTitle });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error("Update title error:", err);
        }
        setIsEditing(false);
    };

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNewTitle(title);
        setIsEditing(true);
        setMenuPos(null);
    };

    const handleContextMenu = (e?: React.MouseEvent | React.KeyboardEvent | MouseEvent) => {
        if (e) e.preventDefault();
        
        let x = window.innerWidth / 2 - 80;
        let y = window.innerHeight / 2 - 150;

        // Try to find the exact target element to position near it
        const target = (e?.currentTarget || e?.target) as HTMLElement;

        if (e && 'clientX' in e && (e as MouseEvent).clientX !== 0) {
            x = (e as MouseEvent).clientX;
            y = (e as MouseEvent).clientY;
        } else if (target) {
            // Keyboard or Programmatic trigger
            const rect = target.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        }
        
        // Ensure menu stays within viewport
        if (x + 170 > window.innerWidth) x = window.innerWidth - 170;
        if (y + 350 > window.innerHeight) y = window.innerHeight - 350;
        if (x < 10) x = 10;
        if (y < 10) y = 10;

        setMenuPos({ x, y });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            handleContextMenu(e);
        }
    };

    return (
        <div 
            className={`relative group w-full aspect-[2/3] perspective-1000 ${showMenu ? 'z-[100]' : 'z-0'}`}
            onBlur={handleBlur}
        >
            <motion.button
                tabIndex={showMenu ? -1 : 0}
                onContextMenu={handleContextMenu}
                onKeyDown={handleKeyDown}
                onClick={handleAction}
                className="relative w-full h-full squircle-lg overflow-hidden apple-glass focus-ring group pointer-events-auto shadow-2xl"
                whileHover={{ y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                {/* Background Shadow Glow */}
                <div className="absolute inset-0 bg-dracula-purple/5 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-500" />

                {/* Status Indicator */}
                {isRunning && (
                    <div className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-dracula-bg/80 backdrop-blur-md border border-dracula-green/30 text-dracula-green text-[10px] font-black uppercase tracking-[0.2em] neon-glow-green animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-dracula-green shadow-[0_0_10px_#50fa7b]" />
                        {t('common.running')}
                    </div>
                )}

                {/* Media Artwork & Background Engine */}
                {background_url ? (
                    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center bg-dracula-bg">
                        {/* Dynamic Glassmorphism Background layer created from the logo itself (Blurred) */}
                        <div className="absolute inset-0 scale-150 opacity-40 overflow-hidden mix-blend-screen group-hover:opacity-60 transition-opacity duration-700">
                            <img src={background_url} className="w-full h-full object-cover blur-3xl saturate-200" aria-hidden="true" />
                        </div>
                        
                        {/* The Actual Centered Logo/Icon */}
                        <div className="relative w-3/5 h-3/5 flex items-center justify-center drop-shadow-2xl">
                             <img 
                                src={background_url} 
                                alt={title} 
                                className="max-w-full max-h-full object-contain filter transition-transform duration-700 ease-out group-hover:scale-110 group-focus:scale-110" 
                            />
                        </div>
                    </div>
                ) : (
                    // Fallback when there is strictly no image available
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-dracula-surface/80 to-dracula-bg">
                        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 group-focus:scale-110 transition-transform duration-700">
                             <span className="font-display font-black text-4xl text-dracula-fg/30 uppercase">{title.charAt(0)}</span>
                        </div>
                    </div>
                )}

                {/* Foreground Overlay Gradient for Title Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-dracula-bg via-transparent to-transparent opacity-70 pointer-events-none" />

                {/* Floating Title */}
                <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onBlur={handleUpdateTitle}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateTitle();
                                if (e.key === "Escape") setIsEditing(false);
                                e.stopPropagation();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-dracula-bg/80 backdrop-blur-md border-b-2 border-dracula-purple text-white font-display font-black p-1 focus:outline-none uppercase tracking-tight"
                        />
                    ) : (
                        <>
                            <h3 className="text-base md:text-lg lg:text-xl font-display font-black text-white leading-[1.1] drop-shadow-lg transform transition-transform duration-500 group-hover:translate-y-[-4px] group-focus:translate-y-[-4px] line-clamp-2 uppercase tracking-tight">
                                {title}
                            </h3>
                            <div className="h-1 w-0 bg-dracula-purple group-hover:w-10 group-focus:w-10 transition-all duration-500 mt-2 rounded-full" />
                        </>
                    )}
                </div>

            </motion.button>

            {/* Context Menu Overlay */}
            <AnimatePresence>
                {menuPos && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, x: 10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        onMouseLeave={() => setMenuPos(null)}
                        onClick={(e) => { e.stopPropagation(); setMenuPos(null); }}
                        role="menu"
                        style={{ left: menuPos.x, top: menuPos.y }}
                        className="fixed z-[9999] flex flex-col items-center justify-start p-3 gap-2 bg-dracula-surface/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl w-40 max-h-[110%] overflow-y-auto"
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuPos(null); }}
                            className="w-full flex items-center justify-center gap-3 py-3.5 px-3 rounded-2xl bg-white/5 text-dracula-fg border border-white/10 font-bold uppercase tracking-wider text-[9px] transition-all hover:bg-white/10 hover:border-white/20 group/btn"
                        >
                            <span className="text-sm group-hover/btn:scale-125 transition-transform">✕</span>
                            <span className="truncate">{t('common.back')}</span>
                        </button>

                        <button
                            onClick={handleAction}
                            className="w-full flex items-center justify-center gap-3 py-3.5 px-3 rounded-2xl bg-dracula-purple/20 text-dracula-purple border border-dracula-purple/30 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-dracula-purple/30 group/btn"
                        >
                            <span className="text-sm group-hover/btn:scale-125 transition-transform">{isRunning ? '↺' : '▶'}</span>
                            <span className="truncate">{isRunning ? t('common.restart') : t('common.open')}</span>
                        </button>
                        
                        {isRunning && (
                            <button
                                onClick={handleKill}
                                className="w-full flex items-center justify-center gap-3 py-3.5 px-3 rounded-2xl bg-dracula-pink/10 text-dracula-pink border border-dracula-pink/30 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-dracula-pink/20 group/btn"
                            >
                                <span className="text-sm group-hover/btn:scale-125 transition-transform">⏹</span>
                                <span className="truncate">{t('common.close')}</span>
                            </button>
                        )}

                        <button
                            onClick={handleToggleFavorite}
                            className="w-full flex items-center justify-center gap-3 py-3 px-3 rounded-2xl bg-dracula-yellow/10 text-dracula-yellow border border-dracula-yellow/20 font-bold uppercase tracking-wider text-[9px] transition-all hover:bg-dracula-yellow/20 group/btn"
                        >
                            <span className="text-sm group-hover/btn:scale-125 transition-transform">{is_favorite ? '★' : '☆'}</span>
                            <span className="truncate">{is_favorite ? t('common.remove_favorite') : t('common.favorite')}</span>
                        </button>

                        <button
                            onClick={handleStartEdit}
                            className="w-full flex items-center justify-center gap-3 py-3 px-3 rounded-2xl bg-dracula-cyan/10 text-dracula-cyan border border-dracula-cyan/20 font-bold uppercase tracking-wider text-[9px] transition-all hover:bg-dracula-cyan/20 group/btn"
                        >
                            <span className="text-sm group-hover/btn:scale-125 transition-transform">✎</span>
                            <span className="truncate">{t('common.edit')}</span>
                        </button>
                        
                        <button
                            onClick={(e) => { e.stopPropagation(); if (onDeleteRequest) onDeleteRequest(); setMenuPos(null); }}
                            className="w-full flex items-center justify-center gap-3 py-3 px-3 rounded-2xl bg-white/5 text-dracula-fg/50 border border-transparent font-bold uppercase tracking-wider text-[8px] transition-all hover:text-dracula-red hover:bg-dracula-red/10 hover:border-dracula-red/30 group/btn focus-ring"
                        >
                            <span className="text-sm group-hover/btn:scale-125 transition-transform">🗑</span>
                            <span className="truncate">{t('common.delete')}</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
