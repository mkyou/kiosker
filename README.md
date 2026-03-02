<div align="center">
  <img src="public/kiosker-icon.png" alt="Kiosker Logo" width="128">
  <h1>Kiosker</h1>
  <p><em>Um Hub de Entretenimento e Aplicações com Minimalismo Cinemático</em></p>
</div>

O **Kiosker** é uma aplicação focada em transformar o seu PC/TV em um hub limpo, minimalista e navegado por joystick/teclado. Com inspiração no Apple tvOS, o Kiosker isola distrações do Windows e te foca diretamente nos seus streamings, jogos e programas preferidos.

## 📥 Como Instalar (Windows)

O Kiosker está disponível através do nosso instalador automático para Windows x64.

1. Vá até a página de **[Releases](../../releases)** deste repositório (no menu lateral direito do GitHub).
2. Baixe o instalador mais recente:
   - `Kiosker_vX.X.X_x64-setup.exe` (Recomendado)
   - *Alternativa:* Baixe o `Kiosker_vX.X.X_x64_en-US.msi`
3. Execute o botão duplo no arquivo baixado e siga o assistente de instalação (Next > Next > Install).

## 🚀 Como Usar

O Kiosker é extremamente focado em controles simples (Spatial Navigation) construído pra você não precisar de mouse:
- **Teclado:** Navegue usando as `Setas` + `Enter`.
- **Controle / Gamepad:** Use o seu controle (D-Pad e botão **X/A**) se conectado diretamente para explorar a interface.

### 🛑 Atalho de Segurança "Anti-Travamento"

Como o Kiosker abre seus jogos e plataformas em modo janela cheia, criamos duas "rotas de fuga" essenciais caso você fique preso em um aplicativo sem conseguir usar o gamepad para voltar para casa:
- Se você tiver um **Mouse**: Clique 3x rapidamente com o *botão direito*.
- Com o **Teclado**: Pressione simultaneamente `CTRL` + `SHIFT` + `Q`.

Isso vai encerrar instantaneamente qualquer site ou app em tela cheia e te devolver para o hub Kiosker!

## 🛠️ Tecnologias
Construído com uma stack de altíssima performance:
- [Tauri](https://tauri.app/) & [Rust](https://www.rust-lang.org/) para integrações no fundo do OS (Navegação Global, Execução de Processos Locais).
- React + Vite renderizando com suporte a aceleração via GPU de interface em framerate nativo.
- [Framer Motion](https://www.framer.com/motion/) gerenciando as físicas de escalonamento suave e Glassmorphism UI.
