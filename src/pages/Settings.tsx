import { useState, useEffect } from "react";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";

export function Settings() {
    const [autoStart, setAutoStart] = useState(false);

    useEffect(() => {
        // Check initial autostart status
        isEnabled().then(setAutoStart).catch(console.error);
    }, []);

    const toggleAutoStart = async () => {
        try {
            if (autoStart) {
                await disable();
                setAutoStart(false);
            } else {
                await enable();
                setAutoStart(true);
            }
        } catch (e) {
            console.error("Failed to toggle autostart", e);
        }
    };

    return (
        <div className="flex flex-col w-full h-full p-10 md:p-16 overflow-y-auto animate-fade-in-up">
            <header className="mb-14 w-full">
                <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight pb-2">Ajustes</h1>
                <p className="text-white/50 font-sans mt-1 text-xl font-light tracking-wide">
                    Configurações do sistema Kiosker.
                </p>
            </header>

            <div className="max-w-3xl space-y-8">
                {/* Autostart Section */}
                <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                    <h3 className="text-2xl font-display font-semibold mb-2">Inicialização</h3>
                    <p className="text-white/50 mb-6 font-sans">Configure o Kiosker para iniciar com o Windows.</p>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <span className="font-medium text-lg">Iniciar Kiosker com o sistema</span>
                        <button
                            onClick={toggleAutoStart}
                            className={`w-14 h-8 rounded-full relative focus-ring outline-none transition-colors duration-300 ${autoStart ? 'bg-blue-600' : 'bg-white/20'}`}
                        >
                            <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 ${autoStart ? 'right-1' : 'left-1'}`}></div>
                        </button>
                    </div>
                </div>

                {/* Shortcuts Section */}
                <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                    <h3 className="text-2xl font-display font-semibold mb-2">Atalhos e Controles</h3>
                    <p className="text-white/50 mb-6 font-sans">Teclas de atalho para navegação e controle.</p>

                    <ul className="space-y-3 font-sans">
                        <li className="flex justify-between p-4 bg-white/5 rounded-xl">
                            <span className="text-white/80">Sair do modo Web/Jogo e voltar ao Launcher</span>
                            <kbd className="bg-white/10 px-3 py-1 rounded text-sm text-white border border-white/20 font-mono">CTRL + SHIFT + Q</kbd>
                        </li>
                        <li className="flex justify-between p-4 bg-white/5 rounded-xl">
                            <span className="text-white/80">Voltar / Fechar Aplicação (Joystick)</span>
                            <div className="flex gap-2 text-xs">
                                <kbd className="bg-white/10 px-3 py-1 rounded text-sm text-white border border-white/20 font-mono">SELECT</kbd>
                                <span className="text-white/50 self-center">ou</span>
                                <kbd className="bg-white/10 px-3 py-1 rounded text-sm text-white border border-white/20 font-mono">HOME</kbd>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* Backup Section */}
                <div className="glass-panel p-8 rounded-[2rem] border border-white/5">
                    <h3 className="text-2xl font-display font-semibold mb-2">Backup & Restauração</h3>
                    <p className="text-white/50 mb-6 font-sans">Exporte ou importe sua biblioteca de itens SQLite e miniaturas.</p>

                    <div className="flex gap-4">
                        <button className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium focus-ring">
                            Exportar Biblioteca
                        </button>
                        <button className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium focus-ring">
                            Importar Biblioteca
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
