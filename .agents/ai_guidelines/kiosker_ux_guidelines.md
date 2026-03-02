# Kiosker - AI UX/UI Guidelines 

> **DIRETRIZ DE ESCOPO:** O agente encarregado deste arquivo atua EXCLUSIVAMENTE como UI/UX Designer e Desenvolvedor Frontend Visual. Você **NÃO DEVE** alterar a lógica de banco de dados, refatorar rotinas do Rust ou mudar requisições assíncronas. Seu escopo é garantir que interfaces, tailwind, cores, transições e regras de responsividade listadas abaixo sejam fielmente reproduzidas e preservadas durantes implementações futuras.

Este documento serve como a fonte da verdade do Design System para o desenvolvimento do Kiosker.

## O Estilo Escolhido: Minimalismo Cinemático (Apple TV / tvOS)

O Kiosker é um aplicativo feito para TVs e telas de Kiosk. O estilo visual é inspirado na Apple TV. A inteface deve ser invisível, e o conteúdo (arte dos filmes e jogos) deve brilhar.

### 1. Paleta de Cores e Fundo (Background)
- **O Fundo Master:** Deve ser preto puro (`#000000`) para se fundir nas bordas da TV.
- **Background Dinâmico (Orbs/Blobs):** No fundo, atrás de tudo, devem existir manchas orgânicas de gradiente suave (Ex: roxo, azul escuro, magenta). Essas manchas devem ser imensas e ter aplicadas nelas uma classe de `blur` extremo (ex: `blur-3xl` ou `backdrop-blur-3xl`).
- **Surface:** Os elementos UI (Cards, Menus) nunca são sólidos. Eles usam `bg-white/5` ou `bg-white/10` acompanhados do efeito `backdrop-blur-lg` para formar o clássico "Glassmorphism".
- **Bordas:** Cartões inativos possuem uma borda extremamente fina e sutil (`border border-white/10`).

### 2. Tipografia (Typography)
- O projeto usa as fontes **Outfit** para títulos (`font-display`) e **Inter** para textos longos/UI (`font-sans`).
- Não queremos as fontes nativas monótonas (`sans-serif`, Arial, etc). Quando os agentes reconstruírem propriedades sem usar as classes Tailwind atreladas às fontes, o frontend quebrará.

### 3. Anatomia dos Cards (MediaCard)
- Proporção natural de poster de filme (Retrato, aproximado de 2:3).
- **Inativo:** Transparente, cantos arredondados (`rounded-3xl` ou superior), arte do filme visível, título esmaecido ou ausente.
- **Focado (Hover / Focus):** 
  - O card sofre um escalonamento (`transform scale-105` ou `scale-110`).
  - O card flutua ganhando profundidade (`drop-shadow-2xl`).
  - A borda fina translúcida de `white/10` muda estourando em uma luz sólida branca: `border-white ring-2 ring-white/50`.
  - Gradiente escuro no rodapé (para o nome da obra) torna-se mais nítido na arte não focada anteriormente.

### 4. Anatomia do Menu Lateral (Sidebar)
As únicas categorias laterais exigidas e aprovadas pelo usuário são:
1. **Início** (Reunindo os acessos recentes/Populares)
2. **Streaming** (Web Apps focado em Mídia)
3. **Jogos** (Emuladores e PC nativo)

- **Comportamento:** O menu lateral esquerdo é super restrito. Quando o usuário navega pelo lado direito da tela, o menu fica recolhido mostrando apenas Ícones.
- **Expansão Sanfona:** Apenas se o spatial focus (Teclado esquerdo/Controle pra esquerda) cair explicitamente na área da Sidebar, as palavras devem reaparecer expandindo o controle (Animação de "Width").

### 5. Navegação Espacial (Spatial Navigation Engine)
A regra de ouro da "10-foot UI":
- **Nunca use o foco naterno do mouse/browser (`:focus-visible` nativo que desenha um outline azul grosseiro).**
- O sistema usa a lógica de controle React onde nós sabemos *qual é o ID* do elemento focado (`focusedIndex`).
- Todos os efeitos de cor e sombra citados acima devem transacionar fluidamente `transition-all duration-300 ease-out` na mudança de foco.
- Os cartões não devem colidir ou se espremer sob responsividade do FlexBox/Grid em resoluções minúsculas (Mantenha o padding coerente).
