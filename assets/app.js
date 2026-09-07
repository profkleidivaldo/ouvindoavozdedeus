// =====================================================================
// Ouvindo a Voz de Deus — app estático (HTML/CSS/JS puro para GitHub Pages)
// Sem build, sem dependências além de fontes via CDN.
// Conteúdo dos estudos: ver assets/data.js (fiel ao material original).
// =====================================================================

const LS_PROGRESSO = "ovd_progresso_v1";

const root = document.getElementById("app");

function carregarProgresso() {
  try {
    const raw = localStorage.getItem(LS_PROGRESSO);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { respostas: {}, compromissos: {}, concluidos: {}, perfil: { nome: "" } };
}

function salvarProgresso(p) {
  try { localStorage.setItem(LS_PROGRESSO, JSON.stringify(p)); } catch (e) { console.error(e); }
}

let ESTADO = {
  progresso: carregarProgresso(),
  tela: "inicio",
  estudoId: null,
  fase: 0,
  chatAberto: false,
};

// ---------------------------------------------------------------------
// Helpers de texto/DOM
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
  message: `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>`,
  send: `<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>`,
  gear: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>`,
  x: `<path d="M18 6L6 18"/><path d="M6 6l12 12"/>`,
  book: `<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>`,
};

function icon(name, size) { return svgIcon(ICONS[name] || "", size); }

// ---------------------------------------------------------------------
// Camada de IA — chave protegida no Google Apps Script.
// A chave da Mistral nunca é enviada ao navegador nem gravada no GitHub.
// ---------------------------------------------------------------------

function montarSystemPrompt(estudo, pergunta, nome) {
  return `Você é um facilitador de estudo bíblico empático, acolhedor e respeitoso, guiando ${nome || "um estudante"} pelo material "Ouvindo a Voz de Deus".

REGRAS ABSOLUTAS:
1. Baseie-se ESTRITAMENTE no conteúdo do estudo abaixo. Não invente doutrinas e não cite referências que não estejam listadas no estudo.
2. Não substitua a leitura da Bíblia. Quando necessário, incentive o estudante a ler a referência indicada.
3. Não altere nem reinterprete o conteúdo do estudo. Se a pergunta fugir do tema, gentilmente traga-a de volta.
4. Seja breve, acolhedor e encorajador. Não entregue automaticamente a resposta de lacunas ou exercícios; ajude o estudante a pensar.

ESTUDO ATUAL: "${estudo.titulo}" (Estudo ${estudo.id})
Introdução: ${estudo.intro}
${pergunta ? `Pergunta em foco: "${pergunta.texto}" — referência: ${pergunta.ref || "—"}${pergunta.extra ? " — " + pergunta.extra : ""}` : ""}
Recapitulação: ${estudo.recap || "—"}`;
}

function dicaEstatica(pergunta) {
  if (!pergunta) return "Vale reler a introdução com calma e depois seguir para a primeira pergunta — cada resposta se apoia no texto bíblico indicado.";
  return `Abra sua Bíblia em ${pergunta.ref || "a referência indicada"} e leia o texto com atenção — a resposta está ali. Sem pressa: escreva com suas próprias palavras o que você encontrar.`;
}

async function perguntarIA({ estudo, pergunta, nome, historico, mensagem }) {
  const endpoint = typeof IA_APPS_SCRIPT_URL !== "undefined" ? IA_APPS_SCRIPT_URL.trim() : "";
  if (!endpoint || endpoint.includes("COLE_AQUI")) throw new Error("Endpoint do Apps Script não configurado");

  const messages = [
    { role: "system", content: montarSystemPrompt(estudo, pergunta, nome) },
    ...(historico || []).slice(-6),
    { role: "user", content: mensagem },
  ];

  // text/plain evita preflight OPTIONS em Apps Script. redirect: follow é importante
  // porque o ContentService pode redirecionar para script.googleusercontent.com.
  const resp = await fetch(endpoint, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) throw new Error("Falha no Apps Script (" + resp.status + ")");
  const data = await resp.json();
  if (!data.ok || !data.text) throw new Error(data.error || "Resposta vazia da IA");
  return data.text.trim();
}

// ---------------------------------------------------------------------
// Popup de texto bíblico (usa parseReferencias/buscarPassagem de biblia.js)
// ---------------------------------------------------------------------

let bibliaState = {
  aberto: false,
  carregando: false,
  erro: null,
  refString: null,
  versao: "porbr2018",
  passagens: [],
};

function abrirReferencia(refString) {
  bibliaState = { ...bibliaState, aberto: true, carregando: true, erro: null, refString, passagens: [] };
  render();
  carregarReferencia();
}

async function carregarReferencia() {
  const refString = bibliaState.refString;
  const citacoes = typeof parseReferencias === "function" ? parseReferencias(refString) : [];

  if (!citacoes.length) {
    bibliaState = { ...bibliaState, carregando: false, erro: "Não consegui identificar essa referência automaticamente. Abra sua Bíblia em " + refString + "." };
    render();
    return;
  }

  try {
    const passagens = [];
    for (const citacao of citacoes) {
      const resultado = await buscarPassagem(citacao, bibliaState.versao);
      passagens.push({ citacao, ...resultado });
    }
    // ignora resposta se o usuário já trocou de referência/versão nesse meio tempo
    if (bibliaState.refString !== refString) return;
    bibliaState = { ...bibliaState, carregando: false, passagens };
  } catch (err) {
    if (bibliaState.refString !== refString) return;
    bibliaState = { ...bibliaState, carregando: false, erro:
      "Não consegui buscar o texto agora (a API pode estar fora do ar, com CORS bloqueado, ou o limite de uso gratuito foi atingido). Abra sua Bíblia em " + refString + "." };
  }
  render();
}


function fecharBiblia() {
  bibliaState = { ...bibliaState, aberto: false, refString: null, passagens: [], erro: null };
  render();
}

function modalBiblia() {
  const overlay = el("div", { class: "chat-overlay", onclick: (e) => { if (e.target === overlay) fecharBiblia(); } });
  const sheet = el("div", { class: "chat-sheet biblia-sheet" });

  sheet.appendChild(el("div", { class: "chat-head" },
    el("div", { class: "chat-head-title" }, icon("book", 16), bibliaState.refString || "Texto bíblico"),
    el("button", { class: "chat-close", onclick: fecharBiblia }, icon("x", 18))
  ));

  const bodyEl = el("div", { class: "chat-body biblia-body" });
  if (bibliaState.carregando) {
    bodyEl.appendChild(el("div", { class: "biblia-loading" }, "Buscando o texto…"));
  } else if (bibliaState.erro) {
    bodyEl.appendChild(el("div", { class: "biblia-erro" }, bibliaState.erro));
  } else if (!bibliaState.passagens.length) {
    bodyEl.appendChild(el("div", { class: "biblia-erro" }, "Nenhum versículo encontrado para essa referência."));
  } else {
    bibliaState.passagens.forEach((p) => {
      const versiculosAlvo = p.citacao.versiculosAlvo || null;
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

  sheet.appendChild(el("div", { class: "chat-note" }, "Texto bíblico: Bíblia Livre (BLIVRE), disponibilizada pela Free Use Bible API. Única versão usada pelo estudo."));

  overlay.appendChild(sheet);
  return overlay;
}

// ---------------------------------------------------------------------
// Imagens ilustrativas — busca temática no Wikimedia Commons.
// As consultas são definidas por assunto bíblico para evitar imagens aleatórias.
// ---------------------------------------------------------------------

const CONSULTAS_IMAGENS_BIBLICAS = {
  1: ["Bible scripture ancient Bible manuscript", "open Bible scripture"],
  2: ["biblical creation Genesis creation nature", "Genesis creation biblical art"],
  3: ["Fall of Man Eden serpent Genesis", "Adam Eve Garden of Eden"],
  4: ["Jesus crucifixion cross salvation", "Christ cross biblical"],
  5: ["biblical repentance prayer confession", "Christian repentance Bible"],
  6: ["Second Coming Jesus clouds Revelation", "Jesus return biblical art"],
  7: ["Second Coming of Christ Jesus clouds", "Christ return biblical"],
  8: ["millennium Revelation 20 biblical", "Revelation millennium biblical art"],
  9: ["biblical resurrection death tomb", "Lazarus resurrection Bible"],
  10: ["new earth Revelation 21 biblical", "new Jerusalem Revelation 21"],
  11: ["salvation grace Jesus cross Bible", "grace Christian cross biblical"],
  12: ["ancient Israel sanctuary tabernacle Bible", "Moses tabernacle sanctuary biblical"],
  13: ["biblical judgment throne Revelation", "Daniel judgment heavenly court"],
  14: ["Moses Ten Commandments Bible tablets", "biblical law stone tablets"],
  15: ["Ten Commandments stone tablets Moses", "Moses law Sinai biblical"],
  16: ["Sabbath biblical seventh day creation", "Jesus Sabbath synagogue Bible"],
  17: ["Sabbath Sunday biblical seventh day", "Christian Sabbath biblical"],
  18: ["biblical health food fruits grains Daniel", "Daniel diet Bible"],
  19: ["biblical prophet scroll prophecy", "Isaiah prophet Bible scroll"],
  20: ["biblical tithe offering grain temple", "Abraham tithe Melchizedek Bible"],
  21: ["biblical offering worship temple", "widow offering Bible"],
  22: ["early Christian church Acts believers", "Jerusalem early church Bible"],
  23: ["Jesus baptism Jordan River baptism", "John the Baptist baptism Jesus"],
  24: ["Jesus teaching disciples Christian life Bible", "early Christians fellowship Bible"],
  25: ["Jesus teaching children Bible education", "biblical teaching children scripture"],
  26: ["Holy Spirit Pentecost Acts 2", "Pentecost Holy Spirit biblical"],
  27: ["apostles ministry serving church Bible", "Paul missionary ministry Bible"],
};

const _cacheImagens = new Map();

function limparHtmlImagem(v) { return String(v || "").replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(); }

async function buscarImagemEstudo(estudo) {
  const consultas = CONSULTAS_IMAGENS_BIBLICAS[estudo.id] || [estudo.titulo + " biblical Bible"];
  for (const consulta of consultas) {
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(consulta)}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1000&format=json&formatversion=2&origin=*`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const dados = await resp.json();
      const paginas = dados?.query?.pages || [];
      const termos = consulta.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      const candidatos = paginas.map(pg => {
        const info = pg.imageinfo?.[0];
        if (!info || !info.url || !/\.(jpe?g|png|webp)$/i.test(info.url)) return null;
        const meta = info.extmetadata || {};
        const texto = [pg.title, meta.ImageDescription?.value, meta.Categories?.value, meta.ObjectName?.value].map(limparHtmlImagem).join(" ").toLowerCase();
        let score = 0;
        termos.forEach(t => { if (texto.includes(t)) score += 2; });
        if (/painting|illustration|engraving|fresco|manuscript|biblical|bible/i.test(texto)) score += 3;
        if (/flag|map|logo|icon|diagram|chart|modern/i.test(texto)) score -= 5;
        return { info, score, titulo: pg.title || "" };
      }).filter(Boolean).sort((a,b) => b.score - a.score);
      if (!candidatos.length) continue;
      const escolhido = candidatos[0].info;
      const artista = limparHtmlImagem(escolhido.extmetadata?.Artist?.value) || "Autor não informado";
      const licenca = limparHtmlImagem(escolhido.extmetadata?.LicenseShortName?.value) || limparHtmlImagem(escolhido.extmetadata?.UsageTerms?.value) || "Ver licença";
      return { url: escolhido.thumburl || escolhido.url, credito: artista, licenca, paginaUrl: escolhido.descriptionurl };
    } catch (e) { /* tenta a próxima consulta */ }
  }
  return null;
}

function imagemEstudoEl(estudo) {
  let cache = _cacheImagens.get(estudo.id);
  if (!cache) {
    cache = { status: "loading" };
    _cacheImagens.set(estudo.id, cache);
    buscarImagemEstudo(estudo).then((res) => {
      _cacheImagens.set(estudo.id, res ? { status: "ok", ...res } : { status: "error" });
      if (ESTADO.tela === "estudo" && ESTADO.estudoId === estudo.id && ESTADO.fase === 0) render();
    });
  }
  if (cache.status === "ok") {
    const link = el("a", { href: cache.paginaUrl || "#", target: "_blank", rel: "noopener noreferrer" });
    link.appendChild(el("img", { class: "estudo-imagem", src: cache.url, alt: estudo.titulo, loading: "lazy" }));
    return el("div", { class: "estudo-imagem-wrap" }, link, el("div", { class: "estudo-imagem-credito" }, `Imagem bíblica · ${cache.credito} · ${cache.licenca} · Wikimedia Commons`));
  }
  if (cache.status === "loading") return el("div", { class: "estudo-imagem-wrap estudo-imagem-loading" }, "Buscando imagem bíblica relacionada ao tema…");
  return null;
}

// ---------------------------------------------------------------------
// Telas
// ---------------------------------------------------------------------

function render() {
  root.innerHTML = "";

  if (ESTADO.tela === "inicio") root.appendChild(telaInicial());
  if (ESTADO.tela === "estudo") root.appendChild(telaEstudo());

  if (ESTADO.chatAberto) root.appendChild(chatAjuda());
  if (bibliaState.aberto) root.appendChild(modalBiblia());
}


function telaInicial() {
  const p = ESTADO.progresso;
  const concluidos = Object.values(p.concluidos || {}).filter(Boolean).length;
  const wrap = el("div", { class: "home-wrap" });

  wrap.appendChild(el("div", { class: "home-header" },
    el("div", { class: "home-kicker" }, "um estudo, um passo de cada vez"),
    el("h1", { class: "home-title" }, "Ouvindo a Voz de Deus"),
    el("p", { class: "home-sub" }, "27 estudos bíblicos, no seu tempo, com apoio para tirar dúvidas.")
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
      el("button", { class: "btn-ajuda", onclick: () => set({ chatAberto: true }) }, icon("message", 15), "Preciso de ajuda"),
      el("button", { class: "btn-primario empurra", style: "margin-top:0", onclick: () => set({ fase: fase + 1 }) },
        fase === totalPerguntas ? "Ir para a recapitulação" : "Próxima pergunta"
      )
    ));
  } else if (fase === faseRecap) {
    body.appendChild(el("h3", { class: "recap-titulo" }, "Recapitulação"));
    body.appendChild(el("p", { class: "recap-texto" }, estudo.recap));
    body.appendChild(el("div", { class: "acoes-linha" },
      el("button", { class: "btn-secundario", onclick: () => set({ fase: fase - 1 }) }, "Voltar"),
      el("button", { class: "btn-ajuda", onclick: () => set({ chatAberto: true }) }, icon("message", 15), "Preciso de ajuda"),
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
// Chat de ajuda
// ---------------------------------------------------------------------

let chatHistorico = [];
let chatMensagens = [];
let chatCarregando = false;

function chatAjuda() {
  const estudo = ESTUDOS.find((e) => e.id === ESTADO.estudoId);
  const totalPerguntas = estudo.perguntas.length;
  const pergunta = ESTADO.fase >= 1 && ESTADO.fase <= totalPerguntas ? estudo.perguntas[ESTADO.fase - 1] : null;
  const nome = ESTADO.progresso.perfil?.nome || "";
  const iaOn = typeof IA_APPS_SCRIPT_URL !== "undefined" && IA_APPS_SCRIPT_URL && !IA_APPS_SCRIPT_URL.includes("COLE_AQUI");

  if (chatMensagens.length === 0) {
    chatMensagens = [{ role: "assistant", content: iaOn
      ? `Oi${nome ? ", " + nome.split(" ")[0] : ""}! Sobre o que você quer conversar nesta pergunta?`
      : dicaEstatica(pergunta) + "\n\n(O tutor de IA ainda não foi conectado ao Google Apps Script.)" }];
  }

  const overlay = el("div", { class: "chat-overlay", onclick: (e) => { if (e.target === overlay) fecharChat(); } });
  const sheet = el("div", { class: "chat-sheet" });

  sheet.appendChild(el("div", { class: "chat-head" },
    el("div", { class: "chat-head-title" }, icon("message", 16), "Tirar uma dúvida"),
    el("button", { class: "chat-close", onclick: fecharChat }, icon("x", 18))
  ));
  sheet.appendChild(el("div", { class: "chat-context" }, `Baseado apenas no texto de ${estudo.titulo}${pergunta ? ` · pergunta ${pergunta.n}` : ""}`));

  const bodyEl = el("div", { class: "chat-body" });
  chatMensagens.forEach((m) => {
    bodyEl.appendChild(el("div", { class: "msg-row " + m.role },
      el("div", { class: "msg-bubble " + m.role }, m.content)
    ));
  });
  if (chatCarregando) {
    bodyEl.appendChild(el("div", { class: "msg-row assistant" }, el("div", { class: "msg-bubble assistant" }, "digitando…")));
  }
  sheet.appendChild(bodyEl);

  const input = el("input", { placeholder: "Escreva sua dúvida…" });
  const sendBtn = el("button", { class: "chat-send" }, icon("send", 16));

  const enviar = async () => {
    const texto = input.value.trim();
    if (!texto || chatCarregando) return;
    chatMensagens.push({ role: "user", content: texto });
    input.value = "";
    chatCarregando = true;
    render();
    focarChatInput();
    try {
      let resp;
      if (iaOn) {
        resp = await perguntarIA({
          estudo, pergunta, nome,
          historico: chatMensagens.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          mensagem: texto,
        });
      } else {
        resp = dicaEstatica(pergunta);
      }
      chatMensagens.push({ role: "assistant", content: resp });
    } catch (err) {
      chatMensagens.push({ role: "assistant", content:
        "Não consegui falar com a IA agora (pode ser bloqueio de CORS do provedor, ou a chave/endpoint configurados). " +
        "Aqui vai uma dica sem IA: " + dicaEstatica(pergunta) });
    } finally {
      chatCarregando = false;
      render();
      focarChatInput();
    }
  };

  input.addEventListener("keydown", (e) => { if (e.key === "Enter") enviar(); });
  sendBtn.addEventListener("click", enviar);

  sheet.appendChild(el("div", { class: "chat-input-row" }, input, sendBtn));
  sheet.appendChild(el("div", { class: "chat-note" },
    iaOn ? "As respostas usam apenas o texto deste estudo." : "Modo sem IA: dicas estáticas baseadas no próprio texto do estudo."
  ));

  overlay.appendChild(sheet);
  setTimeout(() => { bodyEl.scrollTop = bodyEl.scrollHeight; focarChatInput(); }, 0);
  return overlay;

  function focarChatInput() {
    const i = document.querySelector(".chat-input-row input");
    if (i) i.focus();
  }
}

function fecharChat() {
  chatMensagens = [];
  chatHistorico = [];
  set({ chatAberto: false });
}

// ---------------------------------------------------------------------
render();
