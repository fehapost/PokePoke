# NOVA REGION — Guia de Próximos Passos

Este guia descreve como o projeto cresce a partir daqui: como adicionar
Pokémon que andam, como completar a Pokédex, e a ordem recomendada das
próximas grandes tarefas (deploy, sprites de batalha locais, Supabase).

O projeto agora é **multi-arquivo** (`pokepoke_site/`). Nada mais é
embutido em HTML — sprites são arquivos na pasta `assets/`.

---

## 1. Estado atual (junho/2026)

- **Mapa:** 67 × 48 tiles, 2 regiões (Cidade + Rota Norte) ligadas por portais.
- **Personagens jogáveis:** 10 (4 direções × 5 frames cada).
- **Pokémon na Pokédex:** 149 cadastrados (dados completos).
- **Pokémon que andam atrás do jogador:** 9 (4 iniciais + 5 evoluções).
- **Treinadores:** 40. **Casas:** 5. **NPCs:** 8 de campo + 3 internos.
- **Mecânicas:** batalha por turnos, captura, evolução, XP/nível, Pokédex,
  rival, party, PC, save/load (localStorage), companheiro que segue,
  troca de região, áudio por região.
- **Sprites de batalha:** hoje vêm da PokeAPI online → **tarefa pendente:
  baixar para o projeto** (ver seção 4).

---

## 2. Fluxo para adicionar Pokémon que ANDAM (sprites de campo)

Estes são os Pokémon que seguem o jogador / aparecem animados no mapa.

### O que VOCÊ faz
1. Gera a folha de sprite no padrão de sempre:
   - 4 linhas: ESQUERDA, DIREITA, FRENTE, TRÁS
   - 5 colunas: 0 (parado) + 1–4 (caminhada)
   - Fundo liso ou xadrez (eu removo no recorte)
2. Me envia a folha (uma ou várias de uma vez), dizendo o **nome** de cada.

### O que EU faço
1. Recorto a folha em 20 PNGs (64×64, fundo transparente, ancorados pelos pés).
2. Confiro o grid recortado antes de gravar (validação visual).
3. Crio a pasta `assets/pokemon/<nome_minusculo>/` com os 20 PNGs.
4. Adiciono a linha no mapa `_MON_PASTA` em `js/sprites.js`.
5. Se for evolução, ligo a cadeia (o sprite troca quando evolui).
6. Rodo os testes (sintaxe + carregamento + lógica) e te devolvo o
   **projeto atualizado em zip**.

### O que muda no código (eu cuido disso)
- `js/sprites.js`: uma linha em `_MON_PASTA`, ex.: `Pidgey:'pidgey'`.
- Carregamento é **sob demanda** (lazy): o sprite só baixa quando o
  Pokémon aparece. Por isso dá pra ter 151 sem pesar a abertura.

---

## 3. Fluxo para completar a POKÉDEX (dados dos 149→151)

A Pokédex já tem 149 entradas com dados (tipo, evolução, raridade,
atributos). Para cada Pokémon, os campos são:

```
id | Nome | Tipo1 | Tipo2 | estágio | raridade | nível | atk | def | vel | evolui_para
```

### Faltam
- **2 entradas** para fechar 151 (conferir quais — provavelmente formas
  ou números pulados).
- Revisão de evoluções e raridades, se você quiser ajustar balanceamento.

Se quiser mexer nisso, me diz o que ajustar (ex.: "Mewtwo raridade
lendário, nível 70") que eu edito a tabela `BASE_POKEMONS`.

---

## 4. Tarefa pendente: trazer sprites de batalha para o projeto

Hoje os sprites de batalha/Pokédex vêm da PokeAPI (GitHub) ao vivo.
Decisão tomada: **baixar para o projeto**, sem dependência externa.

### O que EU faço (quando você pedir)
1. Baixo os 149 sprites de frente + de costas da PokeAPI.
2. Salvo em `assets/pokemon_batalha/<id>.png` e `<id>_back.png`.
3. Troco as URLs no `BASE_POKEMONS` por caminhos locais.
4. Testo e devolvo o projeto.

Resultado: o jogo deixa de depender de internet para mostrar Pokémon em
batalha — tudo servido pela própria Vercel.

> Observação: os sprites da PokeAPI são de domínio público para uso em
> projetos. Se você for usar arte própria na batalha também, me mande as
> folhas que eu uso as suas no lugar.

---

## 5. Ordem recomendada das grandes tarefas

Sugestão de sequência, cada etapa testável antes da próxima:

1. **Deploy inicial na Vercel** — subir o que já existe e confirmar que
   abre, sprites aparecem, companheiro segue. (Você faz; eu já deixei
   pronto e testado.)
2. **Sprites de batalha locais** (seção 4) — tirar a dependência da
   PokeAPI. Bom fazer cedo, antes de crescer.
3. **Adicionar Pokémon que andam, em lotes** — você manda folhas, eu
   processo. Pode ser contínuo, em paralelo com o resto.
4. **Supabase: save na nuvem + login** — quando o jogo estiver no ar e
   estável. Encaixa sobre o sistema de save atual (v2). Permite jogar em
   vários dispositivos com a mesma conta.
5. **Extras opcionais** — ranking/leaderboard, mais regiões, mais NPCs.

---

## 6. Referência rápida da estrutura

```
pokepoke_site/
  index.html              página do jogo
  css/estilo.css          estilos
  js/
    sprites.js            carregador de sprites (lazy loading)
    jogo.js               lógica do jogo
  assets/
    personagens/<nome>/   10 jogáveis × 20 PNGs
    pokemon/<nome>/        Pokémon que andam × 20 PNGs (sob demanda)
    pokemon_batalha/       (futuro) sprites de batalha locais
    npcs/                  NPCs com sprite dedicado
  vercel.json             config da Vercel (estático, sem build)
  README.md               como publicar
  PROXIMOS_PASSOS.md      este arquivo
```

---

## 7. Limite de tamanho — quando reavaliar

O lazy loading resolve a abertura (cada Pokémon só baixa quando aparece),
então **não há mais o teto do single-file**. O projeto aguenta os 151 sem
problema de carregamento.

O que vale acompanhar agora é o **peso do repositório**: 151 Pokémon que
andam × ~180 KB ≈ 27 MB de PNGs, mais os sprites de batalha. É publicável
na Vercel sem dificuldade, mas se o repositório ficar pesado para clonar,
a saída é mover os assets para um storage (ex.: Supabase Storage) e servir
de lá. Não é necessário agora — só uma rota se incomodar no futuro.
