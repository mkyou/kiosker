# Kiosker - Implementation & Backend Guidelines

Este documento serve como a fonte da verdade para o Engenheiro de Software focado em **Lógica de Negócios, Integração de Sistemas e Backend** (Rust/Tauri + React Hooks/States).

> **DIRETRIZ DE ESCOPO:** O agente trabalhando com base neste arquivo atua EXCLUSIVAMENTE na resolução de bugs lógicos, concorrência, banco de dados e comunicação OS. Você deve preservar **cegamente** a interface (Tailwind/CSS) definida pela equipe de UI.

## Bugs Críticos Atuais para Resolução Imediata

### 1. Correção do Modo Kiosk no Firefox (e Dupla Execução)
- **Problema:** O Firefox não está abrindo em modo `--kiosk` real. Está reaproveitando uma janela/perfil de usuário aberta. Além disso, os links estão abrindo duas vezes (duas instâncias ou abas).
- **Ação Exigida:** 
  - Rever o `processes.rs` no Tauri. O Firefox muitas vezes ignora `--kiosk` se uma sessão já existir. Pesquise e adicione as flags necessárias (como `-new-instance`, `-private-window` ou criar um `-profile` temporário).
  - Investigar o frontend React (`MediaCard.tsx` ou `HomeGrid.tsx`): o disparo do comando Tauri está sendo duplicado (pode ser o `onClick` e um atalho de teclado conflitando e disparando duas vezes em paralelo).

### 2. Automação de Metadados (Scraping/APIs)
- **Problema:** A aplicação salva links ou jogos, mas exibe imagens/dados mockados, tornando a biblioteca visualmente confusa.
- **Ação Exigida:** 
  - Criar rotinas no Rust para buscar dados ricos na hora da adição.
  - Para URLs (`web`): Fazer parse das tags OpenGraph (`<meta property="og:image">`) ou extrair favicons em alta resolução para usar como `icon_url` e `background_url`.
  - Para Jogos (`exe`): Usar lógicas para buscar capas (via APIs raw como IGDB/SteamGridDB ou extração de ícone do binário) e popular o banco de dados dinamicamente.

### 3. Falha no Tauri File Dialog
- **Problema:** O usuário clica para adicionar o atalho do jogo e o seletor nativo do Windows não abre.
- **Ação Exigida:** 
  - Instalar/verificar o `@tauri-apps/plugin-dialog` e os arquivos de configuração de Capabilities (`src-tauri/capabilities/default.json`). No Tauri v2, apis de dialog precisam explicitamente de permissão declarada nas capabilities para acessar o sistema de arquivos.

### 4. Lógica de Navegação e Filtros da Sidebar
- **Problema:** Os cliques na Sidebar (Streaming, Jogos) não filtram os dados reais listados na Home.
- **Ação Exigida:** 
  - Ajustar o estado em `App.tsx` e `HomeGrid.tsx`. A aba ativa (`activeTab`) deve ditar um `.filter()` no array retornado pelo SQLite (Ex: `items.filter(i => activeTab === 'home' || (activeTab === 'streaming' && i.item_type === 'web') || (activeTab === 'games' && i.item_type === 'exe'))`).
