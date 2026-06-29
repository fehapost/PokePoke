
/* ============ STATE ============ */
// Versão do jogo (fonte única) — exibida discretamente no canto inferior direito da barra.
// Bump aqui a cada mudança que você quiser marcar como nova versão.
const VERSAO_JOGO='1.3.0';
const TILE=30, LARGURA_MAPA=67, ALTURA_MAPA=48;
const ICONE_BOLA_HTML='<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" alt="bola">';
let ultimoPasso=0; const INTERVALO=132;
// NPCs (exceto lojistas) viram de lado a cada 15s
let npcVirado=false;
setInterval(()=>{ npcVirado=!npcVirado; if(typeof desenharMundo==='function' && jogoIniciado) desenharMundo(); }, 15000);
let estadoPerna=false, direcaoAtual='baixo';
let labirintoLimpo=false; // vira true quando o boss do labirinto é derrotado (luzes acendem)
let mostrandoNotificacao=false, callbackNotificacao=null;
let emBatalha=false, batalhaTreinador=false, subMenuAtaques=false, subMenuBolas=false;
let emParty=false, emPokedex=false, vindoDeBatalha=false, esperandoEspaco=false, trocaObrigatoria=false;
let esperandoEspacoDerrota=false; // mensagem de derrota total aguardando [ESPAÇO]
let emCutscene=false; // trava input do jogador durante cenas (ex.: rival se aproximando)
let jogoIniciado=false;
let player={x:8,y:10};
let inicialEscolhido=false, equipeAtiva=[], caixaPC=[];
let treinadorAtual=null, indexInimigoEquipe=0, pkmInimigo=null, pkmAtivoJogador=null;
let emLoja=false, selecionandoBola=false;

// Economia e itens
let dinheiro=0;
// 5 tipos de bola. mult = bônus na taxa de captura; master sempre captura.
const TIPOS_BOLA={
  poke:   {nome:'Esfera Comum',  icone:'🔴', mult:1.0,  preco:200,  cor:'#ff3b4e'},
  great:  {nome:'Esfera Grande', icone:'🔵', mult:1.5,  preco:600,  cor:'#3a6bff'},
  ultra:  {nome:'Esfera Ultra',  icone:'🟡', mult:2.0,  preco:1200, cor:'#ffce4d'},
  premier:{nome:'Esfera Premier',icone:'⚪', mult:1.7,  preco:900,  cor:'#f3f3f3'},
  master: {nome:'Esfera Mestra', icone:'🟣', mult:999,  preco:9000, cor:'#8a5cff'}
};
const ORDEM_BOLAS=['poke','great','ultra','premier','master'];
// sorteia o tipo de uma esfera do chão (mesma distribuição da coleta)
function sortearTipoBola(){ let r=Math.random(); return r<0.55?'poke': r<0.82?'great': r<0.95?'ultra': r<0.99?'premier':'master'; }
// URL da esfera padrão (mesma imagem de sempre) + filtro de cor por tipo
const POKEBALL_PNG='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
const FILTRO_BOLA={
  poke:'none',
  great:'hue-rotate(205deg) saturate(1.5)',
  ultra:'hue-rotate(70deg) saturate(1.7) brightness(1.12)',
  premier:'grayscale(1) brightness(1.55) contrast(.92)',
  master:'hue-rotate(262deg) saturate(1.5)'
};
// mesma esfera de sempre, só recolorida por tipo (filtro CSS)
function bolaColoridaHTML(tipo){ return '<img src="'+POKEBALL_PNG+'" alt="bola" style="filter:'+(FILTRO_BOLA[tipo]||'none')+'">'; }
// Esferas dos iniciais: uma cor por TIPO do Pokémon (recoloração da esfera vermelha padrão).
// Bulbasaur(GRAMA) verde, Charmander(FOGO) laranja, Squirtle(ÁGUA) azul, Pikachu(ELÉTRICO) amarelo.
const FILTRO_BOLA_TIPO={
  GRAMA:   'hue-rotate(110deg) saturate(1.5)',
  FOGO:    'hue-rotate(20deg) saturate(1.4) brightness(1.08)',
  'ÁGUA':  'hue-rotate(205deg) saturate(1.6)',
  'ELÉTRICO':'hue-rotate(60deg) saturate(1.9) brightness(1.2)'
};
function filtroBolaTipo(tp){ return FILTRO_BOLA_TIPO[tp]||'none'; }
// HTML da esfera de um inicial. aberta=false -> fechada; aberta=true -> esfera ABERTA (após a escolha).
function bolaStarterHTML(nome, aberta){
  let tp=(BASE_POKEMONS[nome]||{}).tipo; let f=filtroBolaTipo(tp);
  if(aberta){
    return '<div class="bola-aberta" style="filter:'+f+'"><img class="ba-top" src="'+POKEBALL_PNG+'" alt=""><img class="ba-bot" src="'+POKEBALL_PNG+'" alt=""></div>';
  }
  return '<img src="'+POKEBALL_PNG+'" alt="bola" style="filter:'+f+'">';
}
let bolsa={poke:5, great:0, ultra:0, premier:0, master:0};
let bolaSelecionada='poke';

const $=id=>document.getElementById(id);
const divMapa=$('mapa'), divBatalha=$('tela-batalha'), divParty=$('tela-party'),
  listaParty=$('lista-party'), divPokedex=$('tela-pokedex'), listaPokedex=$('lista-pokedex'),
  textoBatalha=$('texto-batalha'), painelBotoes=$('painel-botoes'),
  bolaAnimada=$('pokebola-animada'), txtCaptura=$('texto-captura'), msgCentral=$('msg-centro-tela');

/* ============ SALVAR / CARREGAR (localStorage) ============ */
const SAVE_KEY='pokepoke_nova_region_save_v1';
function salvarJogo(){
  if(!jogoIniciado){ mostrarAviso("Comece o jogo antes de salvar."); return; }
  try{
    // captura o estado vivo da região atual nos snapshots antes de salvar
    let regioesSnapshot={};
    if(typeof _snapshotRegiao==='function' && typeof mapaRegiao!=='undefined'){
      // copia os snapshots já existentes (outras regiões)
      for(let k in _estadoRegioes){ regioesSnapshot[k]=_serializarSnapshot(_estadoRegioes[k]); }
      // e a região atual ao vivo
      regioesSnapshot[mapaRegiao]=_serializarSnapshot(_snapshotRegiao());
    }
    let dados={
      v:2, player:{x:player.x,y:player.y}, direcaoAtual,
      regiao: (typeof mapaRegiao!=='undefined'? mapaRegiao : 'cidade'),
      regioes: regioesSnapshot,
      inicialEscolhido, equipeAtiva, caixaPC, dinheiro, registroDex, bolsa, bolaSelecionada,
      palette: PLAYER_PALETTE,
      genero: PLAYER_GENERO,
      nome: nomeEfetivo(),
      labirintoLimpo,
      treinadores: listaTreinadores.map(t=>({id:t.id, derrotado:t.derrotado})),
      fixos: pokemonsFixos.map(p=>({nome:p.nome, x:p.x, y:p.y, lvl:p.lvl, derrotado:p.derrotado, tiles:p.tiles, emoji:p.emoji, aleatorio:p.aleatorio})),
      rivalNivel: (typeof rivalNivel!=='undefined'?rivalNivel:null),
      rivalVitorias: (typeof rivalVitoriasJogador!=='undefined'?rivalVitoriasJogador:0),
      rivalChamou: (typeof rivalChamouPrimeiro!=='undefined'?rivalChamouPrimeiro:false),
      rivalEquipe: (typeof rivalEquipe!=='undefined'?rivalEquipe:[]),
      companheiro: companheiro ? {nome:companheiro.nome, x:companheiro.x, y:companheiro.y, dir:companheiro.dir} : null
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(dados));
    mostrarAviso("Jogo salvo!");
  }catch(e){ mostrarAviso("Não foi possível salvar (armazenamento bloqueado neste contexto)."); }
}
// converte um snapshot (com Set e matriz) para forma serializável em JSON
function _serializarSnapshot(s){
  return {
    mapa: s.mapa, fixos: s.fixos, treinadores: s.treinadores,
    npcsCampo: s.npcsCampo, npcsInternos: s.npcsInternos, bolas: s.bolas,
    casas: s.casas, fachada: Array.from(s.fachada), carros: s.carros
  };
}
function _desserializarSnapshot(o){
  return {
    mapa: o.mapa, fixos: o.fixos||[], treinadores: o.treinadores||[],
    npcsCampo: o.npcsCampo||[], npcsInternos: o.npcsInternos||[], bolas: o.bolas||[],
    casas: o.casas||[], fachada: new Set(o.fachada||[]), carros: o.carros||[]
  };
}
function existeSave(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } }
function carregarJogo(){
  try{
    let raw=localStorage.getItem(SAVE_KEY); if(!raw) return false;
    let d=JSON.parse(raw);
    if(d.direcaoAtual) direcaoAtual=d.direcaoAtual;
    inicialEscolhido=!!d.inicialEscolhido;
    // Pokémon do jogador: reidrata para restaurar getters (hpMax, ataque, etc.)
    if(Array.isArray(d.equipeAtiva)) equipeAtiva=reidratarLista(d.equipeAtiva);
    if(Array.isArray(d.caixaPC)) caixaPC=reidratarLista(d.caixaPC);
    if(typeof d.dinheiro==='number') dinheiro=d.dinheiro;
    if(d.registroDex) registroDex=d.registroDex;
    if(d.bolsa) bolsa=d.bolsa;
    if(d.bolaSelecionada) bolaSelecionada=d.bolaSelecionada;
    if(typeof d.labirintoLimpo==='boolean') labirintoLimpo=d.labirintoLimpo;
    if(d.palette){ Object.assign(PLAYER_PALETTE, d.palette); }
    if(d.genero){ PLAYER_GENERO = (d.genero==='f'?'f':(d.genero==='l'?'l':(d.genero==='lf'?'lf':(d.genero==='nb'?'nb':(d.genero==='np'?'np':(d.genero==='ea'?'ea':(d.genero==='ev'?'ev':(d.genero==='es'?'es':(d.genero==='pg'?'pg':'m'))))))))); }
    if(typeof d.nome==='string' && d.nome.trim()){ nomeJogador=d.nome.trim(); nomeEditadoManual=true; _setCamposNome(nomeJogador); }
    if(typeof d.rivalNivel!=='undefined') rivalNivel=d.rivalNivel;
    if(typeof d.rivalChamou==='boolean') rivalChamouPrimeiro=d.rivalChamou;
    if(typeof d.rivalVitorias==='number') rivalVitoriasJogador=d.rivalVitorias;
    if(Array.isArray(d.rivalEquipe)) rivalEquipe=d.rivalEquipe;

    // ===== Regiões (save v2). Saves v1 não têm região: tratam-se como 'cidade'. =====
    if(d.regioes && typeof _restaurarRegiao==='function'){
      // carrega todos os snapshots salvos
      for(let k in d.regioes){ _estadoRegioes[k]=_desserializarSnapshot(d.regioes[k]); }
      let destino = d.regiao || 'cidade';
      if(_estadoRegioes[destino]){ _restaurarRegiao(_estadoRegioes[destino]); }
      mapaRegiao = destino;
      // remove o snapshot da região ativa (ela agora está "ao vivo" nos arrays globais)
      delete _estadoRegioes[destino];
    } else {
      // save antigo: aplica fixos/treinadores direto na cidade (comportamento v1)
      if(Array.isArray(d.treinadores)) d.treinadores.forEach(s=>{ let t=listaTreinadores.find(x=>x.id===s.id); if(t) t.derrotado=s.derrotado; });
      if(Array.isArray(d.fixos)) pokemonsFixos=d.fixos.map(s=>({nome:s.nome,x:s.x,y:s.y,lvl:s.lvl,derrotado:s.derrotado,tiles:s.tiles,emoji:s.emoji,aleatorio:s.aleatorio}));
      if(typeof mapaRegiao!=='undefined') mapaRegiao='cidade';
    }
    // posição do jogador por último (depende da região já aplicada)
    if(d.player){ player.x=d.player.x; player.y=d.player.y; }
    // companheiro (Pokémon que segue)
    if(d.companheiro && d.companheiro.nome){
      carregarMon(d.companheiro.nome);
      companheiro={nome:d.companheiro.nome, x:d.companheiro.x, y:d.companheiro.y, dir:d.companheiro.dir||'baixo', walkFrame:0, andandoAte:0};
      const el=$('companheiro'); if(el) el.style.display='block';
    } else { limparCompanheiro(); }
    return true;
  }catch(e){ return false; }
}

/* ============ AUDIO ============ */
let audioCtx=null, loopAudio=null, volMestre=0.25, mutado=false; // música começa a 25%
function alternarConfig(){const m=$('modal-configuracoes'); m.style.display=m.style.display==='flex'?'none':'flex';}
// fecha o menu Opções e executa a ação escolhida (Time/Dex/Visual/Mapa/Salvar)
function opcaoMenu(fn){ $('modal-configuracoes').style.display='none'; if(typeof fn==='function') fn(); }
// botão Espaço do d-pad: mesmo efeito da barra de espaço (confirma encontro / inicia batalha no mato)
function apertarEspaco(){
  if(!jogoIniciado||mostrandoNotificacao) return;
  if(esperandoEspaco){ if(window.iniciarBatalhaAgora) window.iniciarBatalhaAgora(); return; }
  if(emBatalha||emParty||emPokedex||emLoja||emCutscene) return;
  iniciarBatalhaSelvagem(false);
}
// ===== Mochila (tecla R): mostra as esferas e itens do jogador =====
let emMochila=false;
function abrirMochila(){
  if(!jogoIniciado||mostrandoNotificacao||emBatalha||emCutscene) return;
  if(emMochila){ fecharMochila(); return; }
  emMochila=true; $('mochila-dinheiro').innerText=`₽ ${dinheiro}`;
  let cont=$('mochila-itens'); cont.innerHTML='';
  let temItem=false;
  ORDEM_BOLAS.forEach(k=>{ let qt=bolsa[k]||0; if(qt<=0) return; temItem=true; let b=TIPOS_BOLA[k];
    let row=document.createElement('div'); row.className='card-pkm';
    row.innerHTML=`<div class="meta-l"><span style="font-size:20px">${b.icone}</span>
      <div><div class="nm">${b.nome}</div><div class="sub">taxa de captura ×${b.mult>900?'∞':b.mult}</div></div></div>
      <span class="tag" style="font-weight:800; font-size:14px">×${qt}</span>`;
    cont.appendChild(row);
  });
  if(!temItem){ cont.innerHTML=`<div style="color:var(--muted); text-align:center; padding:14px 0">Sua mochila está vazia.\nCompre Esferas na Pokémart.</div>`; }
  $('modal-mochila').style.display='flex';
}
function fecharMochila(){ $('modal-mochila').style.display='none'; emMochila=false; }
// ===== Minimapa =====
function corMinimapa(v){
  if(v===13||v===84)return '#3a82e8';            // rio / ponte quebrada
  if(v===14)return '#a87b46';                    // ponte
  if(v===24)return '#c3c6cd';                    // calçada
  if(v===31||v===68)return '#eef0f3';            // faixa de pedestre
  if(v===25||v===26)return '#41454e';            // asfalto
  if(v===32)return '#b08755';                    // calçada marrom
  if(v===10||v===33)return '#d2b074';            // estrada de terra / terra batida
  if(v===4||v===36||v===38)return '#b14a3a';     // telhado/fachada (casas)
  if(v===30)return '#3a5fb0';                    // ginásio (teto azul)
  if(v===35||v===37||v===53)return '#9a6a4a';    // tijolo/janela
  if([3,5,6,7,9,17,19,40,57].includes(v))return '#6d4c34'; // interiores
  if(v===2)return '#2e8a3a';                     // mato alto
  if([12,20,21,22,34,69].includes(v))return '#1f7a3a'; // árvores
  if(v===83)return '#7a5a2a';                    // árvore marrom
  if([23,15,61,62,63,65].includes(v))return '#46b056'; // vegetação/flor
  if(v===11)return '#7a5a3a';                    // tronco
  if(v===16||v===29||v===64)return '#9aa3b5';    // placa/poste
  if(v===87)return '#ff7a18';                    // cerca policial
  if([80,81,82].includes(v))return '#5b6680';    // estação/trem
  if(v===74||v===85||v===86)return '#caa15a';    // caixa correio / baú
  if(v===8||v===1||v===66)return '#0b0f18';      // fora/borda/montanha
  return '#57aa57';                               // campo aberto (grama)
}
function desenharMinimapa(){
  let cv=$('cv-mapa'); if(!cv)return; let ctx=cv.getContext('2d');
  let sx=cv.width/LARGURA_MAPA, sy=cv.height/ALTURA_MAPA;
  ctx.imageSmoothingEnabled=true;
  ctx.clearRect(0,0,cv.width,cv.height);
  for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++){
    ctx.fillStyle=corMinimapa(MAPA[r][c]);
    ctx.fillRect(Math.round(c*sx),Math.round(r*sy),Math.ceil(sx)+1,Math.ceil(sy)+1);
  }
  // carros
  ctx.fillStyle='#ffd35a';
  if(typeof carros!=='undefined') carros.forEach(car=>{ ctx.fillRect(Math.round(car.x*sx),Math.round(car.y*sy),Math.ceil(sx*2),Math.ceil(sy)); });
  // jogador: marcador redondo com contorno (mais "mapa")
  let pxp=(player.x+0.5)*sx, pyp=(player.y+0.5)*sy, raio=Math.max(5,sx*0.7);
  ctx.beginPath(); ctx.arc(pxp,pyp,raio,0,7); ctx.fillStyle='#ff2d3a'; ctx.fill();
  ctx.lineWidth=2; ctx.strokeStyle='#fff'; ctx.stroke();
}
function abrirMapa(){ if(!jogoIniciado)return; $('modal-mapa').style.display='flex'; desenharMinimapa(); }
function fecharMapa(){ $('modal-mapa').style.display='none'; }
function mudarVolume(v){volMestre=v/100; $('vol-txt').innerText=v+'%';}
function mutarSom(c){mutado=c;}
function iniciarAudio(){if(audioCtx)return; audioCtx=new (window.AudioContext||window.webkitAudioContext)(); musicaPorRegiao();}
// ---- Melodias (chiptune) ----
const MELODIAS={
  // dentro de casa: tranquila, lenta
  casa:   {notas:[330,392,440,392,330,294,262,294,330,392,330,262,0,294,330,0], tempo:0.357, tipo:'triangle', vol:0.05},
  // esquerda do rio: aventura LEVE — mais calma (tempo mais lento, onda suave, volume menor)
  esq:    {notas:[392,440,494,523,587,523,494,440,392,440,494,392,330,392,440,494], tempo:0.33, tipo:'triangle', vol:0.045},
  // direita do rio: aventura — mais calma (antes intensa/rápida em sawtooth)
  dir:    {notas:[262,262,311,349,392,349,311,262,247,294,330,392,440,392,330,294], tempo:0.27, tipo:'triangle', vol:0.045},
  // batalha
  batalha:{notas:[330,330,392,330,294,262,294,330,349,349,440,392,330,294,262,247], tempo:0.168, tipo:'square', vol:0.06},
};
let musicaAtual=null, cicloMusica=null, musicaPausada=false, regiaoAtual=null, emBatalhaMusica=false;
function _tocarLoop(mel){
  if(loopAudio)clearInterval(loopAudio); let passo=0;
  loopAudio=setInterval(()=>{
    if(mutado||!audioCtx||musicaPausada)return;
    if(passo>=mel.notas.length)passo=0; let f=mel.notas[passo];
    if(f>0){let osc=audioCtx.createOscillator(), g=audioCtx.createGain();
      osc.type=mel.tipo; osc.frequency.value=f; g.gain.setValueAtTime(volMestre*mel.vol,audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+mel.tempo*0.9);
      osc.connect(g); g.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime+mel.tempo);}
    passo++;
  }, mel.tempo*1000);
}
// regiões de mapa (fora de batalha) tocam 1 min e pausam 1 min
function _iniciarCicloRegiao(mel){
  if(cicloMusica)clearTimeout(cicloMusica);
  musicaPausada=false; _tocarLoop(mel);
  const ciclar=(tocando)=>{
    cicloMusica=setTimeout(()=>{
      if(emBatalhaMusica)return; // batalha controla sozinha
      musicaPausada=tocando; // se estava tocando, agora pausa
      ciclar(!tocando);
    }, 60000); // 1 minuto
  };
  ciclar(true);
}
function regiaoDoJogador(){
  if(isInHouse(player.x,player.y)) return 'casa';
  return player.x < 18 ? 'esq' : 'dir';   // rio fica na coluna ~18
}
// chamada ao mover/entrar/sair: troca a trilha se mudou de região
function musicaPorRegiao(){
  if(!audioCtx||emBatalhaMusica)return;
  let reg=regiaoDoJogador();
  if(reg===regiaoAtual) return; // não reinicia se continua na mesma região
  regiaoAtual=reg; musicaAtual=reg;
  if(reg==='casa'){ // casa: tranquila contínua (sem ciclo de pausa)
    if(cicloMusica)clearTimeout(cicloMusica); musicaPausada=false; _tocarLoop(MELODIAS.casa);
  } else {
    _iniciarCicloRegiao(MELODIAS[reg]);
  }
}
function tocarMusicaCenario(){ emBatalhaMusica=false; regiaoAtual=null; musicaPorRegiao(); }
function tocarMusicaBatalha(){ emBatalhaMusica=true; if(cicloMusica)clearTimeout(cicloMusica); musicaPausada=false; _tocarLoop(MELODIAS.batalha); }
// som de passos no mato
let _ultimoMato=0;
function somMato(){
  if(!audioCtx||mutado)return; let agora=Date.now(); if(agora-_ultimoMato<120)return; _ultimoMato=agora;
  // ruído curto filtrado = "farfalhar" de folhas
  let dur=0.12, bufSize=Math.floor(audioCtx.sampleRate*dur);
  let buf=audioCtx.createBuffer(1,bufSize,audioCtx.sampleRate); let data=buf.getChannelData(0);
  for(let i=0;i<bufSize;i++){ data[i]=(Math.random()*2-1)*(1-i/bufSize); }
  let src=audioCtx.createBufferSource(); src.buffer=buf;
  let bp=audioCtx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2600; bp.Q.value=0.8;
  let g=audioCtx.createGain(); g.gain.setValueAtTime(volMestre*0.18,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+dur);
  src.connect(bp); bp.connect(g); g.connect(audioCtx.destination); src.start(); src.stop(audioCtx.currentTime+dur);
}
function jingleEncontro(){ // pequeno arpejo de alerta
  if(!audioCtx||mutado)return;
  [523,659,784,1046].forEach((f,i)=>setTimeout(()=>sfx(f,0.12,'square'),i*90));
}
function sfx(freq,dur,type){ if(!audioCtx||mutado)return; let o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type||'square'; o.frequency.value=freq; g.gain.setValueAtTime(volMestre*0.12,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+dur); o.connect(g); g.connect(audioCtx.destination);
  o.start(); o.stop(audioCtx.currentTime+dur); }
// ===== Sons de golpe (texturizados por tipo) e "pancada" no impacto =====
let _golpeJaDado=false; // 1º golpe da batalha pausa a música de encontro
function pararMusicaBatalha(){ musicaPausada=true; if(loopAudio){clearInterval(loopAudio); loopAudio=null;} }
// ruído curto filtrado — base para fogo/água/pancada
function _ruido(dur, filtroTipo, freq, q, vol){
  if(!audioCtx||mutado)return;
  let n=Math.floor(audioCtx.sampleRate*dur); let buf=audioCtx.createBuffer(1,n,audioCtx.sampleRate); let dt=buf.getChannelData(0);
  for(let i=0;i<n;i++) dt[i]=(Math.random()*2-1)*(1-i/n);
  let src=audioCtx.createBufferSource(); src.buffer=buf;
  let f=audioCtx.createBiquadFilter(); f.type=filtroTipo; f.frequency.value=freq; if(q)f.Q.value=q;
  let g=audioCtx.createGain(); g.gain.setValueAtTime(volMestre*vol,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+dur);
  src.connect(f); f.connect(g); g.connect(audioCtx.destination); src.start(); src.stop(audioCtx.currentTime+dur);
}
// som do golpe: textura por tipo, intensidade pela força (1..4)
function somGolpe(tipo, forca){
  if(!audioCtx||mutado)return; forca=Math.max(1,Math.min(4,forca||1));
  let vol=0.10+forca*0.035, dur=0.18+forca*0.05;
  if(tipo==='FOGO'){ _ruido(dur,'bandpass',1100+forca*200,0.7,vol*1.1); _ruido(dur*0.8,'highpass',2600,0,vol*0.5); }
  else if(tipo==='ÁGUA'){ _ruido(dur,'lowpass',700+forca*120,0,vol); sfx(220+forca*40,dur*0.7,'sine'); }
  else if(tipo==='ELÉTRICO'){ for(let i=0;i<forca;i++) setTimeout(()=>sfx(900+Math.random()*700,0.05,'square'),i*45); _ruido(dur*0.6,'highpass',3500,0,vol*0.5); }
  else if(tipo==='GRAMA'){ _ruido(dur,'bandpass',2200,1.2,vol*0.85); }
  else if(tipo==='GELO'){ _ruido(dur,'highpass',3000,0,vol*0.7); sfx(1200,dur*0.5,'triangle'); }
  else { sfx(420+forca*60,dur*0.6,'sawtooth'); }
}
// "pancada" ao acertar o Pokémon: thump grave + clique
function somPancada(forca){
  if(!audioCtx||mutado)return; forca=Math.max(1,Math.min(4,forca||1));
  let o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type='sine'; o.frequency.setValueAtTime(180,audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(60,audioCtx.currentTime+0.18);
  g.gain.setValueAtTime(volMestre*(0.16+forca*0.05),audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.22);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+0.24);
  _ruido(0.08,'lowpass',1200,0,0.16+forca*0.04);
}

/* ============ POKÉMON DATA ============ */
const DADOS_151=[
"1|Bulbasaur|GRAMA|VENENO|1|comum|18|6|6|6|Ivysaur","2|Ivysaur|GRAMA|VENENO|2|incomum|24|6|6|5|Venusaur","3|Venusaur|GRAMA|VENENO|3|raro|32|8|8|6|",
"4|Charmander|FOGO||1|comum|18|4|7|7|Charmeleon","5|Charmeleon|FOGO||2|incomum|24|5|7|7|Charizard","6|Charizard|FOGO|VOADOR|3|superraro|40|7|9|8|",
"7|Squirtle|ÁGUA||1|comum|18|7|4|7|Wartortle","8|Wartortle|ÁGUA||2|incomum|24|7|6|5|Blastoise","9|Blastoise|ÁGUA||3|raro|32|9|8|6|",
"10|Caterpie|INSETO||1|comum|18|2|1|3|Metapod","11|Metapod|INSETO||2|comum|18|7|1|1|Butterfree","12|Butterfree|INSETO|VOADOR|3|comum|18|5|6|7|",
"13|Weedle|INSETO|VENENO|1|comum|18|2|2|4|Kakuna","14|Kakuna|INSETO|VENENO|2|comum|18|7|1|1|Beedrill","15|Beedrill|INSETO|VENENO|3|incomum|24|5|8|8|",
"16|Pidgey|NORMAL|VOADOR|1|comum|18|3|3|5|Pidgeotto","17|Pidgeotto|NORMAL|VOADOR|2|incomum|24|5|5|6|Pidgeot","18|Pidgeot|NORMAL|VOADOR|3|raro|32|6|7|8|",
"19|Rattata|NORMAL||1|comum|18|2|4|8|Raticate","20|Raticate|NORMAL||2|incomum|24|4|6|8|","21|Spearow|NORMAL|VOADOR|1|comum|18|3|5|7|Fearow",
"22|Fearow|NORMAL|VOADOR|2|incomum|24|5|8|8|","23|Ekans|VENENO||1|comum|18|3|5|5|Arbok","24|Arbok|VENENO||2|incomum|24|6|7|6|",
"25|Pikachu|ELÉTRICO||2|raro|32|3|6|9|Raichu","26|Raichu|ELÉTRICO||3|raro|32|5|8|9|","27|Sandshrew|TERRA||1|comum|18|6|5|4|Sandslash",
"28|Sandslash|TERRA||2|incomum|24|8|7|5|","29|Nidoran-F|VENENO||1|comum|18|3|4|5|Nidorina","30|Nidorina|VENENO||2|incomum|24|5|5|5|Nidoqueen",
"31|Nidoqueen|VENENO|TERRA|3|raro|32|8|8|6|","32|Nidoran-M|VENENO||1|comum|18|3|5|5|Nidorino","33|Nidorino|VENENO||2|incomum|24|5|6|6|Nidoking",
"34|Nidoking|VENENO|TERRA|3|raro|32|7|9|7|","35|Clefairy|FADA||2|incomum|24|5|4|3|Clefable","36|Clefable|FADA||3|raro|32|8|7|5|",
"37|Vulpix|FOGO||1|comum|18|3|5|7|Ninetales","38|Ninetales|FOGO||2|raro|32|6|8|9|","39|Jigglypuff|NORMAL|FADA|2|incomum|24|5|3|2|Wigglytuff",
"40|Wigglytuff|NORMAL|FADA|3|raro|32|8|6|4|","41|Zubat|VENENO|VOADOR|1|comum|18|2|3|8|Golbat","42|Golbat|VENENO|VOADOR|2|incomum|24|5|7|9|",
"43|Oddish|GRAMA|VENENO|1|comum|18|3|4|3|Gloom","44|Gloom|GRAMA|VENENO|2|incomum|24|5|6|3|Vileplume","45|Vileplume|GRAMA|VENENO|3|raro|32|8|8|3|",
"46|Paras|INSETO|GRAMA|1|comum|18|3|4|2|Parasect","47|Parasect|INSETO|GRAMA|2|incomum|24|6|8|2|","48|Venonat|INSETO|VENENO|1|comum|18|4|3|4|Venomoth",
"49|Venomoth|INSETO|VENENO|2|incomum|24|5|7|8|","50|Diglett|TERRA||1|comum|18|1|5|10|Dugtrio","51|Dugtrio|TERRA||2|raro|32|3|8|10|",
"52|Meowth|NORMAL||1|comum|18|3|3|9|Persian","53|Persian|NORMAL||2|incomum|24|5|6|10|","54|Psyduck|ÁGUA||1|comum|18|4|4|5|Golduck",
"55|Golduck|ÁGUA||2|incomum|24|7|8|7|","56|Mankey|LUTADOR||1|comum|18|3|6|7|Primeape","57|Primeape|LUTADOR||2|incomum|24|5|9|9|",
"58|Growlithe|FOGO||1|incomum|24|5|6|7|Arcanine","59|Arcanine|FOGO||2|superraro|40|8|9|9|","60|Poliwag|ÁGUA||1|comum|18|3|4|8|Poliwhirl",
"61|Poliwhirl|ÁGUA||2|incomum|24|5|6|8|Poliwrath","62|Poliwrath|ÁGUA|LUTADOR|3|raro|32|8|9|6|","63|Abra|PSÍQUICO||1|incomum|24|1|2|9|Kadabra",
"64|Kadabra|PSÍQUICO||2|raro|32|3|8|9|Alakazam","65|Alakazam|PSÍQUICO||3|superraro|40|4|10|10|","66|Machop|LUTADOR||1|comum|18|5|6|4|Machoke",
"67|Machoke|LUTADOR||2|incomum|24|7|8|4|Machamp","68|Machamp|LUTADOR||3|raro|32|8|10|5|","69|Bellsprout|GRAMA|VENENO|1|comum|18|3|5|4|Weepinbell",
"70|Weepinbell|GRAMA|VENENO|2|incomum|24|5|7|5|Victreebel","71|Victreebel|GRAMA|VENENO|3|raro|32|7|9|5|","72|Tentacool|ÁGUA|VENENO|1|comum|18|5|4|7|Tentacruel",
"73|Tentacruel|ÁGUA|VENENO|2|raro|32|9|7|9|","74|Geodude|PEDRA|TERRA|1|comum|18|7|6|2|Graveler","75|Graveler|PEDRA|TERRA|2|incomum|24|8|8|2|Golem",
"76|Golem|PEDRA|TERRA|3|raro|32|9|10|3|","77|Ponyta|FOGO||1|comum|18|4|6|9|Rapidash","78|Rapidash|FOGO||2|raro|32|6|8|10|",
"79|Slowpoke|ÁGUA|PSÍQUICO|1|comum|18|7|3|1|Slowbro","80|Slowbro|ÁGUA|PSÍQUICO|2|raro|32|10|7|2|","81|Magnemite|ELÉTRICO|AÇO|1|incomum|24|6|6|4|Magneton",
"82|Magneton|ELÉTRICO|AÇO|2|raro|32|8|9|5|","83|Farfetchd|NORMAL|VOADOR|0|raro|32|5|7|6|","84|Doduo|NORMAL|VOADOR|1|comum|18|3|5|8|Dodrio",
"85|Dodrio|NORMAL|VOADOR|2|raro|32|5|9|10|","86|Seel|ÁGUA||1|comum|18|5|4|4|Dewgong","87|Dewgong|ÁGUA|GELO|2|incomum|24|7|7|5|",
"88|Grimer|VENENO||1|comum|18|6|5|3|Muk","89|Muk|VENENO||2|raro|32|8|9|4|","90|Shellder|ÁGUA||1|comum|18|8|4|4|Cloyster",
"91|Cloyster|ÁGUA|GELO|2|raro|32|10|8|6|","92|Gastly|FANTASMA|VENENO|1|incomum|24|2|5|8|Haunter","93|Haunter|FANTASMA|VENENO|2|raro|32|4|8|9|Gengar",
"94|Gengar|FANTASMA|VENENO|3|superraro|40|6|10|9|","95|Onix|PEDRA|TERRA|1|incomum|24|10|4|5|","96|Drowzee|PSÍQUICO||1|comum|18|5|4|4|Hypno",
"97|Hypno|PSÍQUICO||2|incomum|24|7|7|5|","98|Krabby|ÁGUA||1|comum|18|5|7|5|Kingler","99|Kingler|ÁGUA||2|raro|32|7|10|6|",
"100|Voltorb|ELÉTRICO||1|comum|18|4|4|10|Electrode","101|Electrode|ELÉTRICO||2|raro|32|5|6|10|","102|Exeggcute|GRAMA|PSÍQUICO|1|incomum|24|5|4|3|Exeggutor",
"103|Exeggutor|GRAMA|PSÍQUICO|2|raro|32|7|9|5|","104|Cubone|TERRA||1|incomum|24|6|5|4|Marowak","105|Marowak|TERRA||2|raro|32|8|8|5|",
"106|Hitmonlee|LUTADOR||0|raro|32|5|9|8|","107|Hitmonchan|LUTADOR||0|raro|32|7|8|7|","108|Lickitung|NORMAL||0|incomum|24|7|5|4|",
"109|Koffing|VENENO||1|comum|18|6|5|3|Weezing","110|Weezing|VENENO||2|raro|32|8|8|4|","111|Rhyhorn|TERRA|PEDRA|1|incomum|24|8|8|3|Rhydon",
"112|Rhydon|TERRA|PEDRA|2|raro|32|9|10|4|","113|Chansey|NORMAL||0|superraro|40|9|2|5|","114|Tangela|GRAMA||0|incomum|24|8|6|4|",
"115|Kangaskhan|NORMAL||0|raro|32|8|8|7|","116|Horsea|ÁGUA||1|comum|18|3|4|6|Seadra","117|Seadra|ÁGUA||2|incomum|24|5|8|7|",
"118|Goldeen|ÁGUA||1|comum|18|4|5|6|Seaking","119|Seaking|ÁGUA||2|incomum|24|6|8|7|","120|Staryu|ÁGUA||1|incomum|24|5|5|8|Starmie",
"121|Starmie|ÁGUA|PSÍQUICO|2|raro|32|7|9|9|","122|MrMime|PSÍQUICO|FADA|0|raro|32|6|7|8|","123|Scyther|INSETO|VOADOR|0|superraro|40|6|9|10|",
"124|Jynx|GELO|PSÍQUICO|0|raro|32|4|8|8|","125|Electabuzz|ELÉTRICO||0|raro|32|5|9|9|","126|Magmar|FOGO||0|raro|32|5|9|8|",
"127|Pinsir|INSETO||0|raro|32|7|10|7|","128|Tauros|NORMAL||0|raro|32|7|8|9|","129|Magikarp|ÁGUA||1|comum|18|1|1|8|Gyarados",
"130|Gyarados|ÁGUA|VOADOR|2|superraro|40|8|10|8|","131|Lapras|ÁGUA|GELO|0|superraro|40|9|8|6|","132|Ditto|NORMAL||0|raro|32|5|5|5|",
"133|Eevee|NORMAL||1|raro|32|4|5|7|Vaporeon","134|Vaporeon|ÁGUA||2|superraro|40|9|8|6|","135|Jolteon|ELÉTRICO||2|superraro|40|5|8|10|",
"136|Flareon|FOGO||2|superraro|40|6|10|7|","137|Porygon|NORMAL||0|superraro|40|6|6|5|","138|Omanyte|PEDRA|ÁGUA|1|raro|32|7|5|3|Omastar",
"139|Omastar|PEDRA|ÁGUA|2|superraro|40|9|8|4|","140|Kabuto|PEDRA|ÁGUA|1|raro|32|6|6|5|Kabutops","141|Kabutops|PEDRA|ÁGUA|2|superraro|40|8|10|8|",
"142|Aerodactyl|PEDRA|VOADOR|0|superraro|40|7|9|10|","143|Snorlax|NORMAL||0|superraro|40|10|9|2|","144|Articuno|GELO|VOADOR|0|lendario|50|9|9|8|",
"145|Zapdos|ELÉTRICO|VOADOR|0|lendario|50|8|10|9|","146|Moltres|FOGO|VOADOR|0|lendario|50|8|10|8|","147|Dratini|DRAGÃO||1|superraro|40|4|5|5|Dragonair",
"148|Dragonair|DRAGÃO||2|superraro|40|6|7|7|Dragonite","149|Dragonite|DRAGÃO|VOADOR|3|lendario|50|9|10|8|","150|Mewtwo|PSÍQUICO||0|lendariosupremo|50|9|10|10|",
"151|Mew|PSÍQUICO||0|mitico|48|8|8|8|"
];

const POOLS_ATAQUES={
  'NORMAL':[{n:'Investida',p:12,t:'NORMAL',lvlReq:1,pp:25},{n:'Ataque Rápido',p:16,t:'NORMAL',lvlReq:10,pp:25},{n:'Pancada',p:25,t:'NORMAL',lvlReq:20,pp:20},{n:'Hiper Raio',p:50,t:'NORMAL',lvlReq:30,pp:10},{n:'Giga Impacto',p:80,t:'NORMAL',lvlReq:40,pp:5}],
  'FOGO':[{n:'Brasa',p:14,t:'FOGO',lvlReq:1,pp:25},{n:'Roda de Fogo',p:20,t:'FOGO',lvlReq:10,pp:20},{n:'Lança-Chamas',p:35,t:'FOGO',lvlReq:20,pp:15},{n:'Explosão',p:50,t:'FOGO',lvlReq:30,pp:10}],
  'ÁGUA':[{n:'Bolhas',p:12,t:'ÁGUA',lvlReq:1,pp:25},{n:'Jato d\'Água',p:18,t:'ÁGUA',lvlReq:10,pp:20},{n:'Surf',p:28,t:'ÁGUA',lvlReq:20,pp:20},{n:'Hidro Bomba',p:45,t:'ÁGUA',lvlReq:30,pp:10}],
  'GRAMA':[{n:'Absorver',p:12,t:'GRAMA',lvlReq:1,pp:25},{n:'Chicote de Cipó',p:18,t:'GRAMA',lvlReq:10,pp:25},{n:'Folha Navalha',p:26,t:'GRAMA',lvlReq:20,pp:20},{n:'Raio Solar',p:45,t:'GRAMA',lvlReq:30,pp:10}],
  'ELÉTRICO':[{n:'Choque',p:13,t:'ELÉTRICO',lvlReq:1,pp:25},{n:'Faísca',p:20,t:'ELÉTRICO',lvlReq:10,pp:20},{n:'Choque do Trovão',p:30,t:'ELÉTRICO',lvlReq:20,pp:15},{n:'Trovão',p:48,t:'ELÉTRICO',lvlReq:30,pp:10}],
  'PSÍQUICO':[{n:'Confusão',p:14,t:'PSÍQUICO',lvlReq:1,pp:25},{n:'Pulso Mental',p:22,t:'PSÍQUICO',lvlReq:10,pp:20},{n:'Psíquico',p:35,t:'PSÍQUICO',lvlReq:20,pp:15}],
  'PEDRA':[{n:'Lançar Pedra',p:14,t:'PEDRA',lvlReq:1,pp:25},{n:'Avalanche',p:24,t:'PEDRA',lvlReq:12,pp:20},{n:'Deslize de Pedras',p:34,t:'PEDRA',lvlReq:24,pp:15}],
  'LUTADOR':[{n:'Golpe Baixo',p:14,t:'LUTADOR',lvlReq:1,pp:25},{n:'Chute Duplo',p:22,t:'LUTADOR',lvlReq:10,pp:20},{n:'Soco Dinâmico',p:36,t:'LUTADOR',lvlReq:24,pp:15}]
};
// fallback pools for remaining types
['INSETO','VOADOR','VENENO','TERRA','FANTASMA','GELO','DRAGÃO','FADA','AÇO'].forEach(t=>{
  if(!POOLS_ATAQUES[t]) POOLS_ATAQUES[t]=[{n:'Investida',p:12,t,lvlReq:1,pp:25},{n:'Golpe '+t.charAt(0)+t.slice(1).toLowerCase(),p:22,t,lvlReq:10,pp:20},{n:'Ataque Pesado',p:34,t,lvlReq:22,pp:15}];
});

// Type effectiveness (attacker -> {defender:mult})
const TIPOS_FORTE={ FOGO:['GRAMA','INSETO','GELO'], ÁGUA:['FOGO','PEDRA','TERRA'], GRAMA:['ÁGUA','PEDRA','TERRA'],
  ELÉTRICO:['ÁGUA','VOADOR'], PEDRA:['FOGO','VOADOR','INSETO','GELO'], LUTADOR:['NORMAL','PEDRA','GELO'],
  PSÍQUICO:['LUTADOR','VENENO'], TERRA:['FOGO','ELÉTRICO','PEDRA','VENENO'], GELO:['GRAMA','VOADOR','DRAGÃO','TERRA'],
  VENENO:['GRAMA'], INSETO:['GRAMA','PSÍQUICO'], VOADOR:['GRAMA','LUTADOR','INSETO'], FANTASMA:['PSÍQUICO','FANTASMA'], DRAGÃO:['DRAGÃO'] };
const TIPOS_FRACO={ FOGO:['ÁGUA','PEDRA'], ÁGUA:['GRAMA','ELÉTRICO'], GRAMA:['FOGO','VOADOR','INSETO','GELO','VENENO'],
  ELÉTRICO:['TERRA'], PEDRA:['ÁGUA','GRAMA','LUTADOR'], LUTADOR:['VOADOR','PSÍQUICO'], PSÍQUICO:['INSETO','FANTASMA'],
  TERRA:['ÁGUA','GRAMA','GELO'], GELO:['FOGO','LUTADOR','PEDRA'], VENENO:['PSÍQUICO','TERRA'], INSETO:['FOGO','VOADOR','PEDRA'],
  VOADOR:['ELÉTRICO','PEDRA','GELO'], FANTASMA:['FANTASMA'], DRAGÃO:['GELO','DRAGÃO'] };
function multiplicadorTipo(atk,def){ if((TIPOS_FORTE[atk]||[]).includes(def))return 2; if((TIPOS_FRACO[atk]||[]).includes(def))return 0.5; return 1; }

const CORES_TIPO={NORMAL:'#a8a878',FOGO:'#f0803c',ÁGUA:'#6aa0f0',GRAMA:'#78c850',ELÉTRICO:'#f8d030',
  INSETO:'#a8b820',VOADOR:'#a890f0',VENENO:'#a040a0',PEDRA:'#b8a038',TERRA:'#e0c068',LUTADOR:'#c03028',
  PSÍQUICO:'#f85888',FANTASMA:'#705898',GELO:'#98d8d8',DRAGÃO:'#7038f8',FADA:'#ee99ac',AÇO:'#b8b8d0'};
function pillTipo(t){return `<span class="type-pill" style="background:${CORES_TIPO[t]||'#888'}">${t}</span>`;}

// Ícone por tipo (usado nos botões de ataque)
const ICONE_TIPO={NORMAL:'⭐',FOGO:'🔥',ÁGUA:'💧',GRAMA:'🌿',ELÉTRICO:'⚡',INSETO:'🐛',VOADOR:'🪶',
  VENENO:'☠️',PEDRA:'🪨',TERRA:'⛰️',LUTADOR:'👊',PSÍQUICO:'🔮',FANTASMA:'👻',GELO:'❄️',DRAGÃO:'🐉',FADA:'✨',AÇO:'⚙️'};
// Cor base do botão de ataque por tipo (fundo forte + texto legível)
const COR_BOTAO_TIPO={NORMAL:{bg:'#9a9a78',fg:'#fff'},FOGO:{bg:'#e8542a',fg:'#fff'},ÁGUA:{bg:'#3a7be0',fg:'#fff'},
  GRAMA:{bg:'#3fae3f',fg:'#fff'},ELÉTRICO:{bg:'#e0b020',fg:'#2a2200'},INSETO:{bg:'#8a9a1a',fg:'#fff'},
  VOADOR:{bg:'#8a7be0',fg:'#fff'},VENENO:{bg:'#9030a0',fg:'#fff'},PEDRA:{bg:'#a08828',fg:'#fff'},
  TERRA:{bg:'#c0a040',fg:'#2a2200'},LUTADOR:{bg:'#c0301f',fg:'#fff'},PSÍQUICO:{bg:'#e84878',fg:'#fff'},
  FANTASMA:{bg:'#5a4888',fg:'#fff'},GELO:{bg:'#5fbcd0',fg:'#06222a'},DRAGÃO:{bg:'#6028e0',fg:'#fff'},
  FADA:{bg:'#e07ba0',fg:'#fff'},AÇO:{bg:'#9090b0',fg:'#fff'}};
function corBotaoTipo(t){return COR_BOTAO_TIPO[t]||{bg:'#5b8cff',fg:'#fff'};}

const BASE_POKEMONS={}; let registroDex={};
// Formato: id|nome|tipo1|tipo2|estagio|raridade|hpBase|def|atk|vel|evoNext
DADOS_151.forEach(p=>{let d=p.split('|');
  BASE_POKEMONS[d[1]]={id:d[0],nome:d[1],tipo:d[2],tipo2:d[3]||null,estagio:+d[4],raridade:d[5],
    hpBase:+d[6], defBase:+d[7], atkBase:+d[8], velBase:+d[9], evo:d[10]||null,
    sprite:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${d[0]}.png`,
    back:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${d[0]}.png`};
  registroDex[d[1]]='oculto';});

const RARIDADE_INFO={
  comum:          {nome:'Comum',            cor:'#9CA3AF', borda:'#9CA3AF', grad:'linear-gradient(160deg,#1a2030,#141925)',                           peso:100, mult:0.1, minLevel:1},
  incomum:        {nome:'Incomum',          cor:'#22C55E', borda:'#22C55E', grad:'linear-gradient(160deg,#10241a,#0f1a16)',                           peso:55,  mult:0.2, minLevel:5},
  raro:           {nome:'Raro',             cor:'#3B82F6', borda:'#3B82F6', grad:'linear-gradient(160deg,#101f3a,#0e1626)',                           peso:24,  mult:0.3, minLevel:30},
  superraro:      {nome:'Super Raro',       cor:'#A855F7', borda:'#A855F7', grad:'linear-gradient(160deg,#23123a,#160e26)',                           peso:9,   mult:0.4, minLevel:65},
  lendario:       {nome:'Lendário',         cor:'#FACC15', borda:'#FACC15', grad:'linear-gradient(160deg,#2a2207,#1a1408)',                           peso:2,   mult:0.5, minLevel:80},
  lendariosupremo:{nome:'Lendário Supremo', cor:'#DC2626', borda:'#FACC15', grad:'linear-gradient(160deg,#3a0d0d 0%,#2a1206 55%,#1c0a06 100%)',       peso:1,   mult:0.6, minLevel:90},
  mitico:         {nome:'Mítico',           cor:'#EC4899', borda:'#EC4899', grad:'linear-gradient(160deg,#2e0f24,#1c0a18)',                           peso:1,   mult:0.7, minLevel:85}};
function rarInfo(r){return RARIDADE_INFO[r]||RARIDADE_INFO.comum;}

// Motor de atributos: stat = base * (mult_raridade * level) + base
function calcAtributo(base, raridade, level){
  let m=(RARIDADE_INFO[raridade]||{mult:0.1}).mult;
  return Math.round(base * (m*level) + base);
}

function ataquesDisponiveis(tipo,level){let pool=POOLS_ATAQUES[tipo]||POOLS_ATAQUES['NORMAL']; return pool.filter(a=>level>=a.lvlReq);}
// Atributos crescem com o nível: stat = base*(mult*level)+base
function criarInstanciaPokemon(nome,levelAlvo){let base=BASE_POKEMONS[nome], lvl=Math.max(1,levelAlvo);
  let inst={id:base.id,nome:base.nome,tipo:base.tipo,tipo2:base.tipo2,raridade:base.raridade,estagio:base.estagio,
    back:base.back,sprite:base.sprite,level:lvl,xp:0,evo:base.evo,
    baseAtk:base.atkBase, baseDef:base.defBase, baseVel:base.velBase, hpBase:base.hpBase,
    get xpNecessario(){return this.level*10;},
    // atributos derivados (recalculam sozinhos quando o nível sobe)
    get statAtk(){return calcAtributo(this.baseAtk,this.raridade,this.level);},
    get statDef(){return calcAtributo(this.baseDef,this.raridade,this.level);},
    get statVel(){return calcAtributo(this.baseVel,this.raridade,this.level);},
    get ataque(){return this.statAtk;},
    get defesa(){return this.statDef;},
    get velocidade(){return this.statVel*3;},
    get hpMax(){return this.hpBase + Math.round(this.hpBase*((RARIDADE_INFO[this.raridade]||{mult:0.1}).mult*this.level));},
    get ataques(){return ataquesDisponiveis(this.tipo,this.level);}};
  inst.hp=inst.hpMax;
  // PP atual por ataque (chave = nome do ataque). Inicia cheio.
  inst.ppAtual={};
  sincronizarPP(inst);
  return inst;}

// Garante que ppAtual tenha entrada para cada ataque disponível (cheio se novo).
// Chamado ao criar, ao subir de nível (novos golpes) e ao reidratar do save.
function sincronizarPP(pkm){
  if(!pkm.ppAtual) pkm.ppAtual={};
  let disp=pkm.ataques||[];
  disp.forEach(a=>{ if(pkm.ppAtual[a.n]===undefined) pkm.ppAtual[a.n]=a.pp; });
  return pkm.ppAtual;
}
// PP máximo de um ataque pelo nome (procura no pool do tipo do pokémon)
function ppMaxDe(pkm, nomeAtaque){
  let a=(pkm.ataques||[]).find(x=>x.n===nomeAtaque);
  return a?a.pp:0;
}
// Recarrega todo o PP de um pokémon (ex.: ao curar no centro pokémon / fim de batalha)
function recarregarPP(pkm){
  if(!pkm) return;
  sincronizarPP(pkm);
  (pkm.ataques||[]).forEach(a=>{ pkm.ppAtual[a.n]=a.pp; });
}

// Reidrata um pokémon salvo (objeto plano sem getters) recriando a instância e restaurando estado.
function reidratarPokemon(s){
  if(!s||!s.nome||!BASE_POKEMONS[s.nome]) return null;
  let p=criarInstanciaPokemon(s.nome, s.level||5);
  if(typeof s.xp==='number') p.xp=s.xp;
  if(typeof s.hp==='number') p.hp=s.hp; else p.hp=p.hpMax;
  // restaura PP salvo (mantém usos gastos); sincroniza p/ golpes novos
  sincronizarPP(p);
  if(s.ppAtual && typeof s.ppAtual==='object'){
    for(let nm in s.ppAtual){ if(p.ppAtual[nm]!==undefined) p.ppAtual[nm]=s.ppAtual[nm]; }
  }
  // apelido/itens futuros podem ser copiados aqui
  return p;
}
function reidratarLista(arr){ return Array.isArray(arr)? arr.map(reidratarPokemon).filter(Boolean) : []; }

// Aparição por nível mínimo da raridade (Comum 1, Incomum 5, Raro 30, Super Raro 65, Lendário 80, Lendário Supremo 90, Mítico 85)
function podeAparecer(nome, levelRef){
  let b=BASE_POKEMONS[nome];
  let min=(RARIDADE_INFO[b.raridade]||{minLevel:1}).minLevel;
  return levelRef>=min;
}
/* ============ MAP (reescrito do zero) ============ */
// Tiles: 0 campo, 1 borda, 2 mato-alto, 3 chão-casa, 4 parede(teto vermelho), 5 tapete/porta,
//   6 mesa, 7 PC-cura, 8 fora, 9 livros, 10 estrada-terra, 11 tronco, 12 árvore, 13 rio, 14 ponte,
//   15 flor, 16 placa, 17 caixa-loja, 19 prateleira, 20 árvore-grande, 21 pinheiro, 22 arbusto,
//   23 vegetação, 24 calçada, 25 asfalto, 26 asfalto-faixa, 29 poste, 30 parede-gym(teto azul)
const MAPA=Array.from({length:ALTURA_MAPA},()=>Array(LARGURA_MAPA).fill(0));
// borda sólida
for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++){
  if(r===0||r===ALTURA_MAPA-1||c===0||c===LARGURA_MAPA-1)MAPA[r][c]=1;
}
// ===== EXPANSÃO: colunas 51..65 replicam grama + estrada à direita =====
// (a coluna 50 era a última útil antes da borda; estendemos o padrão p/ a direita)
(function expandirDireita(){
  const COL_INI=51, COL_FIM=65;  // 15 colunas novas
  for(let r=1;r<ALTURA_MAPA-1;r++){
    // tile-base da linha: usa a avenida horizontal nas rows 21..26, senão grama
    let base;
    if(r>=22 && r<=25)       base=25;   // asfalto (pista)
    else if(r===21||r===26)  base=24;   // calçada da avenida
    else if(r===18||r===19||r===28||r===29) base=32; // calçada marrom (faixas existentes)
    else                     base=0;    // grama
    for(let c=COL_INI;c<=COL_FIM;c++) MAPA[r][c]=base;
  }
})();

// ===== 4 CASAS NOS CANTOS =====
// inicial = laboratório (sup. esq.), gin sup.dir, gin inf.esq, centro inf.dir
const CASAS=[
  {nome:'Laboratório',        tipo:'lab',     x0:3,  y0:4,  x1:13, y1:11, porta:[8,11]},
  {nome:'Ginásio Leste',      tipo:'ginasio', x0:38, y0:3,  x1:48, y1:11, porta:[43,11]},
  {nome:'Ginásio Oeste',      tipo:'ginasio', x0:3,  y0:36, x1:13, y1:44, porta:[8,36]},
  {nome:'Centro Pokémon',     tipo:'centro',  x0:38, y0:36, x1:48, y1:44, porta:[43,36]},
  {nome:'Casa de Pedra',      tipo:'pedra',   x0:52, y0:4,  x1:65, y1:17, porta:[58,17]},
  {nome:'Casa Aconchego',     tipo:'casa',    x0:59, y0:31, x1:65, y1:37, porta:[59,33]},
];
function construirCasa(b){
  for(let r=b.y0;r<=b.y1;r++)for(let c=b.x0;c<=b.x1;c++){
    if(MAPA[r]?.[c]===undefined)continue;
    let parede=(r===b.y0||r===b.y1||c===b.x0||c===b.x1);
    MAPA[r][c]= parede ? (b.tipo==='ginasio'?30: b.tipo==='pedra'?70 :4) : 3;
  }
  if(b.porta) MAPA[b.porta[1]][b.porta[0]]=5;
}
CASAS.forEach(construirCasa);

// Interior das casas
(function interiores(){
  // ===== Mobília comum a todas as casas (decorativa, sólida) =====
  // Layout seguro: móveis encostam nas paredes; centro fica livre p/ andar.
  function mobiliar(casa, opts){
    opts=opts||{};
    let x0=casa.x0, y0=casa.y0, x1=casa.x1, y1=casa.y1;
    let cxm=Math.floor((x0+x1)/2);
    // piso de quarto em todo o interior
    for(let r=y0+1;r<=y1-1;r++)for(let c=x0+1;c<=x1-1;c++) MAPA[r][c]=40;
    // quadros na parede de cima, sem cobrir a porta
    for(let c=x0+2;c<=x1-2;c+=3){ if(MAPA[y0][c]!==5) MAPA[y0][c]=49; }
    // estante (canto sup. esquerdo)
    MAPA[y0+1][x0+1]=47; MAPA[y0+1][x0+2]=47;
    // cama (canto sup. direito) — 2 colunas, cabeceira + corpo
    MAPA[y0+1][x1-1]=41; MAPA[y0+2][x1-1]=42;
    MAPA[y0+1][x1-2]=41; MAPA[y0+2][x1-2]=42;
    // sofá (parede esquerda, mais abaixo)
    MAPA[y1-2][x0+1]=43; MAPA[y1-2][x0+2]=44;
    // vasos (canto inf. direito)
    MAPA[y1-1][x1-1]=48; MAPA[y1-2][x1-1]=48;
    // TV/espelho (parede superior, à esquerda do centro) salvo se for ocupado por outra coisa
    if(!opts.semTV) MAPA[y0+2][x0+4]=46;
    // tapete de saída na frente da porta interna (linha de baixo, no centro)
    MAPA[y1-1][cxm]=5;
    return {cxm};
  }

  // --- Laboratório (sup. esq.): mesa do professor com starters + estante ---
  let lab=CASAS[0];
  mobiliar(lab,{semTV:true});
  // mesa do professor no centro (1 linha) — starters em cima dela
  for(let c=lab.x0+3;c<=lab.x1-3;c++){ MAPA[lab.y0+4][c]=6; }
  // livros extra
  MAPA[lab.y0+1][lab.x1-3]=9;

  // --- Ginásio Leste (sup. dir.): sala mobiliada + plataforma do líder ---
  let gLeste=CASAS[1];
  mobiliar(gLeste);
  MAPA[gLeste.y1-2][Math.floor((gLeste.x0+gLeste.x1)/2)]=6; // plataforma/tapete do líder (mesa)

  // --- Ginásio Oeste (inf. esq.): sala mobiliada + plataforma do líder ---
  let gOeste=CASAS[2];
  mobiliar(gOeste);
  MAPA[gOeste.y1-2][Math.floor((gOeste.x0+gOeste.x1)/2)]=6;

  // --- Centro Pokémon (inf. dir.): balcão de cura + 2 sofás verticais + vasos na entrada ---
  let cen=CASAS[3];
  mobiliar(cen,{semTV:true});
  let cenM=Math.floor((cen.x0+cen.x1)/2);
  // limpa a mobília-padrão que vamos reposicionar (sofá horizontal e vasos do canto)
  MAPA[cen.y1-2][cen.x0+1]=40; MAPA[cen.y1-2][cen.x0+2]=40;     // remove sofá horizontal padrão
  MAPA[cen.y1-1][cen.x1-1]=40; MAPA[cen.y1-2][cen.x1-1]=40;     // remove vasos do canto
  // balcão de cura: PC (computador) na PAREDE DIREITA (onde estava o quadrado azul)
  MAPA[cen.y0+3][cen.x1-1]=7; MAPA[cen.y0+3][cen.x1-2]=6;        // PC + balcão ao lado
  // 2 sofás VERTICAIS encostados na parede esquerda
  MAPA[cen.y0+2][cen.x0+1]=50; MAPA[cen.y0+3][cen.x0+1]=51;      // sofá 1 (cima)
  MAPA[cen.y0+5][cen.x0+1]=50; MAPA[cen.y0+6][cen.x0+1]=51;      // sofá 2 (baixo)
  // vasos na beira da ENTRADA (ladeando a porta, logo abaixo dela)
  MAPA[cen.y0+1][cenM-1]=48; MAPA[cen.y0+1][cenM+1]=48;

  // --- Casa de Pedra (BA4-BN18): LABIRINTO (interior vazio + paredes de pedra internas) ---
  if(CASAS[4]){ let cp=CASAS[4];
    for(let r=cp.y0+1;r<=cp.y1-1;r++)for(let c=cp.x0+1;c<=cp.x1-1;c++) MAPA[r][c]=40; // piso vazio
    const PEDRA=70;
    for(let c=53;c<=62;c++) MAPA[14][c]=PEDRA;  // BB15..BK15 (linha)
    for(let c=54;c<=62;c++) MAPA[10][c]=PEDRA;  // BC11..BK11
    for(let c=54;c<=62;c++) MAPA[8][c]=PEDRA;   // BC9..BK9
    for(let r=7;r<=8;r++)   MAPA[r][59]=PEDRA;  // BH8..BH9
    for(let r=6;r<=14;r++)  MAPA[r][53]=PEDRA;  // BB7..BB15
    // novas paredes
    for(let r=7;r<=12;r++)  MAPA[r][64]=PEDRA;   // BM8..BM13 (col 64, rows 7..12)
    for(let c=61;c<=64;c++) MAPA[6][c]=PEDRA;    // BM7..BJ7 (row 6, cols 61..64)
    for(let c=57;c<=61;c++) MAPA[5][c]=PEDRA;    // BJ6..BF6 (row 5, cols 57..61)
    for(let c=55;c<=64;c++) MAPA[12][c]=PEDRA;   // BM13..BD13 (row 12, cols 55..64)
    MAPA[cp.y1][58]=5;                          // porta na base
    // tapete vermelho onde fica o boss (BB6 = 53,5) e ao redor
    MAPA[5][53]=71; MAPA[5][54]=71; MAPA[6][54]=71;
  }
})();

// ===== ESTRADA HORIZONTAL de carros (de ponta a ponta), no meio =====
const RUA_R=[22,23,24,25];   // 4 faixas de asfalto
const CALC_R=[21,26];        // calçadas
const FAIXA_R=[23,24];       // faixa tracejada central
function isInHouse(x,y){ for(let b of CASAS){ if(x>=b.x0&&x<=b.x1&&y>=b.y0&&y<=b.y1) return true; } return false; }
function casaEm(x,y){ for(let b of CASAS){ if(x>=b.x0&&x<=b.x1&&y>=b.y0&&y<=b.y1) return b; } return null; }
(function avenida(){
  for(let c=1;c<LARGURA_MAPA-1;c++){
    CALC_R.forEach(r=>{ if(MAPA[r]?.[c]!==undefined && !isInHouse(c,r) && MAPA[r][c]!==1) MAPA[r][c]=24; });
    RUA_R.forEach(r=>{ if(MAPA[r]?.[c]!==undefined && !isInHouse(c,r) && MAPA[r][c]!==1){
      MAPA[r][c]= (FAIXA_R.includes(r) && c%3===0) ? 26 : 25;
    }});
    // 1 fileira de GRAMA colada na calçada (cima=20, baixo=27)
    [20,27].forEach(r=>{ if(MAPA[r]?.[c]!==undefined && !isInHouse(c,r) && MAPA[r][c]!==1) MAPA[r][c]=0; });
    // 2 fileiras de CALÇADA MARROM (cima=18,19 ; baixo=28,29)
    [18,19,28,29].forEach(r=>{ if(MAPA[r]?.[c]!==undefined && !isInHouse(c,r) && MAPA[r][c]!==1) MAPA[r][c]=32; });
  }
})();

// ===== RIO vertical, com PONTE DE MADEIRA (2 fileiras) onde a calçada marrom cruza =====
const RIO_C=18;          // coluna central média do rio
const AV_R0=20, AV_R1=27; // banda da estrada+grama (rio interrompido aqui; estrada passa por baixo)
(function rio(){
  for(let r=1;r<ALTURA_MAPA-1;r++){
    if(r>=AV_R0 && r<=AV_R1) continue;           // rio não corta a estrada/grama central
    let desv = Math.sin(r/5.5)*2.0 + Math.sin(r/2.3)*0.7 + Math.sin(r*0.37)*0.4;
    let centro = RIO_C + desv;
    let larg = 1.0 + (Math.sin(r/4.0)*0.25 + 0.25);
    let c0 = Math.round(centro - larg), c1 = Math.round(centro + larg);
    for(let c=c0;c<=c1;c++){
      if(MAPA[r]?.[c]!==undefined && MAPA[r][c]!==1 && !isInHouse(c,r)) MAPA[r][c]=13;
    }
  }
  // PONTE DE MADEIRA (2 fileiras) nas faixas de calçada marrom que cruzam o rio
  [18,19,28,29].forEach(r=>{ for(let c=1;c<LARGURA_MAPA-1;c++){ if(MAPA[r]?.[c]===13) MAPA[r][c]=14; } });
  // PONTES extras no MEIO de cada seção do rio (posições marcadas nos prints)
  const PONTE_CIMA=[16,17];      // rio de cima (2 fileiras)
  const PONTE_BAIXO=[32,33,34];  // rio de baixo (3 fileiras — +1 quadradinho, print 2)
  [...PONTE_CIMA,...PONTE_BAIXO].forEach(r=>{ for(let c=1;c<LARGURA_MAPA-1;c++){ if(MAPA[r]?.[c]===13) MAPA[r][c]=14; } });
})();
// ===== TRONCOS cercando o rio, parando 1 quadrado antes de cada ponte =====
(function troncosNoRio(){
  const linhasPonte=[16,17,18,19,28,29,32,33,34];   // todas as fileiras de ponte
  function pertoDePonte(r){ return linhasPonte.some(rp=>Math.abs(rp-r)<=1); } // 1 quadrado antes/depois
  for(let r=1;r<ALTURA_MAPA-1;r++){
    if(pertoDePonte(r)) continue;                 // não cerca a 1 quadrado da ponte
    for(let c=1;c<LARGURA_MAPA-1;c++){
      if(MAPA[r][c]!==0) continue;                // só em grama
      let pertoAgua=[[0,1],[0,-1],[1,0],[-1,0]].some(([dr,dc])=>MAPA[r+dr]?.[c+dc]===13);
      if(pertoAgua) MAPA[r][c]=11;                // tronco sólido na margem
    }
  }
})();

// ===== Zona livre ao redor das casas (nada de vegetação encostando) + frente da porta limpa =====
function ehPertoDeCasa(c,r){
  for(let b of CASAS){ if(c>=b.x0-1 && c<=b.x1+1 && r>=b.y0-1 && r<=b.y1+1) return true; }
  return false;
}
// garante 2 tiles livres na frente de cada porta
CASAS.forEach(b=>{ if(!b.porta)return; let [px,py]=b.porta;
  let fora = py>=b.y1 ? 1 : -1;   // porta embaixo => livre p/ baixo; em cima => p/ cima
  for(let d=1;d<=2;d++){ let ry=py+fora*d; if(MAPA[ry]?.[px]!==undefined && MAPA[ry][px]!==1) MAPA[ry][px]=10; }
});

// ===== MAPA LIMPO: sem árvores, plantas, vegetação, flores, troncos ou mato alto =====
// (geração de vegetação/mato/troncos/postes/placas removida a pedido)
function colocarPlaca(c,r){ if(MAPA[r]?.[c]!==undefined && [0,15,23].includes(MAPA[r][c])) MAPA[r][c]=16; }
// limpeza final de segurança: remove árvores/plantas/flores/mato/postes/placas (troncos do rio ficam)
for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++){
  if([2,12,15,20,21,22,23,29,16].includes(MAPA[r][c])) MAPA[r][c]=0;
}

// ===== Cercado de mato reutilizável (troncos em volta + mato dentro) =====
function cercadoMato(ox,oy,larg,alt){
  for(let c=ox-1;c<=ox+larg;c++){ if(MAPA[oy-1]?.[c]===0)MAPA[oy-1][c]=11; if(MAPA[oy+alt]?.[c]===0)MAPA[oy+alt][c]=11; }
  for(let r=oy-1;r<=oy+alt;r++){ if(MAPA[r]?.[ox-1]===0)MAPA[r][ox-1]=11; if(MAPA[r]?.[ox+larg]===0)MAPA[r][ox+larg]=11; }
  for(let r=oy;r<oy+alt;r++)for(let c=ox;c<ox+larg;c++){ if(MAPA[r]?.[c]===0) MAPA[r][c]=2; }
}
// ===== CASA 1 (laboratório): estradinha p/ baixo + 2 cercados de mato alto =====
(function labExterno(){
  for(let r=12;r<=17;r++){ if(MAPA[r]?.[8]===0) MAPA[r][8]=10; }
  cercadoMato(2,13,5,4);    // mato ESQUERDO (cols 2-6)
  cercadoMato(10,13,4,4);   // mato DIREITO (cols 10-13) — afastado do rio
})();
// ===== CASA 2 (Ginásio Oeste, canto inf. esq.): mesmo layout de 2 matos cercados =====
(function casa2Externo(){
  // estradinha ligando a porta do ginásio oeste (8,36) aos matos e à calçada marrom (sobe pelo meio)
  for(let r=30;r<=35;r++){ if(MAPA[r]?.[8]===0||MAPA[r]?.[8]===2) MAPA[r][8]=10; }
  cercadoMato(2,30,5,4);    // mato ESQUERDO (cols 2-6, rows 30-33)
  cercadoMato(10,30,4,4);   // mato DIREITO (cols 10-13, rows 30-33)
  // garante o corredor central livre (terra) entre os dois matos
  for(let r=30;r<=35;r++){ if(MAPA[r]?.[8]===2) MAPA[r][8]=10; if(MAPA[r]?.[8]===0) MAPA[r][8]=10; }
})();
// ===== CASA 4 (Ginásio Leste, canto sup. dir.): porta embaixo -> sai p/ baixo (igual casa 1) =====
(function casa4Externo(){
  for(let r=12;r<=17;r++){ if(MAPA[r]?.[43]===0||MAPA[r]?.[43]===2) MAPA[r][43]=10; }
  cercadoMato(37,13,5,4);   // mato ESQUERDO (cols 37-41, rows 13-16)
  cercadoMato(45,13,4,4);   // mato DIREITO (cols 45-48, rows 13-16)
  for(let r=12;r<=17;r++){ if(MAPA[r]?.[43]===2) MAPA[r][43]=10; }
})();
// ===== CASA 3 (Centro Pokémon, canto inf. dir.): porta em cima -> sai p/ cima (igual casa 2) =====
(function casa3Externo(){
  for(let r=30;r<=35;r++){ if(MAPA[r]?.[43]===0||MAPA[r]?.[43]===2) MAPA[r][43]=10; }
  cercadoMato(37,30,5,4);   // mato ESQUERDO (cols 37-41, rows 30-33)
  cercadoMato(45,30,4,4);   // mato DIREITO (cols 45-48, rows 30-33)
  for(let r=30;r<=35;r++){ if(MAPA[r]?.[43]===2) MAPA[r][43]=10; }
})();
// ===== Limpeza de TRONCOS SOLTOS perto da casa 1 e do rio (partes circuladas) =====
(function limparTroncosSoltos(){
  // remove troncos isolados (sem vizinho tronco ortogonal) em todo o mapa
  let aRemover=[];
  for(let r=1;r<ALTURA_MAPA-1;r++)for(let c=1;c<LARGURA_MAPA-1;c++){
    if(MAPA[r][c]!==11) continue;
    let temVizinho=[[0,1],[0,-1],[1,0],[-1,0]].some(([dr,dc])=>MAPA[r+dr]?.[c+dc]===11);
    if(!temVizinho) aRemover.push([r,c]);
  }
  aRemover.forEach(([r,c])=>MAPA[r][c]=0);
  // limpa o corredor entre o mato direito da casa 1 e o rio (cols 15-16, rows 11-17)
  for(let r=11;r<=17;r++)for(let c=15;c<=16;c++){ if(MAPA[r]?.[c]===11) MAPA[r][c]=0; }
})();

// ===== EDIÇÕES MANUAIS POR COORDENADA (grade Excel) =====
(function edicoesManuais(){
  function coord(co){ let m=(''+co).toUpperCase().match(/^([A-Z]+)(\d+)$/); if(!m)return null;
    let c=0; for(let i=0;i<m[1].length;i++)c=c*26+(m[1].charCodeAt(i)-64);
    return {c:c-1, r:parseInt(m[2],10)-1}; }
  function set(co,v){ let t=coord(co); if(t&&MAPA[t.r]?.[t.c]!==undefined) MAPA[t.r][t.c]=v; }
  const T=11, AGUA=13, PONTE=14, GRAMA=0;
  // remover tronco -> grama
  ['J15','J16','H15','H16','D18','C18','O15','O16','V15',
   'O33','O34','J33','J34','H33','H34','C35',
   'S46','S47','W46','W47'].forEach(c=>set(c,GRAMA));
  // remover água -> (depois alguns viram tronco)
  ['R12','R13','R14','R15'].forEach(c=>set(c,GRAMA));
  // adicionar tronco
  ['R12','R13','R14'].forEach(c=>set(c,T));
  // remover ponte -> água (volta a ser rio)
  ['S17','T17','U17','S18','T18','U18','S19','T19','U19','R20','S20','T20',
   'Q33','R33','S33','T33'].forEach(c=>set(c,AGUA));
  // adicionar ponte
  ['R15','S15','T15','U15','V15','R16','S16','T16','U16','V16',
   'U34','V34','V35',
   'S46','S47','T46','T47','U46','U47','V46','V47','W46','W47'].forEach(c=>set(c,PONTE));
  // ----- NOVAS EDIÇÕES -----
  const ESTRADA=10, MATO=2;
  // estrada (terra) ligando as pontas das pontes
  ['R19','S19','T19','U19','V19','R20','S20','T20','U20','V20',
   'R29','S29','T29','U29','V29','R30','S30','T30','U30','V30'].forEach(c=>set(c,ESTRADA));
  // ponte extra
  ['Q34','Q35'].forEach(c=>set(c,PONTE));
  // tronco extra
  ['P33'].forEach(c=>set(c,T));
  // mato alto: bloco de AA33..AH42 (cols AA..AH, rows 33..42)
  (function(){ let c0=coord('AA33').c, c1=coord('AH33').c, r0=33-1, r1=42-1;
    for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){ if(MAPA[r]?.[c]===0) MAPA[r][c]=MATO; } })();

  // ---- LOTE 2 DE EDIÇÕES ----
  // remover árvores -> grama
  ['X20','R10','O35','P37','Q35','X16','AF10','AD8','AE7'].forEach(c=>set(c,GRAMA));
  // ponte nova (topo do rio)
  ['R2','S2','T2','U2','V2','W2','R3','S3','T3','U3','V3','W3'].forEach(c=>set(c,PONTE));
  // troncos diversos
  ['R17','R18','V17','V18'].forEach(c=>set(c,T));
  // troncos coluna AI33..AI42
  (function(){ let cc=coord('AI33').c; for(let r=33-1;r<=42-1;r++){ if(MAPA[r]?.[cc]===0) MAPA[r][cc]=T; } })();
  // CONTORNO de troncos do retângulo Z33..AZ42 (só a borda)
  (function(){ let c0=coord('Z33').c, c1=coord('AZ33').c, r0=33-1, r1=42-1;
    for(let c=c0;c<=c1;c++){ if(MAPA[r0]?.[c]===0)MAPA[r0][c]=T; if(MAPA[r1]?.[c]===0)MAPA[r1][c]=T; }
    for(let r=r0;r<=r1;r++){ if(MAPA[r]?.[c0]===0)MAPA[r][c0]=T; if(MAPA[r]?.[c1]===0)MAPA[r][c1]=T; } })();
  // remover troncos
  ['AM18','AN18','AK15','AK16','AQ15','AQ16','AS15','AS16','AU18','AW18','AX14'].forEach(c=>set(c,GRAMA));
  // mato alto AD5..AI11 cercado por troncos nas laterais AC5..AC11 e AJ5..AJ11
  (function(){ let cAD=coord('AD5').c, cAI=coord('AI5').c, r0=5-1, r1=11-1;
    for(let r=r0;r<=r1;r++)for(let c=cAD;c<=cAI;c++){ if(MAPA[r]?.[c]===0) MAPA[r][c]=MATO; }
    let cAC=coord('AC5').c, cAJ=coord('AJ5').c;
    for(let r=r0;r<=r1;r++){ if(MAPA[r]?.[cAC]===0)MAPA[r][cAC]=T; if(MAPA[r]?.[cAJ]===0)MAPA[r][cAJ]=T; } })();
  // remover árvores pedidas que caíram dentro do mato -> grama (buraco no mato)
  ['AF10','AD8','AE7'].forEach(c=>set(c,GRAMA));

  // ---- LOTE 3 DE EDIÇÕES ----
  const FAIXA=31;
  // faixa de pedestre AQ23..AT26 e H23..J26
  (function(){ let c0=coord('AQ23').c,c1=coord('AT23').c; for(let r=23-1;r<=26-1;r++)for(let c=c0;c<=c1;c++){ if([25,26].includes(MAPA[r]?.[c])) MAPA[r][c]=FAIXA; } })();
  (function(){ let c0=coord('H23').c,c1=coord('J23').c; for(let r=23-1;r<=26-1;r++)for(let c=c0;c<=c1;c++){ if([25,26].includes(MAPA[r]?.[c])) MAPA[r][c]=FAIXA; } })();
  // remover troncos
  ['AK32','AQ32','AQ33','AS33','AS32','AX34'].forEach(c=>set(c,GRAMA));
  // mato alto em AE7, AF10 (e AD8 recebe o treinador, mas o tile vira mato)
  ['AE7','AF10','AD8'].forEach(c=>set(c,MATO));
  // pontes
  ['R29','S29','T29','U29','V29','R30','S30','T30','U30','V30','Q35'].forEach(c=>set(c,PONTE));
  // troncos
  ['T31','T32'].forEach(c=>set(c,T));
  // remover árvores
  ['AA20','AA19','Z19','Z18'].forEach(c=>set(c,GRAMA));
  // replicar o caminho do W20 em X20
  (function(){ let w=coord('W20'), x=coord('X20'); if(MAPA[w.r]?.[w.c]!==undefined) MAPA[x.r][x.c]=MAPA[w.r][w.c]; })();

  // ---- LOTE 4 DE EDIÇÕES ----
  const TERRA=33, ARVPEQ=34, FLOR=15, ARV=12;
  // helpers de intervalo (retângulo entre dois cantos, em qualquer ordem)
  function bloco(a,b,v){ let A=coord(a),B=coord(b); let r0=Math.min(A.r,B.r),r1=Math.max(A.r,B.r),c0=Math.min(A.c,B.c),c1=Math.max(A.c,B.c);
    for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){ if(MAPA[r]?.[c]!==undefined && MAPA[r][c]!==1 && !isInHouse(c,r)) MAPA[r][c]=v; } }
  function linha(a,b,v){ bloco(a,b,v); } // mesma coisa (retângulo); usado p/ linhas/colunas
  // árvores pequenas
  linha('AJ34','AJ41',ARV);
  linha('AK36','AK41',ARV);
  linha('AL37','AL41',ARV);
  // caminho de terra batida (vários trechos)
  linha('X46','Z46',TERRA); linha('X47','Z47',TERRA);
  linha('Z45','AG45',TERRA); linha('AA46','AH46',TERRA);
  linha('AI47','AY47',TERRA); linha('AH46','AY46',TERRA);
  linha('AB43','AB45',TERRA);
  // copiar o caminho de Y19/Y20 -> Z19, AA19, AA20
  (function(){ let src=coord('Y19'), v19=MAPA[src.r]?.[src.c]; let src2=coord('Y20'), v20=MAPA[src2.r]?.[src2.c];
    set('Z19',v19); set('AA19',v19); set('AA20',v20); })();
  // pontes R19..V19 e R20..V20
  linha('R19','V19',PONTE); linha('R20','V20',PONTE);
  // caminhos de terra batida diversos
  linha('W15','AK15',TERRA); linha('W16','AK16',TERRA);
  linha('AE14','AG12',TERRA);
  linha('X2','AY3',TERRA);    // X2..AY3 (2 fileiras)
  linha('B2','Q3',TERRA);     // B2..Q3 (2 fileiras)
  // árvore + flor isoladas
  set('C12',ARV); set('C5',FLOR);

  // ====== CASA 1 (laboratório) — ENCURTADA: ocupa linhas 5..12 (coord) ======
  const TIJOLO=35, FACHADA=36, JANELA=37, ESTANTE_NOVA=39, PISO=40,
        FACHADA_PISO=38, JANELA_PISO=53, PORTA_MAD=54, VASO=48, PC_CURA=55, SOFA_TOP=50, SOFA_BOT=51;
  (function casa1(){
    let D=coord('D5').c, N=coord('N5').c;
    let rTopo=5-1, rFrente=11-1, rParede=12-1;   // topo=row5, frente=row11, parede=row12 (índices)
    // limpa qualquer resíduo da linha antiga (row 4) -> grama
    for(let c=D;c<=N;c++){ if(MAPA[3]?.[c]!==undefined) MAPA[3][c]=0; }
    // interior (rows 6..10) = piso
    for(let r=6-1;r<=10-1;r++)for(let c=D+1;c<=N-1;c++){ if(MAPA[r]?.[c]!==undefined) MAPA[r][c]=PISO; }
    // contorno de tijolos: topo (row5), laterais (col D e N)
    for(let c=D;c<=N;c++){ MAPA[rTopo][c]=TIJOLO; }
    for(let r=rTopo;r<=rParede;r++){ MAPA[r][D]=TIJOLO; MAPA[r][N]=TIJOLO; }
    // parede da frente (row12) = fachada sólida, com porta de madeira em I12
    for(let c=D;c<=N;c++){ MAPA[rParede][c]=FACHADA; }
    set('I12',PORTA_MAD);
    // fileira da frente (row11): piso por dentro / fachada por fora; janelas G11,K11
    for(let c=D+1;c<=N-1;c++){ MAPA[rFrente][c]=PISO; }
    set('G11',JANELA_PISO); set('K11',JANELA_PISO);
    // ---- móveis (linha de cima = row6) ----
    set('E6',VASO);                          // planta
    set('F6',ESTANTE_NOVA); set('G6',ESTANTE_NOVA); set('H6',ESTANTE_NOVA); // prateleiras
    set('I6',ESTANTE_NOVA);                   // prateleira
    set('J6',ESTANTE_NOVA);                   // armário (era planta) — igual ao L6
    set('K6',ESTANTE_NOVA); set('L6',ESTANTE_NOVA); // prateleiras (replicadas em K,L)
    set('M6',PC_CURA);                        // COMPUTADOR de cura (PC)
    // MESA SEPARADA: 3 esferas iniciais em H8/I8/J8 + pedestal do Pikachu em M10
    ['H8','I8','J8','M10'].forEach(c=>set(c,6));
    // sofá vertical na esquerda (rows 9-10)
    set('E9',SOFA_TOP); set('E10',SOFA_BOT);
  })();
  // ---- CONTORNO DE TIJOLOS ao redor da casa de baixo / Ginásio Oeste (porta em I37) ----
  (function(){
    let D=coord('D37').c, N=coord('N37').c, r0=37-1, r1=45-1, portaC=coord('I37').c;
    for(let c=D;c<=N;c++){ if(c!==portaC) set2(c,r0); }
    for(let c=D;c<=N;c++){ set2(c,r1); }
    for(let r=r0;r<=r1;r++){ set2(D,r); set2(N,r); }
    function set2(c,r){ if(MAPA[r]?.[c]!==undefined) MAPA[r][c]=TIJOLO; }
  })();
  // correção: tapete solto deixava buraco no telhado em I44 e AR44 -> vira piso
  set('I44',PISO); set('AR44',PISO);
  // ---- PORTAS DE MADEIRA nas outras casas ----
  ['AR11','AR37','I37'].forEach(c=>set(c,PORTA_MAD));
  // árvores em P6..P9
  ['P6','P7','P8','P9'].forEach(c=>set(c,12));

  // ---- LOTE 5: ajustes pedidos ao redor do laboratório ----
  // remover troncos soltos -> grama
  ['J13','K13','L13','M13','N13','O13','J4','O14',
   'J17','J18','K18','L18','M18','N18','O18',
   'H13','H14','G13','F13',
   'H17','H18','G18','F18','E18'].forEach(c=>set(c,GRAMA));
  // cor da fachada da frente do laboratório (row 11): mesma cor da parede frontal (N12 = FACHADA).
  // Cantos D11/N11 sólidos (FACHADA); miolo andável por dentro, fachada por fora (FACHADA_PISO).
  ['D11','N11'].forEach(c=>set(c,FACHADA));
  ['E11','F11','H11','I11','J11','L11','M11'].forEach(c=>set(c,FACHADA_PISO));
  // caminho de terra: BD31..BD38 e BE31..BE38 (2 colunas), + BE47/BF47
  linha('BD31','BD38',TERRA); linha('BE31','BE38',TERRA);
  ['BE47','BF47'].forEach(c=>set(c,TERRA));

  // ---- LOTE 6: ajustes pedidos ----
  set('J14',GRAMA);                 // remover tronco em J14
  set('F13',T);                     // tronco em F13
  set('H13',74);                    // caixa de correio em H13
  // árvores
  ['AX43','AX44','AX45','AY43'].forEach(c=>set(c,ARV));
  // quadrado de mato alto BB39..BL44 (preenche)
  bloco('BB39','BL44',MATO);
  // troncos intercalados com árvores na coluna BC39..BC44
  (function(){ let cc=coord('BC39').c; let r0=39-1, r1=44-1; let alt=true;
    for(let r=r0;r<=r1;r++){ if(MAPA[r]?.[cc]!==undefined){ MAPA[r][cc]= alt?T:ARV; alt=!alt; } } })();
  // móveis da nova casa (Casa Aconchego, BH32..BN36): mesa de centro + cadeiras
  set('BK34',6);                    // mesa de centro (62,33)
  set('BK33',75); set('BK35',75);   // cadeiras acima/abaixo da mesa
  // fecha o buraco na parede esquerda (BH32/BH33 estavam como estrada) — só a porta BH34 abre
  ['BH32','BH33'].forEach(c=>set(c,4));
  // árvore grande em AA6, AA7, Z7
  ['AA6','AA7','Z7'].forEach(c=>set(c,20));
  // peças triangulares grama/água no rio (orientação conforme o lado da água)
  set('W5',77); set('W8',79); set('V10',79); set('S9',76);
  // estação de trem (BD45..BN47): cercado em cima (gap de entrada), plataforma, trem embaixo
  linha('BD45','BN45',82); set('BI45',0);   // cercado + entrada (c60)
  linha('BD46','BN46',24);                   // plataforma (calçada)
  linha('BD47','BN47',81); set('BI47',80);   // vagões + porta de embarque (c60)

  // ---- LOTE 7: ajustes pedidos ----
  linha('AP47','AV47',83);          // árvores marrons
  linha('AD45','AG45',ARV);         // árvores
  ['T15','T16','T19','T20'].forEach(c=>set(c,84));  // ponte quebrada
  linha('R21','V21',ARV);           // árvores
  linha('B4','B10',ARV);            // árvores (coluna B)
  ['R4','R5'].forEach(c=>set(c,ARV));
  // diminuir faixa de pedestre (volta a asfalto)
  ['AT23','AT24','AT25','AT26','AS23','AS24','AS25','AS26',
   'J23','J24','J25','J26','BN23','BN24','BN25','BN26'].forEach(c=>set(c,25));
  linha('AX36','AX41',ARV);         // árvores
  set('AY41',85);                   // baú (dinheiro + 2 esferas)

  // ---- LOTE 8: bloqueio policial + ponte ----
  ['R27','R29'].forEach(c=>set(c,87));   // cerca policial (interdição)
  set('T47',13);                          // remove a ponte (vira água)
  ['U47','V47'].forEach(c=>set(c,84));    // ponte quebrada
  // setas no chão (B19/B20) que levam à área a OESTE
  ['B19','B20'].forEach(c=>set(c,88));

  // ====== CASA 2 (Ginásio Oeste) — móveis + balcão de loja ======
  const ESTANTE_180=58, BALCAO=57;
  // prateleiras viradas 180° em F44..L44
  (function(){ let A=coord('F44'),B=coord('L44'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=ESTANTE_180; } })();
  // planta M43 -> E44
  set('M43',PISO); set('E44',VASO);
  // sofá E43/F43 -> vertical em E41 (topo) e E42 (base)
  set('E43',PISO); set('F43',PISO); set('E41',SOFA_TOP); set('E42',SOFA_BOT);
  // balcão em U: G43,G42,G41,H41,I41,J41,K41,K42,K43 (será copiado p/ casa 3 e depois removido daqui)
  ['G43','G42','G41','H41','I41','J41','K41','K42','K43'].forEach(c=>set(c,BALCAO));

  // ====== LOTE NOVO ======
  const VMARROM_A=59, VMARROM_B=60;
  // vaso de planta em H39 e replica em J39
  set('H39',VASO); set('J39',VASO);
  // árvore em R10
  set('R10',ARV);
  // terra texturizada
  ['AF4','AG4','AQ15','AQ16','AS15','AS16'].forEach(c=>set(c,TERRA));
  // árvores V36 e W36..W41
  set('V36',ARV); ['W36','W37','W38','W39','W40','W41'].forEach(c=>set(c,ARV));
  // árvores AA47..AH47
  (function(){ let A=coord('AA47'),B=coord('AH47'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=ARV; } })();
  // terra B46..R46 e B47..R47
  (function(){ ['46','47'].forEach(rr=>{ let A=coord('B'+rr),B=coord('R'+rr); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=TERRA; } }); })();
  // flores em vaso marrom (cores diferentes) em AB17, AC17
  set('AB17',VMARROM_A); set('AC17',VMARROM_B);

  // ====== REPLICAÇÃO DE CASAS ======
  // copia retângulo de origem -> destino com offset (dcol, drow)
  function copiarCasa(c0,r0,c1,r1,dcol,drow){
    for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
      let nr=r+drow, nc=c+dcol;
      if(MAPA[r]?.[c]!==undefined && MAPA[nr]?.[nc]!==undefined) MAPA[nr][nc]=MAPA[r][c];
    }
  }
  // Casa 1 (lab, cols3-13 rows3-13) -> Casa 4 (Gin.Leste, cols38-48 rows2-12): offset col+35, row-1
  copiarCasa(3,3,13,13, 35,-1);
  // Casa 2 (Gin.Oeste, cols3-13 rows35-45) -> Casa 3 (Centro, cols38-48 rows34-44): offset col+35, row-1
  copiarCasa(3,35,13,45, 35,-1);
  // --- encurta a casa 4 igual à casa 1: limpa a linha-resíduo do topo (row 2 -> grama) ---
  for(let c=38;c<=48;c++){ if(MAPA[2]?.[c]!==undefined) MAPA[2][c]=0; }
  // --- Corrige as PORTAS das casas replicadas (uma porta só por casa) ---
  // Ginásio Leste (casa 4): porta única na base em (43,11)
  (function(){ MAPA[11][43]=PORTA_MAD; MAPA[10][43]=PISO; })();
  // Centro (casa 3): porta no topo (2 tiles) em (43,35)-(43,36)
  (function(){ MAPA[35][43]=PORTA_MAD; MAPA[36][43]=PORTA_MAD; MAPA[37][43]=PISO; })();

  // ====== LOTE MAPA (flores no piso, árvores, terra, troncos) ======
  // piso igual Q27 (calçada) com flores de cores diferentes em R43,R44,R45
  set('R43',61); set('R44',62); set('R45',63);
  // árvores
  ['B37','B38','B39','B40','C42','C43','C44','C45'].forEach(c=>set(c,ARV));
  (function(){ let A=coord('D47'),B=coord('H47'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=ARV; } })();
  (function(){ let A=coord('J46'),B=coord('N46'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=ARV; } })();
  // terra texturizada O37..O45
  (function(){ let cc=coord('O37').c; for(let r=37-1;r<=45-1;r++){ if(MAPA[r]?.[cc]!==undefined) MAPA[r][cc]=TERRA; } })();
  // troncos Q36, Q37
  ['Q36','Q37'].forEach(c=>set(c,T));

  // ====== POSTES DE LUZ de 7 em 7 nas fileiras 22 e 27 (começando em col D=3) ======
  (function(){ const POSTE=64; for(let c=3;c<=50;c+=7){ if(MAPA[21]?.[c]!==undefined) MAPA[21][c]=POSTE; if(MAPA[26]?.[c]!==undefined) MAPA[26][c]=POSTE; } 
    // garante o poste final em AY (col 50)
    if(MAPA[21]?.[50]!==undefined) MAPA[21][50]=POSTE; if(MAPA[26]?.[50]!==undefined) MAPA[26][50]=POSTE; })();
  // reafirma a cerca policial (o poste de 7-em-7 caía em R27 e sobrescrevia)
  ['R27','R29'].forEach(c=>set(c,87));

  // ====== balcão da casa 2 já foi copiado p/ casa 3 -> remove o da casa 2 (vira piso) ======
  ['G43','G42','G41','H41','I41','J41','K41','K42','K43'].forEach(c=>set(c,PISO));

  // ====== LOTE AJUSTES ======
  const TIJOLO_PRETO=35, MARROM_CASA=36, GIRASSOL_PISO=65, CALCADA=24;
  // Casa 4 (Gin.Leste) frente: blocos pretos AM11-AQ11 e AS11-AW11; marrom AM12-AQ12 e AS12-AW12
  (function(){
    [['AM11','AQ11'],['AS11','AW11']].forEach(([a,b])=>{ let A=coord(a),B=coord(b); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=TIJOLO_PRETO; } });
    [['AM12','AQ12'],['AS12','AW12']].forEach(([a,b])=>{ let A=coord(a),B=coord(b); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=MARROM_CASA; } });
  })();
  // Casa 3 (Centro): remove a porta de AR36 (mantém a de AR35) -> AR36 vira piso
  set('AR36',PISO);
  // volta o balcão na casa 2 (Gin.Oeste)
  ['G43','G42','G41','H41','I41','J41','K41','K42','K43'].forEach(c=>set(c,BALCAO));
  // tronco em U33
  set('U33',T);
  // blocos pretos sólidos AM45-AW45
  (function(){ let A=coord('AM45'),B=coord('AW45'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=TIJOLO_PRETO; } })();
  // piso de Z27 (calçada) + 3 girassóis em AL43,AL44,AL45
  ['AL43','AL44','AL45'].forEach(c=>set(c,GIRASSOL_PISO));
  // árvores AC44-AH44 e AH45
  (function(){ let A=coord('AC44'),B=coord('AH44'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=ARV; } })();
  set('AH45',ARV);
  // troncos AA32..AI32
  (function(){ let A=coord('AA32'),B=coord('AI32'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=T; } })();
  // montanha (intranspassável) Y10..AA10 e Y13..AB13
  const MONTANHA=66;
  (function(){ let A=coord('Y10'),B=coord('AA10'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=MONTANHA; } })();
  (function(){ let A=coord('Y13'),B=coord('AB13'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=MONTANHA; } })();

  // ====== CASA 4 (Gin.Leste) móveis ======
  // replica a estante AR5 em AS5
  set('AS5',ESTANTE_NOVA);
  // balcão vertical AP6..AP8 e AT6..AT8
  ['AP6','AP7','AP8','AT6','AT7','AT8'].forEach(c=>set(c,BALCAO));
  // dois vasos
  set('AN10',VASO); set('AV10',VASO);

  // ====== LOTE NOVO MAPA ======
  const CALCADA_CINZA=24;
  // (a esfera de AH33 é adicionada junto às demais bolas fixas, após bolasNoChao existir)
  // troncos AC35..AH35
  (function(){ let A=coord('AC35'),B=coord('AH35'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=T; } })();
  // troncos AA39..AG39
  (function(){ let A=coord('AA39'),B=coord('AG39'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=T; } })();
  // troncos Y8..AB8
  (function(){ let A=coord('Y8'),B=coord('AB8'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=T; } })();
  // árvores coluna AK5..AK11
  (function(){ let cc=coord('AK5').c; for(let r=5-1;r<=11-1;r++){ if(MAPA[r]?.[cc]!==undefined && MAPA[r][cc]===0) MAPA[r][cc]=ARV; } })();
  // árvores O5..O11 (coluna)
  (function(){ let cc=coord('O5').c; for(let r=5-1;r<=11-1;r++){ if(MAPA[r]?.[cc]!==undefined && MAPA[r][cc]===0) MAPA[r][cc]=ARV; } })();
  // árvores AC43..AI43
  (function(){ let A=coord('AC43'),B=coord('AI43'); for(let c=A.c;c<=B.c;c++){ if(MAPA[A.r]?.[c]!==undefined) MAPA[A.r][c]=ARV; } })();
  // calçada cinza (cor de Z22) em AD17 e AA17
  set('AD17',CALCADA_CINZA); set('AA17',CALCADA_CINZA);
  // textura externa D10..N10 = fachada marrom: as quinas D10/N10 eram tijolo preto -> fachada
  set('D10',36); set('N10',36);
  // CORREÇÃO FINAL casa 3: porta no TOPO em AR36; fecha a de baixo
  (function(){
    // fecha o corredor de baixo: coluna 43 volta ao normal
    MAPA[39][43]=57;  // restaura balcão
    MAPA[42][43]=58;  // restaura prateleira
    MAPA[43][43]=35;  // parede de baixo (tijolo) - remove porta AR44
    MAPA[44][43]=35;  // bloqueia AR45 (era saída) -> tijolo
    // abre a porta no topo em AR36
    MAPA[35][43]=54;  // porta de madeira no contorno do topo
    MAPA[36][43]=40;  // piso logo abaixo (entra pro salão)
    MAPA[34][43]=10;  // estrada/acesso externo acima da porta
  })();

  // sombra da porta em AR36 (porta escurecida 30%)
  set('AR36',67);
  // remove tronco em AL35 -> grama
  set('AL35',0);

  // ====== FAIXAS DE PEDESTRE horizontais (brancas) + bloqueio da rua ======
  const FAIXA_H=68;
  // faixa OESTE encolhida: cols 7-8 (H-I) — removida a coluna J(9), rows 22-25
  for(let r=22;r<=25;r++) for(let c=7;c<=8;c++){ if(MAPA[r]?.[c]!==undefined) MAPA[r][c]=FAIXA_H; }
  // faixa LESTE encolhida: cols 42-43 (AQ-AR) — removidas AS(44)/AT(45), rows 22-25
  for(let r=22;r<=25;r++) for(let c=42;c<=43;c++){ if(MAPA[r]?.[c]!==undefined) MAPA[r][c]=FAIXA_H; }
  // qualquer faixa vertical (31) restante na avenida -> asfalto sólido (25)
  for(let r=22;r<=25;r++) for(let c=0;c<LARGURA_MAPA;c++){ if(MAPA[r]?.[c]===31) MAPA[r][c]=25; }
  // (faixa de BN removida a pedido — cols J/AS/AT/BN deixam de ter faixa)

  // ====== LOTE NOVO ======
  // bloco de pedras Y10..AB13 (cols 24..27, rows 9..12)
  for(let r=9;r<=12;r++) for(let c=24;c<=27;c++){ if(MAPA[r]?.[c]!==undefined) MAPA[r][c]=70; }
  // árvores AZ2..BN4 (cols 51..65, rows 1..3)
  for(let r=1;r<=3;r++) for(let c=51;c<=65;c++){ if(MAPA[r]?.[c]!==undefined && MAPA[r][c]===0) MAPA[r][c]=ARV; }

  // ====== LOTE NOVO ======
  // troncos AH4 AI4 AD4 AE4
  ['AH4','AI4','AD4','AE4'].forEach(c=>set(c,T));
  // árvores Y5..AB7 (bloco)
  (function(){ let A=coord('Y5'),B=coord('AB7'); for(let r=A.r;r<=B.r;r++) for(let c=A.c;c<=B.c;c++){ if(MAPA[r]?.[c]!==undefined && MAPA[r][c]===0) MAPA[r][c]=ARV; } })();
  // Z6 é uma árvore MAIOR (tile 12, marcada como grande)
  set('Z6',69);
  // árvores coluna AY9..AY18
  (function(){ let cc=coord('AY9').c; for(let r=9-1;r<=18-1;r++){ if(MAPA[r]?.[cc]!==undefined && MAPA[r][cc]===0) MAPA[r][cc]=ARV; } })();
  // árvores AX4..AX6 (coluna)
  (function(){ let cc=coord('AX4').c; for(let r=4-1;r<=6-1;r++){ if(MAPA[r]?.[cc]!==undefined && MAPA[r][cc]===0) MAPA[r][cc]=ARV; } })();

  // ====== LOTE: pedidos do usuário (árvores e grama alta) ======
  const ARVGRANDE=20;            // 20 = árvore-grande
  linha('X36','X42',ARVGRANDE);  // árvores GRANDES na coluna X
  linha('Y36','Y42',ARV);        // árvores normais na coluna Y
  linha('BA34','BA41',ARV);      // árvores na coluna BA
  bloco('BM39','BN44',MATO);     // grama alta (mato) em BM39..BN44
})();

// ===== Efeito de FOLHAS ao vento: passam da direita (BC28) p/ a esquerda (AR28), em world coords =====
function efeitoFolhas(){
  if(typeof divMapa==='undefined' || !divMapa) return;
  const x0=54, x1=43, y=27;            // BC28 (c54) -> AR28 (c43), linha 28 (r27)
  const dxPx=(x1-x0)*TILE;             // deslocamento p/ a esquerda (negativo)
  for(let i=0;i<14;i++){
    let f=document.createElement('div'); f.className='folha-vento'; f.textContent='🍃';
    f.style.left=(x0*TILE)+'px'; f.style.top=((y*TILE)+(Math.random()*22-6))+'px';
    f.style.setProperty('--dx', dxPx+'px');
    f.style.animationDelay=(i*0.12)+'s';
    f.style.fontSize=(13+Math.random()*8)+'px';
    divMapa.appendChild(f);
    setTimeout(()=>{ if(f.parentNode) f.remove(); }, 2800+i*120);
  }
}

// ===== PLACAS na frente das casas (rótulo conforme os NPCs internos) =====
// Mapa de posição 'c,r' -> texto. Tile 16 (placa) é sólido; interage com [E] por adjacência.
let PLACAS={};
function colocarPlacas(){
  PLACAS={};
  // porta/entrada de cada casa (coord interna) -> rótulo
  const defs=[
    {d:[8,11],  txt:"🔬 LABORATÓRIO\nO Prof. Cedro entrega seu primeiro Pokémon."},
    {d:[43,11], txt:"🏋 GINÁSIO\nDesafie o Líder para ganhar uma insígnia."},
    {d:[8,36],  txt:"🏪 LOJA\nCompre Esferas e itens com o vendedor."},
    {d:[43,36], txt:"🏥 CENTRO POKÉMON\nUse [E] no computador para curar TODA a equipe de graça."},
  ];
  const livre=(x,y)=> MAPA[y] && MAPA[y][x]!==undefined && !isInHouse(x,y)
    && SOLIDOS.indexOf(MAPA[y][x])<0 && MAPA[y][x]!==2 && MAPA[y][x]!==13;
  defs.forEach(({d,txt})=>{
    let [dx,dy]=d;
    // célula de saída: vizinha ortogonal da porta, fora da casa e andável (fica desobstruída)
    let fora=[[0,1],[0,-1],[1,0],[-1,0]].map(([ox,oy])=>[dx+ox,dy+oy]).find(([x,y])=>livre(x,y));
    if(!fora) return;
    let [fx,fy]=fora;
    let ex=fx-dx, ey=fy-dy;       // direção do caminho de saída
    let bx=fx+ex, by=fy+ey;       // um passo além da saída
    // placa ao LADO (perpendicular ao caminho): ao lado da saída, depois um passo além, depois ao lado da porta
    let perp = (ex===0) ? [[1,0],[-1,0]] : [[0,1],[0,-1]];
    let cands = [
      [fx+perp[0][0], fy+perp[0][1]], [fx+perp[1][0], fy+perp[1][1]],
      [bx+perp[0][0], by+perp[0][1]], [bx+perp[1][0], by+perp[1][1]],
      [dx+perp[0][0], dy+perp[0][1]], [dx+perp[1][0], dy+perp[1][1]],
    ];
    let pos = cands.find(([x,y])=>livre(x,y));
    if(!pos) return;
    let [px,py]=pos; MAPA[py][px]=16; PLACAS[px+','+py]=txt;
  });
}

// Coordenadas que, vistas DE FORA, mostram fachada (em vez de telhado); por dentro preservam o tile real
let fachadaExterna=new Set();
(function(){
  function add(co){ let m=(''+co).toUpperCase().match(/^([A-Z]+)(\d+)$/); let c=0; for(let i=0;i<m[1].length;i++)c=c*26+(m[1].charCodeAt(i)-64); fachadaExterna.add((c-1)+','+(parseInt(m[2],10)-1)); }
  // D10..N10
  ['D10','E10','F10','G10','H10','I10','J10','K10','L10','M10','N10'].forEach(add);
  // fileira 11 (pula G11 e K11 = janelas)
  ['D11','E11','F11','H11','I11','J11','L11','M11','N11'].forEach(add);
})();

// (Vegetação aleatória removida — árvores/flores não são mais geradas automaticamente.)

// Esferas espalhadas no chão (item coletável)
let bolasNoChao=[];
(function semearBolas(){
  let tentativas=0;
  while(bolasNoChao.length<8 && tentativas<500){
    tentativas++;
    let c=2+Math.floor(Math.random()*(LARGURA_MAPA-4));
    let r=2+Math.floor(Math.random()*(ALTURA_MAPA-4));
    if(MAPA[r][c]===0 && !isInHouse(c,r) && !(r===player.y&&c===player.x) && !bolasNoChao.some(b=>b.x===c&&b.y===r)){
      bolasNoChao.push({x:c,y:r});
    }
  }
})();
// esfera fixa pedida em B47 (col 1, row 46) — se o tile estiver livre
(function(){ let c=1,r=46; if(MAPA[r]?.[c]===0 && !bolasNoChao.some(b=>b.x===c&&b.y===r)) bolasNoChao.push({x:c,y:r}); })();
// esferas pedidas: AL36 (col 37,row 35) e B12 (col 1,row 11)
[[37,35],[1,11]].forEach(([c,r])=>{ let v=MAPA[r]?.[c]; if([0,10,33,5,31].includes(v) && !bolasNoChao.some(b=>b.x===c&&b.y===r)) bolasNoChao.push({x:c,y:r}); });
// esfera AH33 (col 33,row 32 — fica no mato)
(function(){ let c=33,r=32; if(MAPA[r]?.[c]!==undefined && !bolasNoChao.some(b=>b.x===c&&b.y===r)) bolasNoChao.push({x:c,y:r}); })();

/* ============ NPCS / TRAINERS / WANDERERS ============ */
let pokemonsVagantes=[]; // sem Pokémon vagando no campo
// Pokémon selvagens FIXOS no mapa (batalham ao interagir/esbarrar). Snorlax ocupa 2 tiles.
let pokemonsFixos=[
  {nome:'Eevee',   x:1,  y:1,  lvl:20, emoji:'🦊', derrotado:false},
  {nome:'Snorlax', x:22, y:2,  lvl:30, emoji:'🐻', derrotado:false, tiles:[[22,2],[22,1]]}
];
// Espalha Pokémon selvagens ALEATÓRIOS em pontos de grama/mato pelo mapa
(function semearSelvagensAleatorios(){
  let nomes=Object.keys(BASE_POKEMONS); if(!nomes.length) return;
  // coleta TODOS os tiles de mato (2) livres do mapa
  let matos=[];
  for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++){
    if(MAPA[r]?.[c]===2 && !isInHouse(c,r)) matos.push([c,r]);
  }
  // embaralha
  for(let i=matos.length-1;i>0;i--){ let j=Math.floor(Math.random()*(i+1)); [matos[i],matos[j]]=[matos[j],matos[i]]; }
  let ocupados=new Set([
    ...pokemonsFixos.map(p=>p.x+','+p.y),
    ...(typeof bolasNoChao!=='undefined'?bolasNoChao.map(b=>b.x+','+b.y):[])
  ]);
  let qtd=Math.min(7, matos.length);   // metade do anterior (era 14) — Pokémon selvagens soltos
  let postos=0;
  for(let k=0;k<matos.length && postos<qtd;k++){
    let [c,r]=matos[k]; if(ocupados.has(c+','+r)) continue;
    let nm=nomes[Math.floor(Math.random()*nomes.length)];
    let lvl=8+Math.floor(Math.random()*18); // 8..25
    pokemonsFixos.push({nome:nm, x:c, y:r, lvl, derrotado:false, aleatorio:true});
    ocupados.add(c+','+r); postos++;
  }
})();
/* ============ SISTEMA DE REGIÕES ============ */
// Coloca a SAÍDA da cidade onde ficava o Mewtwo (canto inferior direito).
MAPA[46][65]=72;

let mapaRegiao='cidade';
const _estadoRegioes={}; // guarda snapshot por região

// Snapshot de tudo que é específico de uma região
function _snapshotRegiao(){
  return {
    mapa: MAPA.map(row=>row.slice()),
    fixos: pokemonsFixos.map(p=>({...p})),
    treinadores: listaTreinadores.map(t=>({...t})),
    npcsCampo: npcsCampo.map(n=>({...n})),
    npcsInternos: npcsInternos.map(n=>({...n})),
    bolas: bolasNoChao.map(b=>({...b})),
    casas: CASAS.map(c=>({...c})),
    fachada: new Set(fachadaExterna),
    carros: (typeof carros!=='undefined'? carros.map(c=>({...c})) : [])
  };
}
// Aplica um snapshot de volta aos arrays globais (in-place, sem trocar referências const)
function _restaurarRegiao(s){
  for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++) MAPA[r][c]=s.mapa[r][c];
  pokemonsFixos.length=0; s.fixos.forEach(p=>pokemonsFixos.push({...p}));
  listaTreinadores.length=0; s.treinadores.forEach(t=>listaTreinadores.push({...t}));
  npcsCampo.length=0; s.npcsCampo.forEach(n=>npcsCampo.push({...n}));
  npcsInternos.length=0; s.npcsInternos.forEach(n=>npcsInternos.push({...n}));
  bolasNoChao.length=0; s.bolas.forEach(b=>bolasNoChao.push({...b}));
  CASAS.length=0; s.casas.forEach(c=>CASAS.push({...c}));
  fachadaExterna.clear(); s.fachada.forEach(v=>fachadaExterna.add(v));
  if(typeof carros!=='undefined'){ carros.length=0; s.carros.forEach(c=>carros.push({...c})); }
}

// Gera a REGIÃO 2 ("Rota Norte"): grama aberta, trilhas, manchas de mato e portal de volta.
// Região OESTE: mapa pequeno (jogável só até col AJ=36 e linha 40; resto bloqueado).
function _gerarMapaOeste(){
  const COLMAX=36, ROWMAX=40;
  for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++){
    if(c>COLMAX || r>ROWMAX) MAPA[r][c]=1;                          // fora da área menor = sólido
    else MAPA[r][c]=(r===0||c===0||r===ROWMAX||c===COLMAX)?1:0;     // borda + grama
  }
  CASAS.length=0; fachadaExterna.clear();
  npcsInternos.length=0; bolasNoChao.length=0;
  if(typeof carros!=='undefined') carros.length=0;
  pokemonsFixos.length=0; listaTreinadores.length=0; npcsCampo.length=0;
  // moldura de árvores logo dentro da borda da área
  for(let c=1;c<COLMAX;c++){ MAPA[1][c]=12; MAPA[ROWMAX-1][c]=12; }
  for(let r=1;r<ROWMAX;r++){ MAPA[r][1]=12; MAPA[r][COLMAX-1]=12; }
  // trilha de terra no meio
  let rmid=Math.floor(ROWMAX/2);
  for(let c=2;c<COLMAX-1;c++){ MAPA[rmid][c]=32; }
  // manchas de mato alto (encontros)
  [[6,6,8,5],[20,9,8,6],[10,26,10,6],[24,28,8,5]].forEach(([x0,y0,w,h])=>{
    for(let r=y0;r<y0+h;r++)for(let c=x0;c<x0+w;c++){ if(MAPA[r]?.[c]===0) MAPA[r][c]=2; }
  });
  // árvores decorativas
  [[8,14],[16,20],[28,12],[12,32],[22,24]].forEach(([c,r])=>{ if(MAPA[r]?.[c]===0) MAPA[r][c]=12; });
  // seta de VOLTA para a cidade (borda direita, na altura da entrada)
  MAPA[19][COLMAX-1]=89;
  MAPA[19][COLMAX-2]=0;  // garante grama andável antes da seta
  // NPC de boas-vindas
  npcsCampo.push({nome:'Andarilho',x:30,y:19,cor:'c-verde',dir:'esquerda',msg:"Andarilho:\nEsta é a clareira a oeste. Use a seta ➡️ para voltar à cidade."});
  // semeia selvagens no mato (níveis médios)
  (function(){ let nomes=Object.keys(BASE_POKEMONS); if(!nomes.length)return;
    let matos=[]; for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++) if(MAPA[r][c]===2) matos.push([c,r]);
    for(let i=matos.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[matos[i],matos[j]]=[matos[j],matos[i]];}
    let qtd=Math.min(10,matos.length);
    for(let k=0;k<qtd;k++){let [c,r]=matos[k]; let nm=nomes[Math.floor(Math.random()*nomes.length)]; let lvl=10+Math.floor(Math.random()*15);
      pokemonsFixos.push({nome:nm,x:c,y:r,lvl,derrotado:false,aleatorio:true}); }
  })();
}
function _gerarRotaNorte(){
  // limpa tudo que é da cidade
  for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++){
    MAPA[r][c] = (r===0||r===ALTURA_MAPA-1||c===0||c===LARGURA_MAPA-1) ? 1 : 0;
  }
  CASAS.length=0; fachadaExterna.clear();
  npcsInternos.length=0; bolasNoChao.length=0;
  if(typeof carros!=='undefined') carros.length=0;

  // moldura de árvores logo dentro da borda (tile 12 = árvore, sólida)
  for(let c=1;c<LARGURA_MAPA-1;c++){ MAPA[1][c]=12; MAPA[ALTURA_MAPA-2][c]=12; }
  for(let r=1;r<ALTURA_MAPA-1;r++){ MAPA[r][1]=12; MAPA[r][LARGURA_MAPA-2]=12; }

  // trilha de terra (tile 32 = calçada-marrom, andável) em cruz
  let cmid=Math.floor(LARGURA_MAPA/2), rmid=Math.floor(ALTURA_MAPA/2);
  for(let c=2;c<LARGURA_MAPA-2;c++){ MAPA[rmid][c]=32; MAPA[rmid+1][c]=32; }
  for(let r=2;r<ALTURA_MAPA-2;r++){ MAPA[r][cmid]=32; MAPA[r][cmid+1]=32; }

  // manchas de mato alto (tile 2 = encontros selvagens)
  let manchas=[[6,6,10,5],[48,6,12,6],[8,34,14,6],[44,34,14,7],[28,20,12,6]];
  manchas.forEach(([x0,y0,w,h])=>{
    for(let r=y0;r<y0+h;r++)for(let c=x0;c<x0+w;c++){
      if(r>1&&r<ALTURA_MAPA-2&&c>1&&c<LARGURA_MAPA-2&&MAPA[r][c]===0) MAPA[r][c]=2;
    }
  });

  // algumas árvores decorativas espalhadas (sólidas)
  [[14,9],[20,14],[40,11],[52,28],[18,40],[46,42],[30,8],[34,38]].forEach(([c,r])=>{
    if(MAPA[r]?.[c]===0) MAPA[r][c]=12;
  });

  // PORTAL DE VOLTA para a cidade: canto inferior esquerdo (perto da entrada)
  MAPA[ALTURA_MAPA-3][2]=73;

  // selvagens da rota: níveis mais altos, espalhados no mato
  pokemonsFixos.length=0;
  listaTreinadores.length=0;
  npcsCampo.length=0;
  (function semearRota(){
    let nomes=Object.keys(BASE_POKEMONS); if(!nomes.length) return;
    let matos=[];
    for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++) if(MAPA[r][c]===2) matos.push([c,r]);
    for(let i=matos.length-1;i>0;i--){ let j=Math.floor(Math.random()*(i+1)); [matos[i],matos[j]]=[matos[j],matos[i]]; }
    let qtd=Math.min(16, matos.length);
    for(let k=0;k<qtd;k++){ let [c,r]=matos[k];
      let nm=nomes[Math.floor(Math.random()*nomes.length)];
      let lvl=22+Math.floor(Math.random()*20); // 22..41
      pokemonsFixos.push({nome:nm,x:c,y:r,lvl,derrotado:false,aleatorio:true});
    }
    // um lendário de recompensa no topo da rota
    pokemonsFixos.push({nome:'Mewtwo',x:cmid,y:3,lvl:70,emoji:'🧬',derrotado:false});
  })();
}

const ENTRADAS={
  cidade: {x:64, y:46},   // ao voltar da rota, reaparece ao lado da saída
  rota:   {x:3,  y:ALTURA_MAPA-3}, // ao chegar na rota, ao lado do portal de volta
  oeste:  {x:34, y:19},   // ao chegar na área oeste, perto da saída (borda direita)
  cidadeOeste: {x:2, y:19} // ao voltar da área oeste, ao lado das setas (B19/B20)
};

let _emTransicao=false;
function transicaoRegiao(destino, nomeExibir, entrada){
  if(_emTransicao) return; _emTransicao=true;
  const ov=$('transicao-regiao'), nm=$('transicao-nome');
  nm.textContent=nomeExibir;
  ov.style.pointerEvents='auto'; ov.style.opacity='1';
  setTimeout(()=>{ nm.style.opacity='1'; }, 250);
  setTimeout(()=>{
    // salva região de origem
    _estadoRegioes[mapaRegiao]=_snapshotRegiao();
    // aplica destino
    if(destino==='rota'){
      if(_estadoRegioes['rota']) _restaurarRegiao(_estadoRegioes['rota']);
      else _gerarRotaNorte();
    } else if(destino==='oeste'){
      if(_estadoRegioes['oeste']) _restaurarRegiao(_estadoRegioes['oeste']);
      else _gerarMapaOeste();
    } else {
      if(_estadoRegioes['cidade']) _restaurarRegiao(_estadoRegioes['cidade']);
    }
    mapaRegiao=destino;
    player.x=entrada.x; player.y=entrada.y;
    // reposiciona o companheiro logo atrás do jogador na nova região e limpa a fila
    if(companheiro){ companheiro.x=entrada.x; companheiro.y=entrada.y; companheiro.andandoAte=0; _filaPassos=[]; }
    atualizarCamera(); desenharMundo(); renderizarJogador();
    if(companheiro) renderizarCompanheiro();
    if(typeof musicaPorRegiao==='function') musicaPorRegiao();
    // fade in
    nm.style.opacity='0';
    setTimeout(()=>{ ov.style.opacity='0'; ov.style.pointerEvents='none'; _emTransicao=false; }, 350);
  }, 750);
}

setInterval(()=>{
  if(jogoIniciado&&!emBatalha&&!mostrandoNotificacao&&!esperandoEspaco&&!emParty&&!emPokedex){
    pokemonsVagantes.forEach(p=>{let d=Math.floor(Math.random()*4),nx=p.x,ny=p.y;
      if(d===0)ny--;else if(d===1)ny++;else if(d===2)nx--;else nx++;
      if(ny>=2&&ny<ALTURA_MAPA-1&&nx>=1&&nx<LARGURA_MAPA-1&&MAPA[ny][nx]===0){p.x=nx;p.y=ny;}});
    desenharMundo();
  }
},2200);

let npcsInternos=[
  {nome:'PROF',x:8,y:6,cor:'c-branco',spriteCustom:'professor',msg:"Prof. Cedro:\nAh, é você! Pegue um parceiro na mesa e explore Nova Region.\nA estrada no meio cruza o rio por pontes de madeira. Há dois Ginásios (teto azul) e um Centro Pokémon (teto vermelho) nos cantos.\n\nIMPORTANTE: quando seus Pokémon ficarem feridos ou desmaiarem, vá ao CENTRO POKÉMON (a casa de teto vermelho) e use [E] no computador de cura para recuperar TODA a equipe de graça. Se todos desmaiarem, você não poderá batalhar até curá-los lá!"},
  {nome:'Vendedor',x:43,y:40,cor:'c-azul-r',msg:"Vendedor de Pokémon:\nCompro e vendo Pokémon! As ofertas mudam a cada 5 minutos."},
  {nome:'Vendedor2',x:8,y:41,cor:'c-verde',dir:'cima',msg:"Vendedor:\nEsferas a bom preço, freguês!"},
  // Casa Aconchego (BH32..BN36): dois moradores em volta da mesa de centro
  {nome:'Morador',x:61,y:33,cor:'c-rosa',dir:'direita',msg:"Moradora:\nQue bom receber visita! Senta um pouco com a gente."},
  {nome:'Morador2',x:63,y:33,cor:'c-azul-j',dir:'esquerda',msg:"Morador:\nEsta vila é tranquila. Um bom chá e boa conversa é tudo que precisamos."}
];
let balconista={x:-9,y:-9,cor:'c-verde'}; // removido (loja de cura desativada)
// NPCs decorativos de campo (sem batalha) — interagíveis com [E]
let npcsCampo=[
  {nome:'Moça',x:48,y:27,skin:'lf',msg:"Moça de cabelo grande:\nO vento daqui deixa o meu cabelo uma bagunça total!"},
  {nome:'Criança',x:47,y:27,cor:'c-amarelo',escala:0.8,dir:'direita',msg:"Criança:\nEu A-DO-RO esse vento! Ele deixa meu cabelo todo bagunçado e eu acho isso o máximo!"},
  {nome:'RIVAL',x:8,y:13,cor:'c-preto',ehRival:true,corClasse:'c-preto',derrotado:false,lider:false,premio:1500,pokemons:[]},
  {nome:'Criança A',x:27,y:17,cor:'c-amarelo',escala:0.8,msg:"Criança:\nViu as flores ali? Tem de várias cores! Minha favorita é a vermelha."},
  {nome:'Criança B',x:28,y:17,cor:'c-verde',escala:0.8,msg:"Criança:\nEu gosto mais dos girassóis! Eles ficam virados pro sol o dia todo."},
  {nome:'Policial',x:41,y:26,spriteCustom:'policia',dir:'esquerda',msg:"Policial:\nMantenha a ordem na cidade, treinador. A travessia é só nas faixas de pedestre!"},
  // Bloqueio policial em R (col 17): dois guardas + cerca, caminho interditado
  {nome:'Policial2',x:17,y:27,spriteCustom:'policia',dir:'esquerda',msg:"Policial:\n🚧 Este caminho está INTERDITADO! Ninguém passa por aqui hoje."},
  {nome:'Policial3',x:17,y:29,spriteCustom:'policia',dir:'esquerda',msg:"Policial:\nDesculpe, treinador. A via está fechada — siga por outro caminho."},
  {nome:'Professor',x:27,y:18,spriteCustom:'professor',msg:"Professor:\nBem-vindo ao meu laboratório de campo! Estude bem cada Pokémon que encontrar."},
  {nome:'Sábio',x:28,y:18,spriteCustom:'sabio',msg:"Sábio:\nJá percorri muitas regiões com esta mochila. A jornada ensina mais que qualquer batalha."}
];
// Estado do nível do rival: null = primeira batalha (usa jogador-1); depois vira fixo e sobe +4 por derrota
let rivalNivel=null, rivalVitoriasJogador=0;
let rivalChamouPrimeiro=false; // true depois do desafio do rival na 1ª saída do laboratório
let rivalEquipe=[]; // espécies FIXAS do rival (uma vez sorteadas, nunca mudam); cresce até 5 nas vitórias do jogador
const RIVAL_MAX=5;
// Sorteia uma espécie nova ainda não usada pelo rival
function sortearEspecieRival(){
  let nomes=Object.keys(BASE_POKEMONS);
  let disp=nomes.filter(n=>!rivalEquipe.includes(n));
  let pool=disp.length?disp:nomes;
  return pool[Math.floor(Math.random()*pool.length)];
}
// Monta o time do rival a partir das espécies FIXAS; só o nível é recalculado.
// As espécies persistem entre batalhas — só crescem (via crescerEquipeRival) quando o jogador vence.
function montarTimeRival(){
  let rival=npcsCampo.find(n=>n.ehRival); if(!rival)return;
  // garante pelo menos 1 espécie fixa na 1ª vez
  if(rivalEquipe.length===0) rivalEquipe.push(sortearEspecieRival());
  // define o nível-base do rival
  let lvl;
  if(rivalNivel===null){ // primeira batalha: nível do 1º Pokémon do jogador - 1
    let lvlJog=Math.max(1,(equipeAtiva[0]?equipeAtiva[0].level:5));
    lvl=Math.max(1, lvlJog-1);
  } else {
    lvl=rivalNivel; // nível fixo (já acumulou os +4 das derrotas/vitórias anteriores)
  }
  rival.nivelAtual=lvl;
  rival.nome=nomeRival();   // Mike (Luke) ou Jade (Ayla), conforme o personagem escolhido
  // todas as espécies fixas no mesmo nível
  rival.pokemons=rivalEquipe.map(n=>({n, lvl}));
  rival.derrotado=false;
}
// Quando o jogador VENCE: o rival ganha +1 espécie nova (fixa), até o limite (min de 5 e o tamanho da equipe do jogador)
function crescerEquipeRival(){
  let alvo=Math.min(RIVAL_MAX, Math.max(1, equipeAtiva.length));
  if(rivalEquipe.length<alvo){ rivalEquipe.push(sortearEspecieRival()); }
}
// Reposiciona o rival em um tile livre aleatório do mapa (fora de casas)
function reposicionarRival(){
  let rival=npcsCampo.find(n=>n.ehRival); if(!rival)return;
  for(let tent=0;tent<400;tent++){
    let c=2+Math.floor(Math.random()*(LARGURA_MAPA-4));
    let r=2+Math.floor(Math.random()*(ALTURA_MAPA-4));
    if(SOLIDOS.indexOf(MAPA[r][c])<0 && !isInHouse(c,r) && MAPA[r][c]!==2 &&
       !(c===player.x&&r===player.y) && !bolasNoChao.some(b=>b.x===c&&b.y===r) &&
       !npcsCampo.some(n=>!n.ehRival&&n.x===c&&n.y===r)){
      rival.x=c; rival.y=r; return;
    }
  }
}
let listaTreinadores=[
  // Líder do Ginásio Leste (sup. dir.) + capanga dentro do ginásio
  {id:5,x:42,y:6,corClasse:'c-azul-j',nome:'Faixa-Preta',pokemons:[{n:'Primeape',lvl:30}],derrotado:false,premio:1200},
  {id:14,x:50,y:1,corClasse:'c-rosa',nome:'Mestra Rosa',pokemons:[{n:'Gyarados',lvl:70}],derrotado:false,lider:true,premio:7000},
  {id:6,x:43,y:6,corClasse:'c-vermelho',nome:'LÍDER Bruno',pokemons:[{n:'Machamp',lvl:40}],derrotado:false,lider:true,premio:3000},
  // Líder do Ginásio Oeste (inf. esq.)
  {id:7,x:8,y:41,corClasse:'c-roxo',nome:'LÍDER Sabrina',pokemons:[{n:'Alakazam',lvl:42}],derrotado:false,lider:true,premio:3200},
  // ---- Treinadores de campo (times aleatórios) ----
  {id:10,x:10,y:46,corClasse:'c-azul-r',skin:'np',nome:'Treinador Novato',pokemons:[{n:'Spearow',lvl:10},{n:'Horsea',lvl:10},{n:'Magneton',lvl:10}],derrotado:false,premio:600},
  {id:11,x:31,y:45,corClasse:'c-marrom-b',skin:'np',nome:'Treinador Veterano',pokemons:[{n:'Raticate',lvl:25},{n:'Moltres',lvl:25},{n:'Nidoking',lvl:25},{n:'Graveler',lvl:25}],derrotado:false,premio:1500},
  {id:12,x:47,y:45,corClasse:'c-roxo',nome:'Treinador Elite',pokemons:[{n:'Kabutops',lvl:35},{n:'MrMime',lvl:35},{n:'Persian',lvl:35}],derrotado:false,premio:2100},
  {id:13,x:32,y:40,corClasse:'c-azul-j',skin:'nb',nome:'Treinador Errante',dir:'esquerda',pokemons:[{n:'Psyduck',lvl:10},{n:'Flareon',lvl:10},{n:'Ekans',lvl:10}],derrotado:false,premio:1800},
  {id:15,x:20,y:33,corClasse:'c-verde',skin:'nb',nome:'Treinador da Trilha',dir:'esquerda',pokemons:[{n:'Sandshrew',lvl:11},{n:'Geodude',lvl:11}],derrotado:false,premio:900},
  {id:16,x:53,y:5,corClasse:'c-roxo',nome:'BOSS do Labirinto',dir:'baixo',pokemons:[{n:'Onix',lvl:35},{n:'Golem',lvl:38},{n:'Rhydon',lvl:40}],derrotado:false,lider:true,premio:8000,bossLabirinto:true},
  {id:17,x:55,y:13,corClasse:'c-azul-j',nome:'Guardião I',dir:'cima',pokemons:[{n:'Machop',lvl:15}],derrotado:false,premio:1500},
  {id:18,x:63,y:11,corClasse:'c-vermelho',nome:'Guardião II',dir:'esquerda',pokemons:[{n:'Graveler',lvl:20}],derrotado:false,premio:2000},
  {id:19,x:54,y:9,corClasse:'c-amarelo',nome:'Guardião III',dir:'baixo',pokemons:[{n:'Hitmonlee',lvl:25}],derrotado:false,premio:2500},
  {id:20,x:58,y:7,corClasse:'c-verde',nome:'Guardião IV',dir:'direita',pokemons:[{n:'Onix',lvl:30}],derrotado:false,premio:3000},
  // Treinador ninja em S46 (era o aviso 'Morador' de R46, agora vira batalha) — ninja preto
  {id:21,x:18,y:45,corClasse:'c-marrom-b',skin:'np',nome:'Ninja das Sombras',dir:'cima',pokemons:[{n:'Ekans',lvl:12},{n:'Koffing',lvl:12},{n:'Zubat',lvl:12}],derrotado:false,premio:1100},
  // Segundo ninja branco logo abaixo do da trilha (U34) — em U35, virado p/ esquerda
  {id:22,x:20,y:34,corClasse:'c-verde',skin:'nb',nome:'Ninja da Trilha',dir:'esquerda',pokemons:[{n:'Sandshrew',lvl:11},{n:'Zubat',lvl:11}],derrotado:false,premio:900}
];

// Starters: 3 esferas na mesa (H8/I8/J8) + Pikachu num pedestal separado (M10).
// Escolher qualquer um define o inicial e faz os outros sumirem (render é gated por !inicialEscolhido).
const STARTERS=[
  {nome:'Bulbasaur', x:7, y:7, atalho:'Q'},  // H8
  {nome:'Charmander',x:8, y:7, atalho:'W'},  // I8
  {nome:'Squirtle',  x:9, y:7, atalho:'E'},  // J8
  {nome:'Pikachu',   x:12,y:9, atalho:'R'}   // M10 (separado)
];

/* ============ NOTIFICATION ============ */
function mostrarAviso(texto,cb=null){mostrandoNotificacao=true; callbackNotificacao=cb;
  $('texto-notificacao').innerText=texto; $('caixa-notificacao').style.display='flex';}
function fecharNotificacao(){$('caixa-notificacao').style.display='none'; mostrandoNotificacao=false;
  if(callbackNotificacao){let f=callbackNotificacao; callbackNotificacao=null; f();}}

/* ============ SPRITES (16x16 chibi, canvas) ============ */
/* Mapa de chaves -> cor. Chaves minúsculas/maiúsculas distinguem tons.
   Customizável: pele(s/S), cabelo(h/H), camisa(c/C), acento(a), calça/bota(p/P).
   Fixos: contorno(o), branco-olho(w), preto-olho(k), sombra-pele(d). */
const PLAYER_PALETTE={
  pele:'#ffd9a8', peleSombra:'#e8b98a',
  cabelo:'#6b4a2b', cabeloSombra:'#4d3219',
  camisa:'#7d8aa3', camisaSombra:'#5f6c85',
  acento:'#ff8c2e',
  calca:'#34507a', bota:'#5a3a22'
};
function paletaMap(P){
  // tons derivados para sombreamento mais rico
  function mix(hex,f){let n=parseInt(hex.slice(1),16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    r=Math.max(0,Math.min(255,Math.round(r*f)));g=Math.max(0,Math.min(255,Math.round(g*f)));b=Math.max(0,Math.min(255,Math.round(b*f)));
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
  return {
  '.':null, o:'#1f232e', w:'#ffffff', k:'#3a2c22',
  s:P.pele, d:P.peleSombra, b:'#f0a0a0',
  H:P.cabeloSombra, h:P.cabelo, j:mix(P.cabelo,1.35),
  c:P.camisa, C:P.camisaSombra, l:mix(P.camisa,1.25),
  a:P.acento, R:mix(P.acento,0.82),
  p:P.calca, q:mix(P.calca,0.7),
  P:P.bota, B:mix(P.bota,1.5)
};}

/* Cada direção tem 2 frames (perna A/B). 16 colunas x 16 linhas. */
const SPRITES={
baixo:[
[
"................................................................",
"................................o...............................",
"...........................oooooHooooo..........................",
".........................ooHHHHHhHHHHHoo........................",
"........................oHHhhhhhhhhhhhHHo.......................",
"......................oojjjjjjjjjjjjjjjjjoo.....................",
".....................oHhjjjjjjjjjjjjjjjjjhHo....................",
".....................ohhjjjjjjjjjjjjjjjjjhho....................",
"....................ohhhhhhhhhhhhhhhhhhhhhhho...................",
"...................oHhhhhhhhhhhhhhhhhhhhhhhhHo..................",
"...................oHhhhhhhhhhhhhhhhhhhhhhhhHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"..................oHHHHHhhhhhhhhhhhhhhhhhHHHHHo.................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHsssssssssssssHHHHHHo..................",
"...................oHHHHHHsssssssssssssHHHHHHo..................",
"...................oHHHHHHHHHHhhhhhHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHhHHHHHHHHHHHHo..................",
"....................ooHHHwwwwwHHHHHwwwwwHHHoo...................",
"....................osssHwkwwwHHHHHwkwwwHssso...................",
"....................osssswkwwwHHHHHwkwwwsssso...................",
"....................osssswkkkwHHHHHwkkkwsssso...................",
"....................osssswwwwwssHsswwwwwsssso...................",
"....................ossssssssssdddsssssssssso...................",
"....................ossssssssssdddsssssssssso...................",
".....................oosssssssssssssssssssoo....................",
"......................ossssssssssssssssssso.....................",
".......................osssssdddddddssssso......................",
".......................ossssssssdsssssssso......................",
"........................osdddddddddddddso.......................",
"........................oddddsssssssddddo.......................",
".........................odddsssssssdddo........................",
"..........................ooosssssssooo.........................",
".....................oooooooodddddddoooooooo....................",
"................oooooaaaaaaaadddddddaaaaaaaaooooo...............",
"...............oaaaaaaaaaaaaadddddddaaaaaaaaaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"..............oddssssRRaaaaaaaaaaaaaaaaaaaRRssssddo.............",
"..............oddssssRRaaaaaaaaaaaaaaaaaaaRRssssddo.............",
"..............oddssssRRaaaaaaaaaaaaaaaaaaaRRssssddo.............",
"..............oddssssaaaaaaaaaaaaaaaaaaaaaaassssddo.............",
"..............oddssssopppppppppppppppppppppossssddo.............",
"..............oddssssopqqppppppqqqppppppqqpossssddo.............",
"..............oddssssooqqppppppqqqppppppqqoossssddo.............",
"..............oddssssooqqppppppqqqppppppqqoossssddo.............",
"..............oddssssooqqppppppqqqppppppqqoossssddo.............",
"..............ossssssooqqppppppqqqppppppqqoosssssso.............",
"..............ossssssooqqppppppqqqppppppqqoosssssso.............",
"..............ossssssooqqppppppqqqppppppqqoosssssso.............",
"...............oooooo.oqqppppppqqqppppppqqo.oooooo..............",
"......................oqqppppppqqqppppppqqo.....................",
"......................oqqppppppqqqppppppqqo.....................",
".....................oBBBBBBBBBBoBBBBBBBBBBo....................",
".....................oPPPPPPPPPPoPPPPPPPPPPo....................",
".....................oPPPPPPPPPPoPPPPPPPPPPo....................",
".....................oPPPPPPPPPPoPPPPPPPPPPo...................."
],
[
"................................................................",
"................................o...............................",
"...........................oooooHooooo..........................",
".........................ooHHHHHhHHHHHoo........................",
"........................oHHhhhhhhhhhhhHHo.......................",
"......................oojjjjjjjjjjjjjjjjjoo.....................",
".....................oHhjjjjjjjjjjjjjjjjjhHo....................",
".....................ohhjjjjjjjjjjjjjjjjjhho....................",
"....................ohhhhhhhhhhhhhhhhhhhhhhho...................",
"...................oHhhhhhhhhhhhhhhhhhhhhhhhHo..................",
"...................oHhhhhhhhhhhhhhhhhhhhhhhhHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"..................oHHHHHhhhhhhhhhhhhhhhhhHHHHHo.................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHsssssssssssssHHHHHHo..................",
"...................oHHHHHHsssssssssssssHHHHHHo..................",
"...................oHHHHHHHHHHhhhhhHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHhHHHHHHHHHHHHo..................",
"....................ooHHHwwwwwHHHHHwwwwwHHHoo...................",
"....................osssHwkwwwHHHHHwkwwwHssso...................",
"....................osssswkwwwHHHHHwkwwwsssso...................",
"....................osssswkkkwHHHHHwkkkwsssso...................",
"....................osssswwwwwssHsswwwwwsssso...................",
"....................ossssssssssdddsssssssssso...................",
"....................ossssssssssdddsssssssssso...................",
".....................oosssssssssssssssssssoo....................",
"......................ossssssssssssssssssso.....................",
".......................osssssdddddddssssso......................",
".......................ossssssssdsssssssso......................",
"........................osdddddddddddddso.......................",
"........................oddddsssssssddddo.......................",
".........................odddsssssssdddo........................",
"..........................ooosssssssooo.........................",
".....................oooooooodddddddoooooooo....................",
"................oooooaaaaaaaadddddddaaaaaaaaooooo...............",
"...............oaaaaaaaaaaaaadddddddaaaaaaaaaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaaaaaaaaaaaaRRaaaaao..............",
"..............oddssssRRaaaaaaaaaaaaaaaaaaaRRssssddo.............",
"..............oddssssRRaaaaaaaaaaaaaaaaaaaRRssssddo.............",
"..............oddssssRRaaaaaaaaaaaaaaaaaaaRRssssddo.............",
"..............oddssssaaaaaaaaaaaaaaaaaaaaaaassssddo.............",
"..............oddssssopppppppppppppppppppppossssddo.............",
"..............oddssssoppqqpppppppppppppqqppossssddo.............",
"..............oddssssoooqqpppppppppppppqqooossssddo.............",
"..............oddsssso.oqqpppppppppppppqqo.ossssddo.............",
"..............oddsssso.oqqpppppppppppppqqo.ossssddo.............",
"..............osssssso.oqqpppppppppppppqqo.osssssso.............",
"..............osssssso.oqqpppppppppppppqqo.osssssso.............",
"..............osssssso.oqqpppppppppppppqqo.osssssso.............",
"...............oooooo..oqqpppppppppppppqqo..oooooo..............",
".......................oqqpppppppppppppqqo......................",
".......................oqqpppppppppppppqqo......................",
"......................oBBBBBBBBBBBBBBBBBBBo.....................",
"......................oPPPPPPPPPPPPPPPPPPPo.....................",
"......................oPPPPPPPPPPPPPPPPPPPo.....................",
"......................oPPPPPPPPPPPPPPPPPPPo....................."
]
],
cima:[
[
"................................................................",
"................................o...............................",
"...........................oooooHooooo..........................",
".........................ooHHHHHhHHHHHoo........................",
"........................oHHhhhhhhhhhhhHHo.......................",
"......................oojjjjjjjjjjjjjjjjjoo.....................",
".....................oHhjjjjjjjjjjjjjjjjjhHo....................",
".....................ohhjjjjjjjjjjjjjjjjjhho....................",
"....................ohhhhhhhhhhhhhhhhhhhhhhho...................",
"...................oHhhhhhhhhhhhhhhhhhhhhhhhHo..................",
"...................oHhhhhhhhhhhhhhhhhhhhhhhhHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"..................oHHHHHhhhhhhhhhhhhhhhhhHHHHHo.................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"....................oHHHHHHHHHHHHHHHHHHHHHHHo...................",
"....................oHHHHHHHHHHHHHHHHHHHHHHHo...................",
"....................oHHHHHHHHHHHHHHHHHHHHHHHo...................",
".....................ooosssssssssssssssssooo....................",
"........................ossssssssssssssso.......................",
".........................ossssssssssssso........................",
"..........................oosdddddddsoo.........................",
".....................oooooooodddddddoooooooo....................",
"................oooooaaaaaaaaaaaaaaaaaaaaaaaooooo...............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"..............ossssssRRaaaaaaaaRRRaaaaaaaaRRsssssso.............",
"..............ossssssRRaaaaaaaaRRRaaaaaaaaRRsssssso.............",
"..............ossssssRRaaaaaaaaRRRaaaaaaaaRRsssssso.............",
"..............ossssssaaaaaaaaaaaaaaaaaaaaaaasssssso.............",
"..............ossssssoppppppppppppppppppppposssssso.............",
"..............ossssssoppppppppppppppppppppposssssso.............",
"..............ossssssoopppppppppopppppppppoosssssso.............",
"..............ossssssoopppppppppopppppppppoosssssso.............",
"..............ossssssoopppppppppopppppppppoosssssso.............",
"..............ossssssoopppppppppopppppppppoosssssso.............",
"..............ossssssoopppppppppopppppppppoosssssso.............",
"..............ossssssoopppppppppopppppppppoosssssso.............",
"...............oooooo.opppppppppopppppppppo.oooooo..............",
"......................opppppppppopppppppppo.....................",
"......................opppppppppopppppppppo.....................",
".....................oPPPPPPPPPPoPPPPPPPPPPo....................",
".....................oPPPPPPPPPPoPPPPPPPPPPo....................",
".....................oPPPPPPPPPPoPPPPPPPPPPo....................",
".....................oPPPPPPPPPPoPPPPPPPPPPo...................."
],
[
"................................................................",
"................................o...............................",
"...........................oooooHooooo..........................",
".........................ooHHHHHhHHHHHoo........................",
"........................oHHhhhhhhhhhhhHHo.......................",
"......................oojjjjjjjjjjjjjjjjjoo.....................",
".....................oHhjjjjjjjjjjjjjjjjjhHo....................",
".....................ohhjjjjjjjjjjjjjjjjjhho....................",
"....................ohhhhhhhhhhhhhhhhhhhhhhho...................",
"...................oHhhhhhhhhhhhhhhhhhhhhhhhHo..................",
"...................oHhhhhhhhhhhhhhhhhhhhhhhhHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"..................oHHHHHhhhhhhhhhhhhhhhhhHHHHHo.................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHhhhhhhhhhhhhhhhhhHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"...................oHHHHHHHHHHHHHHHHHHHHHHHHHo..................",
"....................oHHHHHHHHHHHHHHHHHHHHHHHo...................",
"....................oHHHHHHHHHHHHHHHHHHHHHHHo...................",
"....................oHHHHHHHHHHHHHHHHHHHHHHHo...................",
".....................ooosssssssssssssssssooo....................",
"........................ossssssssssssssso.......................",
".........................ossssssssssssso........................",
"..........................oosdddddddsoo.........................",
".....................oooooooodddddddoooooooo....................",
"................oooooaaaaaaaaaaaaaaaaaaaaaaaooooo...............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"...............oaaaaaRRaaaaaaaaRRRaaaaaaaaRRaaaaao..............",
"..............ossssssRRaaaaaaaaRRRaaaaaaaaRRsssssso.............",
"..............ossssssRRaaaaaaaaRRRaaaaaaaaRRsssssso.............",
"..............ossssssRRaaaaaaaaRRRaaaaaaaaRRsssssso.............",
"..............ossssssaaaaaaaaaaaaaaaaaaaaaaasssssso.............",
"..............ossssssoppppppppppppppppppppposssssso.............",
"..............ossssssoppppppppppppppppppppposssssso.............",
"..............ossssssooopppppppppppppppppooosssssso.............",
"..............osssssso.opppppppppppppppppo.osssssso.............",
"..............osssssso.opppppppppppppppppo.osssssso.............",
"..............osssssso.opppppppppppppppppo.osssssso.............",
"..............osssssso.opppppppppppppppppo.osssssso.............",
"..............osssssso.opppppppppppppppppo.osssssso.............",
"...............oooooo..opppppppppppppppppo..oooooo..............",
".......................opppppppppppppppppo......................",
".......................opppppppppppppppppo......................",
"......................oPPPPPPPPPPPPPPPPPPPo.....................",
"......................oPPPPPPPPPPPPPPPPPPPo.....................",
"......................oPPPPPPPPPPPPPPPPPPPo.....................",
"......................oPPPPPPPPPPPPPPPPPPPo....................."
]
],
lado:[
[
"................................................................",
"................................................................",
".................................o..............................",
".............................ooooHoooo..........................",
"...........................ooHHHHHHHHHoo........................",
"..........................ojjjjjjjjjjjjjo.......................",
".........................oHjjjjjjjjjjjjjHo......................",
"........................ohhjjjjjjjjjjjjjHHo.....................",
".......................ohhhhhhhhhhhhhhhhhHHo....................",
"......................ohhhhhhhhhhhhhhhhhhhHHo...................",
"......................ohhhhhhhhhhhhhhhhhhhHHo...................",
".....................ohhhhhhhhhhhhhhhhhhhhhHo...................",
"......................ohhHHHHhhhhhhhhhhhhhHHo...................",
".....................oHhhHHHHhhhhhhhhhhhhhHHHo..................",
"......................oHhHHHHhhhhhhhhhhhhHHHo...................",
"......................oHHHHHHHHHHHHHHHHHHHHHo...................",
"......................oHHHHHHHHHHssssssssHHHo...................",
"......................oHHHHHHHHHHssssssssHHHo...................",
".......................oHHHHHHHHHHHHHHHHHHHso...................",
"........................oHHHHHHHHHHHHHHHHHsso...................",
"........................oHHHHHHHHHHHHHHHHssso...................",
"........................oHHHHHHHHHHHHwwwwwsso...................",
".......................osssssHHsssHHHwkwwwssso..................",
"........................ossssssddsssswkwwwsso...................",
"........................ossssssddsssswkkkwsso...................",
"........................ossssssddsssswwwwwsso...................",
"........................osssssssssssssssssddo...................",
"........................osssssssssssssssssddo...................",
".........................ossssssssssssssssso....................",
".........................ossssssssssssdddddo....................",
"..........................ossssssssssssssso.....................",
"...........................ossssssssssssso......................",
"............................ossssssssssso.......................",
".............................oosssssssso........................",
"..............................osssssssso........................",
"............................oooddddddddoo.......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaddssssaaRRRo......................",
"...........................oaaddssssaaRRRo......................",
"...........................oaaddssssaaRRRo......................",
"...........................oaaddssssaaRRRo......................",
"............................opppppppppppo.......................",
"............................opppppppppppo.......................",
".............................oppppppppppo.......................",
".............................oppppppppppo.......................",
".............................oppppppppppo.......................",
".............................oppppppppppo.......................",
".............................oppppppppppo.......................",
".............................oppppppppppo.......................",
".............................oppppppppppo.......................",
".............................oppppppppppo.......................",
".............................oppppppppppo.......................",
"............................oPPPPPPPPPPPPo......................",
"............................oPPPPPPPPPPPPo......................",
"............................oPPPPPPPPPPPPo......................",
"............................oPPPPPPPPPPPPo......................"
],
[
"................................................................",
"................................................................",
".................................o..............................",
".............................ooooHoooo..........................",
"...........................ooHHHHHHHHHoo........................",
"..........................ojjjjjjjjjjjjjo.......................",
".........................oHjjjjjjjjjjjjjHo......................",
"........................ohhjjjjjjjjjjjjjHHo.....................",
".......................ohhhhhhhhhhhhhhhhhHHo....................",
"......................ohhhhhhhhhhhhhhhhhhhHHo...................",
"......................ohhhhhhhhhhhhhhhhhhhHHo...................",
".....................ohhhhhhhhhhhhhhhhhhhhhHo...................",
"......................ohhHHHHhhhhhhhhhhhhhHHo...................",
".....................oHhhHHHHhhhhhhhhhhhhhHHHo..................",
"......................oHhHHHHhhhhhhhhhhhhHHHo...................",
"......................oHHHHHHHHHHHHHHHHHHHHHo...................",
"......................oHHHHHHHHHHssssssssHHHo...................",
"......................oHHHHHHHHHHssssssssHHHo...................",
".......................oHHHHHHHHHHHHHHHHHHHso...................",
"........................oHHHHHHHHHHHHHHHHHsso...................",
"........................oHHHHHHHHHHHHHHHHssso...................",
"........................oHHHHHHHHHHHHwwwwwsso...................",
".......................osssssHHsssHHHwkwwwssso..................",
"........................ossssssddsssswkwwwsso...................",
"........................ossssssddsssswkkkwsso...................",
"........................ossssssddsssswwwwwsso...................",
"........................osssssssssssssssssddo...................",
"........................osssssssssssssssssddo...................",
".........................ossssssssssssssssso....................",
".........................ossssssssssssdddddo....................",
"..........................ossssssssssssssso.....................",
"...........................ossssssssssssso......................",
"............................ossssssssssso.......................",
".............................oosssssssso........................",
"..............................osssssssso........................",
"............................oooddddddddoo.......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaaaaaaaaaRRRo......................",
"...........................oaaddssssaaRRRo......................",
"...........................oaaddssssaaRRRo......................",
"...........................oaaddssssaaRRRo......................",
"...........................oaaddssssaaRRRo......................",
"............................opppppppppppo.......................",
"............................oppppppppppppo......................",
"...........................opppppppppppppo......................",
"...........................opppppppppppppo......................",
"...........................opppppppppppppo......................",
"...........................opppppppppppppo......................",
"...........................opppppppppppppo......................",
"...........................opppppppppppppo......................",
"...........................opppppppppppppo......................",
"...........................opppppppppppppo......................",
"...........................opppppppppppppo......................",
"..........................oPPPPPPPPPPPPPPPo.....................",
"..........................oPPPPPPPPPPPPPPPo.....................",
"..........................oPPPPPPPPPPPPPPPo.....................",
"..........................oPPPPPPPPPPPPPPPo....................."
]
]
};

/* ===== SPRITES (carregados de arquivos externos via sprites.js) ===== */
carregarPersonagens();
carregarNPCs(true);
if(typeof carregarNpcAnim==='function') carregarNpcAnim('policial'); // sprite direcional (lado) dos policiais
// (Pokémon companheiros são carregados sob demanda via carregarMon(nome).)

// Estado de animação do jogador
let walkFrame=0; let andandoAte=0;

/* ============ COMPANHEIRO (Pokémon inicial segue o jogador) ============ */
let companheiro=null; // {nome, x, y, dir, walkFrame, andandoAte}
let _filaPassos=[];   // fila de movimentos pendentes do jogador {x,y,dir,quando}
const COMP_DELAY=400; // atraso (ms) antes do companheiro repetir cada passo do jogador

function definirCompanheiro(nome){
  carregarMon(nome);
  if(!MON_OBJ[nome]){ companheiro=null; return; }
  // começa atrás do jogador, na direção oposta à que ele encara
  let dx=0,dy=0;
  if(direcaoAtual==='baixo')dy=-1; else if(direcaoAtual==='cima')dy=1;
  else if(direcaoAtual==='esquerda')dx=1; else dx=-1;
  let cx=player.x+dx, cy=player.y+dy;
  companheiro={nome, x:cx, y:cy, dir:direcaoAtual, walkFrame:0, andandoAte:0};
  _filaPassos=[];
  const el=$('companheiro'); if(el) el.style.display='block';
  renderizarCompanheiro();
}
function limparCompanheiro(){ companheiro=null; _filaPassos=[]; const el=$('companheiro'); if(el) el.style.display='none'; }

// Chamado a cada passo válido do jogador: ENFILEIRA a posição que o jogador deixou.
// O companheiro só vai ocupar essa posição depois de COMP_DELAY (loop _tickCompanheiro).
function avancarCompanheiro(prevX, prevY, dirMov){
  if(!companheiro) return;
  _filaPassos.push({x:prevX, y:prevY, dir:dirMov, quando:Date.now()});
}

// Loop que consome a fila: move o companheiro para os passos já "maduros" (após o delay).
// Mantém 1 tile de distância — quando o jogador para, o companheiro alcança o último passo e para ao lado.
function _tickCompanheiro(){
  if(!companheiro || _filaPassos.length===0) return;
  let agora=Date.now();
  let moveu=false;
  // consome todos os passos cujo tempo já venceu (evita acúmulo se o jogador andou rápido)
  while(_filaPassos.length>0 && agora-_filaPassos[0].quando >= COMP_DELAY){
    let passo=_filaPassos.shift();
    // não pisar em cima do jogador: se o próximo passo é a posição atual do player, segura
    if(passo.x===player.x && passo.y===player.y){ _filaPassos.unshift(passo); break; }
    // direção que o companheiro encara = para onde ele está se movendo
    let ndir=(passo.x>companheiro.x?'direita': passo.x<companheiro.x?'esquerda': passo.y>companheiro.y?'baixo': passo.y<companheiro.y?'cima': companheiro.dir);
    companheiro.dir=ndir;
    companheiro.x=passo.x; companheiro.y=passo.y;
    companheiro.walkFrame=(companheiro.walkFrame+1)%4;
    companheiro.andandoAte=Date.now()+260;
    moveu=true;
  }
  if(moveu) renderizarCompanheiro();
}

function desenharSpriteMon(canvas, nome, dir, frame, andando){
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,64,64); ctx.imageSmoothingEnabled=false;
  let SET=MON_OBJ[nome]; if(!SET) return;
  let d=SET[dir]||SET['baixo']; if(!d) return;
  let im;
  if(andando){ let arr=d.andar; let idx=((frame%arr.length)+arr.length)%arr.length; im=arr[idx]||d.parado; }
  else im=d.parado;
  let pronto = im && ((im.naturalWidth>0)||im.complete);
  if(!pronto) return;
  ctx.drawImage(im,0,0,64,64);
}
function renderizarCompanheiro(){
  if(!companheiro) return;
  const el=$('companheiro'); if(!el) return;
  let cv=el.querySelector('canvas');
  if(!cv){ el.innerHTML=''; const sh=document.createElement('div'); sh.className='char-shadow'; el.appendChild(sh);
    cv=document.createElement('canvas'); cv.width=64; cv.height=64; el.appendChild(cv); }
  let andando=Date.now()<companheiro.andandoAte;
  desenharSpriteMon(cv, companheiro.nome, companheiro.dir, companheiro.walkFrame, andando);
  // o #player é fixo no centro (258,258) e o mapa se move; posiciona o companheiro
  // relativo ao jogador, pelo deslocamento em tiles.
  el.style.left=(390 + (companheiro.x - player.x)*TILE)+'px';
  el.style.top=(255 + (companheiro.y - player.y)*TILE)+'px';
}
// Loop do companheiro: consome a fila de passos com atraso (COMP_DELAY) e
// reposiciona o sprite junto à câmera mesmo quando o jogador está parado.
setInterval(()=>{
  if(!companheiro || !jogoIniciado) return;
  _tickCompanheiro();
  // mantém o companheiro alinhado à câmera (o mapa pode ter se movido)
  renderizarCompanheiro();
}, 120);
// Rede de segurança do JOGADOR (espelha o loop do companheiro acima): redesenha
// o sprite parado periodicamente enquanto o jogo está ativo. Sem isto, se o sprite
// chega DEPOIS do primeiro render (latência de rede na Vercel), o jogador fica
// invisível parado e só aparece ao andar. renderizarJogador é idempotente.
setInterval(()=>{ if(jogoIniciado) renderizarJogador(); }, 200);
function estaAndando(){ return Date.now()<andandoAte; }

const NPC_TINT_CACHE={}; // cache de sprites de NPC por direção

// genero do jogador: 'm' (padrao) ou 'f'. Define qual conjunto de sprites usar.
let PLAYER_GENERO='m';
// Animacao lateral (esquerda/direita): intercala o frame "parado" da direcao entre cada frame
// de caminhada -> [andar0, parado, andar1, parado, andar2, ...]. Nao mexe em cima/baixo.
// Os loaders sao assincronos; reconstruimos a lista andar a cada frame de render para garantir
// que os Image refs ja carregados sejam usados (idempotente via flag _interleaved).
function _intercalarLateral(objSet){
  // Intercalacao desativada: esquerda/direita usam apenas os frames reais de caminhada.
}
function aplicarIntercalacaoLateral(){
  _intercalarLateral(SPRITE_ANIM_OBJ);
  _intercalarLateral(SPRITE_ANIM_OBJ_F);
}
function spriteSetAtual(){ return PLAYER_GENERO==='f' ? SPRITE_ANIM_OBJ_F : (PLAYER_GENERO==='l' ? SPRITE_ANIM_OBJ_L : (PLAYER_GENERO==='lf' ? SPRITE_ANIM_OBJ_LF : (PLAYER_GENERO==='nb' ? SPRITE_ANIM_OBJ_NB : (PLAYER_GENERO==='np' ? SPRITE_ANIM_OBJ_NP : (PLAYER_GENERO==='ea' ? SPRITE_ANIM_OBJ_EA : (PLAYER_GENERO==='ev' ? SPRITE_ANIM_OBJ_EV : (PLAYER_GENERO==='es' ? SPRITE_ANIM_OBJ_ES : (PLAYER_GENERO==='pg' ? SPRITE_ANIM_OBJ_PG : SPRITE_ANIM_OBJ)))))))); }
function definirGenero(g){ PLAYER_GENERO = (g==='f'?'f':(g==='l'?'l':(g==='lf'?'lf':(g==='nb'?'nb':(g==='np'?'np':(g==='ea'?'ea':(g==='ev'?'ev':(g==='es'?'es':(g==='pg'?'pg':'m')))))))));
  _autoPreencherNome();
  if(typeof renderizarJogador==='function') renderizarJogador();
  if(typeof atualizarPreview==='function') atualizarPreview();
  if(typeof atualizarPreviewIntro==='function') atualizarPreviewIntro();
  marcarGenero(); }
function marcarGenero(){
  ['','-intro'].forEach(suf=>{
    let bm=document.getElementById('btn-genero-m'+suf), bf=document.getElementById('btn-genero-f'+suf), bl=document.getElementById('btn-genero-l'+suf), blf=document.getElementById('btn-genero-lf'+suf);
    let bnb=document.getElementById('btn-genero-nb'+suf), bnp=document.getElementById('btn-genero-np'+suf);
    let bea=document.getElementById('btn-genero-ea'+suf), bev=document.getElementById('btn-genero-ev'+suf);
    let bes=document.getElementById('btn-genero-es'+suf), bpg=document.getElementById('btn-genero-pg'+suf);
    if(bm) bm.style.borderColor = PLAYER_GENERO==='m' ? 'var(--accent)' : 'var(--line)';
    if(bf) bf.style.borderColor = PLAYER_GENERO==='f' ? 'var(--accent)' : 'var(--line)';
    if(bl) bl.style.borderColor = PLAYER_GENERO==='l' ? 'var(--accent)' : 'var(--line)';
    if(blf) blf.style.borderColor = PLAYER_GENERO==='lf' ? 'var(--accent)' : 'var(--line)';
    if(bnb) bnb.style.borderColor = PLAYER_GENERO==='nb' ? 'var(--accent)' : 'var(--line)';
    if(bnp) bnp.style.borderColor = PLAYER_GENERO==='np' ? 'var(--accent)' : 'var(--line)';
    if(bea) bea.style.borderColor = PLAYER_GENERO==='ea' ? 'var(--accent)' : 'var(--line)';
    if(bev) bev.style.borderColor = PLAYER_GENERO==='ev' ? 'var(--accent)' : 'var(--line)';
    if(bes) bes.style.borderColor = PLAYER_GENERO==='es' ? 'var(--accent)' : 'var(--line)';
    if(bpg) bpg.style.borderColor = PLAYER_GENERO==='pg' ? 'var(--accent)' : 'var(--line)';
  });
}

// ---- Nome do treinador (definido pelo jogador na intro) ----
// Cada personagem tem um nome-padrão (sugestão). O jogador pode digitar o seu;
// nesse caso `nomeEditadoManual` trava o auto-preenchimento ao trocar de avatar.
let nomeJogador = '';
let nomeEditadoManual = false;
const NOMES_PERSONAGEM = {
  m:'Luke',  l:'Mike',  nb:'Alex', np:'Ethan', pg:'Eric',   // masculinos
  f:'Ayla',  lf:'Jade', ea:'Serena', ev:'Kaya', es:'Nick'   // femininos
};
// Rival do jogador = o "par" não escolhido: Luke<->Mike, Ayla<->Jade.
const RIVAL_DE = { m:'l', l:'m', f:'lf', lf:'f' };
function generoRival(){ return RIVAL_DE[PLAYER_GENERO] || 'l'; }
function nomeRival(){ return NOMES_PERSONAGEM[generoRival()] || 'Rival'; }
// conjunto de sprites do rival, conforme o gênero-par
function spriteSetRival(){
  const g=generoRival();
  return g==='m' ? SPRITE_ANIM_OBJ : g==='l' ? SPRITE_ANIM_OBJ_L
       : g==='f' ? SPRITE_ANIM_OBJ_F : g==='lf' ? SPRITE_ANIM_OBJ_LF : SPRITE_ANIM_OBJ_L;
}
// true se o jogador ainda tem algum Pokémon vivo
function temPokemonVivo(){ return equipeAtiva.some(p=>p && p.hp>0); }
// bloqueia início de batalha/encontro quando todos desmaiaram (avisa e retorna true)
function bloquearSemPokemon(){
  if(!inicialEscolhido || temPokemonVivo()) return false;
  mostrarAviso("Todos os seus Pokémon estão desmaiados!\nLeve-os a um Centro Pokémon (teto vermelho) para curá-los antes de batalhar.");
  return true;
}
// nome efetivo: o digitado, ou o padrão do personagem se vazio
function nomeEfetivo(){ return (nomeJogador && nomeJogador.trim()) ? nomeJogador.trim() : (NOMES_PERSONAGEM[PLAYER_GENERO]||'Treinador'); }
// reflete um valor em todos os campos de nome (intro e modal de visual)
function _setCamposNome(v){ ['nome-jogador-intro','nome-jogador-custom'].forEach(id=>{ const el=document.getElementById(id); if(el && el.value!==v) el.value=v; }); }
// preenche o nome com o padrão do personagem atual, a menos que o jogador já tenha digitado o seu
function _autoPreencherNome(){ if(nomeEditadoManual) return; nomeJogador = NOMES_PERSONAGEM[PLAYER_GENERO]||''; _setCamposNome(nomeJogador); }
// handler dos inputs de nome: registra edição manual e propaga
function aoEditarNome(v){ nomeEditadoManual = (String(v).trim().length>0); nomeJogador = v; _setCamposNome(v); }

// (Sprites de Policial/Professor/Sábio carregados via sprites.js)

// ---- Recoloração do jogador a partir de PLAYER_PALETTE ----
function _hexRgb(h){let n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];}
function _rgbHsv(r,g,b){r/=255;g/=255;b/=255;let mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0; if(d){ if(mx===r)h=((g-b)/d)%6; else if(mx===g)h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if(h<0)h+=360;}
  return [h, mx===0?0:d/mx, mx];}
// classifica um pixel original do sprite em região (usa cor + posição vertical)
function _regiao(r,g,b,py){
  let [h,s,v]=_rgbHsv(r,g,b);
  // py é a linha (0..63). Faixas anatômicas aproximadas do sprite:
  //  0-17 cabeça/cabelo · 16-38 tronco/camisa · 38-56 pernas/calça · 56-64 sapato
  let yCabeca = (py!==undefined && py<=18);
  let ySapato = (py!==undefined && py>=55);
  // camiseta laranja: matiz ~12-48, saturada
  if(h>=12 && h<=48 && s>0.45 && v>0.45) return 'camisa';
  // calça jeans azul
  if(h>=185 && h<=255 && s>0.18) return 'calca';
  // pele: tons claros pêssego (matiz ~15-45, alta luminância, saturação baixa-média) e NÃO na cabeça-cabelo
  if(h>=8 && h<=50 && v>0.6 && s>=0.12 && s<=0.6) return 'pele';
  // cabelo: marrom escuro SOMENTE na região da cabeça (evita confundir com o sapato marrom)
  if(yCabeca && h>=8 && h<=45 && v<=0.62 && s>0.18) return 'cabelo';
  // sapato fica embaixo: mantém a cor original (não recolore)
  return null;
}
function _recolor(rgbDest, r,g,b, baseRef){
  // preserva o brilho relativo trocando o matiz pela cor destino
  let [,, v]=_rgbHsv(r,g,b);
  let f=0.55+v*0.7;
  return [Math.min(255,Math.round(rgbDest[0]*f)), Math.min(255,Math.round(rgbDest[1]*f)), Math.min(255,Math.round(rgbDest[2]*f))];
}
const PLAYER_TINT={}; // (legado) não usado com sprites de cor fixa
let _tintFail=false;
function reconstruirSpriteJogador(){ /* sprites de cor fixa: nada a recolorir */ }
function imgDaDirecao(dir){
  let SET=spriteSetAtual();
  let d=SET[dir]||SET['baixo'];
  return d ? d.parado : null;
}
// Desenha o frame correto da direção. frame<0 ou null = parado; senão usa o quadro da caminhada.
function desenharSpriteCanvas(canvas, dir, frame, palette, espelhar, andando){
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,64,64); ctx.imageSmoothingEnabled=false;
  if(andando && (dir==='esquerda'||dir==='direita')) aplicarIntercalacaoLateral();
  let SET=spriteSetAtual();
  let d=SET[dir]||SET['baixo']; if(!d) return;
  let im;
  if(andando){ let arr=d.andar; let idx=((frame%arr.length)+arr.length)%arr.length; im=arr[idx]||d.parado; }
  else im=d.parado;
  let pronto = im && ((im.naturalWidth>0)||im.complete);
  if(!pronto) return;
  ctx.drawImage(im,0,0,64,64);
}

function spriteJogadorEl(){
  const wrap=document.createElement('div'); wrap.className='grid-pixel-char';
  const sh=document.createElement('div'); sh.className='char-shadow'; wrap.appendChild(sh);
  const cv=document.createElement('canvas'); cv.width=64; cv.height=64; wrap.appendChild(cv);
  desenharSpriteCanvas(cv, direcaoAtual, walkFrame, PLAYER_PALETTE, false, estaAndando());
  return wrap;
}
function renderizarJogador(){
  const p=$('player');
  let cv=p.querySelector('canvas');
  if(!cv){ p.innerHTML=''; const sh=document.createElement('div'); sh.className='char-shadow'; p.appendChild(sh);
    cv=document.createElement('canvas'); cv.width=64; cv.height=64; p.appendChild(cv); }
  desenharSpriteCanvas(cv, direcaoAtual, walkFrame, PLAYER_PALETTE, false, estaAndando());
  // mato cobrindo as pernas quando o jogador está no mato alto
  let mf=$('mato-frente-player');
  if(mf){ mf.style.display = (MAPA[player.y] && MAPA[player.y][player.x]===2) ? 'block' : 'none'; }
}

/* NPCs: paletas variadas por "cor" antiga */
const NPC_PALETTES={
  'c-vermelho':{pele:'#ffcf9e',peleSombra:'#e7ad81',cabelo:'#3a2a1a',cabeloSombra:'#241a10',camisa:'#d9434f',camisaSombra:'#a8323c',acento:'#ffd35a',calca:'#33384a',bota:'#23262f'},
  'c-azul-j':{pele:'#ffd9a8',peleSombra:'#e8b98a',cabelo:'#5a3d22',cabeloSombra:'#3f2b16',camisa:'#3a6bff',camisaSombra:'#2a4fcf',acento:'#9fd0ff',calca:'#2a3142',bota:'#23262f'},
  'c-rosa':{pele:'#ffd9a8',peleSombra:'#e8b98a',cabelo:'#6b4a2b',cabeloSombra:'#4d3219',camisa:'#ff6fae',camisaSombra:'#d94f8e',acento:'#ffd0e6',calca:'#3a2c3a',bota:'#2a1f28'},
  'c-azul-r':{pele:'#f3c39a',peleSombra:'#d9a87f',cabelo:'#2a2a2a',cabeloSombra:'#161616',camisa:'#1b2a78',camisaSombra:'#121d54',acento:'#5d7bd6',calca:'#222a3d',bota:'#1b1e27'},
  'c-marrom-b':{pele:'#e9b98a',peleSombra:'#c99a6e',cabelo:'#3a2417',cabeloSombra:'#26160d',camisa:'#6d4c34',camisaSombra:'#503625',acento:'#caa15a',calca:'#3a2c20',bota:'#231a12'},
  'c-branco':{pele:'#ffe0c0',peleSombra:'#e9c2a0',cabelo:'#b8b8b8',cabeloSombra:'#8f8f8f',camisa:'#f0f0f0',camisaSombra:'#cfcfcf',acento:'#ff8c2e',calca:'#3a4154',bota:'#262b38'},
  'c-verde':{pele:'#ffd9a8',peleSombra:'#e8b98a',cabelo:'#4a3320',cabeloSombra:'#311f12',camisa:'#2bb673',camisaSombra:'#1f8a57',acento:'#fff4c2',calca:'#2a3a2c',bota:'#1d2620'},
  'c-amarelo':{pele:'#ffd9a8',peleSombra:'#e8b98a',cabelo:'#6b4a2b',cabeloSombra:'#4d3219',camisa:'#ffce4d',camisaSombra:'#d9a92f',acento:'#ff8c2e',calca:'#7a5a1f',bota:'#3a2c10'},
  'c-roxo':{pele:'#f3c8a0',peleSombra:'#d9aa80',cabelo:'#2a1f3a',cabeloSombra:'#1a1226',camisa:'#8a5cff',camisaSombra:'#6a3fcf',acento:'#d9c2ff',calca:'#2e2842',bota:'#211c30'},
  'c-preto':{pele:'#e9b98a',peleSombra:'#c99a6e',cabelo:'#1a1a1a',cabeloSombra:'#0c0c0c',camisa:'#2b2f3a',camisaSombra:'#1d2028',acento:'#7d8aa3',calca:'#222530',bota:'#16181f'},
  'c-cinza':{pele:'#ffe0c0',peleSombra:'#e9c2a0',cabelo:'#7d8aa3',cabeloSombra:'#5f6c85',camisa:'#9aa3b5',camisaSombra:'#76809a',acento:'#cfd6e3',calca:'#3a4154',bota:'#262b38'}
};
// Recolore a camiseta (laranja) da imagem para a cor de cada NPC -> variedade
function hexToRgb(h){let n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];}
function ehLaranjaCamisa(r,g,b){
  return r>150 && g>60 && g<175 && b<95 && (r-b)>65;
}
// Mapeia um código de skin (os mesmos dos personagens jogáveis) -> conjunto de sprites.
// Permite que NPCs/treinadores usem qualquer skin jogável (ex.: ninja_branco='nb', ninja_preto='np').
function spriteSetPorSkin(skin){
  switch(skin){
    case 'f':  return SPRITE_ANIM_OBJ_F;
    case 'l':  return SPRITE_ANIM_OBJ_L;
    case 'lf': return SPRITE_ANIM_OBJ_LF;
    case 'nb': return SPRITE_ANIM_OBJ_NB;
    case 'np': return SPRITE_ANIM_OBJ_NP;
    case 'ea': return SPRITE_ANIM_OBJ_EA;
    case 'ev': return SPRITE_ANIM_OBJ_EV;
    case 'es': return SPRITE_ANIM_OBJ_ES;
    case 'pg': return SPRITE_ANIM_OBJ_PG;
    default:   return SPRITE_ANIM_OBJ; // 'm' / sem skin = menino (padrão)
  }
}
function npcTintCanvas(corClasse, dir, skin){
  // Cor fixa: usa o frame parado da direção (sem recoloração). `skin` escolhe o conjunto de sprites.
  dir = dir||'baixo';
  let chave = 'fix|'+(skin||'m')+'|'+dir;
  if(NPC_TINT_CACHE[chave]) return NPC_TINT_CACHE[chave];
  let SET=spriteSetPorSkin(skin);
  let d=SET[dir]||SET['baixo'];
  let base=d?d.parado:null;
  let cv=document.createElement('canvas'); cv.width=64; cv.height=64;
  let ctx=cv.getContext('2d'); ctx.imageSmoothingEnabled=false;
  if(!base||!base.complete||!base.naturalWidth){ return cv; }
  ctx.drawImage(base,0,0,64,64);
  NPC_TINT_CACHE[chave]=cv; return cv;
}
function spriteNpcEl(corClasse, dirOuVirar, skin){
  // dirOuVirar: direção ('cima'/'baixo'/'esquerda'/'direita') ou booleano (legado: ignorado, usa frente)
  // skin: código opcional de personagem jogável (ex.: 'nb','np'); ausente = menino padrão.
  const wrap=document.createElement('div'); wrap.className='grid-pixel-char';
  const sh=document.createElement('div'); sh.className='char-shadow'; wrap.appendChild(sh);
  const cv=document.createElement('canvas'); cv.width=64; cv.height=64; wrap.appendChild(cv);
  let dir='baixo';
  if(typeof dirOuVirar==='string') dir=dirOuVirar;
  const ctx=cv.getContext('2d'); ctx.imageSmoothingEnabled=false;
  let tint=npcTintCanvas(corClasse, dir, skin);
  if(tint) ctx.drawImage(tint,0,0);
  return wrap;
}

/* ============ CUSTOMIZAÇÃO ============ */
const OPCOES_CUSTOM={
  pele:{label:'Pele', alvo:['pele','peleSombra'], cores:[
    ['#ffe0c0','#e9c2a0'],['#e9b98a','#c99a6e'],['#8a5a36','#6d4424']]},
  cabelo:{label:'Cabelo', alvo:['cabelo','cabeloSombra'], cores:[
    ['#2a2a2a','#161616'],['#6b4a2b','#4d3219'],['#3a2a1a','#241a10'],
    ['#a9742f','#85591f'],['#caa15a','#a07e3d'],['#d94f4f','#a83a3a'],
    ['#3a6bff','#2a4fcf'],['#cfd6e3','#a6afc2']]},
  camisa:{label:'Camisa', alvo:['camisa','camisaSombra'], cores:[
    ['#7d8aa3','#5f6c85'],['#3a6bff','#2a4fcf'],['#d9434f','#a8323c'],
    ['#2bb673','#1f8a57'],['#8a5cff','#6a3fcf'],['#ffce4d','#d9a92f'],
    ['#2b2f3a','#1d2028'],['#f0f0f0','#cfcfcf']]},
  calca:{label:'Calça', alvo:['calca'], cores:[
    ['#3a4154'],['#2a3142'],['#5d4037'],['#222530'],['#2a3a2c'],['#4a3a5a']]}
};
let previewDir='baixo', introDir='baixo';
const ORDEM_DIR=['baixo','direita','cima','esquerda'];

function construirSwatches(containerId){
  // Customização de cor removida (sprites são de cor fixa). Mantém o container vazio.
  const cont=$(containerId); if(!cont)return; cont.innerHTML='';
}
function montarCustomizacao(){ construirSwatches('custom-grupos'); construirSwatches('intro-custom'); marcarGenero(); _autoPreencherNome(); atualizarPreviewIntro(); }
function marcarSelecao(linha,sw){ [...linha.children].forEach(c=>c.style.borderColor='var(--line)'); sw.style.borderColor='var(--accent)'; }
function atualizarPreview(){ const cv=$('cv-preview'); if(!cv)return; desenharSpriteCanvas(cv, previewDir, 0, PLAYER_PALETTE, previewDir==='direita'); }
function atualizarPreviewIntro(){ const cv=$('cv-intro'); if(!cv)return; desenharSpriteCanvas(cv, introDir, 0, PLAYER_PALETTE, introDir==='direita'); }
function girarPreview(){ let i=ORDEM_DIR.indexOf(previewDir); previewDir=ORDEM_DIR[(i+1)%4]; atualizarPreview(); }
function girarIntro(){ let i=ORDEM_DIR.indexOf(introDir); introDir=ORDEM_DIR[(i+1)%4]; atualizarPreviewIntro(); }
function abrirCustom(){ if(!jogoIniciado)return; previewDir='baixo'; construirSwatches('custom-grupos'); marcarGenero(); atualizarPreview(); $('modal-custom').style.display='flex'; }
function fecharCustom(){ $('modal-custom').style.display='none'; }

/* ============ WORLD RENDER ============ */
function desenharMundo(){
  divMapa.innerHTML=''; let playerInHouse=isInHouse(player.x,player.y);
  let casaJogador = playerInHouse ? casaEm(player.x,player.y) : null;
  const frag=document.createDocumentFragment();
  for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++){
    const tile=document.createElement('div'); tile.className='tile';
    let v=MAPA[r][c]; let inHouse=isInHouse(c,r);
    // Dentro de casa: oculta tudo que não pertence à MESMA casa (exterior fica escuro)
    if(playerInHouse){
      let mesmaCasa = inHouse && casaEm(c,r)===casaJogador;
      if(!mesmaCasa){ tile.classList.add('fora-oculto'); tile.style.left=(c*TILE)+'px'; tile.style.top=(r*TILE)+'px'; frag.appendChild(tile); continue; }
    }
    // Camada de FACHADA EXTERNA: por fora mostra fachada, por dentro mostra o tile real
    if(!playerInHouse && typeof fachadaExterna!=='undefined' && fachadaExterna.has(c+','+r)){
      tile.classList.add('fachada'); tile.style.left=(c*TILE)+'px'; tile.style.top=(r*TILE)+'px'; frag.appendChild(tile); continue;
    }
    if(inHouse&&!playerInHouse&&v!==5&&v!==36&&v!==37&&v!==38&&v!==53&&v!==54){ let cb=casaEm(c,r);
      let cls = cb&&cb.tipo==='ginasio' ? 'telhado-barro-azul' : (cb&&cb.tipo==='lab' ? 'telhado-barro' : 'telhado');
      tile.classList.add(cls); }
    else if(v===38){ // fachada vista de fora, piso por dentro (andável)
      tile.classList.add(playerInHouse ? 'chao-casa' : 'fachada'); }
    else if(v===53){ // janela vista de fora, piso por dentro (andável)
      if(playerInHouse) tile.classList.add('chao-casa'); else tile.classList.add('fachada','janela'); }
    else{
      if(v===1)tile.classList.add('parede');
      else if(v===2)tile.classList.add('mato-alto');
      else if(v===3)tile.classList.add('chao-casa');
      else if(v===4)tile.classList.add('parede-casa');
      else if(v===30)tile.classList.add('parede-gym');
      else if(v===5)tile.classList.add('tapete');
      else if(v===6)tile.classList.add('mesa');
      else if(v===7){tile.classList.add('chao-casa','pc-tile'); tile.innerText='💻';}
      else if(v===8)tile.classList.add('fora-limite');
      else if(v===9){tile.classList.add('chao-casa'); tile.innerText='📚';}
      else if(v===10)tile.classList.add('estrada');
      else if(v===33)tile.classList.add('terra-batida');
      else if(v===35)tile.classList.add('piso-tijolo');
      else if(v===36)tile.classList.add('fachada');
      else if(v===37)tile.classList.add('fachada','janela');
      else if(v===39)tile.classList.add('estante-nova');
      else if(v===58)tile.classList.add('estante-180');
      else if(v===57)tile.classList.add('chao-casa','balcao');
      else if(v===54)tile.classList.add('porta-madeira');
      else if(v===55)tile.classList.add('chao-casa','pc-monitor');
      else if(v===56)tile.classList.add('chao-casa','pc-base');
      else if(v===11){tile.classList.add('piso-cinza'); tile.innerText='🪵';}
      else if(v===12){tile.classList.add('piso-cinza','arvore'); tile.innerText='🌳';}
      else if(v===69){tile.classList.add('piso-cinza','arvore-grande'); tile.innerText='🌳';}
      else if(v===70)tile.classList.add('pedra');
      else if(v===71)tile.classList.add('tapete-vermelho');
      else if(v===72){tile.classList.add('portal-saida'); tile.innerText='🚪';}
      else if(v===73){tile.classList.add('portal-volta'); tile.innerText='🏙️';}
      else if(v===34){tile.classList.add('piso-cinza','arvore-peq'); tile.innerText='🌲';}
      else if(v===20){tile.classList.add('piso-cinza','arvore-grande'); tile.style.overflow='visible'; tile.innerText='🌳';}
      else if(v===21){tile.classList.add('piso-cinza','arvore-pinheiro'); tile.style.overflow='visible'; tile.innerText='🌲';}
      else if(v===22){tile.classList.add('piso-cinza','arbusto'); tile.innerText='🌿';}
      else if(v===23){tile.classList.add('piso-cinza','veg'); tile.innerText=['🍃','🌱','🍀'][(r*7+c)%3];}
      else if(v===24)tile.classList.add('calcada');
      else if(v===32)tile.classList.add('calcada-marrom');
      else if(v===25)tile.classList.add('asfalto');
      else if(v===26)tile.classList.add('asfalto-faixa');
      else if(v===31)tile.classList.add('faixa-pedestre');
      else if(v===27){tile.classList.add('asfalto','veiculo-carro'); tile.style.overflow='visible'; tile.innerText=['🚗','🚕','🚙'][(r*5+c)%3];}
      else if(v===28){tile.classList.add('asfalto','veiculo-onibus'); tile.style.overflow='visible'; tile.innerText='🚌';}
      else if(v===29){tile.classList.add('calcada','poste'); tile.innerText=['🚏','💡','🚦'][(r+c)%3];}
      else if(v===13)tile.classList.add('agua');
      else if(v===14)tile.classList.add('ponte');
      else if(v===15){tile.classList.add('piso-cinza','flor'); tile.innerText=Math.random()>.5?'🌼':'🌸';}
      else if(v===16){tile.classList.add('piso-cinza','placa'); tile.innerText='🪧';}
      else if(v===74){tile.classList.add('piso-cinza','caixa-correio'); tile.innerText='📫';}
      else if(v===75){tile.classList.add('chao-casa','cadeira'); tile.innerText='🪑';}
      else if(v===76){tile.classList.add('gw','gw-tl');}   // triângulo grama/água
      else if(v===77){tile.classList.add('gw','gw-tr');}
      else if(v===78){tile.classList.add('gw','gw-bl');}
      else if(v===79){tile.classList.add('gw','gw-br');}
      else if(v===80){tile.classList.add('trem-porta'); tile.innerText='🚪';}   // porta do trem (embarque)
      else if(v===81){tile.classList.add('trem-carro'); tile.innerText='🚃';}   // vagão do trem
      else if(v===82){tile.classList.add('cerca');}                            // cercado da estação
      else if(v===83){tile.classList.add('piso-cinza','arvore-marrom'); tile.style.overflow='visible'; tile.innerText='🌳';} // árvore marrom
      else if(v===84){tile.classList.add('agua','ponte-quebrada'); tile.innerText='🪵';}  // ponte quebrada
      else if(v===85){tile.classList.add('piso-cinza','bau'); tile.innerText='🎁';}        // baú (com recompensa)
      else if(v===86){tile.classList.add('piso-cinza','bau-aberto'); tile.innerText='📭';} // baú aberto
      else if(v===87){tile.classList.add('cerca-policial'); tile.style.overflow='visible';} // cerca policial (interdição)
      else if(v===88){tile.classList.add('seta-mapa'); tile.innerText='⬅️';}                 // seta: leva à área a oeste
      else if(v===89){tile.classList.add('seta-mapa'); tile.innerText='➡️';}                 // seta: volta para a cidade
      else if(v===17){tile.classList.add('mesa'); tile.innerText='🛒'; tile.style.fontSize='12px';}
      else if(v===19){tile.classList.add('prateleira');}
      else if(v===40)tile.classList.add('piso-quarto');
      else if(v===41)tile.classList.add('piso-quarto','movel','cama-cabeceira');
      else if(v===42)tile.classList.add('piso-quarto','movel','cama-corpo');
      else if(v===43)tile.classList.add('piso-quarto','movel','sofa-l');
      else if(v===44)tile.classList.add('piso-quarto','movel','sofa-r');
      else if(v===50)tile.classList.add('piso-quarto','movel','sofa-top');
      else if(v===51)tile.classList.add('piso-quarto','movel','sofa-bot');
      else if(v===45)tile.classList.add('piso-quarto','movel','comoda');
      else if(v===46)tile.classList.add('piso-quarto','movel','tv');
      else if(v===47)tile.classList.add('piso-quarto','movel','estante');
      else if(v===48)tile.classList.add('piso-quarto','vaso');
      else if(v===59)tile.classList.add('piso-quarto','vaso-marrom-a');
      else if(v===60)tile.classList.add('piso-quarto','vaso-marrom-b');
      else if(v===61)tile.classList.add('piso-flor-a');
      else if(v===62)tile.classList.add('piso-flor-b');
      else if(v===63)tile.classList.add('piso-flor-c');
      else if(v===64)tile.classList.add('poste-luz');
      else if(v===65)tile.classList.add('piso-girassol');
      else if(v===66)tile.classList.add('montanha');
      else if(v===67)tile.classList.add('porta-sombra');
      else if(v===68)tile.classList.add('faixa-pedestre-h');
      else if(v===49)tile.classList.add('parede-clara','quadro');
      else tile.classList.add('piso-cinza');
    }
    // blocos imediatamente à esquerda/direita de um poste ficam 25% mais claros
    if(v!==64 && (MAPA[r]?.[c-1]===64 || MAPA[r]?.[c+1]===64)) tile.classList.add('clareado');
    // NÉVOA do labirinto: dentro da Casa de Pedra, só enxerga o próprio tile + 1 na direção virada
    // NÉVOA do labirinto: vê 1 quadrado em todas as direções (igual o rei no xadrez)
    // some quando o boss é derrotado (luzes acendem)
    if(playerInHouse && casaJogador && casaJogador.tipo==='pedra' && !labirintoLimpo){
      let visivel = Math.abs(c-player.x)<=1 && Math.abs(r-player.y)<=1;
      if(!visivel) tile.classList.add('nevoa-labirinto');
    }
    frag.appendChild(tile);
  }
  divMapa.appendChild(frag);

  // Esferas dos iniciais SOBRE A MESA DO PROFESSOR — uma cor por tipo.
  // Antes da escolha: fechadas (interativas). Depois da escolha: ABERTAS (decorativas).
  if(casaEm(player.x,player.y) && casaEm(player.x,player.y).tipo==='lab'){
    STARTERS.forEach(s=>{let b=document.createElement('div'); b.className='item-bola'+(inicialEscolhido?' bola-aberta-wrap':'');
      b.innerHTML=bolaStarterHTML(s.nome, inicialEscolhido); b.style.left=(s.x*TILE)+'px'; b.style.top=(s.y*TILE)+'px'; divMapa.appendChild(b);});
  }
  // Esferas espalhadas no chão (escondidas quando o jogador está dentro de casa)
  bolasNoChao.forEach(b=>{ if(!personagemVisivel(b.x,b.y,playerInHouse))return;
    if(!b.tipo) b.tipo=sortearTipoBola();   // cada bola tem a sua cor (persiste no save)
    let el=document.createElement('div'); el.className='item-bola bobbing';
    el.innerHTML=bolaColoridaHTML(b.tipo); el.style.left=(b.x*TILE)+'px'; el.style.top=(b.y*TILE)+'px'; divMapa.appendChild(el);});

  if(playerInHouse)npcsInternos.forEach(n=>{
    let el;
    if(n.spriteCustom==='professor'){ el=charDeImagem(PROF_IMG); }
    else { let lojista=/Vendedor/.test(n.nome); el=spriteNpcEl(n.cor, n.dir? n.dir : (!lojista && npcVirado)); }
    addChar(n.x,n.y,el);
  });
  // Balconista: só aparece quando o jogador está dentro da loja (sem telhado escondendo)
  if(playerInHouse && casaEm(player.x,player.y) && casaEm(player.x,player.y).tipo==='centro') addChar(balconista.x,balconista.y,spriteNpcEl(balconista.cor));
  // Pokémon vagantes e treinadores só desenham se não estiverem sob um telhado oculto
  pokemonsVagantes.forEach(p=>{ if(personagemVisivel(p.x,p.y,playerInHouse)) addChar(p.x,p.y,spriteNpcEl(p.cor),true); });
  // Pokémon selvagens FIXOS (sprite real), bloqueiam passagem
  pokemonsFixos.forEach(p=>{ if(p.derrotado)return; if(playerInHouse)return;
    let cels = p.tiles || [[p.x,p.y]];
    let baseX=Math.min(...cels.map(t=>t[0])), baseY=Math.min(...cels.map(t=>t[1]));
    let spr = (BASE_POKEMONS[p.nome]&&BASE_POKEMONS[p.nome].sprite)||'';
    let el=document.createElement('div'); el.className='pkm-fixo';
    if(p.tiles) el.classList.add('pkm-fixo-2');
    el.innerHTML=`<img src="${spr}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated">`;
    el.style.left=(baseX*TILE)+'px'; el.style.top=(baseY*TILE)+'px';
    divMapa.appendChild(el);
  });
  // Treinadores inimigos SOMEM depois de perder a batalha (derrotado=true não é desenhado).
  listaTreinadores.forEach(t=>{ if(t.derrotado)return; if(!personagemVisivel(t.x,t.y,playerInHouse))return;
    // treinadores DENTRO do labirinto (casa de pedra) com névoa ativa só aparecem perto do jogador
    let casaT=casaEm(t.x,t.y);
    if(playerInHouse && casaT && casaT.tipo==='pedra' && !labirintoLimpo){
      let perto = Math.abs(t.x-player.x)<=1 && Math.abs(t.y-player.y)<=1;
      if(!perto) return;
    }
    let d=spriteNpcEl(t.corClasse, t.dir? t.dir : npcVirado, t.skin);
    d.style.left=(t.x*TILE)+'px'; d.style.top=(t.y*TILE)+'px'; divMapa.appendChild(d);});
  // NPCs decorativos de campo (sempre visíveis fora de casa)
  if(!playerInHouse)npcsCampo.forEach(n=>{ if(!personagemVisivel(n.x,n.y,playerInHouse))return;
    let d;
    if(n.ehRival){
      // Rival usa o sprite de personagem jogável (loiro/loira), no frame da direção que anda
      let set=spriteSetRival(); let sl=(set && set[n.dir||'baixo'])||(set&&set.baixo);
      d=charDeImagem(sl ? sl.parado : null);
    }
    else if(n.spriteCustom==='policia'){
      // Policial: usa o sprite ANIMADO (4 direções) mostrando o LADO conforme n.dir.
      // Fallback para a imagem estática de frente se o sprite direcional ainda não chegou.
      let setP = (typeof carregarNpcAnim==='function') ? carregarNpcAnim('policial') : null;
      let dir = n.dir || 'esquerda';
      let slot = setP && (setP[dir] || setP.baixo);
      let img = (slot && slot.parado && slot.parado.complete && slot.parado.naturalWidth) ? slot.parado : POLICIA_IMG;
      d=charDeImagem(img);
    }
    else if(n.spriteCustom==='professor' || n.spriteCustom==='sabio'){
      let _img = n.spriteCustom==='professor' ? PROF_IMG : SABIO_IMG;
      d=document.createElement('div'); d.className='grid-pixel-char';
      let sh=document.createElement('div'); sh.className='char-shadow'; d.appendChild(sh);
      let cv=document.createElement('canvas'); cv.width=64; cv.height=64; d.appendChild(cv);
      let ctx=cv.getContext('2d'); ctx.imageSmoothingEnabled=false;
      if(_img.complete && _img.naturalWidth) ctx.drawImage(_img,0,0,64,64);
    } else {
      d=spriteNpcEl(n.cor, n.dir? n.dir : npcVirado, n.skin);
    }
    if(n.escala)d.style.transform='scale('+n.escala+')';
    d.style.left=(n.x*TILE)+'px'; d.style.top=(n.y*TILE)+'px'; divMapa.appendChild(d);});
  atualizarCamera();
  if(typeof montarCamadaCarros==='function'){ camadaCarros=null; montarCamadaCarros(); }
  if(typeof montarGrade==='function' && gradeAtiva) montarGrade();
}
// ===== GRADE DE COORDENADAS estilo Excel (colunas A,B,..,Z,AA,AB..; linhas 1..N) =====
let gradeAtiva=false;
function colLabel(c){ // 0->A, 25->Z, 26->AA ...
  let s=''; c=c+1;
  while(c>0){ let m=(c-1)%26; s=String.fromCharCode(65+m)+s; c=Math.floor((c-1)/26); }
  return s;
}
function coordParaTile(coord){ // "H12" -> {c, r} (1-indexado visível). Retorna null se inválido.
  let m=(''+coord).trim().toUpperCase().match(/^([A-Z]+)(\d+)$/); if(!m)return null;
  let letras=m[1], linha=parseInt(m[2],10);
  let c=0; for(let i=0;i<letras.length;i++){ c=c*26+(letras.charCodeAt(i)-64); }
  return { c:c-1, r:linha-1 };  // converte p/ índice 0-based do MAPA
}
function montarGrade(){
  let velha=document.getElementById('camada-grade'); if(velha)velha.remove();
  let cam=document.createElement('div'); cam.id='camada-grade';
  for(let r=0;r<ALTURA_MAPA;r++)for(let c=0;c<LARGURA_MAPA;c++){
    let cel=document.createElement('div'); cel.className='grade-cel';
    cel.style.left=(c*TILE)+'px'; cel.style.top=(r*TILE)+'px';
    cel.textContent=colLabel(c)+(r+1);   // ex.: H12
    cam.appendChild(cel);
  }
  divMapa.appendChild(cam);
}
function alternarGrade(){ gradeAtiva=!gradeAtiva; if(gradeAtiva)montarGrade(); else { let g=document.getElementById('camada-grade'); if(g)g.remove(); } }
function personagemVisivel(x,y,playerInHouse){
  if(playerInHouse){
    // dentro de casa: só mostra quem está na MESMA casa
    return isInHouse(x,y) && casaEm(x,y)===casaEm(player.x,player.y);
  }
  // fora de casa: esconde quem está dentro de qualquer casa (sob telhado)
  return !isInHouse(x,y);
}
function addChar(x,y,el,bob){ if(bob)el.classList.add('bobbing');
  el.style.left=(x*TILE)+'px'; el.style.top=(y*TILE)+'px'; divMapa.appendChild(el);}
// Constrói um personagem desenhando uma Image (frame parado de frente) num canvas 64x64.
// Usado por NPCs com sprite dedicado (professor) e pelo rival (sprite de personagem jogável).
function charDeImagem(img, escala){
  let d=document.createElement('div'); d.className='grid-pixel-char';
  let sh=document.createElement('div'); sh.className='char-shadow'; d.appendChild(sh);
  let cv=document.createElement('canvas'); cv.width=64; cv.height=64; d.appendChild(cv);
  let ctx=cv.getContext('2d'); ctx.imageSmoothingEnabled=false;
  if(img && img.complete && img.naturalWidth) ctx.drawImage(img,0,0,64,64);
  if(escala) d.style.transform='scale('+escala+')';
  return d;
}
function atualizarCamera(){divMapa.style.left=(390-player.x*TILE)+'px'; divMapa.style.top=(255-player.y*TILE)+'px';}

// ===== CARROS EM MOVIMENTO (direita -> esquerda, em linha reta) =====
// Faixas de tráfego: linhas de asfalto longe do centro da ponte. x em tiles (float).
const FAIXAS_CARRO=[22,24];   // duas faixas no asfalto (evita encostar na calçada)
let carros=[];
(function semearCarros(){
  let emojisCarro=['🚗','🚕','🚙','🚐'];
  // distribui carros e alguns ônibus ao longo da avenida, espaçados
  FAIXAS_CARRO.forEach((linha,fi)=>{
    let n=3;  // -20%: menos carros por faixa
    for(let i=0;i<n;i++){
      let onibus = (i===1 && fi===0);
      carros.push({ x: 4 + i*16 + fi*6, y:linha, vel:0.05+Math.random()*0.02,
        emoji: onibus?'🚌':emojisCarro[Math.floor(Math.random()*emojisCarro.length)],
        onibus, el:null });
    }
  });
})();
let camadaCarros=null;
function montarCamadaCarros(){
  if(isInHouse(player.x,player.y)) return; // dentro de casa: carros ocultos
  camadaCarros=document.createElement('div');
  camadaCarros.style.cssText='position:absolute; left:0; top:0; width:0; height:0; z-index:46; pointer-events:none';
  carros.forEach(car=>{
    let el=document.createElement('div');
    el.className = car.onibus?'veiculo-onibus':'veiculo-carro';
    el.style.position='absolute'; el.style.overflow='visible';
    el.style.display='flex'; el.style.alignItems='center'; el.style.justifyContent='center';
    el.style.width=(TILE*(car.onibus?3:2))+'px'; el.style.height=(TILE*1.6)+'px';
    el.textContent=car.emoji; car.el=el; camadaCarros.appendChild(el);
  });
  divMapa.appendChild(camadaCarros);
  posicionarCarros();
}
function posicionarCarros(){
  carros.forEach(car=>{ if(!car.el)return;
    let w=TILE*(car.onibus?3:2), hbox=TILE*1.6;
    // centraliza a caixa do veículo sobre a faixa (linha = car.y), no centro vertical da pista
    car.el.style.left=(car.x*TILE)+'px';
    car.el.style.top=((car.y+0.5)*TILE - hbox/2)+'px';
  });
}
function tileOcupadoPorCarro(tx,ty){
  // carro ocupa ~2 tiles (carro) ou ~3 (ônibus) de largura na sua linha
  for(let car of carros){
    if(car.y!==ty) continue;
    let larg = car.onibus?3:2;
    let cx=Math.round(car.x);
    if(tx>=cx-0 && tx< cx+larg) return true;
  }
  return false;
}
let loopCarros=setInterval(()=>{
  if(typeof jogoIniciado!=='undefined' && !jogoIniciado) return;
  if(typeof emBatalha!=='undefined' && emBatalha) return;
  if(!camadaCarros) return;
  carros.forEach(car=>{
    car.x-=car.vel;
    if(car.x < -3) car.x = LARGURA_MAPA+2+Math.random()*4;  // reaparece pela direita
  });
  posicionarCarros();
},40);

function atualizarChips(){$('chip-time').innerText=`Time: ${equipeAtiva.length}/6`;
  let dexCount=Object.values(registroDex).filter(s=>s==='capturado').length;
  $('chip-dex').innerText=`Dex: ${dexCount}`;
  $('chip-dinheiro').innerText=`₽ ${dinheiro}`;}
function totalBolas(){return ORDEM_BOLAS.reduce((s,k)=>s+bolsa[k],0);}

/* ============ INTRO ============ */
const STORY=`Bem-vindo a NOVA REGION.

Você acordou tarde — de novo. Lá fora, o sol já bate sobre a vila e o rio corre sob a velha ponte de madeira.

No laboratório, o Prof. Cedro deixou três Esferas sobre a mesa. Caminhe até elas e escolha seu parceiro com [E].

Há treinadores espalhados pelas trilhas, Esferas perdidas no chão, uma Pokémart para reabastecer e um Líder de Ginásio a leste que ninguém venceu. Cada vitória rende dinheiro.

A jornada para completar a Pokédex começa agora.`;

function montarIntro(){
  $('story-text').innerText=STORY;
  // intro começa na PARTE 1 (prólogo); a seleção de personagem só aparece após o OK
  let p1=$('intro-prologo'), p2=$('intro-personagem');
  if(p1) p1.style.display='block';
  if(p2) p2.style.display='none';
}
// PARTE 1 -> PARTE 2: esconde o prólogo e mostra a seleção de personagem
function irParaSelecao(){
  let p1=$('intro-prologo'), p2=$('intro-personagem');
  if(p1) p1.style.display='none';
  if(p2) p2.style.display='block';
  if(typeof atualizarPreviewIntro==='function') atualizarPreviewIntro();
}
// volta da seleção para o prólogo
function voltarPrologo(){
  let p1=$('intro-prologo'), p2=$('intro-personagem');
  if(p2) p2.style.display='none';
  if(p1) p1.style.display='block';
}
function comecarJornada(){
  // garante que o nome digitado (ou o padrão do personagem) seja capturado
  const campo=document.getElementById('nome-jogador-intro');
  if(campo && campo.value.trim()){ nomeJogador=campo.value.trim(); nomeEditadoManual=true; }
  else if(!nomeJogador) nomeJogador=NOMES_PERSONAGEM[PLAYER_GENERO]||'';
  $('intro').style.display='none'; jogoIniciado=true; iniciarAudio();
  mostrarAviso("Prof. Cedro:\n"+nomeEfetivo()+", vá até a mesa e use [E] em uma das três Esferas para escolher seu parceiro!"); }
function continuarJogo(){
  if(!carregarJogo()){ mostrarAviso("Nenhum jogo salvo encontrado."); return; }
  $('intro').style.display='none'; jogoIniciado=true; iniciarAudio();
  if(typeof reconstruirSpriteJogador==='function') reconstruirSpriteJogador();
  atualizarChips(); desenharMundo(); renderizarJogador(); atualizarCamera();
  if(companheiro) renderizarCompanheiro();
  mostrarAviso("Jogo carregado! Bem-vindo de volta.");
}

/* ============ INTERACTION ============ */
function voltarBotaoB(){
  // Em batalha: o Voltar desfaz um passo de cada vez.
  if(emBatalha){
    // 1) modal de stats de Pokémon aberto -> fecha
    if($('modal-pkm') && $('modal-pkm').style.display==='flex'){ fecharStatsPokemon(); return; }
    // 2) tela de Pokémon (troca) aberta -> fecha, exceto se a troca for obrigatória
    if(emParty){ if(!trocaObrigatoria) fecharParty(); return; }
    // 3) submenu de ataques/bolas -> menu principal
    if(subMenuAtaques||subMenuBolas){ menuPrincipal(); return; }
    return; // já no menu principal: nada a desfazer
  }
  // Fora da batalha: fecha o que estiver aberto
  if(mostrandoNotificacao){ fecharNotificacao(); return; }
  if(emMochila){ fecharMochila(); return; }
  if(typeof emLoja!=='undefined' && emLoja){ fecharLoja(); return; }
  if($('modal-mapa') && $('modal-mapa').style.display==='flex'){ fecharMapa(); return; }
  if($('modal-custom') && $('modal-custom').style.display==='flex'){ fecharCustom(); return; }
  if(emParty){ fecharParty(); return; }
  if(emPokedex){ fecharPokedex(); return; }
}
// tile imediatamente à frente do jogador (conforme direcaoAtual)
function tileFrente(){
  let dx=0,dy=0;
  if(direcaoAtual==='cima')dy=-1; else if(direcaoAtual==='baixo')dy=1;
  else if(direcaoAtual==='esquerda')dx=-1; else dx=1;
  return {x:player.x+dx, y:player.y+dy};
}
function interagirBotaoE(){
  if(mostrandoNotificacao){fecharNotificacao(); return;}
  if(emBatalha||emParty||emPokedex||emLoja||!jogoIniciado||emCutscene||emMochila)return;
  // SÓ interage com o tile/entidade PARA ONDE o jogador está virado
  const F=tileFrente(); const fx=F.x, fy=F.y;
  const naFrente=(x,y)=> x===fx && y===fy;
  const tf=MAPA[fy]?.[fx];
  // Placa à frente
  if(PLACAS[fx+','+fy]){ mostrarAviso(PLACAS[fx+','+fy]); return; }
  // Pokémon selvagem fixo à frente: batalha com [E]
  let pfa=pokemonsFixos.find(p=>!p.derrotado && (p.tiles? p.tiles.some(t=>naFrente(t[0],t[1])) : naFrente(p.x,p.y)));
  if(pfa && inicialEscolhido){ iniciarBatalhaFixo(pfa); return; }
  // Escolher inicial: encarando uma Esfera/mesa na mesa do professor
  if(!inicialEscolhido){
    let s=STARTERS.find(s=>naFrente(s.x,s.y));
    let mesaLab = (tf===6 && casaEm(fx,fy)&&casaEm(fx,fy).tipo==='lab');
    if(s || mesaLab){
      // Pikachu fica numa mesa separada (pedestal M10): popup só dele (ele ou cancelar).
      // As outras 3 esferas abrem a escolha dos iniciais (escolher + OK/cancelar).
      let pk=STARTERS.find(s=>s.nome==='Pikachu');
      let ehPikachu = s ? (s.nome==='Pikachu') : (pk && fx===pk.x && fy===pk.y);
      abrirStarterPopup(ehPikachu?'pikachu':'mesa'); return;
    }
  }
  // Coletar Esfera à frente
  let idx=bolasNoChao.findIndex(b=>naFrente(b.x,b.y));
  if(idx>=0){coletarBola(idx); return;}
  // Balconista à frente
  if(naFrente(balconista.x,balconista.y) && casaEm(player.x,player.y)){abrirLoja(); return;}
  // Caixa registradora (17) à frente
  if(tf===17){abrirLoja(); return;}
  // Balcão de loja (57) à frente
  if(tf===57){ let cb=casaEm(player.x,player.y); if(cb && cb.tipo==='centro') abrirLojaPokemon(); else abrirLojaBalcao(); return; }
  // NPC interno à frente
  let npc=npcsInternos.find(n=>naFrente(n.x,n.y));
  if(npc&&isInHouse(player.x,player.y)){mostrarAviso(npc.msg); return;}
  // NPC de campo à frente (fora de casa)
  let npcC=npcsCampo.find(n=>naFrente(n.x,n.y));
  if(npcC && !isInHouse(player.x,player.y)){
    if(npcC.ehRival){
      if(equipeAtiva.length===0){ mostrarAviso("Rival "+nomeRival()+":\nVá pegar um Pokémon primeiro! Aí a gente batalha."); return; }
      if(bloquearSemPokemon())return;
      montarTimeRival(); desenharMundo();
      let intro = rivalVitoriasJogador===0
        ? "Rival "+nomeRival()+":\nFinalmente te encontrei! Sou seu maior rival. Vou provar que sou melhor treinador — prepare-se!"
        : "Rival "+nomeRival()+":\nNos encontramos de novo! Eu treinei muito desde a última vez. Agora estou MUITO mais forte. Você não tem chance!";
      mostrarAviso(intro, ()=>iniciarBatalhaTreinador(npcC)); return;
    }
    // NPCs do cabelo (Criança AV28 / Moça AW28): rajada de folhas da direita p/ a esquerda
    if(npcC.y===27 && (npcC.x===47||npcC.x===48)) efeitoFolhas();
    mostrarAviso(npcC.msg); return;
  }
  // PC de cura à frente
  if(tf===7||tf===55){curarNoPc(); return;}
  // Trem à frente (porta 80 ou vagão 81): embarca e viaja para a próxima cidade
  if(tf===80||tf===81){
    mostrarAviso("🚂 Estação de Trem:\nO trem parte para a próxima cidade!", ()=>transicaoRegiao('rota','Próxima Cidade',ENTRADAS.rota));
    return;
  }
  // Baú à frente: dá dinheiro + 2 Esferas e fica aberto
  if(tf===85){
    let ganho=300+Math.floor(Math.random()*201); dinheiro+=ganho;
    bolsa.great=(bolsa.great||0)+2;
    MAPA[fy][fx]=86; atualizarChips(); desenharMundo();
    sfx(700,0.1); setTimeout(()=>sfx(950,0.12),100);
    mostrarAviso("🎁 Você abriu um baú!\nEncontrou ₽"+ganho+" e 2 Esferas Grandes 🔵!");
    return;
  }
}
function coletarBola(idx){
  let tipo = bolasNoChao[idx].tipo || sortearTipoBola();   // pega o tipo (cor) da bola coletada
  bolasNoChao.splice(idx,1);
  bolsa[tipo]++; sfx(700,0.1); setTimeout(()=>sfx(950,0.12),100);
  desenharMundo();
  mostrarAviso(`Você encontrou uma ${TIPOS_BOLA[tipo].icone} ${TIPOS_BOLA[tipo].nome}!`);
}
function curarNoPc(){if(equipeAtiva.length===0){mostrarAviso("💻 PC Pokémon:\nSua equipe está vazia."); return;}
  equipeAtiva.forEach(p=>{p.hp=p.hpMax; recarregarPP(p);}); sfx(660,0.12); setTimeout(()=>sfx(880,0.15),120);
  mostrarAviso("💻 PC Pokémon:\nSua equipe foi totalmente curada!");}
function escolherInicial(nome){inicialEscolhido=true; let pkm=criarInstanciaPokemon(nome,5); equipeAtiva.push(pkm); definirCompanheiro(nome);
  registroDex[nome]='capturado'; dinheiro=500; fecharStarterPopup(); desenharMundo(); atualizarChips(); sfx(600,0.1); setTimeout(()=>sfx(800,0.14),120);
  mostrarAviso(`Você escolheu ${nome}!\n\nO Prof. te deu ₽500 e 5 Esferas. Saia pela porta abaixo e explore Nova Region.`);}

let starterPopupAberto=false;
let starterSelecionado=null;   // nome do Pokémon atualmente selecionado no popup
let _starterCards={};          // nome -> elemento do card (p/ aplicar destaque)
// cor de destaque pelo TIPO do Pokémon (Pikachu amarelo, Squirtle azul, Charmander laranja, Bulbasaur verde)
function corTipo(nome){ let b=BASE_POKEMONS[nome]; return (b&&CORES_TIPO[b.tipo])||'var(--accent)'; }
// realça/normaliza um card conforme estiver selecionado
function _pintarCardStarter(nome){
  let cor=corTipo(nome), el=_starterCards[nome]; if(!el)return;
  let sel=(starterSelecionado===nome);
  el.style.borderColor=cor;
  el.style.borderWidth=sel?'4px':'3px';                                  // borda mais espessa, ainda mais no selecionado
  el.style.boxShadow=sel?('0 0 0 2px '+cor+', 0 0 14px '+cor):'none';    // "contorno" extra quando selecionado
}
function selecionarStarter(nome){
  starterSelecionado=nome;
  Object.keys(_starterCards).forEach(_pintarCardStarter);
  let ok=$('starter-ok'); if(ok) ok.disabled=false;
}
// modo: 'mesa' = os 3 iniciais (Bulbasaur/Charmander/Squirtle); 'pikachu' = só o Pikachu
function abrirStarterPopup(modo){
  modo = modo||'mesa';
  starterPopupAberto=true; starterSelecionado=null; _starterCards={};
  let lista = (modo==='pikachu') ? STARTERS.filter(s=>s.nome==='Pikachu')
                                 : STARTERS.filter(s=>s.nome!=='Pikachu');
  $('starter-titulo').innerText = (modo==='pikachu') ? 'Quer o Pikachu?' : 'Escolha seu parceiro inicial';
  $('starter-sub').innerText    = (modo==='pikachu') ? 'Confirme em OK ou cancele.' : 'Selecione um Pokémon e confirme em OK.';
  const grid=$('starter-grid');
  grid.style.gridTemplateColumns = (lista.length===1) ? '1fr' : 'repeat(2,1fr)';
  grid.innerHTML='';
  lista.forEach(s=>{let b=BASE_POKEMONS[s.nome];
    let tipos=pillTipo(b.tipo)+(b.tipo2?' '+pillTipo(b.tipo2):'');
    let cor=corTipo(s.nome);
    let card=document.createElement('div');
    card.style.cssText='background:var(--panel); border:3px solid '+cor+'; border-radius:12px; padding:10px; cursor:pointer; text-align:center; transition:border-color .12s, box-shadow .12s, border-width .12s';
    card.innerHTML=`<div style="font-size:11px; font-weight:800; color:${cor}">[${s.atalho}]</div>
      <img src="${b.sprite}" style="width:64px; height:64px; image-rendering:pixelated"><div style="font-weight:700; font-size:13px">${b.nome}</div>
      <div style="margin:4px 0">${tipos}</div>
      <div style="font-size:10px; color:var(--muted)">⚔ Atq ${b.atkBase} · 🛡 Def ${b.defBase} · ⚡ Vel ${b.velBase}</div>`;
    card.onclick=()=>selecionarStarter(s.nome);
    _starterCards[s.nome]=card;
    grid.appendChild(card);
  });
  // Pikachu: já vem pré-selecionado (a opção é ele ou cancelar)
  if(modo==='pikachu') selecionarStarter('Pikachu');
  else { let ok=$('starter-ok'); if(ok) ok.disabled=true; }
  Object.keys(_starterCards).forEach(_pintarCardStarter);
  $('modal-starter').style.display='flex';
}
// OK: confirma o Pokémon selecionado
function confirmarStarter(){ if(!starterSelecionado) return; escolherInicial(starterSelecionado); }
function fecharStarterPopup(){ starterPopupAberto=false; starterSelecionado=null; $('modal-starter').style.display='none'; }

/* ============ LOJA ============ */
// ====== LOJA COM CARRINHO ======
// O jogador ajusta a quantidade de cada esfera (− / +), vê o total e clica em Comprar.
let lojaPrecos=null;        // preços ativos da loja aberta
let carrinho={};            // {tipo: quantidade}
const PRECOS_BALCAO={poke:100, great:300, ultra:500, premier:1200, master:5000};
function _precosPadrao(){ let p={}; ORDEM_BOLAS.forEach(k=>p[k]=TIPOS_BOLA[k].preco); return p; }
function abrirLoja(){ abrirLojaCart(_precosPadrao()); }
function abrirLojaBalcao(){ abrirLojaCart(PRECOS_BALCAO); }
function abrirLojaCart(precos){
  lojaPrecos=precos; carrinho={}; ORDEM_BOLAS.forEach(k=>carrinho[k]=0);
  emLoja=true; $('loja-dinheiro').innerText=`₽ ${dinheiro}`;
  let cont=$('loja-itens'); cont.innerHTML='';
  ORDEM_BOLAS.forEach(k=>{let b=TIPOS_BOLA[k]; let preco=precos[k];
    let row=document.createElement('div'); row.className='card-pkm';
    row.innerHTML=`<div class="meta-l"><span style="font-size:20px">${b.icone}</span>
      <div><div class="nm">${b.nome} · <span style="color:var(--gold)">₽${preco}</span></div>
      <div class="sub">tem: ${bolsa[k]} · taxa ×${b.mult>900?'∞':b.mult}</div></div></div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="mudarCarrinho('${k}',-1)">−</button>
        <span class="qty-num" id="qty-${k}">0</span>
        <button class="qty-btn" onclick="mudarCarrinho('${k}',1)">+</button>
      </div>`;
    cont.appendChild(row);
  });
  atualizarTotalLoja();
  $('modal-loja').style.display='flex';
}
function mudarCarrinho(k,delta){
  carrinho[k]=Math.max(0,(carrinho[k]||0)+delta);
  let el=$('qty-'+k); if(el) el.innerText=carrinho[k];
  sfx(delta>0?620:420,0.04);
  atualizarTotalLoja();
}
function totalCarrinho(){ let t=0; for(let k in carrinho) t+=carrinho[k]*((lojaPrecos&&lojaPrecos[k])||0); return t; }
function atualizarTotalLoja(){
  let t=totalCarrinho(); let el=$('loja-total');
  if(el) el.innerText=`Carrinho: ₽ ${t}`+(t>dinheiro?'  (saldo insuficiente)':'');
  let btn=$('loja-comprar'); if(btn){ let ok=t>0 && t<=dinheiro; btn.disabled=!ok; btn.style.opacity=ok?'1':'.45'; }
}
function comprarCarrinho(){
  let t=totalCarrinho(); if(t<=0) return;
  if(dinheiro<t){ sfx(160,0.15,'sawtooth'); let el=$('loja-total'); if(el) el.innerText='Saldo insuficiente!'; return; }
  dinheiro-=t; let resumo=[];
  ORDEM_BOLAS.forEach(k=>{ if(carrinho[k]>0){ bolsa[k]+=carrinho[k]; resumo.push(`${carrinho[k]}× ${TIPOS_BOLA[k].nome}`); } });
  sfx(740,0.08); setTimeout(()=>sfx(940,0.1),100); atualizarChips();
  abrirLojaCart(lojaPrecos);  // reabre a loja com o carrinho zerado e saldo atualizado
  let dm=$('loja-dinheiro'); if(dm){ dm.innerText=`✅ Comprado! ₽ ${dinheiro}`; setTimeout(()=>{ if(emLoja&&dm) dm.innerText=`₽ ${dinheiro}`; },1600); }
}
function fecharLoja(){$('modal-loja').style.display='none'; emLoja=false; lojaPrecos=null;}

/* ====== LOJA DE POKÉMON (balcão do Centro / casa 3) ====== */
let ofertasPokemon=[];          // ofertas de compra atuais
let ofertasGeradasEm=0;         // timestamp
const OFERTAS_INTERVALO=5*60*1000;  // 5 minutos
const NUM_OFERTAS=6;
// preço de um Pokémon = base por raridade * (1 + level/20), arredondado
function precoPokemon(nome, level){
  let base=BASE_POKEMONS[nome]; if(!base) return 100;
  let mult=(RARIDADE_INFO[base.raridade]||{mult:0.1}).mult;   // 0.1..0.7
  let precoBase=Math.round(300 * (1 + mult*6));               // comum~480, mítico~1560
  return Math.round(precoBase * (1 + (level||5)/20));
}
function precoVendaPokemon(p){ return Math.round(precoPokemon(p.nome, p.level) * 0.6); } // vende por 60%
// gera ofertas aleatórias respeitando raridade (mesma regra do mato) e nível do jogador
function gerarOfertasPokemon(){
  let levelRef = equipeAtiva[0] ? equipeAtiva[0].level : 5;
  ofertasPokemon=[];
  for(let i=0;i<NUM_OFERTAS;i++){
    let nome=sortearSelvagem(levelRef);
    let lvl=Math.max(2, levelRef + Math.floor(Math.random()*5)-2);
    ofertasPokemon.push({nome, level:lvl, preco:precoPokemon(nome,lvl)});
  }
  ofertasGeradasEm=Date.now();
}
function abrirLojaPokemon(){
  if(Date.now()-ofertasGeradasEm > OFERTAS_INTERVALO || ofertasPokemon.length===0) gerarOfertasPokemon();
  emLoja=true;
  let cont=$('loja-itens'); cont.innerHTML='';
  $('loja-dinheiro').innerText=`₽ ${dinheiro}`;
  // tempo restante p/ trocar ofertas
  let restante=Math.max(0, OFERTAS_INTERVALO-(Date.now()-ofertasGeradasEm));
  let min=Math.floor(restante/60000), seg=Math.floor((restante%60000)/1000);
  let cab=document.createElement('div'); cab.style.cssText='font-weight:700;margin:2px 0 6px;color:var(--accent)';
  cab.innerText=`COMPRAR — novas ofertas em ${min}:${(''+seg).padStart(2,'0')}`;
  cont.appendChild(cab);
  ofertasPokemon.forEach((of,idx)=>{
    let base=BASE_POKEMONS[of.nome]; let ri=rarInfo(base.raridade);
    let row=document.createElement('div'); row.className='card-pkm';
    row.innerHTML=`<div class="meta-l"><img src="${base.sprite}" width="34" height="34" style="image-rendering:pixelated">
      <div><div class="nm">${of.nome} <span style="color:${ri.cor};font-size:11px">${ri.nome}</span></div>
      <div class="sub">Nv ${of.level} · ${base.tipo}${base.tipo2?'/'+base.tipo2:''}</div></div></div>
      <button class="btn-acao" id="buyp-${idx}" style="height:34px;padding:0 12px;">₽${of.preco}</button>`;
    cont.appendChild(row);
    $('buyp-'+idx).onclick=()=>comprarPokemon(idx);
  });
  // seção VENDER
  let cabV=document.createElement('div'); cabV.style.cssText='font-weight:700;margin:12px 0 6px;color:var(--accent)';
  cabV.innerText='VENDER (sua equipe)';
  cont.appendChild(cabV);
  if(equipeAtiva.length<=1){
    let aviso=document.createElement('div'); aviso.className='sub'; aviso.style.padding='4px 2px';
    aviso.innerText = equipeAtiva.length===0 ? 'Você não tem Pokémon.' : 'Você só tem 1 Pokémon — não dá pra vender o último.';
    cont.appendChild(aviso);
  } else {
    equipeAtiva.forEach((p,idx)=>{
      let base=BASE_POKEMONS[p.nome]; let ri=rarInfo(p.raridade); let preco=precoVendaPokemon(p);
      let row=document.createElement('div'); row.className='card-pkm';
      row.innerHTML=`<div class="meta-l"><img src="${base.sprite}" width="34" height="34" style="image-rendering:pixelated">
        <div><div class="nm">${p.nome} <span style="color:${ri.cor};font-size:11px">${ri.nome}</span></div>
        <div class="sub">Nv ${p.level}</div></div></div>
        <button class="btn-acao" id="sellp-${idx}" style="height:34px;padding:0 12px;">Vender ₽${preco}</button>`;
      cont.appendChild(row);
      $('sellp-'+idx).onclick=()=>venderPokemon(idx);
    });
  }
  $('modal-loja').style.display='flex';
}
function comprarPokemon(idx){
  let of=ofertasPokemon[idx]; if(!of) return;
  if(dinheiro<of.preco){sfx(160,0.15,'sawtooth'); $('loja-dinheiro').innerText='Saldo insuficiente!';
    setTimeout(()=>$('loja-dinheiro').innerText=`₽ ${dinheiro}`,900); return;}
  let pkm=criarInstanciaPokemon(of.nome, of.level);
  if(equipeAtiva.length<6) equipeAtiva.push(pkm); else caixaPC.push(pkm);
  dinheiro-=of.preco; registroDex[of.nome]='capturado';
  ofertasPokemon.splice(idx,1);  // some da lista após comprar
  sfx(740,0.1); atualizarChips(); $('loja-dinheiro').innerText=`₽ ${dinheiro}`;
  mostrarAviso(`Você comprou ${of.nome}!`+(equipeAtiva.length>6?'\nFoi para o PC (equipe cheia).':''), ()=>abrirLojaPokemon());
}
function venderPokemon(idx){
  if(equipeAtiva.length<=1) return;
  let p=equipeAtiva[idx]; let preco=precoVendaPokemon(p);
  dinheiro+=preco; equipeAtiva.splice(idx,1);
  sfx(900,0.1); atualizarChips(); $('loja-dinheiro').innerText=`₽ ${dinheiro}`;
  mostrarAviso(`Você vendeu ${p.nome} por ₽${preco}.`, ()=>abrirLojaPokemon());
}

/* ============ MOVEMENT ============ */
const SOLIDOS=[1,4,6,7,8,9,11,12,13,16,17,19, 20,21,22, 25, 26, 29, 30, 34, 35, 36, 37, 39, 41,42,43,44,45,46,47,48,49,50,51,55,56,57,58,59,60,66,69,70,74,75,81,82,83,84,85,87];
function forcarMovimento(letra){
  if(!jogoIniciado||mostrandoNotificacao||emLoja||emCutscene||emMochila)return;
  let agora=Date.now(); if(agora-ultimoPasso<INTERVALO)return; ultimoPasso=agora;
  if(emBatalha||emParty||emPokedex||esperandoEspaco)return;
  let px=player.x,py=player.y;
  let l=letra.toLowerCase();
  let dirAnterior=direcaoAtual;
  if(l==='w'){py--;direcaoAtual='cima';}else if(l==='s'){py++;direcaoAtual='baixo';}
  else if(l==='a'){px--;direcaoAtual='esquerda';}else if(l==='d'){px++;direcaoAtual='direita';}
  if(direcaoAtual!==dirAnterior) walkFrame=0; // ao virar, comeca no 1o frame da nova direcao
  renderizarJogador(); // vira na hora, mesmo contra parede
  if(py<0||py>=ALTURA_MAPA||px<0||px>=LARGURA_MAPA)return;
  let bloco=MAPA[py][px];
  if(SOLIDOS.includes(bloco))return;
  // Portais de transição entre regiões
  if(bloco===72){ player.x=px; player.y=py; desenharMundo(); renderizarJogador();
    transicaoRegiao('rota','Rota Norte', ENTRADAS.rota); return; }
  if(bloco===73){ player.x=px; player.y=py; desenharMundo(); renderizarJogador();
    transicaoRegiao('cidade','Cidade', ENTRADAS.cidade); return; }
  // Setas no chão: 88 leva à área OESTE; 89 volta à cidade (ao lado das setas)
  if(bloco===88){ player.x=px; player.y=py; desenharMundo(); renderizarJogador();
    transicaoRegiao('oeste','Área Oeste', ENTRADAS.oeste); return; }
  if(bloco===89){ player.x=px; player.y=py; desenharMundo(); renderizarJogador();
    transicaoRegiao('cidade','Cidade', ENTRADAS.cidadeOeste); return; }
  // Pokémon selvagem fixo no caminho: bloqueia e inicia batalha
  let pf=pokemonsFixos.find(p=>!p.derrotado && (p.tiles? p.tiles.some(t=>t[0]===px&&t[1]===py) : (p.x===px&&p.y===py)));
  if(pf){ iniciarBatalhaFixo(pf); return; }
  if(typeof tileOcupadoPorCarro==='function' && tileOcupadoPorCarro(px,py))return; // não atravessa carro
  if(npcsInternos.some(n=>n.x===px&&n.y===py&&isInHouse(px,py)))return;
  if(balconista.x===px&&balconista.y===py)return; // não atravessa a balconista
  if(!isInHouse(px,py) && npcsCampo.some(n=>n.x===px&&n.y===py))return; // não atravessa NPCs de campo
  if(bolasNoChao.some(b=>b.x===px&&b.y===py))return; // esfera é pathblocker (precisa pegar com [E])
  // Antes de escolher o inicial: pode andar dentro do laboratório, mas não sair.
  if(!inicialEscolhido && !isInHouse(px,py)){
    mostrarAviso("Escolha primeiro uma das Esferas na mesa do Prof. Cedro (use [E]).");
    return;
  }
  // Treinador no caminho: bloqueia e inicia batalha. Derrotados somem e liberam a passagem.
  let tNoTile=listaTreinadores.find(t=>t.x===px&&t.y===py&&!t.derrotado);
  if(tNoTile){ desenharMundo(); iniciarBatalhaTreinador(tNoTile); return; }
  // Passo válido: avança quadro da caminhada + bob
  let _set=spriteSetAtual(); let _arr=(_set[direcaoAtual]&&_set[direcaoAtual].andar)||[];
  let _len=_arr.length||7;
  walkFrame=(walkFrame+1)%_len; andandoAte=Date.now()+260; passoVisual();
  let _prevX=player.x, _prevY=player.y; // posição que o jogador deixa (vira destino do companheiro)
  player.x=px;player.y=py; atualizarCamera(); desenharMundo();
  if(companheiro){ avancarCompanheiro(_prevX, _prevY, direcaoAtual); }
  // Primeira saída do laboratório: o rival se aproxima e te desafia
  if(!rivalChamouPrimeiro && inicialEscolhido && casaEm(_prevX,_prevY)?.tipo==='lab' && !isInHouse(px,py)){
    rivalChamouPrimeiro=true; setTimeout(()=>rivalSeAproxima(), 400);
  }
  if(bloco===2){ somMato(); }                 // farfalhar ao andar no mato
  musicaPorRegiao();                           // troca trilha se mudou de lado do rio / casa
  if(bloco===2&&Math.random()<0.16){setTimeout(()=>iniciarBatalhaSelvagem(true),140);}
}
function passoVisual(){const p=$('player'); p.classList.remove('andando'); void p.offsetWidth; p.classList.add('andando');}
// Rival se aproxima na 1ª saída do laboratório: começa 3 tiles abaixo do jogador,
// anda 2 passos em direção a ele e chama para a batalha.
function rivalSeAproxima(){
  let rival=npcsCampo.find(n=>n.ehRival); if(!rival || !inicialEscolhido) return;
  emCutscene=true;                 // trava o jogador (fica parado esperando)
  teclasMov.clear();               // descarta qualquer tecla "presa"
  rival.x=player.x; rival.y=Math.min(ALTURA_MAPA-2, player.y+4); rival.dir='cima';
  desenharMundo();
  // 1) espera 1 segundo com o jogador parado, depois o rival vem andando devagar
  setTimeout(()=>{
    let it=setInterval(()=>{
      if(rival.y>player.y+1){ rival.y--; desenharMundo(); }
      else{
        clearInterval(it);
        emCutscene=false;
        montarTimeRival(); desenharMundo();
        // o diálogo só avança quando o jogador apertar E; aí começa a batalha
        mostrarAviso("Rival "+nomeRival()+":\nEspera aí! Vi que você pegou seu primeiro Pokémon. Vamos ver agora mesmo quem é o melhor treinador — vem pra cima!",
          ()=>{ let r=npcsCampo.find(n=>n.ehRival); if(r && !bloquearSemPokemon()) iniciarBatalhaTreinador(r); });
      }
    }, 480);                       // mais devagar (era 350)
  }, 1000);
}

/* ============ BATTLE ============ */
let atbJogador=0,atbInimigo=0,loopATB=null,turnoPausado=false;
function gatilhoBatalha(callback){
  divBatalha.style.display='flex';
  document.querySelector('.arena').style.visibility='hidden';
  $('menu-batalha').style.visibility='hidden';
  msgCentral.style.display='none';
  esperandoEspaco=false;

  let ri=rarInfo(pkmInimigo.raridade);
  let intro=$('encontro-intro');
  intro.style.setProperty('--ei-cor', ri.cor);
  $('ei-sprite').src=pkmInimigo.sprite;
  $('ei-rar').innerText=ri.nome; $('ei-rar').style.color=ri.cor; $('ei-rar').style.borderColor=ri.cor;
  $('ei-text').innerText = batalhaTreinador ? `${treinadorAtual.nome} quer batalhar!` : `Um ${pkmInimigo.nome} selvagem apareceu!`;

  // RESET completo (corrige efeito só aparecer na 1ª vez): limpa display inline e reanima
  intro.classList.remove('show','flashing','revelar');
  intro.style.display='';            // remove o display:none inline da vez anterior
  $('ei-prompt').style.display='none';
  // reinicia as animações internas clonando as classes
  ['ei-sprite','ei-text','ei-rar'].forEach(id=>{ let el=$(id); el.style.animation='none'; void el.offsetWidth; el.style.animation=''; });
  void intro.offsetWidth;            // força reflow antes de reanimar
  intro.classList.add('show','flashing');

  tocarMusicaBatalha(); jingleEncontro();

  // 1) efeito/flash roda; 2) o Pokémon já aparece junto; 3) mostra o prompt de pular/batalhar
  let prontoParaPular=false, jaAvancou=false;
  setTimeout(()=>{
    $('ei-prompt').style.display='flex';
    intro.classList.add('revelar');
    prontoParaPular=true; esperandoEspaco=true;
  }, 1100);

  // pular/avançar (Espaço ou clique)
  window.iniciarBatalhaAgora=()=>{
    if(!prontoParaPular || jaAvancou) return;
    jaAvancou=true; esperandoEspaco=false;
    intro.classList.remove('show','flashing','revelar'); intro.style.display='none';
    msgCentral.style.display='none';
    document.querySelector('.arena').style.visibility='visible'; $('menu-batalha').style.visibility='visible';
    callback();
  };
}
// Nível de um encontro selvagem a partir do nível L do Pokémon do jogador.
// Distribuição: 50% dentro de ±3 níveis; 25% abaixo (1..L-4); 25% acima (L+4..L+10).
// Faixa total possível: do nível 1 até L+10.
function nivelEncontro(L){
  const r=Math.random();
  let lo, hi;
  if(r<0.50){ lo=L-3; hi=L+3; }        // 50%: entre 3 abaixo e 3 acima
  else if(r<0.75){ lo=1;   hi=L-4; }   // 25%: mais que 3 níveis abaixo
  else { lo=L+4; hi=L+10; }            // 25%: mais que 3 níveis acima (até +10)
  lo=Math.max(1, lo); hi=Math.max(lo, hi);
  return lo + Math.floor(Math.random()*(hi-lo+1));
}
// Força de um golpe (1=fraco .. 4=mais forte) a partir do poder — escala os efeitos visuais.
function forcaAtaque(atq){ let p=(atq&&atq.p)||0; return p<=16?1 : p<=27?2 : p<=40?3 : 4; }
function sortearSelvagem(levelRef){
  // candidatos que podem aparecer nesse nível
  let cands=Object.keys(BASE_POKEMONS).filter(k=> +BASE_POKEMONS[k].id<=151
    && !STARTERS.map(s=>s.nome).includes(k) && podeAparecer(k, levelRef));
  if(cands.length===0) cands=Object.keys(BASE_POKEMONS).filter(k=>podeAparecer(k,levelRef));
  // peso por raridade
  let total=0, pesos=cands.map(k=>{let p=(RARIDADE_INFO[BASE_POKEMONS[k].raridade]||{peso:10}).peso; total+=p; return p;});
  let r=Math.random()*total;
  for(let i=0;i<cands.length;i++){ r-=pesos[i]; if(r<=0) return cands[i]; }
  return cands[cands.length-1];
}
function iniciarBatalhaSelvagem(automatica=false){
  if(!inicialEscolhido)return;
  if(bloquearSemPokemon())return;
  if(!automatica&&MAPA[player.y][player.x]!==2){mostrarAviso("Ande pelo mato alto verde para encontrar Pokémon."); return;}
  emBatalha=true; subMenuAtaques=false; batalhaTreinador=false;
  pkmAtivoJogador=equipeAtiva.find(p=>p.hp>0)||equipeAtiva[0];
  let levelRef=nivelEncontro(pkmAtivoJogador.level);
  let nome=sortearSelvagem(levelRef);
  pkmInimigo=criarInstanciaPokemon(nome,levelRef);
  if(registroDex[pkmInimigo.nome]==='oculto')registroDex[pkmInimigo.nome]='visto';
  gatilhoBatalha(()=>{montarArena(); textoBatalha.innerText=`Um ${pkmInimigo.nome} selvagem (Lv.${pkmInimigo.level}) apareceu!`; iniciarLoopATB();});
}
function iniciarBatalhaFixo(pf){
  if(!inicialEscolhido){ mostrarAviso("Escolha primeiro um Pokémon inicial."); return; }
  if(bloquearSemPokemon())return;
  emBatalha=true; subMenuAtaques=false; batalhaTreinador=false;
  pokemonFixoAtual=pf;
  pkmAtivoJogador=equipeAtiva.find(p=>p.hp>0)||equipeAtiva[0];
  pkmInimigo=criarInstanciaPokemon(pf.nome, pf.lvl);
  if(registroDex[pkmInimigo.nome]==='oculto')registroDex[pkmInimigo.nome]='visto';
  gatilhoBatalha(()=>{montarArena(); textoBatalha.innerText=`Um ${pkmInimigo.nome} selvagem (Lv.${pkmInimigo.level}) bloqueia o caminho!`; iniciarLoopATB();});
}
let pokemonFixoAtual=null;
function iniciarBatalhaTreinador(t){
  if(bloquearSemPokemon())return;
  emBatalha=true; subMenuAtaques=false; batalhaTreinador=true; treinadorAtual=t; indexInimigoEquipe=0;
  pkmInimigo=criarInstanciaPokemon(t.pokemons[0].n,t.pokemons[0].lvl); pkmAtivoJogador=equipeAtiva.find(p=>p.hp>0)||equipeAtiva[0];
  if(registroDex[pkmInimigo.nome]==='oculto')registroDex[pkmInimigo.nome]='visto';
  gatilhoBatalha(()=>{montarArena(); textoBatalha.innerText=`${t.nome} quer batalhar!`; iniciarLoopATB();});
}
function iniciarLoopATB(){
  clearInterval(loopATB); limparFxTimers(); atbJogador=0; atbInimigo=0; turnoPausado=false; _golpeJaDado=false; atualizarHps(); painelBotoes.innerHTML='';
  loopATB=setInterval(()=>{
    if(emBatalha&&!turnoPausado&&!mostrandoNotificacao&&!esperandoEspaco){
      atbJogador+=pkmAtivoJogador.velocidade*0.12; atbInimigo+=pkmInimigo.velocidade*0.12;
      $('bar-atb-jogador').style.width=Math.min(100,atbJogador)+'%'; $('bar-atb-inimigo').style.width=Math.min(100,atbInimigo)+'%';
      if(atbJogador>=100&&atbInimigo>=100){Math.random()>0.5?triggerTurnoJogador():turnoInimigo();}
      else if(atbJogador>=100)triggerTurnoJogador(); else if(atbInimigo>=100)turnoInimigo();
    }
  },50);
}
function triggerTurnoJogador(){turnoPausado=true; atbJogador=0; textoBatalha.innerText=`Sua vez! O que ${pkmAtivoJogador.nome} fará?`; menuPrincipal();}

function corHp(frac){return frac>0.5?'var(--green)':frac>0.2?'var(--warn)':'var(--red)';}
function tiposHtml(p){return pillTipo(p.tipo)+(p.tipo2?' '+pillTipo(p.tipo2):'');}
function statsHtml(p){return `<b style="color:#ffce4d">⚡ Vel ${p.statVel}</b> · <b style="color:#3a6bff">🛡 Def ${p.statDef}</b> · <b style="color:#ff3b4e">⚔ Atq ${p.statAtk}</b>`;}
function estilizarHud(hudEl, p){
  let ri=rarInfo(p.raridade);
  hudEl.style.borderColor=ri.borda;
  hudEl.style.background=ri.grad;
  hudEl.style.boxShadow=`0 0 0 1px ${ri.borda}66, 0 0 18px ${ri.cor}40, var(--shadow)`;
}
function montarArena(){
  bolaAnimada.classList.remove('voo-bola'); txtCaptura.style.display='none';
  let i=$('img-inimigo'); i.classList.remove('faint'); i.style.display='block';
  $('nome-inimigo').innerText=pkmInimigo.nome; $('lvl-inimigo').innerText=`Lv.${pkmInimigo.level}`;
  $('tipo-inimigo').innerHTML=tiposHtml(pkmInimigo)+` <span class="rar-badge" style="color:${rarInfo(pkmInimigo.raridade).cor};border-color:${rarInfo(pkmInimigo.raridade).borda}">${rarInfo(pkmInimigo.raridade).nome}</span>`;
  $('stats-inimigo').innerHTML=statsHtml(pkmInimigo);
  estilizarHud(document.querySelector('.hud-inimigo'), pkmInimigo);
  i.src=pkmInimigo.sprite;
  let j=$('img-jogador'); j.classList.remove('faint'); j.style.display='block';
  $('nome-jogador').innerText=pkmAtivoJogador.nome; $('lvl-jogador').innerText=`Lv.${pkmAtivoJogador.level}`;
  $('tipo-jogador').innerHTML=tiposHtml(pkmAtivoJogador)+` <span class="rar-badge" style="color:${rarInfo(pkmAtivoJogador.raridade).cor};border-color:${rarInfo(pkmAtivoJogador.raridade).borda}">${rarInfo(pkmAtivoJogador.raridade).nome}</span>`;
  $('stats-jogador').innerHTML=statsHtml(pkmAtivoJogador);
  estilizarHud(document.querySelector('.hud-jogador'), pkmAtivoJogador);
  j.src=pkmAtivoJogador.back;
  atualizarHps();
}
function atualizarHps(){
  $('txt-hp-inimigo').innerText=`${pkmInimigo.hp}/${pkmInimigo.hpMax}`; $('txt-hp-jogador').innerText=`${pkmAtivoJogador.hp}/${pkmAtivoJogador.hpMax}`;
  $('xp-jogador').innerText=`XP ${pkmAtivoJogador.xp}/${pkmAtivoJogador.xpNecessario}`;
  let fi=pkmInimigo.hp/pkmInimigo.hpMax, fj=pkmAtivoJogador.hp/pkmAtivoJogador.hpMax;
  let bi=$('bar-hp-inimigo'),bj=$('bar-hp-jogador'); bi.style.width=fi*100+'%'; bj.style.width=fj*100+'%';
  bi.style.background=corHp(fi); bj.style.background=corHp(fj);
  $('bar-xp-jogador').style.width=Math.min(100,pkmAtivoJogador.xp/pkmAtivoJogador.xpNecessario*100)+'%';
}
function menuPrincipal(){subMenuAtaques=false; subMenuBolas=false;
  let bola=batalhaTreinador?`<button class="btn-acao" disabled><span class="atalho">A</span> Esfera</button>`
    :`<button class="btn-acao btn-gold" onclick="menuBolas()"><span class="atalho">A</span> Esfera</button>`;
  painelBotoes.innerHTML=`<button class="btn-acao" onclick="menuAtaques()"><span class="atalho">Q</span> Lutar</button>
    <button class="btn-acao btn-ghost" onclick="abrirPartyBatalha()"><span class="atalho">W</span> Pokémon</button>
    ${bola}<button class="btn-acao btn-ghost" onclick="fugirBatalha()"><span class="atalho">S</span> Fugir</button>`;}
function menuBolas(){
  if(totalBolas()===0){textoBatalha.innerText="Você não tem nenhuma Esfera! Compre na Pokémart."; return;}
  subMenuAtaques=false; subMenuBolas=true;
  painelBotoes.innerHTML=''; let at=['Q','W','A','S'];
  let disp=ORDEM_BOLAS.filter(k=>bolsa[k]>0).slice(0,3);
  _bolasExibidas=disp.slice(); // guarda p/ os atalhos de teclado
  disp.forEach((k,i)=>{let b=TIPOS_BOLA[k]; let btn=document.createElement('button'); btn.className='btn-acao btn-gold btn-mv';
    btn.innerHTML=`<span class="mv-nm"><span class="atalho">${at[i]}</span> ${b.icone} ${b.nome}</span><span class="mv-tp">x${bolsa[k]} · taxa ×${b.mult>900?'∞':b.mult}</span>`;
    btn.onclick=()=>usarPokebola(k); painelBotoes.appendChild(btn);});
  let volta=document.createElement('button'); volta.className='btn-acao btn-ghost'; volta.innerHTML=`<span class="atalho">B</span> Voltar`;
  volta.onclick=menuPrincipal; painelBotoes.appendChild(volta);
}
let _bolasExibidas=[];
function menuAtaques(){subMenuAtaques=true; subMenuBolas=false; painelBotoes.innerHTML=''; let at=['Q','W','A','S'];
  sincronizarPP(pkmAtivoJogador);
  for(let i=0;i<4;i++){let a=pkmAtivoJogador.ataques[i]; let b=document.createElement('button'); b.className='btn-acao btn-mv btn-tipo';
    if(a){let c=corBotaoTipo(a.t); let ic=ICONE_TIPO[a.t]||'•';
      let ppA=pkmAtivoJogador.ppAtual[a.n]; if(ppA===undefined)ppA=a.pp;
      let semPP=ppA<=0;
      b.style.background=c.bg; b.style.color=c.fg; b.style.borderColor='rgba(0,0,0,.25)';
      if(semPP) b.style.opacity='0.45';
      b.innerHTML=`<span class="mv-nm"><span class="atalho">${at[i]}</span> <span class="mv-ic">${ic}</span> ${a.n}</span><span class="mv-tp">${a.t} · ${a.p} · PP ${ppA}/${a.pp}</span>`;
      if(semPP){ b.disabled=true; b.onclick=()=>{ textoBatalha.innerText=`${a.n} está sem PP!`; }; }
      else b.onclick=()=>turnoAtaqueJogador(a);}
    else{b.innerHTML='<span class="mv-nm">—</span>'; b.disabled=true;} painelBotoes.appendChild(b);}}
function tratarAtalhos(letra){let l=letra.toUpperCase();
  if((l===' '||letra===' ')&&esperandoEspaco){window.iniciarBatalhaAgora(); return;}
  if(!turnoPausado||mostrandoNotificacao)return;
  // B = voltar ao menu principal a partir de qualquer submenu
  if(l==='B'){ if(subMenuAtaques||subMenuBolas) menuPrincipal(); return; }
  if(subMenuAtaques){
    let a=pkmAtivoJogador.ataques;
    if(l==='Q'&&a[0])turnoAtaqueJogador(a[0]); else if(l==='W'&&a[1])turnoAtaqueJogador(a[1]);
    else if(l==='A'&&a[2])turnoAtaqueJogador(a[2]); else if(l==='S'&&a[3])turnoAtaqueJogador(a[3]);
  } else if(subMenuBolas){
    // no menu de bolas, Q/W/A selecionam a bola exibida; S volta
    let idx={'Q':0,'W':1,'A':2}[l];
    if(idx!==undefined && _bolasExibidas[idx]) usarPokebola(_bolasExibidas[idx]);
    else if(l==='S') menuPrincipal();
  } else {
    // menu principal
    if(l==='Q')menuAtaques(); else if(l==='W')abrirPartyBatalha();
    else if(l==='A'&&!batalhaTreinador)menuBolas(); else if(l==='S')fugirBatalha();
  }}

function flashTipo(cor){let f=$('flash-tipo'); f.style.background=cor; f.classList.remove('flash-on'); void f.offsetWidth; f.classList.add('flash-on');}

// Famílias de efeito por tipo: anim, ícone, glow, e movimento
const FX_FAMILIA={
  FOGO:    {anim:'fxFogo',  ic:'🔥', dur:1.0},
  ÁGUA:    {anim:'fxAgua',  ic:'💧', dur:1.0},
  GRAMA:   {anim:'fxGrama', ic:'🍃', dur:1.1},
  ELÉTRICO:{anim:'fxRaio',  ic:'⚡', dur:0.7},
  GELO:    {anim:'fxAgua',  ic:'❄️', dur:1.1},
  VENENO:  {anim:'fxOrbita',ic:'☠️', dur:1.0},
  PSÍQUICO:{anim:'fxPulse', ic:'🔮', dur:1.0},
  FANTASMA:{anim:'fxPulse', ic:'👻', dur:1.1},
  PEDRA:   {anim:'fxOrbita',ic:'🪨', dur:0.9},
  TERRA:   {anim:'fxOrbita',ic:'🪨', dur:0.9},
  LUTADOR: {anim:'fxPulse', ic:'💥', dur:0.6},
  NORMAL:  {anim:'fxPulse', ic:'💢', dur:0.6},
  INSETO:  {anim:'fxOrbita',ic:'🐛', dur:1.0},
  VOADOR:  {anim:'fxOrbita',ic:'🪶', dur:1.0},
  DRAGÃO:  {anim:'fxPulse', ic:'🐉', dur:1.0},
  FADA:    {anim:'fxOrbita',ic:'✨', dur:1.0},
  AÇO:     {anim:'fxRaio',  ic:'⚙️', dur:0.7}
};
// Mostra o efeito do tipo no alvo por ~3 segundos
let fxTimers=[];
function limparFxTimers(){ fxTimers.forEach(t=>{clearTimeout(t);clearInterval(t);}); fxTimers=[]; }
// Efeito de ataque de 2s sobre o alvo. Retorna nada; chamadas externas cuidam do HP.
// Efeito de ataque sobre o alvo. `forca` (1..4) escala quantidade/tamanho das
// partículas e libera efeitos especiais nas habilidades mais fortes.
function efeitoAtaque(tipo, alvoLayerId, forca){
  forca = Math.max(1, Math.min(4, forca||1));
  let fam=FX_FAMILIA[tipo]||FX_FAMILIA.NORMAL;
  let cor=CORES_TIPO[tipo]||'#fff';
  let layer=$(alvoLayerId); if(!layer)return;
  layer.innerHTML='';
  // brilho de fundo: maior e mais intenso conforme a força
  let glow=document.createElement('div'); glow.className='fx-glow';
  glow.style.background=`radial-gradient(circle, ${cor} 0%, transparent ${55+forca*6}%)`;
  glow.style.animation=`fxGlowAnim ${1.8+forca*0.1}s ease-out forwards`;
  glow.style.opacity=String(0.45+forca*0.12);
  layer.appendChild(glow);
  // partículas por rajada = força+1 (2,3,4,5); tamanho e duração crescem com a força
  const porRajada=forca+1;
  const totalRajadas=Math.ceil((1500+forca*260)/220); let i=0;
  let timer=setInterval(()=>{
    for(let n=0;n<porRajada;n++){
      let p=document.createElement('div'); p.className='fx-p'; p.textContent=fam.ic;
      p.style.left=(10+Math.random()*110)+'px'; p.style.top=(15+Math.random()*95)+'px';
      p.style.setProperty('--dx',(Math.random()*70-35)+'px');
      p.style.setProperty('--dy',(-30-Math.random()*40)+'px');
      let dur=fam.dur*(0.8+Math.random()*0.5);
      p.style.animation=`${fam.anim} ${dur}s ease-out forwards`;
      p.style.fontSize=((12+forca*4)+Math.random()*12)+'px';
      if(forca>=3) p.classList.add('fx-grande');
      // FOGO no golpe mais forte: ~40% das chamas viram azuis
      if(tipo==='FOGO' && forca>=4 && Math.random()<0.4) p.classList.add('fx-azul');
      layer.appendChild(p);
      let rm=setTimeout(()=>p.remove(), dur*1000+60); fxTimers.push(rm);
    }
    if(++i>=totalRajadas){clearInterval(timer);}
  },220);
  fxTimers.push(timer);
  // ----- Efeitos especiais das habilidades mais fortes -----
  if(tipo==='ÁGUA'     && forca>=3) _fxOnda(layer, forca);                 // onda passando sobre o alvo
  if(tipo==='ELÉTRICO' && forca>=3) _fxRaiosGrandes(layer, forca);         // raios grandes (branco -> amarelo)
  if(tipo==='GRAMA'    && forca>=4) _fxFeixe(layer, '#7CFC00');            // feixe (Raio Solar)
  if(tipo==='PSÍQUICO' && forca>=4) _fxFeixe(layer, CORES_TIPO['PSÍQUICO']||'#f95587');
  let cg=setTimeout(()=>{ if(glow.parentNode)glow.remove(); }, 2300); fxTimers.push(cg);
}
// Onda de água que varre o alvo (1 onda na força 3, 2 ondas na força 4)
function _fxOnda(layer, forca){
  let n=forca>=4?2:1;
  for(let k=0;k<n;k++){
    let o=document.createElement('div'); o.className='fx-onda';
    o.style.animation=`fxOndaAnim ${0.95+0.15*k}s ease-out ${k*0.28}s forwards`;
    layer.appendChild(o);
    let rm=setTimeout(()=>{ if(o.parentNode)o.remove(); }, 1500+k*320); fxTimers.push(rm);
  }
}
// Raios grandes: o 1º é branco, os seguintes amarelos (força 3 -> 2 raios, força 4 -> 3)
function _fxRaiosGrandes(layer, forca){
  let n=forca>=4?3:2;
  for(let k=0;k<n;k++){
    let b=document.createElement('div'); b.className='fx-bolt'; b.textContent='⚡';
    b.style.left=(18+k*40+Math.random()*8)+'px'; b.style.top=(8+Math.random()*26)+'px';
    b.style.fontSize=(38+forca*7)+'px';
    b.style.color = k===0 ? '#ffffff' : '#ffe04d';
    b.style.animation=`fxBoltAnim 0.5s ease-out ${k*0.16}s forwards`;
    layer.appendChild(b);
    let rm=setTimeout(()=>{ if(b.parentNode)b.remove(); }, 750+k*170); fxTimers.push(rm);
  }
}
// Feixe vertical (Raio Solar etc.): branco na base -> cor do tipo
function _fxFeixe(layer, corTipo){
  let f=document.createElement('div'); f.className='fx-feixe'; f.style.setProperty('--feixe-cor', corTipo);
  f.style.animation=`fxFeixeAnim 0.9s ease-out forwards`;
  layer.appendChild(f);
  let rm=setTimeout(()=>{ if(f.parentNode)f.remove(); }, 1100); fxTimers.push(rm);
}
// Anima a vida descendo de hpAtual->hpNovo em ~1s
function animarHp(quem, hpNovo, aoTerminar){
  let alvo = quem==='inimigo'? pkmInimigo : pkmAtivoJogador;
  let ini=alvo.hp, passos=20, i=0;
  let t=setInterval(()=>{
    i++; alvo.hp = Math.max(0, Math.round(ini + (hpNovo-ini)*(i/passos)));
    atualizarHps();
    if(i>=passos){ alvo.hp=hpNovo; atualizarHps(); clearInterval(t); if(aoTerminar)aoTerminar(); }
  },50);
  fxTimers.push(t);
}
function calcDano(atacante,defensor,atq){let mult=multiplicadorTipo(atq.t,defensor.tipo);
  let dmg=Math.max(1,Math.round(((atq.p+atacante.ataque)-defensor.defesa)*mult)); return {dmg,mult};}

function turnoAtaqueJogador(atq){
  // PP: bloqueia se não houver usos restantes
  sincronizarPP(pkmAtivoJogador);
  if(pkmAtivoJogador.ppAtual[atq.n]!==undefined && pkmAtivoJogador.ppAtual[atq.n]<=0){
    textoBatalha.innerText=`${atq.n} está sem PP! Escolha outro golpe.`;
    return;
  }
  // consome 1 PP
  if(pkmAtivoJogador.ppAtual[atq.n]!==undefined) pkmAtivoJogador.ppAtual[atq.n]--;
  painelBotoes.innerHTML=''; subMenuAtaques=false; turnoPausado=true;
  let {dmg,mult}=calcDano(pkmAtivoJogador,pkmInimigo,atq);
  let hpNovo=Math.max(0,pkmInimigo.hp-dmg);
  let _f=forcaAtaque(atq);
  if(!_golpeJaDado){ _golpeJaDado=true; pararMusicaBatalha(); }   // 1º golpe encerra a música de encontro
  somGolpe(atq.t,_f); let sp=setTimeout(()=>somPancada(_f),150); fxTimers.push(sp);   // som do tipo + pancada no impacto
  flashTipo(CORES_TIPO[atq.t]); efeitoAtaque(atq.t,'fx-inimigo', _f);   // efeito escala com a força
  $('img-inimigo').classList.add('dano-anim'); let da=setTimeout(()=>$('img-inimigo').classList.remove('dano-anim'),420); fxTimers.push(da);
  let efe=mult>1?' Foi super eficaz!':mult<1?' Não foi muito eficaz...':'';
  textoBatalha.innerText=`${pkmAtivoJogador.nome} usou ${atq.n}! ${dmg} de dano.${efe}`;
  // após 1s do efeito, o HP começa a descer (dura ~1s)
  let t=setTimeout(()=>{
    animarHp('inimigo', hpNovo, ()=>{
      if(pkmInimigo.hp<=0){$('img-inimigo').classList.add('faint'); sfx(180,0.4,'triangle'); let f=setTimeout(fimCicloInimigo,800); fxTimers.push(f);}
      else turnoPausado=false;
    });
  },1000);
  fxTimers.push(t);
}
function turnoInimigo(){
  turnoPausado=true; atbInimigo=0; painelBotoes.innerHTML='';
  let atq=pkmInimigo.ataques[Math.floor(Math.random()*pkmInimigo.ataques.length)];
  let {dmg,mult}=calcDano(pkmInimigo,pkmAtivoJogador,atq);
  let hpNovo=Math.max(0,pkmAtivoJogador.hp-dmg);
  let _f=forcaAtaque(atq);
  if(!_golpeJaDado){ _golpeJaDado=true; pararMusicaBatalha(); }
  somGolpe(atq.t,_f); let sp=setTimeout(()=>somPancada(_f),150); fxTimers.push(sp);
  flashTipo(CORES_TIPO[atq.t]); efeitoAtaque(atq.t,'fx-jogador', _f);
  $('img-jogador').classList.add('dano-anim'); let da=setTimeout(()=>$('img-jogador').classList.remove('dano-anim'),420); fxTimers.push(da);
  let efe=mult>1?' Eficaz!':mult<1?' Resistiu.':'';
  textoBatalha.innerText=`${pkmInimigo.nome} usou ${atq.n}!${efe}`;
  let t=setTimeout(()=>{
    animarHp('jogador', hpNovo, ()=>{
      if(pkmAtivoJogador.hp<=0){$('img-jogador').classList.add('faint'); sfx(150,0.4,'triangle');
        let f=setTimeout(()=>{
          if(equipeAtiva.some(p=>p.hp>0)){
            clearInterval(loopATB);
            textoBatalha.innerText=`${pkmAtivoJogador.nome} desmaiou! Escolha o próximo Pokémon.`;
            trocaObrigatoria=true; abrirPartyBatalha();
          } else {
            // TODOS desmaiaram: sem cura/teleporte automático — vai ao Centro Pokémon.
            let ehRival = batalhaTreinador && treinadorAtual && treinadorAtual.ehRival;
            if(ehRival){ treinadorAtual.derrotado=false; reposicionarRival(); }
            fecharBatalha(null,false);
            derrotaTotal(ehRival);
          }
        },800); fxTimers.push(f);
      } else turnoPausado=false;
    });
  },1000);
  fxTimers.push(t);
}
// Alvo de evolução de um pokémon (BASE do destino) ou null. Exige nível mínimo por estágio.
function evolucaoAlvo(pkm){ if(!pkm||!pkm.evo) return null; let nf=BASE_POKEMONS[pkm.evo]; if(!nf) return null;
  let exigido = nf.estagio>=3 ? 30 : 15; return pkm.level>=exigido ? nf : null; }
// Aplica a evolução (muta o pokémon para a forma nf). Retorna o nome antigo.
function aplicarEvolucao(pkm, nf){ let antigo=pkm.nome;
  pkm.id=nf.id;pkm.nome=nf.nome;pkm.tipo=nf.tipo;pkm.tipo2=nf.tipo2;pkm.raridade=nf.raridade;pkm.estagio=nf.estagio;
  pkm.evo=nf.evo;pkm.sprite=nf.sprite;pkm.back=nf.back;
  pkm.baseAtk=nf.atkBase; pkm.baseDef=nf.defBase; pkm.baseVel=nf.velBase; pkm.hpBase=nf.hpBase;
  pkm.hp=pkm.hpMax; registroDex[pkm.nome]='capturado';
  // se o líder da equipe evoluiu, atualiza o sprite do companheiro no mapa
  if(companheiro && equipeAtiva[0]===pkm){ carregarMon(pkm.nome); if(MON_OBJ[pkm.nome]){
    companheiro.nome=pkm.nome; companheiro.walkFrame=0; companheiro.andandoAte=0;
    if(typeof renderizarCompanheiro==='function') renderizarCompanheiro();
  }}
  return antigo; }
// Distribui XP pela equipe: 70% do total para quem venceu + 50% do total dividido entre TODOS na mão.
// Aplica os level-ups e retorna {subiuWinner, antesWinner, winnerGanho, fila:[{pkm,pre,nf}]}.
function aplicarXpDistribuido(base){
  let party=equipeAtiva.slice(); let n=Math.max(1,party.length);
  let compartilhado=Math.max(0,Math.round(base*0.5/n));
  let bonusVencedor=Math.max(0,Math.round(base*0.7));
  let fila=[], subiuWinner=false, antesWinner=null, winnerGanho=0;
  party.forEach(p=>{
    let ganho=compartilhado + (p===pkmAtivoJogador?bonusVencedor:0);
    if(p===pkmAtivoJogador){ antesWinner={atk:p.statAtk,def:p.statDef,vel:p.statVel,hp:p.hpMax}; winnerGanho=ganho; }
    if(ganho<=0) return;
    p.xp+=ganho;
    while(p.xp>=p.xpNecessario){ p.xp-=p.xpNecessario; let hpA=p.hpMax; p.level++; p.hp+=(p.hpMax-hpA); p.hp=Math.min(p.hp,p.hpMax); if(p===pkmAtivoJogador) subiuWinner=true; }
    let nf=evolucaoAlvo(p);
    if(nf) fila.push({pkm:p, pre:{sprite:p.sprite, nome:p.nome, tipo:p.tipo, raridade:p.raridade}, nf:nf});
  });
  return {subiuWinner, antesWinner, winnerGanho, fila};
}
function fimCicloInimigo(){clearInterval(loopATB); let xp=Math.max(1,Math.round(pkmInimigo.level*10/4)); // XP de vitória reduzida (metade da metade)
  if(batalhaTreinador){indexInimigoEquipe++;
    if(indexInimigoEquipe<treinadorAtual.pokemons.length){
      setTimeout(()=>{pkmInimigo=criarInstanciaPokemon(treinadorAtual.pokemons[indexInimigoEquipe].n,treinadorAtual.pokemons[indexInimigoEquipe].lvl);
        if(registroDex[pkmInimigo.nome]==='oculto')registroDex[pkmInimigo.nome]='visto'; montarArena();
        textoBatalha.innerText=`${treinadorAtual.nome} enviou ${pkmInimigo.nome}!`; iniciarLoopATB();},1400);
    }else{
      if(treinadorAtual.ehRival){
        // jogador venceu: rival ganha +1 espécie nova (fixa) até 5, e sobe o nível-base +4
        rivalNivel = (rivalNivel===null ? treinadorAtual.nivelAtual : rivalNivel) + 4;
        rivalVitoriasJogador++;
        crescerEquipeRival();
        reposicionarRival(); treinadorAtual.derrotado=false;
        receberXp(xp,false,treinadorAtual.premio,treinadorAtual.nome);
        let faltam = Math.min(RIVAL_MAX, Math.max(1,equipeAtiva.length)) - rivalEquipe.length;
        let extra = rivalEquipe.length>=RIVAL_MAX ? "\nMeu time já está completo com 5 Pokémon!" : "";
        setTimeout(()=>mostrarAviso("Rival "+nomeRival()+":\nGrrr... você levou dessa vez! Da próxima eu volto mais forte — e com mais um parceiro!"+extra),300);
      } else { treinadorAtual.derrotado=true; receberXp(xp,treinadorAtual.lider,treinadorAtual.premio,treinadorAtual.nome);
        if(treinadorAtual.bossLabirinto){ labirintoLimpo=true; setTimeout(()=>{ desenharMundo(); mostrarAviso("As luzes do labirinto se acendem! O caminho está livre."); },300); }
      }
    }
  }else{ receberXp(xp,false,20+pkmInimigo.level*4,null);
    if(pokemonFixoAtual){ pokemonFixoAtual.derrotado=true; pokemonFixoAtual=null; }
  }
}
function receberXp(qtd,lider,premio,nomeTreinador){
  if(premio>0){dinheiro+=premio; atualizarChips();}
  let linhaPremio=premio>0?` Recebeu ₽${premio}.`:'';
  let antesA=pkmAtivoJogador.statAtk, antesD=pkmAtivoJogador.statDef, antesV=pkmAtivoJogador.statVel, antesH=pkmAtivoJogador.hpMax;
  let r=aplicarXpDistribuido(qtd);   // 70% p/ o vencedor + 50% dividido entre toda a equipe
  textoBatalha.innerText=`${pkmAtivoJogador.nome} venceu! +${r.winnerGanho} XP (equipe recebeu XP dividida).${linhaPremio}`;
  atualizarHps();
  setTimeout(()=>{
    let venceuLider=lider?"🏆 Você derrotou o Líder e conquistou a Insígnia!":"";
    let aoFim=()=>{ processarFilaEvolucao(r.fila, ()=>fecharBatalha("Vitória!",false)); };
    if(r.subiuWinner){
      atualizarHps(); montarArena(); sfx(700,0.1); setTimeout(()=>sfx(900,0.14),120);
      let tab = `Ataque    ${antesA} -> ${pkmAtivoJogador.statAtk}\n`
              + `Defesa    ${antesD} -> ${pkmAtivoJogador.statDef}\n`
              + `Velocidade ${antesV} -> ${pkmAtivoJogador.statVel}\n`
              + `Vida      ${antesH} -> ${pkmAtivoJogador.hpMax}`;
      painelBotoes.innerHTML='';
      textoBatalha.classList.add('levelup-box');
      textoBatalha.innerText = `✨ LEVEL UP! ${pkmAtivoJogador.nome} → Lv.${pkmAtivoJogador.level}\n` + tab + (venceuLider?("\n"+venceuLider):"");
      setTimeout(()=>{ textoBatalha.classList.remove('levelup-box'); aoFim(); }, 2600);
    }
    else if(venceuLider){ textoBatalha.innerText="Vitória! "+venceuLider; setTimeout(aoFim,1800); }
    else aoFim();
  },1400);
}
// Toca, em sequência, a cutscene de evolução de cada pokémon da fila; depois chama onDone.
function processarFilaEvolucao(fila, onDone){
  if(!fila || !fila.length){ if(onDone) onDone(); return; }
  let item=fila.shift();
  // pula se já não evolui mais (segurança)
  animarEvolucao(item.pkm, item.pre, item.nf, ()=>processarFilaEvolucao(fila, onDone));
}
// ===== Cutscene de EVOLUÇÃO =====
// Pisca entre a cor do Pokémon (raridade) e a cor do tipo + branco/preto (estilo encontro);
// alterna a silhueta entre a forma 1 e a forma 2, acelerando, e revela a evolução colorida.
let _evoOnDone=null;
function animarEvolucao(pkm, pre, nf, onDone){
  _evoOnDone=onDone;
  let tela=$('evolucao-tela'), img=$('evo-sprite'), txt=$('evo-text'), prompt=$('evo-prompt'), okBtn=$('evo-ok');
  if(!tela){ aplicarEvolucao(pkm, nf); if(onDone)onDone(); return; }   // fallback se a tela não existir
  let corTipo=(typeof CORES_TIPO!=='undefined' && CORES_TIPO[pre.tipo])||'#9CA3AF';
  let corMon=(RARIDADE_INFO[pre.raridade]||{}).cor||corTipo;
  tela.style.setProperty('--evo-c1',corMon);
  tela.style.setProperty('--evo-c2',corTipo);
  tela.classList.remove('evo-revela'); tela.style.display='flex';
  txt.innerText='Evoluindo...'; prompt.style.display='none';
  img.classList.remove('silhueta'); img.src=pre.sprite;   // mostra a forma 1 colorida ("Evoluindo...")
  if(typeof sfx==='function') sfx(440,0.12);
  let toggles=0, mostrandoPre=true, intervalo=440;
  function passo(){
    img.classList.add('silhueta');                       // a partir daqui, silhuetas piscando
    mostrandoPre=!mostrandoPre;
    img.src = mostrandoPre ? pre.sprite : nf.sprite;     // alterna silhueta 1 <-> 2
    if(typeof sfx==='function') sfx(mostrandoPre?500:640,0.05);
    toggles++; intervalo=Math.max(80, intervalo-30);
    if(toggles<14){ let t=setTimeout(passo,intervalo); if(typeof fxTimers!=='undefined')fxTimers.push(t); }
    else {
      // revelação: forma 2 colorida + aplica a evolução de fato
      img.classList.remove('silhueta'); img.src=nf.sprite;
      tela.classList.add('evo-revela');
      let antigo=aplicarEvolucao(pkm, nf);
      if(typeof sfx==='function'){ sfx(660,0.14); setTimeout(()=>sfx(880,0.16),150); setTimeout(()=>sfx(1046,0.22),320); }
      txt.innerText=`Parabéns! ${antigo} evoluiu para ${pkm.nome}!`;
      prompt.style.display='flex';
      if(okBtn) okBtn.focus();
    }
  }
  let t0=setTimeout(passo,600); if(typeof fxTimers!=='undefined')fxTimers.push(t0);
}
function fecharEvolucao(){
  let tela=$('evolucao-tela'); if(tela){ tela.classList.remove('evo-revela'); tela.style.display='none'; }
  let cb=_evoOnDone; _evoOnDone=null; if(cb) cb();
}
async function usarPokebola(tipoBola){
  tipoBola=tipoBola||'poke';
  if(bolsa[tipoBola]<=0){textoBatalha.innerText="Você não tem essa esfera."; return;}
  bolsa[tipoBola]--; let info=TIPOS_BOLA[tipoBola];
  painelBotoes.innerHTML=''; subMenuAtaques=false; bolaAnimada.classList.add('voo-bola'); sfx(440,0.1);
  setTimeout(()=>{$('img-inimigo').style.display='none'; txtCaptura.style.display='block';},800);
  // Master sempre captura. Outras: chance maior com HP baixo e mult da bola.
  let chanceBase=1-(pkmInimigo.hp/pkmInimigo.hpMax)*0.7;
  let sucesso = info.mult>900 ? true : Math.random() < Math.min(0.98, chanceBase*info.mult);
  let alvo=sucesso?100:Math.floor(Math.random()*60)+10;
  await new Promise(r=>setTimeout(r,800));
  for(let i=0;i<=alvo;i+=10){txtCaptura.innerText=i+'%'; sfx(500+i,0.04); await new Promise(r=>setTimeout(r,180));}
  if(sucesso){txtCaptura.innerText='Capturado!'; sfx(660,0.12); setTimeout(()=>sfx(880,0.15),140); await new Promise(r=>setTimeout(r,900));
    // XP por captura: mesma distribuição (70% p/ o ativo + 50% dividido pela equipe), antes de adicionar o capturado
    let baseCap=Math.max(1,Math.round(pkmInimigo.level*10/4));
    let rc=aplicarXpDistribuido(baseCap);
    registroDex[pkmInimigo.nome]='capturado'; if(equipeAtiva.length<6)equipeAtiva.push(pkmInimigo); else caixaPC.push(pkmInimigo);
    if(pokemonFixoAtual){ pokemonFixoAtual.derrotado=true; pokemonFixoAtual=null; }
    txtCaptura.style.display='none'; clearInterval(loopATB); atualizarChips(); atualizarHps();
    mostrarAviso(`🎉 ${pkmInimigo.nome} foi capturado com a ${info.nome}!\nA equipe ganhou +${rc.winnerGanho} XP.`,()=>{ processarFilaEvolucao(rc.fila, ()=>fecharBatalha("Capturado!",false)); });
  }else{let fugiu=Math.random()<0.3; txtCaptura.innerText=fugiu?'Fugiu!':'Escapou!'; await new Promise(r=>setTimeout(r,900));
    txtCaptura.style.display='none'; bolaAnimada.classList.remove('voo-bola');
    if(fugiu){clearInterval(loopATB); textoBatalha.innerText="Ele fugiu!"; setTimeout(()=>fecharBatalha("Fugiu!",false),1400);}
    else{$('img-inimigo').style.display='block'; textoBatalha.innerText=`A ${info.nome} não segurou!`; setTimeout(()=>{turnoPausado=false; menuPrincipal();},1100);}}
}
function abrirPartyBatalha(){vindoDeBatalha=true; abrirParty();}
function fugirBatalha(){if(batalhaTreinador){textoBatalha.innerText="Não dá pra fugir de um treinador!"; return;} clearInterval(loopATB); fecharBatalha("Fugiu!",false);}
function fecharBatalha(msg,reset){clearInterval(loopATB); limparFxTimers(); turnoPausado=false; divBatalha.style.display='none'; emBatalha=false; subMenuAtaques=false; esperandoEspaco=false;
  // Pokémon selvagem ALEATÓRIO some após a 1ª batalha mesmo sem captura
  if(pokemonFixoAtual && pokemonFixoAtual.aleatorio){ pokemonFixoAtual.derrotado=true; pokemonFixoAtual=null; }
  txtCaptura.style.display='none'; msgCentral.style.display='none'; $('encontro-intro').style.display='none';
  $('fx-inimigo').innerHTML=''; $('fx-jogador').innerHTML='';
  tocarMusicaCenario(); // volta a trilha do mapa
  // (reset legado de cura/teleporte removido: a derrota total agora exige ir ao Centro Pokémon — ver derrotaTotal)
  atualizarChips(); desenharMundo();
}
// Derrota total: mostra a mensagem (fechável com [ESPAÇO]). Não cura nem teleporta.
// Enquanto não houver Pokémon vivo, encontros/batalhas ficam bloqueados (ver bloquearSemPokemon).
function derrotaTotal(ehRival){
  esperandoEspacoDerrota=true;
  mostrarAviso("Todos os seus Pokémon foram derrotados!\nLeve-os a um Centro Pokémon (teto vermelho) para curá-los.\n\n[ESPAÇO] para continuar", ()=>{
    esperandoEspacoDerrota=false;
    if(ehRival) setTimeout(()=>mostrarAviso("Rival "+nomeRival()+":\nHahaha! Eu avisei. Vou treinar com os mesmos parceiros e te encontro por aí. Da próxima não pega leve!"),300);
  });
}
/* ============ MENUS ============ */
function alternarParty(){if(mostrandoNotificacao||!jogoIniciado)return; if(trocaObrigatoria)return; if(emParty)fecharParty(); else{vindoDeBatalha=false; abrirParty();}}
function fazerTroca(p){
  let obrig=trocaObrigatoria;
  trocaObrigatoria=false;        // libera o fechamento ANTES de fechar
  pkmAtivoJogador=p; fecharParty(); montarArena();
  if(obrig){
    // Reinicia o ritmo da luta para os dois e retoma o loop ATB
    atbJogador=0; atbInimigo=0; turnoPausado=false;
    $('img-jogador').classList.remove('faint');
    textoBatalha.innerText=`Vai, ${p.nome}! A velocidade de ambos foi reiniciada.`;
    iniciarLoopATB();
  } else {
    // Troca voluntária no seu turno: zera só seu ATB e devolve o turno ao inimigo
    turnoPausado=false; atbJogador=0;
  }
}
function abrirParty(){
  emParty=true; listaParty.innerHTML='';
  // Cabeçalho e botão Voltar dependem do modo
  $('btn-voltar-party').style.display = trocaObrigatoria ? 'none' : 'flex';
  document.querySelector('#tela-party .tag').innerText = trocaObrigatoria ? 'troca obrigatória — escolha quem entra' : 'reordene · troque · cure no PC';
  equipeAtiva.forEach((p,i)=>{
    let frac=p.hp/p.hpMax; let ri=rarInfo(p.raridade);
    let card=document.createElement('div'); card.className='card-pkm card-rar';
    card.style.borderColor=ri.borda; card.style.background=ri.grad; card.style.boxShadow=`0 0 0 1px ${ri.borda}55, inset 0 0 12px ${ri.cor}18`;
    if(p.hp<=0)card.style.opacity='0.5';
    card.innerHTML=`<div class="meta-l" style="cursor:pointer">
      <img class="dex-thumb" src="${BASE_POKEMONS[p.nome].sprite}">
      <div><div class="nm">${p.nome} ${pillTipo(p.tipo)}${p.tipo2?' '+pillTipo(p.tipo2):''}</div>
      <div class="sub">Lv.${p.level} · HP ${p.hp}/${p.hpMax} · <span style="color:${ri.cor};font-weight:700">${ri.nome}</span> · 🔍 ver stats</div>
      <div class="hpmini"><i style="width:${frac*100}%; background:${corHp(frac)}"></i></div></div></div>
      <div id="slot-${i}" style="display:flex; gap:6px;"></div>`;
    listaParty.appendChild(card); let slot=$(`slot-${i}`);
    card.querySelector('.meta-l').onclick=()=>verStatsPokemon(p);
    if(vindoDeBatalha){
      if(p.hp>0&&p!==pkmAtivoJogador){let b=document.createElement('button'); b.className='btn-acao'; b.style.height='34px'; b.style.padding='0 12px'; b.innerText='Entrar';
        b.onclick=()=>fazerTroca(p); slot.appendChild(b);}
      else if(p===pkmAtivoJogador){slot.innerHTML='<span style="font-size:10px; color:var(--accent); font-weight:700;">EM CAMPO</span>';}
      else {slot.innerHTML='<span style="font-size:10px; color:var(--red); font-weight:700;">DESMAIADO</span>';}
    }else{
      if(i===0)slot.innerHTML='<span style="font-size:10px; font-weight:700; color:var(--gold);">LÍDER ★</span>';
      else{let b=document.createElement('button'); b.className='btn-acao btn-gold'; b.style.height='34px'; b.style.padding='0 12px'; b.innerText='⬆ Subir';
        b.onclick=()=>{let m=equipeAtiva.splice(i,1)[0]; equipeAtiva.splice(i-1,0,m); abrirParty();}; slot.appendChild(b);}
    }
  });
  divParty.style.display='flex';
}
function fecharParty(){ if(trocaObrigatoria)return; divParty.style.display='none'; emParty=false;}

function verStatsPokemon(p){
  let info=rarInfo(p.raridade);
  let sheet=document.querySelector('#modal-pkm .sheet');
  sheet.style.borderColor=info.borda; sheet.style.background=info.grad;
  sheet.style.boxShadow=`0 0 0 2px ${info.borda}66, 0 0 30px ${info.cor}40, var(--shadow)`;
  $('pkm-nome').innerText=`${p.nome}  Lv.${p.level}`; $('pkm-nome').style.color=info.cor;
  $('pkm-rar').innerText=info.nome; $('pkm-rar').style.color=info.cor;
  $('pkm-sprite').src=BASE_POKEMONS[p.nome].sprite; $('pkm-sprite').style.borderColor=info.borda;
  $('pkm-meta').innerHTML=`<div style="margin-bottom:6px">${pillTipo(p.tipo)}${p.tipo2?' '+pillTipo(p.tipo2):''}</div>
    <div style="font-size:12px;color:var(--muted)">Estágio ${p.estagio||'-'} · Nº ${BASE_POKEMONS[p.nome].id}</div>
    <div style="font-size:12px;color:var(--muted)">XP ${p.xp}/${p.xpNecessario}</div>`;
  // tabela de stats: base, multiplicador, fórmula e valor atual
  let m=info.mult;
  // cores por atributo: Ataque vermelho, Defesa azul, Velocidade amarelo, Vida verde
  function linha(rotulo,base,atual,cor){
    return `<tr><td style="color:${cor};font-weight:800">${rotulo}</td><td>${base}</td><td>×${m} · Lv${p.level}</td><td>${base} × (${m}×${p.level}) + ${base}</td><td style="text-align:right;font-weight:800;color:${cor}">${atual}</td></tr>`;
  }
  $('pkm-stats').innerHTML=`
    <div style="font-size:11px;color:var(--muted);margin-bottom:4px">Multiplicador de raridade: <b style="color:${info.cor}">×${m}</b> · Nível mínimo p/ aparecer: <b>${info.minLevel}</b></div>
    <table class="stat-table">
      <thead><tr><th>Atributo</th><th>Base</th><th>Mult</th><th>Fórmula</th><th style="text-align:right">Atual</th></tr></thead>
      <tbody>
        ${linha('⚔ Ataque', p.baseAtk, p.statAtk, '#ff3b4e')}
        ${linha('🛡 Defesa', p.baseDef, p.statDef, '#3a6bff')}
        ${linha('⚡ Velocidade', p.baseVel, p.statVel, '#ffce4d')}
        ${linha('❤ Vida', p.hpBase, p.hpMax, '#2bb673')}
      </tbody>
    </table>`;
  $('modal-pkm').style.display='flex';
}
function fecharStatsPokemon(){ $('modal-pkm').style.display='none'; }

function alternarPokedex(){
  if(mostrandoNotificacao||!jogoIniciado)return;
  if(emPokedex){fecharPokedex(); return;}
  emPokedex=true; listaPokedex.innerHTML='';
  let cap=Object.values(registroDex).filter(s=>s==='capturado').length;
  $('dex-progress').innerText=`${cap} / 151`;
  Object.keys(BASE_POKEMONS).forEach(k=>{
    let base=BASE_POKEMONS[k], estado=registroDex[k]; let r=document.createElement('div'); r.className='card-pkm';
    let rar=rarInfo(base.raridade);
    if(estado!=='oculto'){ r.classList.add('card-rar'); r.style.borderColor=rar.borda; r.style.background=rar.grad; r.style.boxShadow=`0 0 0 1px ${rar.borda}55, inset 0 0 10px ${rar.cor}14`; }
    let tiposP=pillTipo(base.tipo)+(base.tipo2?' '+pillTipo(base.tipo2):'');
    let statsLine=`⚡${base.velBase} 🛡${base.defBase} ⚔${base.atkBase}`;
    if(estado==='oculto'){r.innerHTML=`<div class="meta-l"><div class="dex-thumb" style="display:grid;place-items:center;color:var(--muted)">?</div><div><div class="nm" style="color:var(--muted)">Nº${base.id} ???</div><div class="sub">não visto</div></div></div>`;}
    else if(estado==='visto'){r.innerHTML=`<div class="meta-l"><img class="dex-thumb visto" src="${base.sprite}"><div><div class="nm">Nº${base.id} ${k}</div><div class="sub">visto · ${tiposP}</div></div></div><span style="font-size:10px;font-weight:700;color:${rar.cor}">${rar.nome}</span>`;}
    else{r.innerHTML=`<div class="meta-l"><img class="dex-thumb" src="${base.sprite}"><div><div class="nm">Nº${base.id} ${k} ${tiposP}</div><div class="sub"><span style="color:${rar.cor};font-weight:700">${rar.nome}</span> · ${statsLine}</div></div></div>
      <button id="dex-btn-${k}" class="btn-acao btn-ghost" style="height:34px; padding:0 12px;">P/ Time</button>`;}
    listaPokedex.appendChild(r);
    // clicar no Pokémon (visto/capturado) abre os stats coloridos
    if(estado!=='oculto'){ let ml=r.querySelector('.meta-l'); if(ml){ ml.style.cursor='pointer';
      ml.onclick=()=>{ let inst = equipeAtiva.find(p=>p.nome===k) || caixaPC.find(p=>p.nome===k) || criarInstanciaPokemon(k,5); verStatsPokemon(inst); }; } }
    if(estado==='capturado'){$(`dex-btn-${k}`).onclick=()=>{
      if(equipeAtiva.some(p=>p.nome===k)){mostrarAviso(`${k} já está na equipe.`); return;}
      if(equipeAtiva.length>=6){let rem=equipeAtiva.pop(); caixaPC.push(rem); mostrarAviso(`${rem.nome} foi para o PC.\n${k} entrou na equipe!`);}
      else mostrarAviso(`${k} entrou na equipe!`);
      equipeAtiva.push(criarInstanciaPokemon(k,5)); atualizarChips(); fecharPokedex();};}
  });
  divPokedex.style.display='flex';
}
function fecharPokedex(){divPokedex.style.display='none'; emPokedex=false;}

/* ============ INPUT ============ */
const teclasMov=new Set();
document.documentElement.addEventListener('keydown',e=>{
  if(!jogoIniciado)return;
  // Mensagem de derrota total: só [ESPAÇO] (fecha o aviso)
  if(esperandoEspacoDerrota){ if(e.code==='Space'){e.preventDefault(); fecharNotificacao();} return; }
  // Durante o alerta de encontro só ESPAÇO funciona
  if(esperandoEspaco){ if(e.code==='Space'){e.preventDefault(); window.iniciarBatalhaAgora();} return; }
  // Pop-up de inicial: atalhos selecionam; Enter confirma; Esc cancela
  if(starterPopupAberto){ let k=(e.key||'').toLowerCase();
    if(e.key==='Escape'){ fecharStarterPopup(); return; }
    if(e.key==='Enter'){ confirmarStarter(); return; }
    let map={q:'Bulbasaur',w:'Charmander',e:'Squirtle',r:'Pikachu'};
    if(map[k] && _starterCards[map[k]]){ selecionarStarter(map[k]); }
    return; }
  if(e.key==='Escape'){ if($('modal-mapa').style.display==='flex'){fecharMapa();return;} if(emMochila){fecharMochila();return;} if(emLoja){fecharLoja();return;} if($('modal-custom').style.display==='flex'){fecharCustom();return;} if(emParty){fecharParty();return;} if(emPokedex){fecharPokedex();return;} }
  // Com a mochila aberta: R/B/E fecham; outras teclas ficam bloqueadas
  if(emMochila){ if(['r','b','e'].includes((e.key||'').toLowerCase())) fecharMochila(); return; }
  if($('modal-mapa').style.display==='flex'){ if((e.key||'').toLowerCase()==='m')fecharMapa(); return; }
  if((e.key||'').toLowerCase()==='m'){ abrirMapa(); return; }
  if((e.key||'').toLowerCase()==='g'){ alternarGrade(); return; }   // liga/desliga a grade de coordenadas
  if(emLoja || $('modal-custom').style.display==='flex')return;
  // Em batalha: só os atalhos de batalha (Q/W/A/S + Espaço já tratado). Movimento/menus bloqueados.
  if(emBatalha){
    // B/Voltar é tratado de forma unificada (submenu, tela de Pokémon, stats)
    if((e.key||'').toLowerCase()==='b'){ voltarBotaoB(); return; }
    if(e.code==='Space'){e.preventDefault();} tratarAtalhos(e.key||e.code); return;
  }
  if(e.code==='Space'){e.preventDefault(); iniciarBatalhaSelvagem(false); return;}
  let k=e.key.toLowerCase();
  if(k==='e')interagirBotaoE();
  else if(k==='b')voltarBotaoB();
  else if(k==='q')alternarParty();
  else if(k==='o')alternarPokedex();
  else if(k==='c')abrirCustom();
  else if(k==='r')abrirMochila();
  else if(['w','a','s','d'].includes(k)){ teclasMov.add(k); forcarMovimento(k); }
});
document.documentElement.addEventListener('keyup',e=>{ let k=(e.key||'').toLowerCase(); if(teclasMov.has(k))teclasMov.delete(k); });
// Loop de movimento contínuo: enquanto a tecla estiver pressionada, anda em ritmo fluido
setInterval(()=>{
  if(!jogoIniciado||emBatalha||emParty||emPokedex||emLoja||emMochila||esperandoEspaco||mostrandoNotificacao)return;
  if($('modal-mapa')?.style.display==='flex'||$('modal-custom')?.style.display==='flex')return;
  if(teclasMov.size===0)return;
  // prioridade: última direção pressionada (usa qualquer uma do set)
  let k=[...teclasMov].pop();
  forcarMovimento(k);
}, 60);

/* ============ INIT ============ */
// Escala o app inteiro para caber na tela (resolve corte no topo em mobile deitado).
// Os modais ficam fora do .app, então não são afetados (continuam em tela cheia).
function ajustarEscala(){
  const app=document.querySelector('.app'); if(!app) return;
  app.style.transform='none';
  // mede a largura/altura REAIS do conteúdo (evita corte quando os controles são largos)
  const w=Math.max(app.offsetWidth, app.scrollWidth), h=Math.max(app.offsetHeight, app.scrollHeight); if(!w||!h) return;
  const availW=window.innerWidth, availH=window.innerHeight;
  let scale=Math.min((availW-6)/w, (availH-6)/h, 1);
  // desce um pouco só quando sobra altura (desktop); no mobile fica centralizado p/ caber
  let folga=availH - h*scale;
  let ty=(scale>=0.999 && folga>140) ? Math.min(folga*0.16, 70) : 0;
  app.style.transform = ty ? `translateY(${ty}px) scale(${scale})` : `scale(${scale})`;
}
window.addEventListener('resize', ajustarEscala);
window.addEventListener('orientationchange', ()=>{ setTimeout(ajustarEscala,200); setTimeout(ajustarEscala,500); });

function inicializarJogo(){
  colocarPlacas();
  renderizarJogador();
  divMapa.style.gridTemplateColumns=`repeat(${LARGURA_MAPA}, ${TILE}px)`;
  divMapa.style.gridTemplateRows=`repeat(${ALTURA_MAPA}, ${TILE}px)`;
  desenharMundo(); atualizarChips(); montarIntro(); montarCustomizacao();
  let elVer=$('versao-jogo'); if(elVer) elVer.textContent='v'+VERSAO_JOGO;
  if(existeSave()){ let b=$('btn-continuar'); if(b) b.style.display='block'; }
  ajustarEscala();
}
inicializarJogo();
setTimeout(ajustarEscala, 100);
