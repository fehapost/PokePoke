/* ============================================================
   sprites.js — carregamento de sprites a partir de arquivos
   (substitui os antigos blocos base64 embutidos no HTML)
   ============================================================ */

// Mapa direção interna -> prefixo de arquivo
const _DIRFILE = { baixo:'frente', cima:'tras', esquerda:'esq', direita:'dir' };

// Mapa das constantes de personagem -> pasta em assets/personagens
const _PERS_PASTA = {
  m:'menino', f:'menina', l:'loiro', lf:'loira',
  nb:'ninja_branco', np:'ninja_preto', ea:'enfermeira_azul', ev:'enfermeira_vermelha',
  es:'estudante', pg:'professor_gravata'
};
// Pokémon -> pasta em assets/pokemon (nome do jogo -> pasta minúscula)
const _MON_PASTA = {
  Charmander:'charmander', Squirtle:'squirtle', Bulbasaur:'bulbasaur', Pikachu:'pikachu',
  Charmeleon:'charmeleon', Wartortle:'wartortle',
  Venusaur:'venusaur', Blastoise:'blastoise', Charizard:'charizard'
};

// Cache de imagens já carregadas (evita rebaixar o mesmo arquivo)
const _imgCache = {};

// Placeholder transparente 1x1 (usado se um arquivo faltar — evita travar)
const _PLACEHOLDER = (() => { const i = new Image(); i.src =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; return i; })();

// Carrega uma imagem de um caminho, com cache e fallback. Chama cb(img) quando pronta.
function carregarImagem(path, cb){
  if(_imgCache[path]){ const im=_imgCache[path]; if(im.complete) cb && cb(im); else im.addEventListener('load',()=>cb&&cb(im)); return im; }
  const im = new Image();
  _imgCache[path] = im;
  let done=false;
  const finish=(ok)=>{ if(done) return; done=true; cb && cb(ok? im : _PLACEHOLDER); };
  im.onload = ()=>finish(true);
  im.onerror = ()=>{ console.warn('Sprite faltando:', path); finish(false); };
  // timeout de segurança: se não carregar em 8s, libera com placeholder
  setTimeout(()=>finish(im.naturalWidth>0), 8000);
  im.src = path;
  return im;
}

// Monta a estrutura {baixo:{parado,andar[]}, ...} de um personagem/pokémon a partir de uma pasta base,
// carregando os PNGs sob demanda. nFrames = quantos frames de andar (4) ou 0 para NPC (só parado).
function montarSpriteSet(baseDir, nFramesAndar){
  const set = {};
  ['baixo','cima','direita','esquerda'].forEach(dir=>{
    const pre = _DIRFILE[dir];
    const slot = { parado:null, andar:[] };
    carregarImagem(`${baseDir}/${pre}_0.png`, im=>slot.parado=im);
    for(let i=1;i<=nFramesAndar;i++){
      const idx=i-1;
      slot.andar[idx]=null;
      carregarImagem(`${baseDir}/${pre}_${i}.png`, im=>slot.andar[idx]=im);
    }
    set[dir]=slot;
  });
  return set;
}

// ----- Personagens jogáveis: monta todos os SPRITE_ANIM_OBJ_* esperados pelo jogo -----
// Mantém os MESMOS nomes globais que o resto do código usa.
let SPRITE_ANIM_OBJ, SPRITE_ANIM_OBJ_F, SPRITE_ANIM_OBJ_L, SPRITE_ANIM_OBJ_LF,
    SPRITE_ANIM_OBJ_NB, SPRITE_ANIM_OBJ_NP, SPRITE_ANIM_OBJ_EA, SPRITE_ANIM_OBJ_EV,
    SPRITE_ANIM_OBJ_ES, SPRITE_ANIM_OBJ_PG;

function carregarPersonagens(){
  const base='assets/personagens';
  SPRITE_ANIM_OBJ    = montarSpriteSet(`${base}/menino`,4);
  SPRITE_ANIM_OBJ_F  = montarSpriteSet(`${base}/menina`,4);
  SPRITE_ANIM_OBJ_L  = montarSpriteSet(`${base}/loiro`,4);
  SPRITE_ANIM_OBJ_LF = montarSpriteSet(`${base}/loira`,4);
  SPRITE_ANIM_OBJ_NB = montarSpriteSet(`${base}/ninja_branco`,4);
  SPRITE_ANIM_OBJ_NP = montarSpriteSet(`${base}/ninja_preto`,4);
  SPRITE_ANIM_OBJ_EA = montarSpriteSet(`${base}/enfermeira_azul`,4);
  SPRITE_ANIM_OBJ_EV = montarSpriteSet(`${base}/enfermeira_vermelha`,4);
  SPRITE_ANIM_OBJ_ES = montarSpriteSet(`${base}/estudante`,4);
  SPRITE_ANIM_OBJ_PG = montarSpriteSet(`${base}/professor_gravata`,4);
}

// ----- Pokémon companheiros: lazy. MON_OBJ[nome] só é montado quando pedido -----
const MON_OBJ = {};
function carregarMon(nome){
  if(MON_OBJ[nome]) return MON_OBJ[nome];
  const pasta = _MON_PASTA[nome];
  if(!pasta) return null;
  MON_OBJ[nome] = montarSpriteSet(`assets/pokemon/${pasta}`,4);
  return MON_OBJ[nome];
}

// ----- NPCs com sprite dedicado (frame único de frente) -----
const POLICIA_IMG = new Image();
const PROF_IMG = new Image();
const SABIO_IMG = new Image();
function carregarNPCs(redesenhar){
  [['policial',POLICIA_IMG],['professor',PROF_IMG],['sabio',SABIO_IMG]].forEach(([nome,img])=>{
    carregarImagem(`assets/npcs/${nome}.png`, im=>{
      img.src = im.src;
      if(redesenhar) img.onload = ()=>{ if(typeof desenharMundo==='function' && window.jogoIniciado) desenharMundo(); };
    });
  });
}
