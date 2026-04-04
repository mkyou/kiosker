# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é o Kiosker

Aplicação desktop cross-platform (Windows e Linux) que transforma o computador em um hub de entretenimento. O usuário navega por itens (apps, sites) usando mouse, teclado ou gamepad.

Stack: **React 19 + TypeScript** (frontend) + **Rust + Tauri 2** (backend) + **SQLite** (dados locais).

## Comandos

```bash
# Desenvolvimento
npm run dev               # Servidor Vite apenas (frontend)
npm run tauri dev         # App completo com hot-reload (frontend + Rust)

# Build
npm run build             # TypeScript + Vite (frontend)
npm run tauri build       # Build completo para a plataforma atual
npm run build:linux       # Build Linux (deb + AppImage)

# Testes
npm run test              # Vitest (execução única)
npm run test:watch        # Vitest watch mode
npm run test:coverage     # Cobertura com v8
cargo test --manifest-path src-tauri/Cargo.toml  # Testes Rust
```

Para rodar um único teste frontend:
```bash
npx vitest run src/test/nome-do-arquivo.test.ts
```

## Arquitetura

### Frontend (`src/`)

- **`App.tsx`** — Raiz: controla qual tab está ativa, registra atalhos de teclado globais.
- **`pages/`** — `HomeGrid.tsx` (grade de itens + botões de adição) e `Settings.tsx` (configurações do app).
- **`hooks/useSpatialNavigation.ts`** — Hook central (~15KB). Implementa navegação direcional por proximidade para teclado e gamepad. Toda lógica de foco espacial está aqui.
- **`components/`** — Componentes reutilizáveis (card de mídia, formulários, teclado virtual, etc.).
- **`translations.ts`** — Strings i18n (PT/EN). Acessadas via `useTranslation`.

Comunicação com o Rust via `invoke<Tipo>("nome_do_comando", { args })` do Tauri.

### Backend Rust (`src-tauri/src/`)

- **`lib.rs`** — Ponto de entrada do Tauri: registra todos os `#[tauri::command]` e inicializa plugins.
- **`db.rs`** — SQLite com `Mutex<Connection>` no `AppState`. Schema: tabelas `items` e `settings`. Migrações inline.
- **`processes.rs`** — Lançamento de executáveis, polling de gamepad (gilrs), listener global de mouse (rdev).
- **`scraper.rs`** — HTTP + parsing HTML (reqwest + scraper): extrai links, metadados Open Graph, valida URLs.
- **`system_apps.rs`** — Enumera aplicativos instalados (Linux via `.desktop` files, Windows via registro/lnk).
- **`browser_profile.rs`** — Gerenciamento de perfis de browser e migração.
- **`system_status.rs`** — Detecção de WiFi e informações do sistema.

### Comunicação Frontend ↔ Backend

Todos os comandos Tauri são registrados em `lib.rs`. Os principais grupos:
- **DB:** `get_items`, `add_item`, `delete_item`, `toggle_favorite`, `get_setting`, `update_setting`, `export_database`, `import_database`
- **Processos:** `launch_executable`, `launch_kiosk`, `get_active_targets`, `kill_target`, `kill_all_kiosks`
- **Sistema:** `get_system_apps`, `get_executable_metadata`, `get_system_status`, `open_wifi_settings`
- **Scraping:** `fetch_and_parse_links`, `fetch_site_metadata`, `sanitize_web_url`

### Testes

- Frontend: Vitest + jsdom + React Testing Library. Mocks globais para APIs do Tauri em `src/test/setup.ts`.
- Backend: módulos `#[cfg(test)]` inline (ex: `scraper.test.rs` importado em `scraper.rs`).
- CI executa apenas os testes frontend (`npm run test`). Testes Rust rodam separadamente.

## CI/CD

GitHub Actions (`.github/workflows/build.yml`): build matrix Windows (`windows-latest`) + Linux (`ubuntu-22.04`). Push para `main` cria automaticamente uma GitHub Release com tag `latest`.
