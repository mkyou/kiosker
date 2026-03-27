# Problemas de Implementação — Kiosker

*Análise estática do código-fonte. Atualizado em 26/03/2026.*

> **Contexto de ameaça**: o usuário é o dono da máquina e configura suas próprias URLs e executáveis. Ataques de "usuário contra si mesmo" foram removidos. O foco está em: crashes, travamentos, perda de dados e usabilidade.

---

## Estabilidade / Crashes

### ~~1. Thread bloqueada indefinidamente ao adicionar URL~~ ✅ Corrigido
- **Arquivo**: `src-tauri/src/scraper.rs`
- **Correção**: Adicionado `.timeout(Duration::from_secs(10))` ao cliente HTTP em `fetch_and_parse_links`.

### ~~2. Panic ao parsear páginas externas~~ ✅ Corrigido
- **Arquivo**: `src-tauri/src/scraper.rs`
- **Correção**: Todos os `Selector::parse(...).unwrap()` substituídos por tratamento de erro com `?` ou `match`.

### ~~3. Deadlock potencial no import de banco de dados~~ ✅ Corrigido
- **Arquivo**: `src-tauri/src/db.rs`
- **Correção**: Lock do `Mutex<Connection>` mantido em bloco único durante toda a troca, eliminando a janela de race condition.

### ~~4. Import de banco sem verificação de integridade~~ ✅ Corrigido
- **Arquivo**: `src-tauri/src/db.rs`
- **Correção**: `PRAGMA integrity_check` executado numa conexão temporária antes de copiar o arquivo para o banco ativo.

### ~~5. Unsafe WinAPI sem validação completa (Windows)~~ ✅ Corrigido
- **Arquivo**: `src-tauri/src/processes.rs`
- **Correção**: Retorno de `GetBitmapBits` comparado contra `buffer_size`; leituras parciais são descartadas antes da conversão BGRA→RGBA.

---

## Usabilidade / Navegação

### ~~6. Triple-click mata kiosks durante uso normal da interface~~ ✅ Corrigido
- **Arquivo**: `src/hooks/useSpatialNavigation.ts`
- **Correção**: Contador reinicia quando o alvo do clique muda — exige 3 cliques consecutivos no **mesmo** elemento.

### ~~7. Gamepad e mouse monitorados em duplicata (frontend + backend)~~ ✅ Corrigido
- **Arquivo**: `src/hooks/useSpatialNavigation.ts`
- **Correção**: Bloco L3+R3 removido do frontend; o combo é tratado exclusivamente pelo backend gilrs.

### ~~8. Wrap-around de navegação não respeita a linha atual~~ ✅ Corrigido
- **Arquivo**: `src/hooks/useSpatialNavigation.ts`
- **Correção**: Wrap filtra elementos da mesma linha (tolerância de 60% da altura) ou coluna antes de selecionar o alvo.

### ~~9. Tolerância angular assimétrica na navegação direcional~~ ✅ Corrigido
- **Arquivo**: `src/hooks/useSpatialNavigation.ts`
- **Correção**: Direção `up` unificada com as demais: `absDx <= absDy * 2.0` (cone de 63°).

### ~~10. Sem foco inicial ao carregar a aplicação~~ ✅ Corrigido
- **Arquivo**: `src/hooks/useSpatialNavigation.ts`
- **Correção**: Primeira navegação foca o primeiro elemento fora de `nav/header/toolbar`; cai no `focusableElements[0]` apenas se nenhum elemento de conteúdo existir.

### ~~11. VirtualKeyboard nunca é exibido~~ ✅ Corrigido
- **Arquivo**: `src/App.tsx`, `src/components/VirtualKeyboard.tsx`
- **Correção**: Listeners `focusin`/`focusout` adicionados para mostrar/ocultar automaticamente; `handleKeyboardInput` implementado com native value setter para compatibilidade com React; `onPointerDown` previne roubo de foco nos botões do teclado.

### ~~12. Status de WiFi retorna `true` como fallback~~ ✅ Corrigido
- **Arquivo**: `src-tauri/src/system_status.rs`
- **Correção**: Fallback alterado de `true` para `false` — quando a detecção falha, assume-se sem conexão.

---

## Resumo

Todos os 12 problemas identificados foram corrigidos.
