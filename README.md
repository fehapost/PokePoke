# NOVA REGION — PokePoke

Jogo Pokémon-style em HTML5/Canvas. Projeto multi-arquivo, pronto para Vercel.

## Estrutura

```
index.html          página do jogo
css/estilo.css      estilos
js/sprites.js       carregamento de sprites (lazy loading dos Pokémon)
js/jogo.js          lógica do jogo
assets/
  personagens/<nome>/  10 personagens jogáveis (frente/tras/esq/dir _0.._4)
  pokemon/<nome>/      Pokémon companheiros (carregados sob demanda)
  npcs/                NPCs com sprite dedicado
```

## Publicar na Vercel

1. Suba esta pasta num repositório Git (GitHub/GitLab/Bitbucket).
2. Em vercel.com → Add New Project → importe o repositório.
3. Framework Preset: **Other** (é site estático, sem build).
4. Deploy. Pronto — a Vercel serve `index.html` na raiz.

Não há etapa de build nem dependências: é HTML/CSS/JS puro.

## Adicionar um novo Pokémon

1. Crie a pasta `assets/pokemon/<nome_minusculo>/` com os 20 PNGs
   (frente_0..4, tras_0..4, esq_0..4, dir_0..4), 64x64 transparente.
2. Em `js/sprites.js`, adicione a entrada em `_MON_PASTA`
   (ex.: `Pidgey:'pidgey'`).
3. O carregamento é sob demanda — nada mais a fazer no loader.

## Sobre o lazy loading

Personagens jogáveis e NPCs carregam ao abrir. Cada Pokémon só é
baixado quando aparece (segue o jogador / entra em cena), via
`carregarMon(nome)`. Isso permite ter 151 Pokémon sem pesar a abertura.
