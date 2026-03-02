export interface KioskerItem {
    id: number;
    title: string;              // Nome exibido no card
    item_type: 'web' | 'exe';   // Identificador rígido de tipo
    target_path: string;        // URL ou Caminho absoluto
    icon_url?: string | null;          // Caminho local da imagem baixada ou URL
    background_url?: string | null;    // Imagem da capa/fundo (Opcional)
    description?: string | null;       // Contexto do scraper (Opcional)
}

export const mockItems: KioskerItem[] = [
    {
        id: 1,
        title: "Netflix",
        item_type: "web",
        target_path: "https://www.netflix.com",
        background_url: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=1600&auto=format&fit=crop",
        description: "Assista a séries e filmes",
    },
    {
        id: 2,
        title: "YouTube",
        item_type: "web",
        target_path: "https://www.youtube.com/tv",
        background_url: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1600&auto=format&fit=crop",
    },
    {
        id: 3,
        title: "Twitch",
        item_type: "web",
        target_path: "https://www.twitch.tv",
        background_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop",
    },
    {
        id: 4,
        title: "Cyberpunk 2077",
        item_type: "exe",
        target_path: "C:\\Games\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe",
        background_url: "https://images.unsplash.com/photo-1605806616949-1d87b487c2a4?q=80&w=1600&auto=format&fit=crop",
    },
    {
        id: 5,
        title: "Hollow Knight",
        item_type: "exe",
        target_path: "C:\\Games\\Hollow Knight\\hollow_knight.exe",
        background_url: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=1600&auto=format&fit=crop",
    },
    {
        id: 6,
        title: "Spotify",
        item_type: "web",
        target_path: "https://open.spotify.com",
        background_url: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=1600&auto=format&fit=crop",
    }
];
