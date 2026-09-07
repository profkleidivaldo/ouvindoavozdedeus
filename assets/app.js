// =====================================================================
// Ouvindo a Voz de Deus — app estático (HTML/CSS/JS puro para GitHub Pages)
// Sem build, sem IA, sem imagens externas. Conteúdo dos estudos fiel ao
// material original — ver assets/data.js.
// =====================================================================

const LS_PROGRESSO = "ovd_progresso_v1";

const root = document.getElementById("app");

// ---------------------------------------------------------------------
// Persistência local
// ---------------------------------------------------------------------

function carregarProgresso() {
  try {
    const raw = localStorage.getItem(LS_PROGRESSO);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { respostas: {}, escolhas: {}, compromissos: {}, concluidos: {}, perfil: { nome: "" } };
}

function salvarProgresso(p) {
  try { localStorage.setItem(LS_PROGRESSO, JSON.stringify(p)); } catch (e) { console.error(e); }
}

let ESTADO = {
  progresso: carregarProgresso(),
  tela: "inicio",
  estudoId: null,
  fase: 0,
  dicaAberta: false,
};

function set(patch) {
  ESTADO = { ...ESTADO, ...patch };
  render();
}

// Navegação — função explícita para evitar falhas de clique/cache.
function abrirEstudo(id) {
  const estudo = ESTUDOS.find((e) => Number(e.id) === Number(id));
  if (!estudo) {
    console.error("Estudo não encontrado:", id);
    return;
  }
  ESTADO = { ...ESTADO, tela: "estudo", estudoId: estudo.id, fase: 0, dicaAberta: false };
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function atualizarProgresso(novo) {
  ESTADO.progresso = novo;
  salvarProgresso(novo);
  render();
}

// ---------------------------------------------------------------------
// Helpers de DOM
// ---------------------------------------------------------------------

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

const svgIcon = (path, size = 16) =>
  el("span", { html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block">${path}</svg>` });

const ICONS = {
  chevronRight: `<path d="M9 18l6-6-6-6"/>`,
  chevronLeft: `<path d="M15 18l-6-6 6-6"/>`,
  check: `<path d="M20 6L9 17l-5-5"/>`,
  lightbulb: `<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/>`,
  x: `<path d="M18 6L6 18"/><path d="M6 6l12 12"/>`,
  book: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>`,
  externalLink: `<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>`,
  refresh: `<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0020.49 15"/>`,
};

function icon(name, size) { return svgIcon(ICONS[name] || "", size); }

// ---------------------------------------------------------------------
// Ícones decorativos de cada estudo — desenhados em SVG, sem nenhuma
// requisição de rede. Escolhidos por palavras-chave do campo "imagem"
// de cada estudo (ver assets/data.js). Substitui a antiga busca de
// fotos externas, que falhava com frequência.
// ---------------------------------------------------------------------

const MOTIVOS = {
  livro: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>`,
  estrela: `<path d="M12 2l2.9 6.4 7.1.6-5.4 4.7 1.7 6.9L12 17l-6.3 3.6 1.7-6.9L2 9l7.1-.6z"/>`,
  chama: `<path d="M12 2c2 3-1 4-1 7a3 3 0 006 0c1.5 2 1 4-1 6a6 6 0 11-10-5c0-2 1.5-3 2-4 1 1 2 1 4-4z"/>`,
  cruz: `<path d="M12 3v18"/><path d="M6 9h12"/>`,
  ampulheta: `<path d="M6 2h12"/><path d="M6 22h12"/><path d="M6 2c0 6 6 6 6 10s-6 4-6 10"/><path d="M18 2c0 6-6 6-6 10s6 4 6 10"/>`,
  balanca: `<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7L2 14a3 3 0 006 0z"/><path d="M19 7l-3 7a3 3 0 006 0z"/>`,
  sol: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/>`,
  gota: `<path d="M12 2s7 8 7 13a7 7 0 11-14 0c0-5 7-13 7-13z"/>`,
  moeda: `<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 1.8-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5"/>`,
  pomba: `<path d="M4 12c2-4 6-5 9-3-1-2 0-4 2-5 0 2 0 3 1 4 2 1 3 3 2 5-1 3-4 4-7 3l-3 3-1-3c-2 0-3-2-3-4z"/>`,
  templo: `<path d="M3 21h18"/><path d="M5 21V10l7-6 7 6v11"/><path d="M9 21v-6h6v6"/>`,
  tabua: `<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/>`,
  arvore: `<path d="M12 22V13"/><path d="M12 13a5 5 0 100-10 5 5 0 000 10z"/><path d="M8 13a4 4 0 110-8"/><path d="M16 13a4 4 0 100-8"/>`,
  casa: `<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>`,
  maos: `<path d="M8 12V6a2 2 0 114 0v5"/><path d="M12 11V4a2 2 0 114 0v7"/><path d="M16 11a2 2 0 114 0v3a7 7 0 01-7 7h-1a7 7 0 01-6-3.5L4 14"/>`,
  olho: `<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>`,
};

const REGRAS_MOTIVO = [
  [/biblia-sagrada/, "livro"],
  [/criacao/, "sol"],
  [/origem-do-mal/, "chama"],
  [/plano-da-salvacao|salvacao-pela-graca/, "cruz"],
  [/fe-arrependimento/, "gota"],
  [/sinais-da-volta|volta-de-cristo/, "estrela"],
  [/milenio/, "ampulheta"],
  [/verdade-sobre-a-morte/, "ampulheta"],
  [/nova-terra/, "arvore"],
  [/santuario/, "templo"],
  [/o-juizo/, "balanca"],
  [/leis-na-biblia|a-lei-moral|mandamento-esquecido|sabado-para-domingo/, "tabua"],
  [/principios-de-saude/, "gota"],
  [/dom-de-profecia/, "olho"],
  [/o-dizimo|ofertar/, "moeda"],
  [/igreja-verdadeira/, "casa"],
  [/batismo/, "gota"],
  [/vida-crista|educacao-crista/, "livro"],
  [/vida-no-espirito/, "pomba"],
  [/ministerio-para-todos/, "maos"],
];

function motivoDoEstudo(estudo) {
  const slug = estudo.imagem || "";
  for (const [regex, nome] of REGRAS_MOTIVO) {
    if (regex.test(slug)) return nome;
  }
  return "livro";
}

function iconeEstudoEl(estudo) {
  const nome = motivoDoEstudo(estudo);
  const path = MOTIVOS[nome] || MOTIVOS.livro;
  return el("div", { class: "estudo-icone-wrap" },
    el("span", { class: "estudo-icone", html:
      `<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
    })
  );
}

// ---------------------------------------------------------------------
// Capas ilustradas — arte vetorial original (paisagem + símbolo do tema),
// gerada em SVG e embutida como imagem base64 (data URI). Não depende de
// nenhuma foto de terceiros (evita problemas de direitos autorais e de
// links quebrados) e reaproveita os mesmos ícones de MOTIVOS acima, então
// cada estudo ganha uma "capa" coerente com seu tema.
// ---------------------------------------------------------------------

const PALETAS_CAPA = {
  livro: ["#7E262C", "#B25A3A", "#F2CB4E"],
  estrela: ["#1B1330", "#3A1F3D", "#7E262C"],
  chama: ["#2A0E0E", "#5E1B22", "#C05A22"],
  cruz: ["#3A1016", "#9C3A3F", "#F2CB4E"],
  ampulheta: ["#0B3B2E", "#3A1F3D", "#7E262C"],
  balanca: ["#072921", "#5E1B22", "#9C3A3F"],
  sol: ["#9C3A3F", "#E3B23C", "#F6DFA0"],
  gota: ["#072921", "#0B3B2E", "#3F9C86"],
  moeda: ["#5E1B22", "#B98A2E", "#F2CB4E"],
  pomba: ["#5E1B22", "#B98A2E", "#FBF3E4"],
  templo: ["#3A1016", "#9C3A3F", "#D8B98A"],
  tabua: ["#072921", "#0B3B2E", "#9C3A3F"],
  arvore: ["#072921", "#0B3B2E", "#4B6B4F"],
  casa: ["#5E1B22", "#9C3A3F", "#E3B23C"],
  maos: ["#5E1B22", "#B98A2E", "#F2CB4E"],
  olho: ["#1B1330", "#5E1B22", "#E3B23C"],
};

const _cacheCapaSvg = new Map();

function montesSVG() {
  return `
    <path d="M0,190 L55,145 L105,178 L165,112 L225,172 L285,132 L335,176 L400,150 L400,240 L0,240 Z" fill="#000" opacity="0.28"/>
    <path d="M0,212 L75,178 L150,208 L220,168 L300,208 L400,182 L400,240 L0,240 Z" fill="#000" opacity="0.4"/>`;
}

function capaSVG(motivo) {
  if (_cacheCapaSvg.has(motivo)) return _cacheCapaSvg.get(motivo);
  const cores = PALETAS_CAPA[motivo] || PALETAS_CAPA.livro;
  const path = MOTIVOS[motivo] || MOTIVOS.livro;
  const uid = "g" + motivo;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240">
    <defs>
      <linearGradient id="sky-${uid}" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stop-color="${cores[0]}"/>
        <stop offset="0.55" stop-color="${cores[1]}"/>
        <stop offset="1" stop-color="${cores[2]}"/>
      </linearGradient>
      <radialGradient id="glow-${uid}" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#FFF7E0" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#FFF7E0" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="400" height="240" fill="url(#sky-${uid})"/>
    <circle cx="308" cy="58" r="80" fill="url(#glow-${uid})"/>
    <circle cx="308" cy="58" r="30" fill="#FFF7E0" opacity="0.85"/>
    ${montesSVG()}
    <circle cx="200" cy="112" r="62" fill="#FFFCF5" opacity="0.12"/>
    <g transform="translate(176,88) scale(2)" fill="none" stroke="#FFFCF5" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      ${path}
    </g>
  </svg>`;
  const b64 = "data:image/svg+xml;base64," + btoa(svg);
  _cacheCapaSvg.set(motivo, b64);
  return b64;
}

function capaEstudoUrl(estudo) {
  return capaSVG(motivoDoEstudo(estudo));
}

function capaThumbEl(estudo) {
  return el("div", { class: "estudo-capa-thumb", style: `background-image:url('${capaEstudoUrl(estudo)}')` });
}

function capaBannerEl(estudo) {
  return el("div", { class: "estudo-capa-banner", style: `background-image:url('${capaEstudoUrl(estudo)}')` });
}

// ---------------------------------------------------------------------
// Dica estática (sem IA) — apenas reforça a referência bíblica e incentiva
// a leitura pessoal. Não inventa conteúdo nem entrega respostas prontas.
// ---------------------------------------------------------------------

function textoDica(pergunta) {
  if (!pergunta) return "Vale reler a introdução com calma antes de seguir para a primeira pergunta.";
  return `Abra sua Bíblia em ${pergunta.ref || "a referência indicada"} e leia o texto com atenção — a resposta está ali. Escreva depois com suas próprias palavras o que você encontrar.`;
}

// ---------------------------------------------------------------------
// Perguntas de múltipla escolha — agora com feedback imediato de certo/
// errado (antes as opções eram só rótulos decorativos, sem nenhuma
// interação). Perguntas com uma única opção correta funcionam como
// múltipla-escolha única (ex.: Sim/Não); perguntas com mais de uma opção
// correta funcionam como "assinale todas que se aplicam".
// ---------------------------------------------------------------------

function indicesCorretos(opcoes) {
  return opcoes.map((o, i) => (o.correta ? i : null)).filter((i) => i !== null);
}

function toggleOpcao(estudoId, perguntaN, indice, unica) {
  const p = ESTADO.progresso;
  const chave = `${estudoId}-${perguntaN}`;
  const atuais = (p.escolhas && p.escolhas[chave]) || [];
  let novas;
  if (unica) {
    novas = atuais.includes(indice) ? [] : [indice];
  } else {
    novas = atuais.includes(indice) ? atuais.filter((i) => i !== indice) : [...atuais, indice];
  }
  atualizarProgresso({ ...p, escolhas: { ...(p.escolhas || {}), [chave]: novas } });
}

function opcoesEl(estudo, pergunta, chave) {
  const corretas = indicesCorretos(pergunta.opcoes);
  const unica = corretas.length <= 1;
  const p = ESTADO.progresso;
  const selecionadas = (p.escolhas && p.escolhas[chave]) || [];
  const respondida = selecionadas.length > 0;

  const wrap = el("div", { class: "opcoes-lista" });
  pergunta.opcoes.forEach((op, i) => {
    const selecionada = selecionadas.includes(i);
    let extraClasse = "";
    let marca = el("span", { class: "opcao-marca" + (unica ? " radio" : "") });
    if (respondida) {
      if (op.correta) {
        extraClasse = " opcao-correta";
        marca = el("span", { class: "opcao-marca opcao-marca-ok" }, icon("check", 12));
      } else if (selecionada) {
        extraClasse = " opcao-errada";
        marca = el("span", { class: "opcao-marca opcao-marca-erro" }, icon("x", 12));
      }
    } else if (selecionada) {
      extraClasse = " selecionada";
    }
    wrap.appendChild(el("button", {
      type: "button",
      class: "opcao-linha" + extraClasse,
      onclick: () => toggleOpcao(estudo.id, pergunta.n, i, unica),
    }, marca, el("span", { class: "opcao-texto" }, op.texto)));
  });

  if (respondida) {
    const acertouTudo = selecionadas.length === corretas.length && selecionadas.every((i) => corretas.includes(i));
    wrap.appendChild(el("div", { class: "opcoes-feedback" + (acertouTudo ? " ok" : " parcial") },
      icon(acertouTudo ? "check" : "lightbulb", 14),
      " " + (acertouTudo
        ? "Isso mesmo! É o que a passagem ensina."
        : "Veja a resposta certa destacada acima — vale reler o texto indicado.")
    ));
  }

  return wrap;
}

// ---------------------------------------------------------------------
// Popup de texto bíblico — usa parseReferencias/buscarPassagem de biblia.js
// ---------------------------------------------------------------------

let bibliaState = {
  aberto: false,
  carregando: false,
  erro: null,
  erroLink: null,
  refString: null,
  passagens: [],
};

function abrirReferencia(refString) {
  bibliaState = { aberto: true, carregando: true, erro: null, erroLink: null, refString, passagens: [] };
  render();
  carregarReferencia();
}

async function carregarReferencia() {
  const refString = bibliaState.refString;
  const citacoes = typeof parseReferencias === "function" ? parseReferencias(refString) : [];

  if (!citacoes.length) {
    bibliaState = { ...bibliaState, carregando: false,
      erro: "Não consegui identificar automaticamente essa referência.",
      erroLink: "https://www.google.com/search?q=" + encodeURIComponent(refString + " bíblia") };
    render();
    return;
  }

  try {
    const passagens = [];
    for (const citacao of citacoes) {
      const resultado = await buscarPassagem(citacao);
      passagens.push({ citacao, ...resultado });
    }
    if (bibliaState.refString !== refString) return; // usuário já trocou de referência
    bibliaState = { ...bibliaState, carregando: false, passagens };
  } catch (err) {
    if (bibliaState.refString !== refString) return;
    bibliaState = { ...bibliaState, carregando: false,
      erro: (err && err.message) || "Não foi possível buscar o texto agora.",
      erroLink: err && err.link ? err.link : "https://www.google.com/search?q=" + encodeURIComponent(refString + " bíblia") };
  }
  render();
}

function tentarNovamente() {
  bibliaState = { ...bibliaState, carregando: true, erro: null, erroLink: null };
  render();
  carregarReferencia();
}

function fecharBiblia() {
  bibliaState = { aberto: false, carregando: false, erro: null, erroLink: null, refString: null, passagens: [] };
  render();
}

function modalBiblia() {
  const overlay = el("div", { class: "sheet-overlay", onclick: (e) => { if (e.target === overlay) fecharBiblia(); } });
  const sheet = el("div", { class: "sheet biblia-sheet" });

  sheet.appendChild(el("div", { class: "sheet-head" },
    el("div", { class: "sheet-head-title" }, icon("book", 16), bibliaState.refString || "Texto bíblico"),
    el("button", { class: "sheet-close", onclick: fecharBiblia }, icon("x", 18))
  ));
  sheet.appendChild(el("div", { class: "biblia-versao-row" }, "Versão: João Ferreira de Almeida (edição histórica, domínio público)"));

  const bodyEl = el("div", { class: "sheet-body biblia-body" });
  if (bibliaState.carregando) {
    bodyEl.appendChild(el("div", { class: "biblia-loading" }, "Buscando o texto…"));
  } else if (bibliaState.erro) {
    bodyEl.appendChild(el("div", { class: "biblia-erro" },
      el("p", {}, bibliaState.erro),
      el("div", { class: "biblia-erro-acoes" },
        el("button", { class: "btn-secundario", onclick: tentarNovamente }, icon("refresh", 14), " Tentar de novo"),
        bibliaState.erroLink
          ? el("a", { class: "btn-ajuda", href: bibliaState.erroLink, target: "_blank", rel: "noopener" }, icon("externalLink", 14), " Abrir online")
          : null
      )
    ));
  } else if (!bibliaState.passagens.length) {
    bodyEl.appendChild(el("div", { class: "biblia-erro" }, "Nenhum versículo encontrado para essa referência."));
  } else {
    bibliaState.passagens.forEach((p) => {
      const versiculosAlvo = p.citacao.vIni ? new Set(
        Array.from({ length: (p.citacao.vFim || p.citacao.vIni) - p.citacao.vIni + 1 }, (_, i) => p.citacao.vIni + i)
      ) : null;
      bodyEl.appendChild(el("div", { class: "biblia-passagem" },
        el("div", { class: "biblia-passagem-titulo" }, `${p.nomeLivro} ${p.citacao.capitulo}`),
        ...p.versiculos.map((v) => el("p", { class: "biblia-versiculo" + (versiculosAlvo && versiculosAlvo.has(v.number) ? " destaque" : "") },
          el("sup", {}, String(v.number)),
          " " + v.text
        ))
      ));
    });
  }
  sheet.appendChild(bodyEl);
  sheet.appendChild(el("div", { class: "sheet-note" }, "Texto de João Ferreira de Almeida (domínio público), via bible-api.com."));

  overlay.appendChild(sheet);
  return overlay;
}

// ---------------------------------------------------------------------
// Telas
// ---------------------------------------------------------------------

function render() {
  if (!root) return;
  root.innerHTML = "";

  if (ESTADO.tela === "inicio") root.appendChild(telaInicial());
  if (ESTADO.tela === "estudo") root.appendChild(telaEstudo());

  if (bibliaState.aberto) root.appendChild(modalBiblia());
}

function telaInicial() {
  const p = ESTADO.progresso;
  const concluidos = Object.values(p.concluidos || {}).filter(Boolean).length;
  const wrap = el("div", { class: "home-wrap" });

  wrap.appendChild(el("div", { class: "home-header" },
    el("div", { class: "home-kicker" }, "um estudo, um passo de cada vez"),
    el("h1", { class: "home-title" }, "Ouvindo a Voz de Deus"),
    el("p", { class: "home-sub" }, "27 estudos bíblicos, no seu tempo.")
  ));

  const nomeInput = el("input", {
    value: p.perfil?.nome || "",
    placeholder: "Seu nome",
    oninput: (e) => atualizarProgresso({ ...p, perfil: { ...p.perfil, nome: e.target.value } }),
  });

  const progressRow = el("div", { class: "progress-row" },
    el("div", { class: "progress-track" }, el("div", { class: "progress-fill", style: `width:${Math.round((concluidos / ESTUDOS.length) * 100)}%` })),
    el("span", { class: "progress-label" }, `${concluidos}/${ESTUDOS.length} estudos`)
  );

  wrap.appendChild(el("div", { class: "profile-card" },
    el("label", {}, "Como podemos te chamar?"),
    nomeInput,
    progressRow
  ));

  const lista = el("div", {});
  ESTUDOS.forEach((e) => {
    const feito = !!p.concluidos?.[e.id];
    const item = el("button", { class: "estudo-item" + (feito ? " feito" : ""), type: "button", onclick: () => abrirEstudo(e.id) },
      el("div", { class: "estudo-capa-wrap" },
        capaThumbEl(e),
        el("span", { class: "estudo-badge" + (feito ? " feito" : "") }, feito ? icon("check", 12) : String(e.id))
      ),
      el("div", { style: "flex:1;min-width:0" },
        el("div", { class: "estudo-titulo" }, e.titulo),
        e.conteudoIncompleto ? el("div", { class: "estudo-flag" }, "conteúdo parcial — página de abertura ausente") : null
      ),
      el("span", { class: "estudo-chev" }, icon("chevronRight", 18))
    );
    lista.appendChild(item);
  });
  wrap.appendChild(lista);

  wrap.appendChild(el("p", { class: "home-footnote" },
    "O conteúdo dos estudos é reproduzido fielmente do material original."
  ));

  return wrap;
}

function telaEstudo() {
  const estudo = ESTUDOS.find((e) => e.id === ESTADO.estudoId);
  if (!estudo) { set({ tela: "inicio" }); return el("div"); }

  const totalPerguntas = estudo.perguntas.length;
  const faseRecap = totalPerguntas + 1;
  const faseCompromisso = totalPerguntas + 2;
  const fase = ESTADO.fase;

  const container = el("div", {});

  container.appendChild(el("div", { class: "estudo-banner" },
    el("div", { class: "estudo-banner-inner" },
      el("button", { class: "back-btn", onclick: () => set({ tela: "inicio", estudoId: null, fase: 0 }) }, icon("chevronLeft", 20)),
      el("div", {},
        el("div", { class: "estudo-kicker" }, `Estudo ${estudo.id}`),
        el("div", { class: "estudo-titulo-banner" }, estudo.titulo)
      )
    )
  ));

  const body = el("div", { class: "estudo-body" });
  body.appendChild(el("div", { class: "mini-progress" }, el("div", { class: "mini-progress-fill", style: `width:${(fase / faseCompromisso) * 100}%` })));

  if (estudo.conteudoIncompleto && fase === 0) {
    body.appendChild(el("div", { class: "aviso-incompleto" }, estudo.intro));
  }

  const p = ESTADO.progresso;
  const nome = p.perfil?.nome || "";

  if (fase === 0) {
    body.appendChild(capaBannerEl(estudo));
    if (!estudo.conteudoIncompleto) {
      body.appendChild(el("p", { class: "intro-text" }, estudo.intro));
    }
    body.appendChild(el("button", { class: "btn-primario", onclick: () => set({ fase: 1 }) },
      nome ? `Começar, ${nome.split(" ")[0]}` : "Começar este estudo"
    ));
  } else if (fase >= 1 && fase <= totalPerguntas) {
    const pergunta = estudo.perguntas[fase - 1];
    const chave = `${estudo.id}-${pergunta.n}`;

    body.appendChild(el("div", { class: "pergunta-cabeca" },
      el("span", { class: "pergunta-num" }, `${pergunta.n}.`),
      el("span", { class: "pergunta-texto" }, pergunta.texto)
    ));
    if (pergunta.ref) {
      body.appendChild(el("button", { class: "pergunta-ref pergunta-ref-btn", onclick: () => abrirReferencia(pergunta.ref) },
        icon("book", 13), " " + pergunta.ref
      ));
    }
    if (pergunta.extra) body.appendChild(el("div", { class: "pergunta-extra" }, pergunta.extra));
    if (pergunta.opcoes) {
      body.appendChild(opcoesEl(estudo, pergunta, chave));
    }

    if (!pergunta.opcoes) {
      const textarea = el("textarea", {
        class: "resposta", rows: "3",
        placeholder: "Escreva aqui o que você encontrou lendo o texto indicado…",
        oninput: (e) => {
          const novo = { ...p, respostas: { ...p.respostas, [chave]: e.target.value } };
          p.respostas = novo.respostas; // evita re-render a cada tecla
          salvarProgresso(novo);
          ESTADO.progresso = novo;
        },
        onblur: () => render(),
      });
      textarea.value = p.respostas?.[chave] || "";
      const respostaWrap = el("div", { class: "resposta-wrap" }, textarea);
      if ((p.respostas?.[chave] || "").trim().length > 0) {
        respostaWrap.appendChild(el("div", { class: "resposta-salva" }, icon("check", 12), " resposta salva"));
      }
      body.appendChild(respostaWrap);
    }

    if (ESTADO.dicaAberta) {
      body.appendChild(el("div", { class: "dica-box" }, icon("lightbulb", 15), " " + textoDica(pergunta)));
    }

    body.appendChild(el("div", { class: "acoes-linha" },
      el("button", { class: "btn-secundario", onclick: () => set({ fase: fase - 1, dicaAberta: false }) }, "Voltar"),
      el("button", { class: "btn-ajuda", onclick: () => set({ dicaAberta: !ESTADO.dicaAberta }) }, icon("lightbulb", 15), ESTADO.dicaAberta ? "Ocultar dica" : "Dica"),
      el("button", { class: "btn-primario empurra", style: "margin-top:0", onclick: () => set({ fase: fase + 1, dicaAberta: false }) },
        fase === totalPerguntas ? "Ir para a recapitulação" : "Próxima pergunta"
      )
    ));
  } else if (fase === faseRecap) {
    body.appendChild(el("h3", { class: "recap-titulo" }, "Recapitulação"));
    body.appendChild(el("p", { class: "recap-texto" }, estudo.recap));
    body.appendChild(el("div", { class: "acoes-linha" },
      el("button", { class: "btn-secundario", onclick: () => set({ fase: fase - 1 }) }, "Voltar"),
      el("button", { class: "btn-primario empurra", style: "margin-top:0", onclick: () => set({ fase: fase + 1 }) }, "Compromisso de fé")
    ));
  } else if (fase === faseCompromisso) {
    const marcados = p.compromissos?.[estudo.id] || estudo.compromisso.map(() => false);
    const box = el("div", { class: "compromisso-box" });
    estudo.compromisso.forEach((c, i) => {
      const item = el("label", { class: "compromisso-item", onclick: () => {
        const atual = [...(p.compromissos?.[estudo.id] || estudo.compromisso.map(() => false))];
        atual[i] = !atual[i];
        atualizarProgresso({ ...p, compromissos: { ...p.compromissos, [estudo.id]: atual } });
      }},
        el("span", { class: "check-quad" + (marcados[i] ? " marcado" : "") }, marcados[i] ? icon("check", 13) : ""),
        el("span", { class: "compromisso-texto" }, c)
      );
      box.appendChild(item);
    });

    const nomeField = el("input", { placeholder: "Nome", value: nome });
    const dataField = el("input", { type: "date", placeholder: "Data" });
    nomeField.addEventListener("input", (e) => { p.perfil = { ...p.perfil, nome: e.target.value }; });
    box.appendChild(el("div", { class: "linha-nome-data" }, nomeField, dataField));
    body.appendChild(el("h3", { class: "recap-titulo" }, "Compromisso de fé"));
    body.appendChild(box);

    body.appendChild(el("div", { class: "acoes-linha" },
      el("button", { class: "btn-secundario", onclick: () => set({ fase: fase - 1 }) }, "Voltar"),
      el("button", { class: "btn-primario verde empurra", style: "margin-top:0", onclick: () => {
        const novo = { ...p, concluidos: { ...p.concluidos, [estudo.id]: true }, perfil: { nome: nomeField.value } };
        atualizarProgresso(novo);
        set({ tela: "inicio", estudoId: null, fase: 0 });
      }}, "Concluir estudo", icon("check", 15))
    ));

    const proximo = ESTUDOS.find((e) => e.id === estudo.id + 1);
    if (proximo) {
      body.appendChild(el("div", { class: "next-banner" },
        el("div", { class: "next-banner-head" }, "Próximo estudo…"),
        el("div", { class: "next-banner-body" },
          el("div", { class: "next-banner-title" }, proximo.titulo),
          el("div", { class: "next-banner-text" }, (proximo.intro || "").split(". ").slice(0, 2).join(". ") + (proximo.conteudoIncompleto ? "" : "…"))
        )
      ));
    }
  }

  container.appendChild(body);
  return container;
}

// ---------------------------------------------------------------------
render();
