// =====================================================================
// Ouvindo a Voz de Deus — app estático (GitHub Pages)
// Sem build step, sem backend. Progresso salvo no localStorage do navegador.
// O "tutor" de dúvidas funciona OFFLINE por padrão (dicas locais baseadas
// só no texto do próprio estudo). Opcionalmente, quem quiser pode ligar
// sua própria chave da API da Anthropic (fica só no navegador da pessoa).
// =====================================================================

const STORAGE_KEY = "ovd_progresso_v1";
const API_KEY_STORAGE = "ovd_api_key_v1";

const app = document.getElementById("app");

// ---------------------------------------------------------------------
// Estado / persistência
// ---------------------------------------------------------------------
function estadoPadrao() {
  return {
    respostas: {},
    compromissos: {},
    concluidos: {},
    perfil: { nome: "" },
  };
}

function carregarProgresso() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...estadoPadrao(), ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Não foi possível ler o progresso salvo:", e);
  }
  return estadoPadrao();
}

function salvarProgresso(progresso) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progresso));
  } catch (e) {
    console.warn("Não foi possível salvar o progresso:", e);
  }
}

let progresso = carregarProgresso();

function atualizarProgresso(mudancas) {
  progresso = { ...progresso, ...mudancas };
  salvarProgresso(progresso);
}

// ---------------------------------------------------------------------
// Roteamento simples via hash (#/ , #/estudo/3)
// ---------------------------------------------------------------------
function rotaAtual() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const partes = hash.split("/").filter(Boolean);
  if (partes[0] === "estudo" && partes[1]) {
    return { tela: "estudo", id: parseInt(partes[1], 10) };
  }
  return { tela: "inicio" };
}

window.addEventListener("hashchange", renderizar);
window.addEventListener("DOMContentLoaded", renderizar);

function irPara(hash) {
  window.location.hash = hash;
}

// ---------------------------------------------------------------------
// Ícones (SVG inline, para não depender de bibliotecas externas)
// ---------------------------------------------------------------------
const icones = {
  chevronLeft: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
  chevronRight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  message: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`,
  sparkles: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 4.8L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.2L12 3z"></path><path d="M5 17l.8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8L5 17z"></path></svg>`,
  send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
  x: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  livro: `<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4.5A2.5 2.5 0 0 1 4.5 2H12v18H4.5A2.5 2.5 0 0 0 2 22.5v-18z"></path><path d="M22 4.5A2.5 2.5 0 0 0 19.5 2H12v18h7.5a2.5 2.5 0 0 1 2.5 2.5v-18z"></path></svg>`,
};

function el(html) {
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  return div.firstElementChild;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------------------------------------------------------------------
// Render principal
// ---------------------------------------------------------------------
function renderizar() {
  const rota = rotaAtual();
  app.className = "";
  app.innerHTML = "";
  if (rota.tela === "estudo") {
    const estudo = ESTUDOS.find((e) => e.id === rota.id);
    if (!estudo) {
      irPara("#/");
      return;
    }
    app.appendChild(renderTelaEstudo(estudo));
  } else {
    app.appendChild(renderTelaInicial());
  }
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

// ---------------------------------------------------------------------
// Tela inicial
// ---------------------------------------------------------------------
function renderTelaInicial() {
  const concluidos = Object.values(progresso.concluidos || {}).filter(Boolean).length;
  const pct = Math.round((concluidos / ESTUDOS.length) * 100);

  const wrap = el(`
    <div class="container-app">
      <header class="topo-app">
        <div class="friso"></div>
        <div class="topo-app-conteudo">
          <div class="topo-eyebrow">um estudo, um passo de cada vez</div>
          <h1 class="topo-titulo">Ouvindo a Voz de Deus</h1>
          <p class="topo-subtitulo">27 estudos bíblicos, no seu tempo, com apoio para tirar dúvidas.</p>
        </div>
      </header>
      <div class="container">
        <div class="painel" style="margin-bottom:20px;">
          <label class="campo-nome-rotulo">Como podemos te chamar?</label>
          <input type="text" class="campo-texto" id="campo-nome" placeholder="Seu nome" value="${escapeHtml(progresso.perfil?.nome || "")}" />
          <div style="margin-top:14px;">
            <div class="barra-progresso-wrap">
              <div class="barra-progresso"><div style="width:${pct}%"></div></div>
              <span class="barra-progresso-legenda">${concluidos}/${ESTUDOS.length} estudos</span>
            </div>
          </div>
        </div>
        <div class="lista-estudos" id="lista-estudos"></div>
        <p class="rodape-nota">
          O conteúdo dos estudos é reproduzido fielmente do material original. O tutor de apoio (ícone de balão) só usa esse mesmo texto para ajudar — nunca substitui a leitura da Bíblia.
        </p>
      </div>
    </div>
  `);

  wrap.querySelector("#campo-nome").addEventListener("input", (e) => {
    atualizarProgresso({ perfil: { ...progresso.perfil, nome: e.target.value } });
  });

  const lista = wrap.querySelector("#lista-estudos");
  ESTUDOS.forEach((estudo) => {
    const feito = !!progresso.concluidos?.[estudo.id];
    const item = el(`
      <button class="item-estudo ${feito ? "concluido" : ""}">
        <div class="selo-estudo">${feito ? icones.check : estudo.id}</div>
        <div style="flex:1; min-width:0;">
          <div class="item-estudo-titulo">${escapeHtml(estudo.titulo)}</div>
          ${estudo.conteudoIncompleto ? `<div class="item-estudo-aviso">conteúdo parcial — página de abertura ausente</div>` : ""}
        </div>
        <span class="seta">${icones.chevronRight}</span>
      </button>
    `);
    item.addEventListener("click", () => irPara(`#/estudo/${estudo.id}`));
    lista.appendChild(item);
  });

  return wrap;
}

// ---------------------------------------------------------------------
// Tela de um estudo (fases: 0 intro, 1..N perguntas, N+1 recap, N+2 compromisso)
// ---------------------------------------------------------------------
function renderTelaEstudo(estudo) {
  const totalPerguntas = estudo.perguntas.length;
  const faseRecap = totalPerguntas + 1;
  const faseCompromisso = totalPerguntas + 2;

  let fase = 0; // estado local desta view

  const raiz = el(`<div class="container-app"></div>`);

  function chaveResp(n) { return `${estudo.id}-${n}`; }

  function montarFaixa() {
    return el(`
      <header class="faixa-estudo">
        <div class="friso"></div>
        <div class="faixa-estudo-linha">
          <button class="botao-voltar" id="btn-voltar" aria-label="Voltar">${icones.chevronLeft}</button>
          <div>
            <div class="faixa-estudo-rotulo">ESTUDO ${estudo.id}</div>
            <div class="faixa-estudo-titulo">${escapeHtml(estudo.titulo)}</div>
          </div>
        </div>
      </header>
    `);
  }

  function montarImagem() {
    const nomeArquivo = `images/${estudo.imagem}.jpg`;
    const box = el(`
      <div class="imagem-estudo">
        <img src="${nomeArquivo}" alt="Ilustração do estudo: ${escapeHtml(estudo.titulo)}"
             onerror="this.style.display='none'; this.parentElement.classList.add('sem-imagem');" />
        <div class="marca-agua">${icones.livro}</div>
        <div class="curva-dourada"></div>
      </div>
    `);
    return box;
  }

  function corpo() {
    const container = el(`<div class="container"></div>`);

    container.appendChild(montarImagem());

    const trilha = el(`<div class="trilha"><div style="width:${(fase / faseCompromisso) * 100}%"></div></div>`);
    container.appendChild(trilha);

    if (estudo.conteudoIncompleto && fase === 0) {
      container.appendChild(el(`<div class="aviso-parcial">${escapeHtml(estudo.intro)}</div>`));
    }

    const painel = el(`<div class="painel"></div>`);
    container.appendChild(painel);

    // FASE 0 — introdução
    if (fase === 0) {
      if (!estudo.conteudoIncompleto) {
        painel.appendChild(el(`<p class="intro-estudo">${escapeHtml(estudo.intro)}</p>`));
      }
      const primeiroNome = (progresso.perfil?.nome || "").split(" ")[0];
      const botao = el(`<button class="botao-primario" style="margin-top:22px;">${primeiroNome ? `Começar, ${escapeHtml(primeiroNome)}` : "Começar este estudo"}</button>`);
      botao.addEventListener("click", () => { fase = 1; rerenderCorpo(); });
      painel.appendChild(botao);
    }

    // FASES 1..N — perguntas
    else if (fase >= 1 && fase <= totalPerguntas) {
      const pergunta = estudo.perguntas[fase - 1];
      painel.appendChild(el(`
        <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:10px;">
          <span class="pergunta-numero">${pergunta.n}.</span>
          <span class="pergunta-texto">${escapeHtml(pergunta.texto)}</span>
        </div>
      `));
      if (pergunta.ref) painel.appendChild(el(`<div class="pergunta-ref">${escapeHtml(pergunta.ref)}</div>`));
      if (pergunta.extra) painel.appendChild(el(`<div class="pergunta-extra">${escapeHtml(pergunta.extra)}</div>`));

      if (pergunta.opcoes) {
        const listaOp = el(`<div class="opcoes-lista"></div>`);
        pergunta.opcoes.forEach((op) => {
          listaOp.appendChild(el(`
            <label class="opcao-linha"><span class="opcao-caixa"></span>${escapeHtml(op)}</label>
          `));
        });
        painel.appendChild(listaOp);
      }

      const valorAtual = progresso.respostas?.[chaveResp(pergunta.n)] || "";
      const textarea = el(`<textarea class="campo-textarea" rows="3" placeholder="Escreva aqui o que você encontrou lendo o texto indicado…">${escapeHtml(valorAtual)}</textarea>`);
      textarea.addEventListener("input", (e) => {
        atualizarProgresso({ respostas: { ...progresso.respostas, [chaveResp(pergunta.n)]: e.target.value } });
      });
      painel.appendChild(textarea);

      const linhaBotoes = el(`<div class="linha-botoes"></div>`);
      const btnVoltarFase = el(`<button class="botao-secundario">Voltar</button>`);
      btnVoltarFase.addEventListener("click", () => { fase -= 1; rerenderCorpo(); });
      const btnAjuda = el(`<button class="botao-ajuda">${icones.message} Preciso de ajuda</button>`);
      btnAjuda.addEventListener("click", () => abrirChat(estudo, pergunta));
      const btnProxima = el(`<button class="botao-primario empurra-direita">${fase === totalPerguntas ? "Ir para a recapitulação" : "Próxima pergunta"}</button>`);
      btnProxima.addEventListener("click", () => { fase += 1; rerenderCorpo(); });

      linhaBotoes.append(btnVoltarFase, btnAjuda, btnProxima);
      painel.appendChild(linhaBotoes);
    }

    // FASE recapitulação
    else if (fase === faseRecap) {
      painel.appendChild(el(`<h3 class="serif" style="color:var(--verde-escuro); font-size:19px; margin-bottom:10px;">Recapitulação</h3>`));
      painel.appendChild(el(`<p class="recap-texto">${escapeHtml(estudo.recap)}</p>`));
      const linhaBotoes = el(`<div class="linha-botoes"></div>`);
      const btnVoltarFase = el(`<button class="botao-secundario">Voltar</button>`);
      btnVoltarFase.addEventListener("click", () => { fase -= 1; rerenderCorpo(); });
      const btnAjuda = el(`<button class="botao-ajuda">${icones.message} Preciso de ajuda</button>`);
      btnAjuda.addEventListener("click", () => abrirChat(estudo, null));
      const btnProxima = el(`<button class="botao-primario empurra-direita">Compromisso de fé</button>`);
      btnProxima.addEventListener("click", () => { fase += 1; rerenderCorpo(); });
      linhaBotoes.append(btnVoltarFase, btnAjuda, btnProxima);
      painel.appendChild(linhaBotoes);
    }

    // FASE compromisso de fé
    else if (fase === faseCompromisso) {
      painel.appendChild(el(`<h3 class="serif" style="color:var(--verde-escuro); font-size:19px; margin-bottom:14px;">Compromisso de fé</h3>`));
      const caixa = el(`<div class="caixa-compromisso"></div>`);
      const marcados = progresso.compromissos?.[estudo.id] || estudo.compromisso.map(() => false);

      estudo.compromisso.forEach((c, i) => {
        const linha = el(`
          <label class="linha-compromisso">
            <span class="check-compromisso ${marcados[i] ? "marcado" : ""}">${marcados[i] ? icones.check : ""}</span>
            <span class="texto-compromisso">${escapeHtml(c)}</span>
          </label>
        `);
        linha.addEventListener("click", () => {
          const atual = [...(progresso.compromissos?.[estudo.id] || estudo.compromisso.map(() => false))];
          atual[i] = !atual[i];
          atualizarProgresso({ compromissos: { ...progresso.compromissos, [estudo.id]: atual } });
          rerenderCorpo();
        });
        caixa.appendChild(linha);
      });

      const linhaDados = el(`
        <div class="linha-dados">
          <input type="text" class="campo-texto" id="input-nome-compromisso" placeholder="Nome" value="${escapeHtml(progresso.perfil?.nome || "")}" style="flex:2;" />
          <input type="date" class="campo-data" id="input-data-compromisso" style="flex:1;" />
        </div>
      `);
      caixa.appendChild(linhaDados);
      painel.appendChild(caixa);

      const linhaBotoes = el(`<div class="linha-botoes"></div>`);
      const btnVoltarFase = el(`<button class="botao-secundario">Voltar</button>`);
      btnVoltarFase.addEventListener("click", () => { fase -= 1; rerenderCorpo(); });
      const btnConcluir = el(`<button class="botao-primario botao-concluir empurra-direita">Concluir estudo ${icones.check}</button>`);
      btnConcluir.addEventListener("click", () => {
        const nome = raiz.querySelector("#input-nome-compromisso")?.value || progresso.perfil?.nome || "";
        atualizarProgresso({
          concluidos: { ...progresso.concluidos, [estudo.id]: true },
          perfil: { ...progresso.perfil, nome },
        });
        irPara("#/");
      });
      linhaBotoes.append(btnVoltarFase, btnConcluir);
      painel.appendChild(linhaBotoes);
    }

    return container;
  }

  let corpoAtual = corpo();
  raiz.appendChild(montarFaixa());
  raiz.appendChild(corpoAtual);

  function rerenderCorpo() {
    const novo = corpo();
    raiz.replaceChild(novo, corpoAtual);
    corpoAtual = novo;
    raiz.querySelector("#btn-voltar").addEventListener("click", () => irPara("#/"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  raiz.querySelector("#btn-voltar").addEventListener("click", () => irPara("#/"));

  return raiz;
}

// ---------------------------------------------------------------------
// "Tirar dúvida" — funciona OFFLINE por padrão (sem nenhuma chamada de
// rede), oferecendo uma dica gerada localmente a partir do próprio texto
// do estudo. Quem quiser ligar um tutor por IA pode informar sua própria
// chave da API da Anthropic (fica salva só no localStorage do navegador
// da pessoa — nunca é enviada para nenhum servidor além da própria API).
// ---------------------------------------------------------------------
function obterChaveApi() {
  try { return localStorage.getItem(API_KEY_STORAGE) || ""; } catch (e) { return ""; }
}
function salvarChaveApi(chave) {
  try {
    if (chave) localStorage.setItem(API_KEY_STORAGE, chave);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch (e) { /* ignore */ }
}

function dicaLocal(estudo, pergunta) {
  if (!pergunta) {
    return `Releia com calma a recapitulação de "${estudo.titulo}" e tente completar cada lacuna lembrando das perguntas anteriores. Se travar em alguma palavra, volte à pergunta correspondente e confira a referência bíblica outra vez — a resposta está lá.`;
  }
  const ref = pergunta.ref ? ` em ${pergunta.ref}` : "";
  return `Boa pergunta! Abra sua Bíblia${ref} e leia o texto com atenção — a resposta costuma aparecer de forma bem direta. Se ajudar, leia também um versículo antes e depois da referência, para entender o contexto. Não tem pressa: o importante é que você mesmo encontre a resposta lendo a Palavra.`;
}

async function perguntarTutorIA({ estudo, pergunta, mensagemUsuario, historico }) {
  const chave = obterChaveApi();
  if (!chave) return null; // sem chave configurada -> quem chamou usa a dica local

  const contexto = `
Você é um facilitador de estudo bíblico empático, acolhedor e respeitoso, guiando um estudante pelo material "Ouvindo a Voz de Deus".

REGRAS ABSOLUTAS:
1. Baseie-se ESTRITAMENTE no conteúdo do estudo abaixo. Não invente doutrinas, não cite versículos que não estejam listados aqui — em vez disso, incentive a pessoa a abrir a própria Bíblia na referência indicada.
2. Não altere nem reinterprete o conteúdo do estudo. Se a pergunta fugir do assunto deste estudo específico, gentilmente traga-a de volta ao tema.
3. Seja breve (2 a 5 frases), caloroso e encorajador. Nunca dê a resposta "certa" da lacuna a preencher — ajude o estudante a pensar e aponte de novo a referência bíblica.
4. Nunca corrija de forma seca; acolha a resposta do estudante com gentileza antes de esclarecer algo.

ESTUDO ATUAL: "${estudo.titulo}" (Estudo ${estudo.id})
Introdução: ${estudo.intro}
${pergunta ? `Pergunta em foco: "${pergunta.texto}" — referência: ${pergunta.ref || "—"}${pergunta.extra ? " — " + pergunta.extra : ""}` : ""}
Recapitulação do estudo: ${estudo.recap || "—"}
`.trim();

  const messages = [...(historico || []), { role: "user", content: mensagemUsuario }];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": chave,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: contexto,
      messages,
    }),
  });

  if (!response.ok) throw new Error(`Falha na API (${response.status})`);
  const data = await response.json();
  const texto = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  return texto || null;
}

function abrirChat(estudo, pergunta) {
  const historicoMsgs = [];

  const fundo = el(`
    <div class="chat-fundo">
      <div class="chat-janela">
        <div class="chat-cabecalho">
          <div class="chat-cabecalho-titulo">${icones.sparkles} Tirar uma dúvida</div>
          <button class="chat-fechar">${icones.x}</button>
        </div>
        <div class="chat-contexto">Baseado apenas no texto de <strong>${escapeHtml(estudo.titulo)}</strong>${pergunta ? ` · pergunta ${pergunta.n}` : ""}</div>
        <div class="chat-corpo" id="chat-corpo"></div>
        <div class="chat-rodape">
          <input type="text" class="chat-input" id="chat-input" placeholder="Escreva sua dúvida…" />
          <button class="chat-enviar" id="chat-enviar">${icones.send}</button>
        </div>
        <div class="chat-config" id="chat-config"></div>
      </div>
    </div>
  `);

  document.body.appendChild(fundo);
  fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
  fundo.querySelector(".chat-fechar").addEventListener("click", fechar);

  function fechar() { fundo.remove(); }

  const corpoChat = fundo.querySelector("#chat-corpo");
  const inputChat = fundo.querySelector("#chat-input");
  const btnEnviar = fundo.querySelector("#chat-enviar");
  const configChat = fundo.querySelector("#chat-config");

  function renderConfig() {
    const temChave = !!obterChaveApi();
    configChat.innerHTML = temChave
      ? `Tutor por IA ativado com sua chave da Anthropic. <button class="link" id="btn-remover-chave">Desligar</button>`
      : `Modo offline: dicas baseadas só no texto do estudo. <button class="link" id="btn-config-chave">Ligar tutor por IA com minha chave da Anthropic</button>`;
    const btnLigar = configChat.querySelector("#btn-config-chave");
    if (btnLigar) btnLigar.addEventListener("click", () => {
      const chave = prompt("Cole sua chave da API da Anthropic (fica salva só neste navegador, no seu aparelho):");
      if (chave) { salvarChaveApi(chave.trim()); renderConfig(); }
    });
    const btnRemover = configChat.querySelector("#btn-remover-chave");
    if (btnRemover) btnRemover.addEventListener("click", () => { salvarChaveApi(""); renderConfig(); });
  }
  renderConfig();

  function bolha(texto, autor) {
    const linha = el(`<div class="bolha-linha ${autor === "user" ? "usuario" : ""}"><div class="bolha ${autor === "user" ? "usuario" : "assistente"}"></div></div>`);
    linha.querySelector(".bolha").textContent = texto;
    corpoChat.appendChild(linha);
    corpoChat.scrollTop = corpoChat.scrollHeight;
    return linha;
  }

  function bolhaDigitando() {
    const linha = el(`<div class="bolha-linha"><div class="bolha assistente">digitando…</div></div>`);
    corpoChat.appendChild(linha);
    corpoChat.scrollTop = corpoChat.scrollHeight;
    return linha;
  }

  async function enviarMensagem(texto) {
    if (!texto.trim()) return;
    bolha(texto, "user");
    historicoMsgs.push({ role: "user", content: texto });
    inputChat.value = "";
    btnEnviar.disabled = true;
    const carregando = bolhaDigitando();
    try {
      let resposta = await perguntarTutorIA({ estudo, pergunta, mensagemUsuario: texto, historico: historicoMsgs.slice(0, -1) });
      if (!resposta) resposta = dicaLocal(estudo, pergunta);
      carregando.remove();
      bolha(resposta, "assistant");
      historicoMsgs.push({ role: "assistant", content: resposta });
    } catch (e) {
      carregando.remove();
      bolha("Não consegui falar com o tutor por IA agora, mas aqui vai uma dica: " + dicaLocal(estudo, pergunta), "assistant");
    } finally {
      btnEnviar.disabled = false;
    }
  }

  btnEnviar.addEventListener("click", () => enviarMensagem(inputChat.value));
  inputChat.addEventListener("keydown", (e) => { if (e.key === "Enter") enviarMensagem(inputChat.value); });

  // saudação inicial (sempre offline, instantânea)
  const primeiroNome = (progresso.perfil?.nome || "").split(" ")[0];
  bolha(
    `${primeiroNome ? `Oi, ${primeiroNome}! ` : "Oi! "}Estou aqui para ajudar com${pergunta ? " esta pergunta" : " esta parte"} do estudo "${estudo.titulo}". O que você gostaria de entender melhor?`,
    "assistant"
  );
  inputChat.focus();
}
