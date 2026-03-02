import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface AddEntryFormProps {
    onComplete: () => void;
}

export function AddEntryForm({ onComplete }: AddEntryFormProps) {
    const [urlsInput, setUrlsInput] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [failedUrls, setFailedUrls] = useState<string[]>([]);

    const handleWebLinksAdd = async () => {
        if (!urlsInput.trim()) return;
        setIsChecking(true);
        setFailedUrls([]);

        const lines = urlsInput.split("\n")
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .map(l => {
                if (!l.startsWith("http://") && !l.startsWith("https://")) {
                    return "https://" + l;
                }
                return l;
            });

        try {
            let healthyUrls: string[] = [];
            try {
                healthyUrls = await invoke<string[]>("check_links_health", { urls: lines });
            } catch (e) {
                console.error("Health check failed:", e);
            }

            // Add healthy URLs
            for (const url of healthyUrls) {
                let metadata: any = { title: null, icon_url: null, description: null };
                try {
                    metadata = await invoke("fetch_site_metadata", { url });
                } catch (e) {
                    console.warn(`Could not fetch metadata for ${url}`, e);
                }

                try {
                    await invoke("add_item", {
                        title: metadata.title || new URL(url).hostname.replace("www.", ""),
                        itemType: "web",
                        targetPath: url,
                        iconUrl: metadata.icon_url || null,
                        backgroundUrl: null,
                        description: metadata.description || null
                    });
                } catch (e) {
                    console.error(`Error adding item ${url}`, e);
                }
            }

            // Figure out which ones failed
            const failed = lines.filter(url => !healthyUrls.includes(url));
            if (failed.length > 0) {
                setFailedUrls(failed);
            } else {
                onComplete(); // Done if all were healthy
            }

            // clear the input
            setUrlsInput("");
        } catch (error) {
            console.error("Check failed:", error);
        } finally {
            setIsChecking(false);
        }
    };

    const handleForceAdd = async (url: string) => {
        try {
            let metadata: any = { title: null, icon_url: null, description: null };
            try {
                metadata = await invoke("fetch_site_metadata", { url });
            } catch (e) {
                console.warn(`Could not fetch metadata for ${url}`, e);
            }

            try {
                await invoke("add_item", {
                    title: metadata.title || new URL(url).hostname.replace("www.", ""),
                    itemType: "web",
                    targetPath: url,
                    iconUrl: metadata.icon_url || null,
                    backgroundUrl: null,
                    description: metadata.description || null
                });
            } catch (e) {
                console.error(`Error force adding ${url}`, e);
            }

            const remaining = failedUrls.filter(u => u !== url);
            setFailedUrls(remaining);
            if (remaining.length === 0) {
                onComplete();
            }
        } catch (error) {
            console.error("Force add failed:", error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-xl glass-panel p-8 rounded-3xl border border-white/10 flex flex-col shadow-2xl">
                <button
                    onClick={onComplete}
                    className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <div>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <svg className="w-6 h-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <h3 className="text-2xl font-display font-semibold text-white">Adicionar Streaming</h3>
                    </div>
                    <p className="text-sm text-center text-white/50 mb-6 w-full px-4">Adicione serviços da web. O sistema fará um *Health Check* automático buscando o favicon (ícone). Use uma URL por linha.</p>

                    <textarea
                        value={urlsInput}
                        onChange={(e) => setUrlsInput(e.target.value)}
                        className="w-full h-32 bg-black/40 border border-white/5 rounded-xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none font-sans text-sm mb-4"
                        placeholder="https://netflix.com&#10;https://youtube.com/tv"
                    />

                    {failedUrls.length > 0 && (
                        <div className="mb-4 bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                            <h4 className="text-red-400 font-semibold mb-2">Falhas de Verificação</h4>
                            <ul className="flex flex-col gap-2">
                                {failedUrls.map((url, idx) => (
                                    <li key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-black/40 rounded-lg">
                                        <span className="text-xs font-mono text-white/70 truncate" title={url}>{url}</span>
                                        <button
                                            onClick={() => handleForceAdd(url)}
                                            className="px-3 py-1 bg-white/10 text-xs rounded-md hover:bg-white/20 transition whitespace-nowrap"
                                        >
                                            Adicionar Mesmo Assim
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <button
                    tabIndex={0}
                    onClick={handleWebLinksAdd}
                    disabled={isChecking || !urlsInput.trim()}
                    className="w-full py-4 bg-blue-600/50 text-white font-medium rounded-xl hover:bg-blue-600/70 disabled:opacity-50 disabled:cursor-not-allowed focus-ring transition-colors shadow-lg mt-4"
                >
                    {isChecking ? "Verificando..." : "Validar e Adicionar"}
                </button>
            </div>
        </div>
    );
}
