// =====================================================================
// Bíblia — Free Use Bible API / HelloAO
// Uma única versão em português: Bíblia Livre (porbr2018)
// =====================================================================

const BIBLIA_API_BASE = "https://bible.helloao.org/api";
const BIBLIA_VERSAO = "porbr2018";
const BIBLIA_VERSAO_NOME = "Bíblia Livre";

const LIVROS_POR_NOME = {
  genesis:"GEN", gn:"GEN", gênesis:"GEN",
  exodo:"EXO", ex:"EXO", êxodo:"EXO",
  levitico:"LEV", lv:"LEV", levítico:"LEV",
  numeros:"NUM", nm:"NUM", números:"NUM",
  deuteronomio:"DEU", dt:"DEU", deuteronômio:"DEU",
  josue:"JOS", js:"JOS", josué:"JOS",
  juizes:"JDG", jz:"JDG", juízes:"JDG",
  rute:"RUT", rt:"RUT",
  "1samuel":"1SA", "1sm":"1SA", "1sam":"1SA",
  "2samuel":"2SA", "2sm":"2SA", "2sam":"2SA",
  "1reis":"1KI", "1rs":"1KI", "2reis":"2KI", "2rs":"2KI",
  "1cronicas":"1CH", "1cr":"1CH", "1crônicas":"1CH",
  "2cronicas":"2CH", "2cr":"2CH", "2crônicas":"2CH",
  esdras:"EZR", ed:"EZR", neemias:"NEH", ne:"NEH", ester:"EST", et:"EST",
  jo:"JHN", jó:"JOB", job:"JOB",
  salmo:"PSA", salmos:"PSA", sl:"PSA",
  proverbios:"PRO", pv:"PRO", provérbios:"PRO",
  eclesiastes:"ECC", ec:"ECC", cantares:"SNG", ct:"SNG",
  isaias:"ISA", is:"ISA", isaías:"ISA", jeremias:"JER", jr:"JER", jeremias:"JER",
  lamentacoes:"LAM", lm:"LAM", lamentações:"LAM", ezequiel:"EZK", ez:"EZK", daniel:"DAN", dn:"DAN",
  oseias:"HOS", os:"HOS", joel:"JOL", jl:"JOL", amos:"AMO", am:"AMO", obadias:"OBA", ob:"OBA",
  jonas:"JON", jn:"JON", miqueias:"MIC", mq:"MIC", naum:"NAM", na:"NAM",
  habacuque:"HAB", hc:"HAB", sofonias:"ZEP", sf:"ZEP", ageu:"HAG", ag:"HAG",
  zacarias:"ZEC", zc:"ZEC", malaquias:"MAL", ml:"MAL",
  mateus:"MAT", mt:"MAT", marcos:"MRK", mc:"MRK", lucas:"LUK", lc:"LUK",
  joao:"JHN", joão:"JHN", atos:"ACT", at:"ACT", romanos:"ROM", rm:"ROM",
  "1corintios":"1CO", "1co":"1CO", "1coríntios":"1CO", "2corintios":"2CO", "2co":"2CO", "2coríntios":"2CO",
  galatas:"GAL", gl:"GAL", gálatas:"GAL", efesios:"EPH", ef:"EPH", efésios:"EPH",
  filipenses:"PHP", fp:"PHP", colossenses:"COL", cl:"COL",
  "1tessalonicenses":"1TH", "1ts":"1TH", "2tessalonicenses":"2TH", "2ts":"2TH",
  "1timoteo":"1TI", "1tm":"1TI", "1timóteo":"1TI", "2timoteo":"2TI", "2tm":"2TI", "2timóteo":"2TI",
  tito:"TIT", tt:"TIT", filemom:"PHM", fm:"PHM", hebreus:"HEB", hb:"HEB", tiago:"JAS", tg:"JAS",
  "1pedro":"1PE", "1pe":"1PE", "2pedro":"2PE", "2pe":"2PE",
  "1joao":"1JN", "1jo":"1JN", "1joão":"1JN", "2joao":"2JN", "2jo":"2JN", "2joão":"2JN",
  "3joao":"3JN", "3jo":"3JN", "3joão":"3JN", judas:"JUD", jd:"JUD", apocalipse:"REV", ap:"REV"
};

function normalizarTexto(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function resolverLivro(token) {
  const original = String(token || "").trim();
  const normalizado = normalizarTexto(original).replace(/\s+/g, "");
  // Jó e João colidem depois da remoção dos acentos.
  if (/^jó$/i.test(original) || /^job$/i.test(normalizado)) return "JOB";
  if (/^joão$/i.test(original) || normalizado === "joao") return "JHN";
  return LIVROS_POR_NOME[normalizado] || LIVROS_POR_NOME[original.toLowerCase()] || null;
}

function expandirVersiculos(resto) {
  if (!resto) return null;
  const alvo = new Set();
  for (const parte of String(resto).split(",")) {
    const item = parte.trim();
    if (!item) continue;
    const m = item.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]), b = Number(m[2]);
      for (let n = Math.min(a,b); n <= Math.max(a,b); n++) alvo.add(n);
    } else {
      const n = Number(item.match(/\d+/)?.[0]);
      if (Number.isFinite(n)) alvo.add(n);
    }
  }
  return alvo.size ? [...alvo].sort((a,b)=>a-b) : null;
}

// Aceita, por exemplo:
// Mateus 24:6, 7, 10
// Mateus 24:6-10
// João 16:13; 8:32
// 2Pedro 1:21
// Hb 9:6
function parseReferencias(refString) {
  if (!refString) return [];
  const partes = String(refString).split(";").map(s => s.trim()).filter(Boolean);
  const resultados = [];
  let livroAtual = null;
  let nomeAtual = null;

  for (const parte of partes) {
    let capitulo = null;
    let resto = null;
    const mLivro = parte.match(/^((?:[1-3]\s*)?[A-Za-zÀ-ÖØ-öø-ÿçÇ]+)\s*(\d+)(?::(.+))?$/);
    if (mLivro) {
      const livro = resolverLivro(mLivro[1]);
      if (livro) {
        livroAtual = livro;
        nomeAtual = mLivro[1].trim();
        capitulo = Number(mLivro[2]);
        resto = mLivro[3] || null;
      }
    }

    if (capitulo === null) {
      const mCont = parte.match(/^(\d+)(?::(.+))?$/);
      if (!livroAtual || !mCont) continue;
      capitulo = Number(mCont[1]);
      resto = mCont[2] || null;
    }

    resultados.push({
      original: parte,
      abbrev: livroAtual,
      nomeLivro: nomeAtual,
      capitulo,
      vIni: null,
      vFim: null,
      versiculosAlvo: expandirVersiculos(resto)
    });
  }
  return resultados;
}

const _cacheBiblia = new Map();

async function buscarPassagem(citacao) {
  const chave = `${BIBLIA_VERSAO}:${citacao.abbrev}:${citacao.capitulo}`;
  let dados = _cacheBiblia.get(chave);
  if (!dados) {
    const url = `${BIBLIA_API_BASE}/${BIBLIA_VERSAO}/${citacao.abbrev}/${citacao.capitulo}.simple.json`;
    const resp = await fetch(url, { method:"GET", cache:"force-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    dados = await resp.json();
    _cacheBiblia.set(chave, dados);
  }

  let versiculos = (dados?.chapter?.content || []).filter(v => v.type === "verse").map(v => ({
    number: Number(v.number),
    text: v.text || ""
  }));

  if (Array.isArray(citacao.versiculosAlvo) && citacao.versiculosAlvo.length) {
    const alvo = new Set(citacao.versiculosAlvo);
    versiculos = versiculos.filter(v => alvo.has(v.number));
  }

  return {
    nomeLivro: dados?.book?.commonName || dados?.book?.name || citacao.nomeLivro,
    versiculos
  };
}
