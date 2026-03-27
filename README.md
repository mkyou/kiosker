<div align="center">
  <img src="public/kiosker-icon.png" alt="Kiosker Logo" width="128">
  <h1>Kiosker</h1>
  <p><em>Um Hub de Entretenimento e Aplicações com Minimalismo Cinemático</em></p>

  <p>
    <img alt="Windows" src="https://img.shields.io/badge/Windows-0078D6?style=flat&logo=windows&logoColor=white">
    <img alt="Linux" src="https://img.shields.io/badge/Linux-FCC624?style=flat&logo=linux&logoColor=black">
    <img alt="Tauri" src="https://img.shields.io/badge/Tauri-24C8D8?style=flat&logo=tauri&logoColor=white">
    <img alt="React" src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black">
  </p>
</div>

O **Kiosker** é uma aplicação desktop que transforma seu computador em um hub de entretenimento navegável por mouse, teclado ou joystick. Disponível para **Windows** e **Linux**.

## Download

Vá até a aba **[Actions](../../actions)** deste repositório, clique no build mais recente e baixe o artefato correspondente ao seu sistema:

| Sistema | Arquivo | Descrição |
|---------|---------|-----------|
| Windows | `Kiosker_vX.X.X_x64-setup.exe` | Instalador NSIS (recomendado) |
| Windows | `Kiosker_vX.X.X_x64_en-US.msi` | Pacote MSI alternativo |
| Linux   | `kiosker_X.X.X_amd64.deb` | Pacote Debian/Ubuntu (recomendado) |
| Linux   | `kiosker_X.X.X_amd64.AppImage` | AppImage portátil |

**Linux (.deb):**
```bash
sudo dpkg -i kiosker_*.deb
```

**Linux (AppImage):**
```bash
chmod +x kiosker_*.AppImage && ./kiosker_*.AppImage
```

## Como Usar

O Kiosker foi pensado para ser simples e operar com qualquer dispositivo de entrada:

| Ação | Teclado | Mouse | Joystick |
|------|---------|-------|----------|
| Navegar | `↑ ↓ ← →` | Clique | Direcional / Analógico |
| Abrir / Confirmar | `Enter` | Clique | `A` / `X` |
| Menu de opções | `Shift+F10` | Botão direito | `Y` / `Triângulo` ou `Start` |
| Sair do Kiosker | `Ctrl+Shift+Q` | 3× clique esquerdo | — |

O Kiosker abre aplicativos em tela cheia e executa sites no modo `--kiosk` do navegador. Para voltar ao hub use qualquer um dos atalhos de saída acima.

## Roadmap

- Refinar o ícone da aplicação (atualmente gerado com IA)
- Lógica mais robusta para buscar imagens/ícones das aplicações nos cards
- Registro de eventuais problemas no roadmap à medida que surgirem
