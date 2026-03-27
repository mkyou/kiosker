# Problemas de Implementação — Kiosker

*Análise estática do código-fonte. Atualizado em 26/03/2026.*

> **Contexto de ameaça**: o usuário é o dono da máquina e configura suas próprias URLs e executáveis. Ataques de "usuário contra si mesmo" foram removidos. O foco está em: crashes, travamentos, perda de dados e usabilidade.

---

## Estabilidade / Crashes

### 1. Thread bloqueada indefinidamente ao adicionar URL
- **Arquivo**: `src-tauri/src/scraper.rs:77-81`
- **Problema**: `fetch_and_parse_links` (chamado ao adicionar um site) não tem timeout. `check_links_health` tem timeout de 5s, mas esta função não.
- **Impacto**: Se a URL demorar ou travar, a thread do Tauri fica suspensa — o processo de adicionar um item nunca termina e a UI congela.
- **Severidade**: Alta

### 2. Panic ao parsear páginas externas
- **Arquivo**: `src-tauri/src/scraper.rs:95, 197, 231, 249, 326`
- **Problema**: Selectors CSS estáticos são construídos com `.unwrap()`. Embora os seletores em si sejam strings fixas (baixo risco de panic), qualquer futura edição que quebre o seletor derruba o processo sem mensagem de erro útil.
- **Impacto**: Crash silencioso ao processar páginas externas.
- **Severidade**: Média

### 3. Deadlock potencial no import de banco de dados
- **Arquivo**: `src-tauri/src/db.rs:214-226`
- **Problema**: `import_database` adquire `Mutex<Connection>` duas vezes em sequência, com `sleep(100ms)` como mitigação. Se qualquer outro handler tentar o lock entre os dois pontos, travamento.
- **Impacto**: Aplicação trava permanentemente após importar backup.
- **Severidade**: Alta

### 4. Import de banco sem verificação de integridade
- **Arquivo**: `src-tauri/src/db.rs:221-226`
- **Problema**: `fs::copy` + `Connection::open` sem `PRAGMA integrity_check`. Um arquivo SQLite corrompido é aceito silenciosamente.
- **Impacto**: Perda de todos os dados após importar um backup defeituoso.
- **Severidade**: Alta

### 5. Unsafe WinAPI sem validação completa (Windows)
- **Arquivo**: `src-tauri/src/processes.rs:103-174`
- **Problema**: `GetBitmapBits` não tem o retorno (`copied`) comparado contra `buffer_size`. Se `copied < buffer_size`, a conversão BGRA→RGBA itera além dos dados válidos.
- **Impacto**: Leitura fora dos limites; potencial crash ao carregar ícones de executáveis.
- **Severidade**: Média (Windows only)

---

## Usabilidade / Navegação

### 6. Triple-click mata kiosks durante uso normal da interface
- **Arquivo**: `src/hooks/useSpatialNavigation.ts:180-197`
- **Problema**: O listener de triple-click dispara em **qualquer** clique dentro da janela do Kiosker, não apenas em área específica. Se o usuário clicar em 3 botões da interface em menos de 1 segundo (ex: navegando rápido), todos os browsers kiosk são encerrados.
- **Impacto**: Comportamento destrutivo acidental durante uso normal.
- **Severidade**: Alta

### 7. Gamepad e mouse monitorados em duplicata (frontend + backend)
- **Arquivo**: `src-tauri/src/processes.rs:244-294` (backend gilrs) e `src/hooks/useSpatialNavigation.ts:209-286` (frontend Gamepad API) / `src-tauri/src/processes.rs:296-335` (backend rdev)
- **Problema**: Tanto o backend Rust quanto o frontend JS monitoram o gamepad e o mouse simultaneamente. O combo L3+R3 e o triple-click podem disparar duas vezes — uma pelo frontend, outra pelo backend — causando `kill_all_kiosks` duplo (inócuo, mas confuso) ou race condition.
- **Impacto**: Comportamento imprevisível; dificulta debugar quando o kiosk fecha sozinho.
- **Severidade**: Média

### 8. Wrap-around de navegação não respeita a linha atual
- **Arquivo**: `src/hooks/useSpatialNavigation.ts:99-119`
- **Problema**: Ao pressionar `→` no último item de uma linha, o wrap pula para o elemento mais à esquerda de **todo o DOM** (pode ser o primeiro item da Toolbar, não o início da mesma linha). O mesmo vale para `←` e `↓`.
- **Impacto**: O usuário perde o contexto de onde estava na grade ao navegar com joystick/teclado.
- **Severidade**: Média

### 9. Tolerância angular assimétrica na navegação direcional
- **Arquivo**: `src/hooks/useSpatialNavigation.ts:72-79`
- **Problema**: A direção `up` aceita `absDx <= absDy * 4.0` (cone de 76°), enquanto as demais aceitam `* 2.0` (63°). Isso faz com que pressionar "cima" frequentemente foque um item em outra coluna ao invés do item diretamente acima.
- **Impacto**: Navegação para cima é imprecisa em grades largas.
- **Severidade**: Baixa

### 10. Sem foco inicial ao carregar a aplicação
- **Arquivo**: `src/hooks/useSpatialNavigation.ts:36-45`
- **Problema**: Nenhum elemento recebe foco ao carregar. A primeira tecla direcional foca `focusableElements[0]`, que é o primeiro elemento focável no DOM — geralmente um botão da Toolbar, não o primeiro card da grade.
- **Impacto**: O usuário com joystick precisa navegar "pelo avesso" para chegar ao primeiro item da grade.
- **Severidade**: Baixa

### 11. VirtualKeyboard nunca é exibido
- **Arquivo**: `src/App.tsx:15-21, 77-82`
- **Problema**: `isKeyboardVisible` é sempre `false` — não existe nenhum código que o defina como `true`. Além disso, `handleKeyboardInput` só faz `console.log`. O teclado virtual é código morto.
- **Impacto**: Recurso anunciado (relevante para kiosks sem teclado físico) não funciona.
- **Severidade**: Alta

### 12. Status de WiFi retorna `true` como fallback
- **Arquivo**: `src-tauri/src/system_status.rs:96-98`
- **Problema**: Quando a detecção de conectividade falha, o sistema assume que há conexão.
- **Impacto**: A UI indica "conectado" mesmo sem internet; operações de scraping falham silenciosamente.
- **Severidade**: Baixa

---

## Resumo

| Categoria         | Qtd |
|-------------------|-----|
| Estabilidade/Crash | 5  |
| Usabilidade/Nav   | 7   |
| **Total**         | **12** |

## Prioridade de correção

1. **Imediato**: #6 Triple-click acidental, #11 VirtualKeyboard morto, #1 Timeout no scraper
2. **Importante**: #3 Deadlock no import, #4 Integrity check, #8 Wrap-around por linha
3. **Melhorias**: #7 Duplicação gamepad/mouse, #9 Tolerância angular, #10 Foco inicial
