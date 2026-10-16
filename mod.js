(() => {
  'use strict';

  /* =====================================================================
     CONFIGURAÇÃO — mude os números aqui para ajustar o jogo
     ===================================================================== */
  const CONFIG = {
    PONTOS_ACERTO: 10,      // por palavra estrangeira encontrada
    PONTOS_ERRO: 10,        // perdidos ao clicar numa palavra do português
    COMBO_MINIMO: 3,        // acertos seguidos para ativar o combo
    BONUS_COMBO: 5,         // extra por acerto enquanto o combo está ativo
    BONUS_PERFEITO: 30,     // achou todas sem errar nenhuma
    BONUS_POR_SEGUNDO: 1,   // por segundo que sobrou (só se achar todas)
    TEMPO_POR_TEXTO: 60,   // segundos
    EMBARALHAR_TEXTOS: true,
    TAMANHO_RANKING: 10,
    CHAVE_RANKING: 'cacaEstrangeirismos.ranking.v1',
    CHAVE_SOM: 'cacaEstrangeirismos.som'
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  /* ---------- armazenamento local ---------- */
  function lerLS(chave, padrao) {
    try {
      const v = localStorage.getItem(chave);
      return v == null ? padrao : JSON.parse(v);
    } catch { return padrao; }
  }
  function gravarLS(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem storage */ }
  }

  /* ---------- estado ---------- */
  const S = {
    nome: '', ordem: [], idx: 0,
    pontos: 0, combo: 0, maiorCombo: 0,
    acertos: 0, erros: 0, totalEstrangeiras: 0, tempoMs: 0,
    som: lerLS(CONFIG.CHAVE_SOM, true)
  };
  let R = null; // rodada (texto atual)

  /* ---------- utilidades ---------- */
  function embaralhar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const chave = (txt) => txt.toLowerCase();
  const normalizarNome = (n) => n.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sorteio = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function formatarTempo(ms) {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function bump(elemento) {
    elemento.classList.remove('bump');
    void elemento.offsetWidth;
    elemento.classList.add('bump');
  }

  // Quebra o texto em palavras clicáveis. [colchetes] = estrangeira.
  function tokenizar(str) {
    const re = /\[([^\]]+)\]|([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)|([^\p{L}\p{N}[]+)/gu;
    const tokens = [];
    let m;
    while ((m = re.exec(str))) {
      if (m[1]) tokens.push({ tipo: 'p', txt: m[1], estrangeira: true });
      else if (m[2]) tokens.push({ tipo: 'p', txt: m[2], estrangeira: false });
      else tokens.push({ tipo: 's', txt: m[3] });
    }
    return tokens;
  }

  /* ---------- som (Web Audio, sem arquivos) ---------- */
  let audio;
  function tom(freq, dur = 0.12, tipo = 'sine', vol = 0.15, atraso = 0) {
    if (!S.som) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime + atraso;
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = tipo;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch { /* sem áudio */ }
  }
  const SOM = {
    acerto: (combo) => { const b = 600 + Math.min(combo, 8) * 40; tom(b, 0.1, 'triangle'); tom(b * 1.5, 0.16, 'triangle', 0.15, 0.08); },
    erro: () => { tom(200, 0.25, 'sawtooth', 0.07); tom(140, 0.3, 'sawtooth', 0.07, 0.1); },
    tique: () => tom(1000, 0.05, 'square', 0.03),
    contagem: () => tom(440, 0.12, 'sine', 0.15),
    vai: () => tom(880, 0.3, 'sine', 0.18),
    vitoria: () => [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.22, 'triangle', 0.15, i * 0.11)),
    fimTempo: () => [400, 300, 200].forEach((f, i) => tom(f, 0.25, 'square', 0.05, i * 0.15))
  };

  const btnSom = $('#btn-som');
  function atualizarBotaoSom() { btnSom.textContent = S.som ? '🔊' : '🔇'; }
  btnSom.addEventListener('click', () => {
    S.som = !S.som;
    gravarLS(CONFIG.CHAVE_SOM, S.som);
    atualizarBotaoSom();
  });
  atualizarBotaoSom();

  /* ---------- confete (canvas) ---------- */
  const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = $('#fx');
  const ctx = fx.getContext('2d');
  const CORES = ['#ff4f8b', '#ffc93c', '#7b5cff', '#16b061', '#3cc6ff', '#ff8a3c'];
  let particulas = [];
  let animando = false;

  function redimensionar() {
    const dpr = window.devicePixelRatio || 1;
    fx.width = innerWidth * dpr;
    fx.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', redimensionar);
  redimensionar();

  function novaParticula(x, y, vx, vy) {
    return {
      x, y, vx, vy,
      vida: 70 + Math.random() * 50,
      cor: sorteio(CORES),
      tam: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3
    };
  }
  function explosao(x, y, n = 18) {
    if (reduzMovimento) return;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const vel = 2 + Math.random() * 5;
      particulas.push(novaParticula(x, y, Math.cos(ang) * vel, Math.sin(ang) * vel - 3));
    }
    animar();
  }
  function chuva(n = 160) {
    if (reduzMovimento) return;
    for (let i = 0; i < n; i++) {
      particulas.push(novaParticula(Math.random() * innerWidth, -20 - Math.random() * innerHeight * 0.5,
        (Math.random() - 0.5) * 2, 2 + Math.random() * 3));
    }
    animar();
  }
  function animar() {
    if (animando) return;
    animando = true;
    const passo = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      particulas = particulas.filter((p) => p.vida > 0 && p.y < innerHeight + 30);
      for (const p of particulas) {
        p.vy += 0.15; p.vx *= 0.99;
        p.x += p.vx; p.y += p.vy;
        p.rot += p.vr; p.vida--;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.vida / 30);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.cor;
        ctx.fillRect(-p.tam / 2, -p.tam / 4, p.tam, p.tam / 2);
        ctx.restore();
      }
      if (particulas.length) requestAnimationFrame(passo);
      else { animando = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
    };
    requestAnimationFrame(passo);
  }

  /* ---------- feedback visual ---------- */
  function flutuante(alvo, texto, classe) {
    const r = alvo.getBoundingClientRect();
    const f = el('div', `flutuante ${classe}`, texto);
    f.style.left = `${r.left + r.width / 2}px`;
    f.style.top = `${r.top}px`;
    document.body.append(f);
    setTimeout(() => f.remove(), 1000);
  }

  function toast(msg, tipo = '', duracao = 2600) {
    const t = el('div', `toast ${tipo}`, msg);
    const box = $('#toasts');
    box.append(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => {
      t.classList.add('saindo');
      setTimeout(() => t.remove(), 300);
    }, duracao);
  }

  /* ---------- fundo decorativo ---------- */
  (function montarFundo() {
    const palavras = ['hello', 'olá', 'hola', 'bonjour', 'ciao', 'hallo', 'wow', 'cool', 'selfie', 'online', 'game', 'like', 'okay', 'link'];
    const fundo = $('#fundo');
    palavras.forEach((p, i) => {
      const s = el('span', null, p);
      s.style.left = `${(i * 37) % 95}%`;
      s.style.top = `${(i * 53) % 95}%`;
      s.style.fontSize = `${1.5 + (i % 4) * 0.9}rem`;
      s.style.setProperty('--d', `${14 + (i % 5) * 4}s`);
      s.style.setProperty('--r', `${(i % 2 ? 1 : -1) * (4 + (i % 6))}deg`);
      fundo.append(s);
    });
  })();

  /* ---------- navegação entre telas ---------- */
  function mostrar(nome) {
    $$('.tela').forEach((t) => t.classList.toggle('ativa', t.id === `tela-${nome}`));
    if (nome === 'ranking') renderRanking();
    if (nome === 'inicio') setTimeout(() => $('#nome').focus(), 50);
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]');
    if (b) mostrar(b.dataset.ir);
  });

  /* ---------- regras (geradas a partir da CONFIG) ---------- */
  (function montarRegras() {
    const regras = [
      ['👀', 'Leia o texto e toque nas palavras <b>estrangeiras</b>, ou seja, que não são do português brasileiro.'],
      ['✅', `Palavra estrangeira: <b>+${CONFIG.PONTOS_ACERTO} pontos</b>.`],
      ['🔥', `<b>Combo:</b> a partir de ${CONFIG.COMBO_MINIMO} acertos seguidos, cada acerto vale <b>+${CONFIG.BONUS_COMBO} extra</b>.`],
      ['❌', `Palavra do português: você <b>perde ${CONFIG.PONTOS_ERRO} pontos</b> dos que já ganhou e o combo zera.`],
      ['🪤', 'Cuidado com as <b>pegadinhas</b>: palavras que vieram de outras línguas mas já foram aportuguesadas (como “hambúrguer” e “tênis”) contam como português!'],
      ['🏷️', 'Nomes de marcas e apps estrangeiros (Instagram, WhatsApp…) contam como estrangeiros. Os títulos não valem.'],
      ['⏱️', `Você tem <b>${CONFIG.TEMPO_POR_TEXTO / 60} minutos</b> por texto. Achou todas? Cada segundo que sobrou vira <b>+${CONFIG.BONUS_POR_SEGUNDO} ponto</b>.`],
      ['⭐', `Texto perfeito (todas as palavras, nenhum erro): <b>+${CONFIG.BONUS_PERFEITO} pontos</b>.`],
      ['🏆', `O ranking mostra o <b>top ${CONFIG.TAMANHO_RANKING}</b>. Vale a melhor pontuação de cada nome; no empate, ganha quem foi mais rápido.`]
    ];
    const ul = $('#lista-regras');
    for (const [icone, html] of regras) {
      const li = el('li');
      li.append(el('span', null, icone));
      const span = el('span');
      span.innerHTML = html; // conteúdo fixo, sem dados do usuário
      li.append(span);
      ul.append(li);
    }
  })();

  /* ---------- início ---------- */
  const inputNome = $('#nome');
  $('#form-nome').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = inputNome.value.trim().replace(/\s+/g, ' ');
    if (nome.length < 2) {
      inputNome.classList.remove('invalido');
      void inputNome.offsetWidth;
      inputNome.classList.add('invalido');
      toast('Digite seu nome (pelo menos 2 letras) ✍️', 'erro');
      inputNome.focus();
      return;
    }
    inputNome.classList.remove('invalido');
    iniciarJogo(nome);
  });

  function iniciarJogo(nome) {
    Object.assign(S, {
      nome, idx: 0, pontos: 0, combo: 0, maiorCombo: 0,
      acertos: 0, erros: 0, totalEstrangeiras: 0, tempoMs: 0
    });
    S.ordem = TEXTOS.map((_, i) => i);
    if (CONFIG.EMBARALHAR_TEXTOS) embaralhar(S.ordem);
    $('#hud-nome').textContent = nome;
    mostrar('jogo');
    prepararTexto();
  }

  /* ---------- rodada (um texto) ---------- */
  const corpo = $('#texto-corpo');
  const comboEl = $('#combo');

  function prepararTexto() {
    const texto = TEXTOS[S.ordem[S.idx]];
    const tokens = tokenizar(texto.corpo);
    R = {
      texto, tokens,
      total: tokens.filter((t) => t.estrangeira).length,
      achadas: 0, erros: 0,
      restanteMs: CONFIG.TEMPO_POR_TEXTO * 1000,
      fim: 0, timer: null, ultimoSeg: null,
      pontosInicio: S.pontos,
      encerrada: true
    };
    S.totalEstrangeiras += R.total;
    S.combo = 0;
    comboEl.hidden = true;

    const frag = document.createDocumentFragment();
    tokens.forEach((t, i) => {
      if (t.tipo === 's') { frag.append(t.txt); return; }
      const b = el('button', 'palavra', t.txt);
      b.type = 'button';
      b.dataset.i = i;
      b.tabIndex = -1;
      frag.append(b);
    });
    corpo.replaceChildren(frag);
    corpo.classList.add('oculto');
    $('#texto-titulo').textContent = texto.titulo;
    $('#hud-texto').textContent = `Texto ${S.idx + 1} de ${S.ordem.length}`;
    $('#btn-terminar').disabled = true;
    atualizarHUD();
    contagemRegressiva(texto.titulo, iniciarTimer);
  }

  function contagemRegressiva(titulo, depois) {
    const ov = $('#contagem');
    const num = $('#contagem-num');
    $('#contagem-sub').textContent = `Texto ${S.idx + 1} de ${S.ordem.length}`;
    $('#contagem-titulo').textContent = titulo;
    ov.hidden = false;
    const passos = ['3', '2', '1', 'Vai!'];
    let i = 0;
    const proximo = () => {
      if (i === passos.length) { ov.hidden = true; depois(); return; }
      num.textContent = passos[i];
      num.classList.remove('zoom'); void num.offsetWidth; num.classList.add('zoom');
      (i === passos.length - 1 ? SOM.vai : SOM.contagem)();
      i++;
      setTimeout(proximo, i === passos.length ? 550 : 800);
    };
    proximo();
  }

  function iniciarTimer() {
    R.encerrada = false;
    corpo.classList.remove('oculto');
    $$('.palavra').forEach((b) => { b.tabIndex = 0; });
    $('#btn-terminar').disabled = false;
    R.fim = performance.now() + R.restanteMs;
    R.timer = setInterval(tique, 200);
    tique();
  }

  function tique() {
    R.restanteMs = Math.max(0, R.fim - performance.now());
    const seg = Math.ceil(R.restanteMs / 1000);
    const urgente = seg <= 15;
    $('#hud-tempo').textContent = formatarTempo(R.restanteMs);
    $('#stat-tempo').classList.toggle('urgente', urgente);
    const barra = $('#barra-tempo');
    barra.style.width = `${(R.restanteMs / (CONFIG.TEMPO_POR_TEXTO * 1000)) * 100}%`;
    barra.classList.toggle('urgente', urgente);
    if (seg !== R.ultimoSeg) {
      if (seg <= 10 && seg > 0) SOM.tique();
      R.ultimoSeg = seg;
    }
    if (R.restanteMs <= 0) encerrarTexto('tempo');
  }

  function atualizarHUD() {
    const p = $('#hud-pontos');
    if (p.textContent !== String(S.pontos)) { p.textContent = S.pontos; bump(p); }
    const a = $('#hud-achadas');
    const novo = `${R.achadas}/${R.total}`;
    if (a.textContent !== novo) { a.textContent = novo; bump(a); }
    $('#hud-tempo').textContent = formatarTempo(R.restanteMs);
  }

  corpo.addEventListener('click', (e) => {
    const b = e.target.closest('button.palavra');
    if (!b || !R || R.encerrada || b.disabled) return;
    const tok = R.tokens[Number(b.dataset.i)];
    b.disabled = true;
    if (tok.estrangeira) acertou(b, tok);
    else errou(b, tok);
    atualizarHUD();
  });

  function acertou(b, tok) {
    S.combo++;
    S.maiorCombo = Math.max(S.maiorCombo, S.combo);
    const emCombo = S.combo >= CONFIG.COMBO_MINIMO;
    const pts = CONFIG.PONTOS_ACERTO + (emCombo ? CONFIG.BONUS_COMBO : 0);
    S.pontos += pts;
    S.acertos++;
    R.achadas++;
    b.classList.add('certa');
    const significado = GLOSSARIO[chave(tok.txt)];
    if (significado) b.title = significado;
    flutuante(b, `+${pts}`, 'mais');
    const r = b.getBoundingClientRect();
    explosao(r.left + r.width / 2, r.top + r.height / 2, emCombo ? 26 : 16);
    SOM.acerto(S.combo);

    if (emCombo) {
      comboEl.hidden = false;
      comboEl.textContent = `🔥 Combo x${S.combo}`;
      bump(comboEl);
    }
    if (R.achadas === R.total) encerrarTexto('completo');
  }

  function errou(b, tok) {
    S.combo = 0;
    comboEl.hidden = true;
    const perda = Math.min(CONFIG.PONTOS_ERRO, S.pontos);
    S.pontos -= perda;
    S.erros++;
    R.erros++;
    b.classList.add('errada');
    flutuante(b, perda ? `-${perda}` : '✗', 'menos');
    SOM.erro();
    if (navigator.vibrate) navigator.vibrate(120);

    const pegadinha = PEGADINHAS[chave(tok.txt)];
    if (pegadinha) toast(`🪤 Pegadinha! ${pegadinha}`, 'erro', 4500);
    else toast(sorteio([
      'Essa é bem brasileira! 🇧🇷',
      'Ops! Essa palavra é do português.',
      'Não é estrangeira! Leia com atenção 👀',
      'Nada disso, essa é nossa! 😅'
    ]), 'erro');
  }

  $('#btn-terminar').addEventListener('click', () => {
    if (!R || R.encerrada) return;
    const faltam = R.total - R.achadas;
    if (confirm(`Ainda faltam ${faltam} palavra(s) estrangeira(s). Quer mesmo encerrar este texto?`)) {
      encerrarTexto('desistiu');
    }
  });

  $('#btn-sair').addEventListener('click', () => {
    if (!confirm('Sair do jogo? Sua pontuação NÃO será salva.')) return;
    if (R) { clearInterval(R.timer); R.encerrada = true; }
    $('#contagem').hidden = true;
    $('#modal-resultado').hidden = true;
    mostrar('inicio');
  });

  function encerrarTexto(motivo) {
    if (R.encerrada) return;
    R.encerrada = true;
    clearInterval(R.timer);
    $('#btn-terminar').disabled = true;

    S.tempoMs += CONFIG.TEMPO_POR_TEXTO * 1000 - R.restanteMs;
    const completo = R.achadas === R.total;
    const bonusTempo = completo ? Math.ceil(R.restanteMs / 1000) * CONFIG.BONUS_POR_SEGUNDO : 0;
    const bonusPerfeito = completo && R.erros === 0 ? CONFIG.BONUS_PERFEITO : 0;
    S.pontos += bonusTempo + bonusPerfeito;
    comboEl.hidden = true;

    // revela o que faltou
    $$('.palavra').forEach((b) => {
      const tok = R.tokens[Number(b.dataset.i)];
      if (tok.estrangeira && !b.classList.contains('certa')) {
        b.classList.add('faltou');
        const sig = GLOSSARIO[chave(tok.txt)];
        if (sig) b.title = sig;
      }
      b.disabled = true;
    });
    atualizarHUD();

    if (completo) { SOM.vitoria(); chuva(bonusPerfeito ? 200 : 110); }
    else if (motivo === 'tempo') { SOM.fimTempo(); toast('⏰ Tempo esgotado!', 'erro'); }

    setTimeout(() => mostrarResultado({ motivo, completo, bonusTempo, bonusPerfeito }), completo ? 1100 : 1400);
  }

  function linha(rotulo, valor, classeValor = '', destaque = false) {
    const d = el('div', `linha${destaque ? ' destaque' : ''}`);
    d.append(el('span', null, rotulo), el('b', classeValor, valor));
    return d;
  }

  function mostrarResultado({ motivo, completo, bonusTempo, bonusPerfeito }) {
    let titulo = 'Texto encerrado';
    if (completo && bonusPerfeito) titulo = '⭐ Texto perfeito!';
    else if (completo) titulo = '🎉 Achou todas!';
    else if (motivo === 'tempo') titulo = '⏰ Tempo esgotado!';
    $('#res-titulo').textContent = titulo;

    const ganho = S.pontos - R.pontosInicio;
    const linhas = $('#res-linhas');
    linhas.replaceChildren(
      linha('Estrangeiras encontradas', `${R.achadas}/${R.total}`),
      linha('Erros', String(R.erros), R.erros ? 'neg' : 'pos'),
      linha('Bônus de tempo', `+${bonusTempo}`, bonusTempo ? 'pos' : ''),
      linha('Bônus texto perfeito', `+${bonusPerfeito}`, bonusPerfeito ? 'pos' : ''),
      linha('Pontos neste texto', `${ganho >= 0 ? '+' : ''}${ganho}`, ganho >= 0 ? 'pos' : 'neg'),
      linha('Total', String(S.pontos), '', true)
    );

    // glossário: uma linha por palavra (sem repetir)
    const vistos = new Map();
    $$('.palavra').forEach((b) => {
      const tok = R.tokens[Number(b.dataset.i)];
      if (!tok.estrangeira) return;
      const k = chave(tok.txt);
      const achou = b.classList.contains('certa');
      if (!vistos.has(k)) vistos.set(k, { txt: tok.txt, achou });
      else if (achou) vistos.get(k).achou = true;
    });
    const ul = $('#res-glossario');
    ul.replaceChildren();
    for (const [k, v] of vistos) {
      const li = el('li');
      li.append(
        el('span', `chip ${v.achou ? 'ok' : 'nao'}`, `${v.achou ? '✓' : '✗'} ${v.txt}`),
        el('span', null, GLOSSARIO[k] || '')
      );
      ul.append(li);
    }

    const ultimo = S.idx >= S.ordem.length - 1;
    $('#btn-continuar').textContent = ultimo ? 'Ver resultado final 🏁' : 'Próximo texto ▶';
    $('#modal-resultado').hidden = false;
    $('#modal-resultado .modal-card').scrollTop = 0;
    $('#btn-continuar').focus();
  }

  $('#btn-continuar').addEventListener('click', () => {
    $('#modal-resultado').hidden = true;
    if (S.idx < S.ordem.length - 1) {
      S.idx++;
      window.scrollTo(0, 0);
      prepararTexto();
    } else {
      finalizarJogo();
    }
  });

  /* ---------- final ---------- */
  function finalizarJogo() {
    const tentativas = S.acertos + S.erros;
    const precisao = tentativas ? Math.round((100 * S.acertos) / tentativas) : 0;
    const entrada = {
      nome: S.nome,
      pontos: S.pontos,
      acertos: S.acertos,
      total: S.totalEstrangeiras,
      erros: S.erros,
      precisao,
      tempoMs: Math.round(S.tempoMs),
      data: Date.now()
    };
    const { posicao, novoRecorde, melhor } = salvarNoRanking(entrada);

    $('#final-titulo').textContent = `Mandou bem, ${S.nome}!`;
    contarAte($('#final-pontos'), S.pontos);

    const stats = $('#final-stats');
    stats.replaceChildren();
    [
      ['Encontradas', `${S.acertos}/${S.totalEstrangeiras}`],
      ['Erros', String(S.erros)],
      ['Precisão', `${precisao}%`],
      ['Maior combo', `x${S.maiorCombo}`],
      ['Tempo total', formatarTempo(entrada.tempoMs)],
      ['Posição', `${posicao}º`]
    ].forEach(([r, v]) => {
      const d = el('div');
      d.append(el('small', null, r), el('strong', null, v));
      stats.append(d);
    });

    let msg;
    if (!novoRecorde) msg = `Sua melhor pontuação continua sendo ${melhor.pontos} pontos (${posicao}º lugar).`;
    else if (posicao === 1) msg = '🥇 Você é o NOVO 1º LUGAR do ranking!';
    else if (posicao <= CONFIG.TAMANHO_RANKING) msg = `🏆 Você entrou no top ${CONFIG.TAMANHO_RANKING} em ${posicao}º lugar!`;
    else msg = `Você ficou em ${posicao}º. Tente de novo para entrar no top ${CONFIG.TAMANHO_RANKING}!`;
    $('#final-msg').textContent = msg;

    mostrar('final');
    SOM.vitoria();
    chuva(posicao <= 3 && novoRecorde ? 300 : 150);
  }

  function contarAte(alvo, valor) {
    const dur = 1200;
    const ini = performance.now();
    const passo = (agora) => {
      const t = Math.min(1, (agora - ini) / dur);
      alvo.textContent = Math.round(valor * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  $('#btn-proximo-jogador').addEventListener('click', () => {
    inputNome.value = '';
    mostrar('inicio');
  });

  /* ---------- ranking ---------- */
  const comparar = (a, b) => b.pontos - a.pontos || a.tempoMs - b.tempoMs || a.data - b.data;
  const lerRanking = () => {
    const lista = lerLS(CONFIG.CHAVE_RANKING, []);
    return Array.isArray(lista) ? lista : [];
  };

  function salvarNoRanking(entrada) {
    const lista = lerRanking();
    const k = normalizarNome(entrada.nome);
    const i = lista.findIndex((x) => normalizarNome(x.nome) === k);
    let novoRecorde = true;
    if (i === -1) lista.push(entrada);
    else if (comparar(entrada, lista[i]) < 0) lista[i] = entrada;
    else novoRecorde = false;
    lista.sort(comparar);
    gravarLS(CONFIG.CHAVE_RANKING, lista.slice(0, 200));
    const posicao = lista.findIndex((x) => normalizarNome(x.nome) === k) + 1;
    return { posicao, novoRecorde, melhor: lista[posicao - 1] };
  }

  function renderRanking() {
    const ol = $('#lista-ranking');
    ol.replaceChildren();
    const lista = lerRanking().sort(comparar).slice(0, CONFIG.TAMANHO_RANKING);
    if (!lista.length) {
      const li = el('li');
      li.append(el('span', 'vazio', 'Ninguém jogou ainda. Seja o primeiro! 🚀'));
      li.style.display = 'block';
      ol.append(li);
      return;
    }
    const medalhas = ['🥇', '🥈', '🥉'];
    const eu = S.nome ? normalizarNome(S.nome) : null;
    lista.forEach((e, i) => {
      const li = el('li', i < 3 ? `top${i + 1}` : '');
      if (eu && normalizarNome(e.nome) === eu) li.classList.add('eu');
      const meio = el('div');
      meio.append(
        el('div', 'nome', e.nome),
        el('span', 'detalhe', `${e.acertos}/${e.total} achadas · ${e.precisao}% precisão · ${formatarTempo(e.tempoMs)}`)
      );
      li.append(el('span', 'posicao', medalhas[i] || `${i + 1}º`), meio, el('span', 'pts', String(e.pontos)));
      ol.append(li);
    });
  }

  $('#btn-zerar').addEventListener('click', () => {
    if (!confirm('Apagar TODO o ranking deste navegador? Isso não pode ser desfeito.')) return;
    gravarLS(CONFIG.CHAVE_RANKING, []);
    renderRanking();
    toast('Ranking zerado.');
  });

  /* ---------- aviso ao fechar no meio do jogo ---------- */
  window.addEventListener('beforeunload', (e) => {
    if ($('#tela-jogo').classList.contains('ativa')) { e.preventDefault(); e.returnValue = ''; }
  });

  inputNome.focus();
})();
