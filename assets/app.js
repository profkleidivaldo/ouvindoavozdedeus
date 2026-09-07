// =====================================================================
// Ouvindo a Voz de Deus — Estudo Bíblico
// Versão estática para GitHub Pages: sem IA, sem chave e sem servidor.
// Conteúdo dos estudos: assets/data.js
// =====================================================================

const LS_PROGRESSO = "ovd_progresso_v1";
const root = document.getElementById("app");

function carregarProgresso() {
  try {
    const raw = localStorage.getItem(LS_PROGRESSO);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { respostas: {}, compromissos: {}, concluidos: {}, perfil: { nome: "" } };
}

function salvarProgresso(p) {
  try { localStorage.setItem(LS_PROGRESSO, JSON.stringify(p)); } catch (e) {}
}

let ESTADO = {
  progresso: carregarProgresso(),
  tela: "inicio",
  estudoId: null,
  fase: 0,
};

function set(patch) {
  ESTADO = { ...ESTADO, ...patch };
  render();
}

function abrirEstudo(id) {
  const estudo = ESTUDOS.find((e) => Number(e.id) === Number(id));
  if (!estudo) return;
  ESTADO = { ...ESTADO, tela: "estudo", estudoId: estudo.id, fase: 0 };
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function atualizarProgresso(novo, redesenhar = true) {
  ESTADO.progresso = novo;
  salvarProgresso(novo);
  if (redesenhar) render();
}

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
  x: `<path d="M18 6L6 18"/><path d="M6 6l12 12"/>`,
  book: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>`,
};
function icon(name, size) { return svgIcon(ICONS[name] || "", size); }

// =====================================================================
// Bíblia — uma única versão em português
// Free Use Bible API / HelloAO — Bíblia Livre (porbr2018)
// =====================================================================

let bibliaState = { aberto:false, carregando:false, erro:null, refString:null, passagens:[] };

function abrirReferencia(refString) {
  bibliaState = { ...bibliaState, aberto:true, carregando:true, erro:null, refString, passagens:[] };
  render();
  carregarReferencia();
}

async function carregarReferencia() {
  const refString = bibliaState.refString;
  const citacoes = typeof parseReferencias === "function" ? parseReferencias(refString) : [];
  if (!citacoes.length) {
    bibliaState = { ...bibliaState, carregando:false, erro:`Não consegui identificar a referência: ${refString}` };
    render();
    return;
  }
  try {
    const passagens = [];
    for (const citacao of citacoes) {
      const resultado = await buscarPassagem(citacao);
      passagens.push({ citacao, ...resultado });
    }
    if (bibliaState.refString !== refString) return;
    bibliaState = { ...bibliaState, carregando:false, erro:null, passagens };
  } catch (err) {
    if (bibliaState.refString !== refString) return;
    bibliaState = { ...bibliaState, carregando:false, erro:`Não foi possível carregar ${refString}. Verifique sua conexão e tente novamente.` };
  }
  render();
}

function fecharBiblia() {
  bibliaState = { ...bibliaState, aberto:false, refString:null, passagens:[], erro:null };
  render();
}

function modalBiblia() {
  const overlay = el("div", { class:"chat-overlay", onclick:(e)=>{ if(e.target===overlay) fecharBiblia(); } });
  const sheet = el("div", { class:"chat-sheet biblia-sheet" });
  sheet.appendChild(el("div", { class:"chat-head" },
    el("div", { class:"chat-head-title" }, icon("book",16), bibliaState.refString || "Texto bíblico"),
    el("button", { class:"chat-close", onclick:fecharBiblia }, icon("x",18))
  ));
  sheet.appendChild(el("div", { class:"biblia-versao-row" },
    el("span", { class:"biblia-versao-fixa" }, `Versão: ${BIBLIA_VERSAO_NOME}`)
  ));
  const body = el("div", { class:"chat-body biblia-body" });
  if (bibliaState.carregando) {
    body.appendChild(el("div", { class:"biblia-loading" }, "Buscando o texto bíblico…"));
  } else if (bibliaState.erro) {
    body.appendChild(el("div", { class:"biblia-erro" }, bibliaState.erro));
  } else if (!bibliaState.passagens.length) {
    body.appendChild(el("div", { class:"biblia-erro" }, "Nenhum versículo encontrado."));
  } else {
    bibliaState.passagens.forEach((p) => {
      const alvo = p.citacao.vIni ? new Set(
        p.citacao.versiculosAlvo || Array.from({ length:(p.citacao.vFim || p.citacao.vIni)-p.citacao.vIni+1 }, (_,i)=>p.citacao.vIni+i)
      ) : null;
      body.appendChild(el("div", { class:"biblia-passagem" },
        el("div", { class:"biblia-passagem-titulo" }, `${p.nomeLivro} ${p.citacao.capitulo}`),
        ...p.versiculos.map((v)=>el("p", { class:"biblia-versiculo" + (alvo && alvo.has(v.number) ? " destaque" : "") },
          el("sup", {}, String(v.number)), " " + v.text
        ))
      ));
    });
  }
  sheet.appendChild(body);
  sheet.appendChild(el("div", { class:"chat-note" }, "Texto fornecido pela Free Use Bible API / HelloAO."));
  overlay.appendChild(sheet);
  return overlay;
}

// =====================================================================
// Imagens locais — sem API externa e sem problemas de CORS/hotlink.
// =====================================================================

const _cacheImagens = new Map();
function imagemEstudoEl(estudo) {
  const nome = estudo.imagem || `estudo-${String(estudo.id).padStart(2,"0")}`;
  const src = `assets/images/${nome}.svg`;
  const wrap = el("div", { class:"estudo-imagem-wrap" });
  const img = el("img", { class:"estudo-imagem", src, alt:estudo.titulo, loading:"eager" });
  img.addEventListener("error", () => {
    wrap.classList.add("estudo-imagem-falha");
    wrap.replaceChildren(el("div", { class:"imagem-fallback" }, el("div", { class:"imagem-fallback-titulo" }, estudo.titulo), el("div", { class:"imagem-fallback-sub" }, "Ouvindo a Voz de Deus")));
  });
  wrap.appendChild(img);
  wrap.appendChild(el("div", { class:"estudo-imagem-credito" }, "Ilustração do estudo"));
  return wrap;
}

// =====================================================================
// Telas
// =====================================================================

function render() {
  root.innerHTML = "";
  if (ESTADO.tela === "inicio") root.appendChild(telaInicial());
  else if (ESTADO.tela === "estudo") root.appendChild(telaEstudo());
  if (bibliaState.aberto) root.appendChild(modalBiblia());
}

function telaInicial() {
  const p = ESTADO.progresso;
  const concluidos = Object.values(p.concluidos || {}).filter(Boolean).length;
  const wrap = el("div", { class: "home-wrap" });

  wrap.appendChild(el("div", { class: "home-header" },
    el("div", { class: "home-kicker" }, "um estudo, um passo de cada vez"),
    el("h1", { class: "home-title" }, "Ouvindo a Voz de Deus"),
    el("p", { class: "home-sub" }, "27 estudos bíblicos, no seu tempo, com as referências bíblicas integradas.")
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
    const item = el("button", { class: "estudo-item" + (feito ? " feito" : ""), onclick: () => set({ tela: "estudo", estudoId: e.id, fase: 0 }) },
      el("div", { class: "estudo-badge" + (feito ? " feito" : "") }, feito ? icon("check", 14) : String(e.id)),
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
    "O conteúdo dos estudos é reproduzido fielmente do material original. O tutor de apoio só usa esse mesmo texto para ajudar — nunca substitui a leitura da Bíblia."
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
    const imagemEl = imagemEstudoEl(estudo);
    if (imagemEl) body.appendChild(imagemEl);
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
      const lista = el("div", { class: "opcoes-lista" });
      pergunta.opcoes.forEach((op) => lista.appendChild(el("label", { class: "opcao-linha" }, el("span", { class: "opcao-marca" }), op)));
      body.appendChild(lista);
    }

    const textarea = el("textarea", {
      class: "resposta", rows: "3",
      placeholder: "Escreva aqui o que você encontrou lendo o texto indicado…",
      oninput: (e) => {
        const novo = { ...p, respostas: { ...p.respostas, [chave]: e.target.value } };
        p.respostas = novo.respostas; // evita re-render a cada tecla
        salvarProgresso(novo);
        ESTADO.progresso = novo;
      },
    });
    textarea.value = p.respostas?.[chave] || "";
    body.appendChild(textarea);

    body.appendChild(el("div", { class: "acoes-linha" },
      el("button", { class: "btn-secundario", onclick: () => set({ fase: fase - 1 }) }, "Voltar"),
      el("button", { class: "btn-primario empurra", style: "margin-top:0", onclick: () => set({ fase: fase + 1 }) },
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

render();
