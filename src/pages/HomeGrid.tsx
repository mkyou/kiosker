import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { MediaCard } from "../components/MediaCard";
import { AddEntryForm } from "../components/AddEntryForm";
import { RightClickIcon } from "../components/RightClickIcon";
import { Plus, Gamepad2 } from "lucide-react";

export interface KioskerItem {
    id: number;
    title: string;
    item_type: 'web' | 'exe';
    target_path: string;
    icon_url?: string;
    background_url?: string;
    description?: string;
}

interface HomeGridProps {
    activeTab: string;
}

export function HomeGrid({ activeTab }: HomeGridProps) {
    const [items, setItems] = useState<KioskerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddWeb, setShowAddWeb] = useState(false);

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

    useEffect(() => {
        fetchItems();
    }, []);

    const handlePickExecutable = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: "Executáveis", extensions: ["exe", "lnk", "bat", "cmd"] }]
            });

            if (selected) {
                try {
                    // Follows Architecture Bible: Send exact path to Rust backend.
                    // Backend returns the sanitized Title and a native OS Icon (Base64) if available.
                    type LocalExecMetadata = { title: string; icon_url: string | null };
                    const metadata = await invoke<LocalExecMetadata>("get_executable_metadata", { path: selected as string });

                    await invoke("add_item", {
                        title: metadata.title,
                        itemType: "exe",
                        targetPath: selected as string,
                        iconUrl: metadata.icon_url,
                        backgroundUrl: null,
                        description: "Local Executable"
                    });
                } catch (e) {
                    console.error("Error adding executable:", e);
                }
                fetchItems();
            }
        } catch (error) {
            console.error("Failed to pick executable:", error);
        }
    };

    const handleFabClick = () => {
        if (activeTab === "apps") {
            handlePickExecutable();
        } else if (activeTab === "web") {
            setShowAddWeb(true);
        }
    };

    // Filter and slice for "home" top 5
    let filteredItems = items.filter(item => {
        if (activeTab === "home") return true;
        if (activeTab === "web") return item.item_type === "web";
        if (activeTab === "apps") return item.item_type === "exe";
        return true;
    });

    if (activeTab === "home") {
        filteredItems = filteredItems.slice(0, 5);
    }

    const getHeaderInfo = () => {
        switch (activeTab) {
            case "home": return {
                title: "Início",
                desc: "Seus itens recentes",
                showHint: true
            };
            case "web": return { title: "Web", desc: "", showHint: false };
            case "apps": return { title: "Aplicações", desc: "", showHint: false };
            default: return { title: "Kiosker", desc: "", showHint: false };
        }
    };
    const headerInfo = getHeaderInfo();

    return (
        <div className="flex flex-col w-full h-full p-10 md:p-16 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <header className="mb-14 w-full animate-fade-in-down">
                <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight pb-2">{headerInfo.title}</h1>
                {headerInfo.desc && (
                    <p className="text-white/50 font-sans mt-1 text-xl font-light tracking-wide flex items-center gap-2">
                        {headerInfo.desc}
                    </p>
                )}
                {headerInfo.showHint && (
                    <div className="mt-4 text-white/40 text-sm font-sans flex items-center flex-wrap gap-2">
                        Use <kbd className="bg-white/10 px-2 py-0.5 rounded border border-white/20">CTRL + SHIFT + Q</kbd>
                        ou 3x <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 flex items-center gap-1"><RightClickIcon className="w-4 h-4" /></span>
                        ou <span className="bg-white/10 px-2 py-0.5 rounded border border-white/20 flex items-center gap-1"><Gamepad2 className="w-4 h-4" /></span>
                        para voltar ao Kiosker sempre que necessário!
                    </div>
                )}
            </header>

            {!loading && filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full flex-1 text-white/40 animate-fade-in">
                    <div className="w-24 h-24 mb-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-display font-medium text-white/80 mb-2">Sua biblioteca está vazia</h2>
                    <p className="font-sans text-lg max-w-md text-center">Navegue até o menu lateral e acesse a área de Adição para inserir seus jogos e serviços de streaming favoritos.</p>
                </div>
            ) : (
                <div className={`grid gap-8 md:gap-10 w-full animate-fade-in-up pb-20 ${activeTab === "home"
                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 place-items-center max-w-[1400px] mx-auto transition-all"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6"
                    }`}>
                    {filteredItems.map((item) => (
                        <MediaCard
                            key={item.id}
                            id={item.id}
                            title={item.title}
                            item_type={item.item_type}
                            target_path={item.target_path}
                            background_url={item.icon_url || item.background_url || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop"}
                            onRefresh={fetchItems}
                        />
                    ))}
                </div>
            )}

            {/* Floating Action Button */}
            {(activeTab === "web" || activeTab === "apps") && (
                <button
                    tabIndex={0}
                    onClick={handleFabClick}
                    className="fixed bottom-10 right-10 p-5 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md border border-white/20 shadow-xl transition-all duration-300 hover:scale-110 focus-ring z-40 group"
                    aria-label="Adicionar Novo"
                >
                    <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
                </button>
            )}

            {/* Modal for Web Additions */}
            {showAddWeb && (
                <AddEntryForm onComplete={() => { setShowAddWeb(false); fetchItems(); }} />
            )}
        </div>
    );
}
