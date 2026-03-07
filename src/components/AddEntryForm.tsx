import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Globe, X, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

interface AddEntryFormProps {
    onComplete: () => void;
}

export function AddEntryForm({ onComplete }: AddEntryFormProps) {
    const { t } = useTranslation();
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

            const failed = lines.filter(url => !healthyUrls.includes(url));
            if (failed.length > 0) {
                setFailedUrls(failed);
            } else {
                onComplete();
            }
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-dracula-bg/40 backdrop-blur-[40px] animate-fade-in">
            <div className="relative w-full max-w-2xl apple-glass p-12 squircle-lg border-white/10 flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                <button
                    onClick={onComplete}
                    className="absolute top-8 right-8 p-3 text-dracula-fg/30 hover:text-dracula-fg rounded-full apple-glass transition-all hover:scale-110 active:scale-95 border-white/5"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-4 bg-dracula-cyan/10 text-dracula-cyan rounded-2xl mb-6">
                        <Globe className="w-8 h-8" />
                    </div>
                    <h3 className="text-4xl font-display font-black text-dracula-fg mb-4 tracking-tighter">{t('home.web')}</h3>
                    <p className="text-dracula-fg/40 text-lg font-sans leading-relaxed px-10">
                        {t('settings.browser.desc')}
                    </p>
                </div>

                <div className="relative group/field mb-6">
                    <textarea
                        autoFocus
                        value={urlsInput}
                        onChange={(e) => setUrlsInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                handleWebLinksAdd();
                            }
                        }}
                        className="w-full h-48 bg-dracula-bg/40 border-2 border-white/5 squircle-md p-8 text-dracula-fg placeholder-dracula-fg/10 focus:outline-none focus:border-dracula-purple/30 transition-all font-sans text-lg selection:bg-dracula-purple/30 resize-none"
                        placeholder="https://netflix.com&#10;https://youtube.com/tv"
                    />
                    <div className="absolute bottom-4 right-6 flex items-center gap-2 text-[10px] text-dracula-fg/10 font-black uppercase tracking-widest pointer-events-none group-focus-within/field:text-dracula-purple/30 transition-colors">
                        Ctrl + Enter para enviar
                    </div>
                </div>

                {failedUrls.length > 0 && (
                    <div className="mb-8 apple-glass border-dracula-pink/20 bg-dracula-pink/5 squircle-md p-8 animate-shake">
                        <div className="flex items-center gap-3 mb-6">
                            <AlertTriangle className="text-dracula-pink w-6 h-6" />
                            <h4 className="text-dracula-pink font-black uppercase tracking-widest text-sm">Atenção: Falha na verificação</h4>
                        </div>
                        <ul className="flex flex-col gap-4">
                            {failedUrls.map((url, idx) => (
                                <li key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-dracula-bg/40 squircle-md border border-white/5">
                                    <span className="text-sm font-mono text-dracula-fg/50 truncate max-w-xs">{url}</span>
                                    <button
                                        onClick={() => handleForceAdd(url)}
                                        className="px-5 py-2.5 bg-dracula-purple/10 text-dracula-purple text-[10px] font-black uppercase tracking-widest squircle-md hover:bg-dracula-purple/20 transition-all border border-dracula-purple/20 active:scale-95"
                                    >
                                        Adicionar mesmo assim
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <button
                    tabIndex={0}
                    onClick={handleWebLinksAdd}
                    disabled={isChecking || !urlsInput.trim()}
                    className="w-full py-5 bg-dracula-purple text-dracula-bg font-black uppercase tracking-[0.3em] text-xs squircle-lg hover:bg-dracula-purple/90 disabled:opacity-30 transition-all shadow-[0_10px_30px_rgba(189,147,249,0.3)] active:scale-98 flex items-center justify-center gap-3"
                >
                    {isChecking ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verificando links...</span>
                        </>
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            <span>Validar e adicionar</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
