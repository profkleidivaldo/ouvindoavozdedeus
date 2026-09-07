// =====================================================================
// Integração com A Bíblia Digital (abibliadigital.com.br) — API gratuita,
// em português, somente leitura. Usada para mostrar o texto NVI de uma
// referência em popup quando o usuário clica nela dentro do estudo.
//
// Nenhum texto bíblico é embutido no código: tudo vem ao vivo da API.
// Só a versão NVI é usada (por pedido explícito), o que também simplifica
// a interface (sem seletor de versão).
// =====================================================================

const BIBLIA_API_BASE = "https://www.abibliadigital.com.br/api";
const BIBLIA_VERSAO = "nvi";
const BIBLIA_TIMEOUT_MS = 8000;

function normalizarTexto(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// nomes completos (normalizados, sem espaço/acento) -> abreviação da API
const LIVROS_POR_NOME = {
  genesis: "gn", exodo: "ex", levitico: "lv", numeros: "nm", deuteronomio: "dt",
  josue: "js", juizes: "jz", rute: "rt", "1samuel": "1sm", "2samuel": "2sm",
  "1reis": "1rs", "2reis": "2rs", "1cronicas": "1cr", "2cronicas": "2cr",
  esdras: "ed", neemias: "ne", ester: "et",
  salmo: "sl", salmos: "sl", proverbios: "pv", eclesiastes: "ec", cantares: "ct",
  isaias: "is", jeremias: "jr", lamentacoes: "lm", ezequiel: "ez", daniel: "dn",
  oseias: "os", joel: "jl", amos: "am", obadias: "ob", jonas: "jn",
  miqueias: "mq", naum: "na", habacuque: "hc", sofonias: "sf", ageu: "ag",
  zacarias: "zc", malaquias: "ml",
  mateus: "mt", marcos: "mc", lucas: "lc", joao: "jo", atos: "at",
  romanos: "rm", "1corintios": "1co", "2corintios": "2co", galatas: "gl",
  efesios: "ef", filipenses: "fp", colossenses: "cl",
  "1tessalonicenses": "1ts", "2tessalonicenses": "2ts",
  "1timoteo": "1tm", "2timoteo": "2tm", tito: "tt", filemom: "fm",
  hebreus: "hb", tiago: "tg", "1pedro": "1pe", "2pedro": "2pe",
  "1joao": "1jo", "2joao": "2jo", "3joao": "3jo", judas: "jd", apocalipse: "ap",
};

// abreviações já usadas diretamente nos dados (ex.: "Hb 9:6", "Êx 40:22")
// também resolvem, mapeando para si mesmas.
const ABREVIACOES_DIRETAS = [
  "gn","ex","lv","nm","dt","js","jz","rt","1sm","2sm","1rs","2rs","1cr","2cr",
  "ed","ne","et","job","sl","pv","ec","ct","is","jr","lm","ez","dn","os","jl",
  "am","ob","jn","mq","na","hc","sf","ag","zc","ml","mt","mc","lc","jo","at",
  "rm","1co","2co","gl","ef","fp","cl","1ts","2ts","1tm","2tm","tt","fm","hb",
  "tg","1pe","2pe","1jo","2jo","3jo","jd","ap",
];
ABREVIACOES_DIRETAS.forEach((a) => { LIVROS_POR_NOME[a] = a; });

// "Jó" é um caso especial: sem acento normaliza para "jo", que colide com
// "João". Resolvido checando a grafia original antes de normalizar.
function resolverLivro(tokenOriginal) {
  const raw = tokenOriginal.trim();
  if (/^j[óo]$/i.test(raw) && /ó/i.test(raw)) return "job";
  const key = normalizarTexto(raw.replace(/\s+/g, ""));
  return LIVROS_POR_NOME[key] || null;
}

// Extrai uma lista de citações {original, abbrev, nomeLivro, capitulo, vIni, vFim}
// de uma string de referência como "Mateus 24:6, 7, 10; 2Timóteo 3:1-4".
// Referências sem nome de livro (ex.: "8:32" após "João 16:13;") herdam o
// livro da citação anterior na mesma string.
function parseReferencias(refString) {
  if (!refString) return [];
  const partes = refString.split(";").map((s) => s.trim()).filter(Boolean);
  const resultados = [];
  let livroAtual = null;
  let nomeAtual = null;

  for (const parte of partes) {
    const mLivro = parte.match(/^((?:[1-3]\s?)?[A-Za-zÀ-ÖØ-öø-ÿçÇ]+)\s+(\d+)(?::(.+))?$/);
    let capituloStr = null;
    let resto = null;

    if (mLivro) {
      const abbrev = resolverLivro(mLivro[1]);
      if (abbrev) {
        livroAtual = abbrev;
        nomeAtual = mLivro[1].trim();
        capituloStr = mLivro[2];
        resto = mLivro[3] || null;
      }
    }

    if (capituloStr === null) {
      if (!livroAtual) continue; // sem livro anterior para herdar: ignora esse trecho
      const mCont = parte.match(/^(\d+)(?::(.+))?$/);
      if (!mCont) continue;
      capituloStr = mCont[1];
      resto = mCont[2] || null;
    }

    const numeros = resto ? [...resto.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10)) : [];
    resultados.push({
      original: parte,
      abbrev: livroAtual,
      nomeLivro: nomeAtual,
      capitulo: parseInt(capituloStr, 10),
      vIni: numeros.length ? Math.min(...numeros) : null,
      vFim: numeros.length ? Math.max(...numeros) : null,
    });
  }
  return resultados;
}

// Link de emergência: se a API falhar por qualquer razão, o usuário ainda
// consegue chegar ao texto com um clique, via busca.
function linkBuscaAlternativa(citacao) {
  const termo = `${citacao.nomeLivro || citacao.abbrev} ${citacao.capitulo}${citacao.vIni ? ":" + citacao.vIni : ""} NVI bíblia`;
  return "https://www.google.com/search?q=" + encodeURIComponent(termo);
}

function fetchComTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// cache simples em memória: evita rebuscar o mesmo capítulo na mesma sessão
const _cacheBiblia = new Map();

async function buscarPassagem(citacao) {
  const chave = `${citacao.abbrev}:${citacao.capitulo}`;
  let dados = _cacheBiblia.get(chave);

  if (!dados) {
    const url = `${BIBLIA_API_BASE}/verses/${BIBLIA_VERSAO}/${citacao.abbrev}/${citacao.capitulo}`;
    let ultimoErro = null;
    // uma tentativa + uma nova tentativa automática, para lidar com falhas passageiras
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const resp = await fetchComTimeout(url, BIBLIA_TIMEOUT_MS);
        if (resp.status === 429) throw new Error("limite");
        if (!resp.ok) throw new Error("http" + resp.status);
        dados = await resp.json();
        break;
      } catch (err) {
        ultimoErro = err;
      }
    }
    if (!dados) {
      const motivo = ultimoErro && ultimoErro.message === "limite"
        ? "O limite de uso gratuito da API foi atingido por agora."
        : "Não foi possível contatar o serviço de texto bíblico agora.";
      const erro = new Error(motivo);
      erro.link = linkBuscaAlternativa(citacao);
      throw erro;
    }
    _cacheBiblia.set(chave, dados);
  }

  let versiculos = dados.verses || [];
  if (citacao.vIni) {
    versiculos = versiculos.filter((v) => v.number >= citacao.vIni && v.number <= (citacao.vFim || citacao.vIni));
  }
  return { nomeLivro: dados.book?.name || citacao.nomeLivro, versiculos };
}
