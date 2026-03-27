# Lista de Testes — Kiosker

*Gerado em 26/03/2026. Cobre Linux e Windows. Indica o que já existe e o que está faltando.*

Convenção: ✅ já existe | ❌ não existe

---

## Backend Rust

### `scraper.rs` / `scraper.test.rs`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 1 | `sanitize_web_url` — adiciona `https://` quando ausente | `test_sanitize_web_url` | ✅ |
| 2 | `sanitize_web_url` — remove espaços no início e fim | `test_sanitize_web_url` | ✅ |
| 3 | `sanitize_web_url` — preserva `http://` existente | `test_sanitize_web_url` | ✅ |
| 4 | `sanitize_web_url` — preserva `https://` existente | `test_sanitize_web_url` | ✅ |
| 5 | `is_valid_url` — aceita URLs `http://` e `https://` válidas | `test_is_valid_url_valid_urls` | ✅ |
| 6 | `is_valid_url` — rejeita URL vazia | `test_is_valid_url_invalid_urls` | ✅ |
| 7 | `is_valid_url` — rejeita `ftp://`, `javascript:`, `data:`, `vbscript:` | `test_is_valid_url_invalid_urls` | ✅ |
| 8 | `is_valid_url` — rejeita URL sem protocolo | `test_is_valid_url_invalid_urls` | ✅ |
| 9 | `is_valid_url` — rejeita URL com `<`, `>`, `;` | `test_is_valid_url_special_characters` | ✅ |
| 10 | `is_valid_url` — rejeita URL com caracteres de controle | `test_is_valid_url_control_characters` | ✅ |
| 11 | `is_valid_url` — rejeita URL > 2000 caracteres | `test_is_valid_url_url_length_limits` | ✅ |
| 12 | `is_valid_url` — aceita URL de exatamente 2000 caracteres | `test_is_valid_url_url_length_limits` | ✅ |
| 13 | `extrapolate_title_from_url` — domínio simples → título capitalizado | `test_extrapolate_title_from_url` | ✅ |
| 14 | `extrapolate_title_from_url` — remove `www.` antes de capitalizar | `test_extrapolate_title_from_url` | ✅ |
| 15 | `extrapolate_title_from_url` — ignora path (`/watch`, `/home`) | `test_extrapolate_title_from_url` | ✅ |
| 16 | `extrapolate_title_from_url` — URL vazia retorna string vazia | `test_extrapolate_title_from_url` | ✅ |
| 17 | `fetch_site_metadata` — título limpo remove sufixo após `\|` | `test_fetch_site_metadata_cleans_title_pipe_separator` | ✅ |
| 18 | `fetch_site_metadata` — título limpo remove sufixo após `-` e `—` | `test_fetch_site_metadata_cleans_title_dash_separator`, `_emdash_separator` | ✅ |
| 19 | `fetch_site_metadata` — descarta títulos Cloudflare ("just a moment", "attention required") | `test_fetch_site_metadata_discards_just_a_moment_title`, `_attention_required_title` | ✅ |
| 20 | `fetch_site_metadata` — fallback para `extrapolate_title_from_url` quando título ausente | `test_fetch_site_metadata_fallback_title_from_url_when_no_title` | ✅ |
| 21 | `fetch_site_metadata` — usa Google favicon API quando `og:image` não encontrado | `test_fetch_site_metadata_falls_back_to_google_favicon_api_when_no_icon` | ✅ |
| 22 | `fetch_site_metadata` — substitui favicon `.ico` pelo Google favicon API | `test_fetch_site_metadata_replaces_ico_favicon_with_google_api` | ✅ |
| 23 | `fetch_site_metadata` — resolve favicon relativo (`/favicon.png` → URL completa) | `test_fetch_site_metadata_resolves_relative_favicon` | ✅ |
| 24 | `fetch_site_metadata` — resolve favicon com `//` (protocolo relativo) | `test_fetch_site_metadata_resolves_protocol_relative_favicon` | ✅ |
| 25 | `search_fallback_image` — substitui espaços por `+` na query | `test_search_fallback_image_sanitizes_spaces_in_query` | ✅ (🔌 `#[ignore]`) |
| 26 | `search_fallback_image` — remove `https://` e `http://` da query | `test_search_fallback_image_sanitizes_url_in_query` | ✅ (🔌 `#[ignore]`) |
| 27 | `check_links_health` — considera 2xx como saudável | `test_check_links_health_2xx_is_healthy` | ✅ |
| 28 | `check_links_health` — considera 3xx (redirect) como saudável | `test_check_links_health_3xx_is_healthy` | ✅ |
| 29 | `check_links_health` — considera 401 e 403 (anti-bot) como saudável | `test_check_links_health_401_is_healthy`, `_403_is_healthy` | ✅ |
| 30 | `check_links_health` — exclui URLs com erro de rede ou timeout | `test_check_links_health_unreachable_is_not_healthy`, `_5xx_is_not_healthy` | ✅ |
| 31 | `fetch_and_parse_links` — rejeita URL inválida antes de fazer request | `test_fetch_and_parse_links_rejects_invalid_url` | ✅ |
| 32 | `fetch_and_parse_links` — deduplica links repetidos | `test_fetch_and_parse_links_deduplicates_consecutive` | ✅ |
| 33 | `fetch_and_parse_links` — ignora links sem `http` (links relativos, âncoras) | `test_fetch_and_parse_links_ignores_relative_and_anchor_links` | ✅ |

> **Nota**: Testes de integração com rede real estão em `scraper.test.rs` marcados com `#[ignore]`. Execute com `cargo test -- --ignored` para rodá-los explicitamente.

---

### `db.rs`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 34 | `add_item` → `get_items` retorna o item inserido | `test_add_and_get_item` | ✅ |
| 35 | `update_setting` → `get_setting` retorna o valor salvo | `test_browser_persistence` | ✅ |
| 36 | `update_setting` atualiza valor existente sem duplicar chave | `test_browser_persistence` | ✅ |
| 37 | Persistência de idioma (pt, en, es, zh) | `test_language_persistence` | ✅ |
| 38 | Schema possui coluna `is_favorite` com padrão 0 | `test_is_favorite_defaults_to_false` | ✅ |
| 39 | `add_item` — rejeita duplicata com mesmo `target_path` | `test_add_item_rejects_duplicate_target_path` | ✅ |
| 40 | `add_item` — aceita dois itens com `target_path` diferentes | `test_add_item_accepts_different_target_paths` | ✅ |
| 41 | `get_items` — retorna campo `is_favorite` corretamente (0 e 1) | `test_get_items_returns_is_favorite_correctly` | ✅ |
| 42 | `toggle_favorite` — define `is_favorite = true` para item existente | `test_toggle_favorite_sets_true` | ✅ |
| 43 | `toggle_favorite` — define `is_favorite = false` para item existente | `test_toggle_favorite_sets_false` | ✅ |
| 44 | `delete_item` — remove o item correto pelo id | `test_delete_item_removes_correct_item` | ✅ |
| 45 | `delete_item` — não remove outros itens | `test_delete_item_does_not_remove_other_items` | ✅ |
| 46 | `update_item` — atualiza apenas o título do item correto | `test_update_item_changes_title` | ✅ |
| 47 | `update_item` — não altera outros campos do item | `test_update_item_does_not_change_other_fields` | ✅ |
| 48 | `get_setting` — retorna `None` para chave inexistente | `test_get_setting_returns_none_for_missing_key` | ✅ |

---

### `browser_profile.rs`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 49 | `find_firefox_profile_in_dir` — encontra dir com `.default-release` | `test_find_firefox_profile` | ✅ |
| 50 | `find_firefox_profile_in_dir` — retorna `None` para diretório vazio | `test_find_firefox_profile_in_dir_returns_none_for_empty_dir` | ✅ |
| 51 | `find_firefox_profile_in_dir` — retorna `None` quando path não existe | `test_find_firefox_profile_in_dir_returns_none_for_nonexistent_path` | ✅ |
| 52 | `find_firefox_profile_in_dir` — encontra dir com `.default` (sem `-release`) | `test_find_firefox_profile_in_dir_finds_plain_default_profile` | ✅ |
| 53 | `run_browser_migration` (Firefox) — copia arquivos corretos (`places.sqlite`, `key4.db`, etc.) | `test_migration_firefox_copies_correct_files` | ✅ |
| 54 | `run_browser_migration` (Chrome) — copia arquivos corretos (`Cookies`, `Login Data`, etc.) | `test_migration_chrome_copies_correct_files` | ✅ |
| 55 | `run_browser_migration` — cria subpasta `Default` para Chrome/Edge | `test_migration_chrome_dest_is_default_subfolder` | ✅ |
| 56 | `run_browser_migration` — não falha quando arquivo fonte não existe | `test_migration_skips_missing_source_files` | ✅ |
| 57 | `run_browser_migration` — grava `browser.type` com o nome correto | `test_migration_writes_browser_type_file` | ✅ |
| 58 | `get_kiosker_profile_dir` — cria diretório se não existir | `test_profile_dir_creation_if_not_exists` | ✅ |

---

### `system_apps.rs`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 59 | `parse_desktop_file` — extrai `Name`, `Exec`, `Icon`, `Comment` | `test_parse_desktop_file` | ✅ (Linux) |
| 60 | `parse_desktop_file` — ignora entrada com `NoDisplay=true` | `test_parse_hidden_desktop_file` | ✅ (Linux) |
| 61 | `parse_desktop_file` — remove `%u`, `%U`, `%f`, `%F` do `Exec` | `test_parse_desktop_file_removes_all_percent_placeholders` | ✅ (Linux) |
| 62 | `parse_desktop_file` — retorna `None` quando `Name` ausente | `test_parse_desktop_file_returns_none_when_name_missing` | ✅ (Linux) |
| 63 | `parse_desktop_file` — retorna `None` quando `Exec` ausente | `test_parse_desktop_file_returns_none_when_exec_missing` | ✅ (Linux) |
| 64 | `parse_desktop_file` — para de ler ao encontrar nova seção `[OtherSection]` | `test_parse_desktop_file_stops_reading_at_new_section` | ✅ (Linux) |
| 65 | `scan_linux_dir_for_apps` — ignora arquivos sem extensão `.desktop` | `test_scan_linux_dir_ignores_non_desktop_files` | ✅ (Linux) |
| 66 | `get_system_apps` — resultado é ordenado alfabeticamente (case-insensitive) | `test_get_system_apps_result_is_sorted_alphabetically` | ✅ |
| 67 | `get_system_apps` — resultado deduplica por nome | `test_get_system_apps_deduplicates_by_name` | ✅ |

---

### `processes.rs`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 68 | `get_executable_metadata` — extrai `file_stem` de path Windows | `test_process_metadata_fallback` | ✅ |
| 69 | `get_executable_metadata` — extrai `file_stem` de path Linux | `test_process_metadata_fallback` | ✅ |
| 70 | `get_active_targets` — retorna `target_path` dos PIDs registrados | `test_active_targets_tracking` | ✅ |
| 71 | `kill_target` — remove apenas o alvo correto da lista | `test_kill_target_logic_clean_up` | ✅ |
| 72 | Triple-click: diferença > 1000ms reinicia contagem | `test_right_click_interval` | ✅ (parcial) |
| 73 | `get_executable_metadata` — path sem extensão retorna o nome completo como título | `test_get_executable_metadata_path_without_extension` | ✅ |
| 74 | `convert_image_to_base64` — PNG retorna `data:image/png;base64,...` | `test_convert_image_to_base64_png` | ✅ |
| 75 | `convert_image_to_base64` — SVG retorna `data:image/svg+xml;base64,...` | `test_convert_image_to_base64_svg` | ✅ |
| 76 | `convert_image_to_base64` — retorna `None` para arquivo inexistente | `test_convert_image_to_base64_returns_none_for_nonexistent_file` | ✅ |
| 77 | `kill_target` — é no-op quando target não existe na lista | `test_kill_target_noop_when_target_not_found` | ✅ |
| 78 | `kill_target` — remove todas as entradas quando mesmo target aparece mais de uma vez | `test_kill_target_removes_all_matching_entries` | ✅ |
| 79 | `get_active_targets` — remove PIDs mortos da lista (limpeza) | `test_active_targets_cleanup_filters_dead_pids` | ✅ |
| 80 | `launch_executable` — falha com erro descritivo para path inexistente | `test_launch_executable_fails_for_nonexistent_path` | ✅ |

---

## Frontend TypeScript

### `useSpatialNavigation.ts`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 81 | Seta `→` move foco para o elemento à direita | `ArrowRight moves focus to the element on the right` | ✅ |
| 82 | Seta `←` move foco para o elemento à esquerda | `ArrowLeft moves focus to the element on the left` | ✅ |
| 83 | Seta `↓` move foco para o elemento abaixo | `ArrowDown moves focus to the element below` | ✅ |
| 84 | Seta `↑` move foco para o elemento acima | `ArrowUp moves focus to the element above` | ✅ |
| 85 | `Enter` dispara `.click()` no elemento focado | `Enter fires .click() on the focused element` | ✅ |
| 86 | `Ctrl+Shift+Q` invoca `kill_all_kiosks` | `Ctrl+Shift+Q invokes kill_all_kiosks` | ✅ |
| 87 | `Shift+F10` dispara evento `contextmenu` no elemento focado | `Shift+F10 dispatches contextmenu event on the focused element` | ✅ |
| 88 | Triple-click em ≤ 1000ms invoca `kill_all_kiosks` | `three left-clicks within 1000ms invoke kill_all_kiosks` | ✅ |
| 89 | Triple-click com > 1000ms entre cliques NÃO invoca `kill_all_kiosks` | `third click after >1000ms from previous resets count and does NOT invoke kill_all_kiosks` | ✅ |
| 90 | Wrap `→`: sem elemento à direita, vai para o elemento mais à esquerda | `ArrowRight on the rightmost element wraps focus to the leftmost element` | ✅ |
| 91 | Wrap `←`: sem elemento à esquerda, vai para o elemento mais à direita | `ArrowLeft on the leftmost element wraps focus to the rightmost element` | ✅ |
| 92 | Wrap `↓`: sem elemento abaixo, vai para o elemento mais ao topo | `ArrowDown on the bottommost element wraps focus to the topmost element` | ✅ |
| 93 | `↑` sem elemento acima não move foco (sem wrap) | `ArrowUp on the topmost element does NOT move focus (no up wrap)` | ✅ |
| 94 | Menu ativo confina navegação: só itera elementos dentro do menu | `navigation is confined to elements within the active [role="menu"]` | ✅ |
| 95 | Sem elemento focado: primeira tecla direcional foca o primeiro elemento | `first arrow press focuses the first focusable element when nothing is focused` | ✅ |
| 96 | Debounce de gamepad: ações em < 150ms são ignoradas | `second gamepad action within the 150ms debounce window is ignored` | ✅ |
| 97 | Gamepad botão 0 (A/Cross) dispara `.click()` no elemento focado | `button 0 (A/Cross) fires click on the focused element` | ✅ |
| 98 | Gamepad botão 3 (Y/Triangle) ou 9 (Start) dispara `contextmenu` | `button 3 (Y/Triangle) dispatches contextmenu on the focused element` | ✅ |
| 99 | Gamepad L3+R3 (botões 10+11) 3x em ≤ 1000ms invoca `kill_all_kiosks` | `L3+R3 combo pressed 3 times within 1000ms invokes kill_all_kiosks` | ✅ |
| 100 | Cleanup: `removeEventListener` e `cancelAnimationFrame` no unmount | `cleanup removes event listeners and cancels animation frame on unmount` | ✅ |

---

### `MediaCard`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 101 | Clique no card lança URL no kiosk (`item_type === "web"`) | `calls invoke("launch_kiosk") with the URL when a web card is clicked` | ✅ |
| 102 | Clique no card lança executável (`item_type === "exe"`) | `calls invoke("launch_executable") with path when an exe card is clicked` | ✅ |
| 103 | Card mostra badge "Running" quando `isRunning = true` | `shows "RODANDO" badge when isRunning is true` | ✅ |
| 104 | Card não mostra badge "Running" quando `isRunning = false` | `does NOT show "RODANDO" badge when isRunning is false` | ✅ |
| 105 | Right-click abre menu de contexto | `opens the context menu on right-click at specific coordinates` | ✅ |
| 106 | Menu de contexto fica dentro dos limites do viewport | `opens the context menu on right-click at specific coordinates` | ✅ |
| 107 | Menu se fecha ao perder foco (`onBlur`) | `context menu closes on blur when focus leaves the card` | ✅ |
| 108 | Menu mostra botão "Fechar" apenas quando `isRunning = true` | `shows "Fechar" button only when isRunning is true` | ✅ |
| 109 | Menu "Favorito": ícone `★` quando `is_favorite = true` | `shows ★ icon in favorite button when is_favorite is true` | ✅ |
| 110 | Menu "Favorito": ícone `☆` quando `is_favorite = false` | `shows ☆ icon in favorite button when is_favorite is false` | ✅ |
| 111 | Clique em "Editar" ativa modo de edição inline | `shows an input when "EDITAR" is clicked in context menu` | ✅ |
| 112 | Edição: `Enter` salva o novo título | `saves the new title when Enter is pressed in edit input` | ✅ |
| 113 | Edição: `Escape` cancela sem salvar | `cancels edit mode on Escape without calling invoke("update_item")` | ✅ |
| 114 | Edição: título vazio cancela sem invocar `update_item` | `empty title cancels edit without calling invoke("update_item")` | ✅ |
| 115 | Edição: título igual ao original cancela sem invocar `update_item` | `same title as original cancels edit without calling invoke("update_item")` | ✅ |
| 116 | Edição: blur salva o novo título | `blur on the edit input saves the new title` | ✅ |
| 117 | `Shift+F10` / `ContextMenu` abre menu de contexto | `Shift+F10 opens the context menu on the focused button` | ✅ |

---

### `VirtualKeyboard`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 118 | Renderiza com todas as teclas visíveis | `VirtualKeyboard.test.tsx` | ✅ |
| 119 | Clique em tecla chama `onKeyPress` com a tecla correta | `VirtualKeyboard.test.tsx` | ✅ |
| 120 | `Backspace` chama `onKeyPress("Backspace")` | `VirtualKeyboard.test.tsx` | ✅ |
| 121 | `Enter` chama `onKeyPress("Enter")` | `VirtualKeyboard.test.tsx` | ✅ |
| 122 | Espaço chama `onKeyPress(" ")` | `VirtualKeyboard.test.tsx` | ✅ |
| 123 | `Esc` chama `onClose` | `VirtualKeyboard.test.tsx` | ✅ |
| 124 | Shift ativado → letras saem em maiúsculo | `VirtualKeyboard.test.tsx` | ✅ |
| 125 | Shift desativado → letras voltam para minúsculo | `VirtualKeyboard.test.tsx` | ✅ |
| 126 | Sequência de teclas chama `onKeyPress` na ordem correta | `VirtualKeyboard.test.tsx` | ✅ |

---

### `HomeGrid`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 127 | Itens favoritos são exibidos na seção "Favoritos" | `renders favorite, web, and app items grouped correctly` | ✅ |
| 128 | Itens `item_type === "web"` são exibidos na seção "Web" | `renders favorite, web, and app items grouped correctly` | ✅ |
| 129 | Itens `item_type === "exe"` são exibidos na seção "Apps" | `renders favorite, web, and app items grouped correctly` | ✅ |
| 130 | Seção "Favoritos" não aparece quando não há favoritos | `does not render "Favoritos" section when no items are favorites` | ✅ |
| 131 | Tela vazia exibe botões de ação quando `items = []` | `renders empty state when there are no items and not loading` | ✅ |
| 132 | Itens dentro de cada seção são ordenados alfabeticamente | `renders web items in alphabetical order` | ✅ |
| 133 | Modal de confirmação de exclusão abre ao solicitar delete | `opens delete confirmation modal when delete is requested via context menu` | ✅ |
| 134 | Confirmar exclusão chama `delete_item` e atualiza lista | `confirm delete calls invoke("delete_item") and closes the modal` | ✅ |
| 135 | Cancelar exclusão não chama `delete_item` | `cancel delete does NOT call invoke("delete_item") and closes the modal` | ✅ |

---

### `Settings`

| # | Funcionalidade | Teste | Status |
|---|----------------|-------|--------|
| 136 | Browser selecionado é destacado visualmente | `highlights the selected browser button with neon-glow class` | ✅ |
| 137 | Clicar em outro browser inicia migração e atualiza estado | `updates browser and runs migration if a different browser is clicked` | ✅ |
| 138 | Botões de browser ficam desabilitados durante migração | `disables browser buttons during migration` | ✅ |
| 139 | Clicar no mesmo browser já selecionado não inicia migração | `does nothing if the already selected browser is clicked` | ✅ |
| 140 | Autostart toggle chama `enable()` / `disable()` corretamente | `calls enable() when autostart is false` / `calls disable() when autostart is true` | ✅ |
| 141 | Export exibe toast de sucesso | `calls export_database and alerts the result` | ✅ |
| 142 | Import exibe toast de sucesso | `calls import_database and alerts the result` | ✅ |
| 143 | Toast desaparece após 3 segundos | `toast disappears after 3 seconds` | ✅ |
| 144 | Clicar em idioma atualiza o idioma da interface | `changes language to English on click and updates text` | ✅ |
| 145 | Idioma selecionado é destacado visualmente | `highlights the selected language button with neon-glow class` | ✅ |

---

## Resumo

| Módulo | Existem | Faltam | Total |
|--------|---------|--------|-------|
| `scraper.rs` | 33 | 0 | 33 |
| `db.rs` | 14 | 0 | 14 |
| `browser_profile.rs` | 11 | 0 | 11 |
| `system_apps.rs` | 9 | 0 | 9 |
| `processes.rs` | 12 | 0 | 12 |
| `useSpatialNavigation.ts` | 20 | 0 | 20 |
| `MediaCard` | 17 | 0 | 17 |
| `VirtualKeyboard` | 9 | 0 | 9 |
| `HomeGrid` | 9 | 0 | 9 |
| `Settings` | 10 | 0 | 10 |
| **Total** | **144** | **0** | **144** |

**Prioridade de escrita** (impacto em regressões ao mexer no código):
1. `useSpatialNavigation.ts` — vai ser refatorado (navegação ruim), zero cobertura hoje
2. `db.rs` — CRUD que tudo usa; faltam testes de toggle, delete, update e duplicata
3. `scraper.rs` — lógica de limpeza de título e fallback de ícone sem cobertura
4. `MediaCard` — componente central da UI, zero cobertura
5. `browser_profile.rs` — migração de perfil sem cobertura
