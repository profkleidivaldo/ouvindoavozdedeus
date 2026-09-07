// =====================================================================
// Bíblia Livre (BLIVRE) via Free Use Bible API / HelloAO
// Única versão usada no aplicativo. Não exige chave nem cadastro.
// =====================================================================

const BIBLIA_API_BASE = "https://bible.helloao.org/api";
const BIBLIA_VERSAO = "por_blj";
const BIBLIA_VERSAO_NOME = "Bíblia Livre (BLIVRE)";

function normalizarTexto(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const LIVROS_POR_NOME = {
  genesis:"GEN", gn:"GEN", exodo:"EXO", ex:"EXO", levitico:"LEV", lv:"LEV", numeros:"NUM", nm:"NUM", deuteronomio:"DEU", dt:"DEU",
  josue:"JOS", js:"JOS", juizes:"JDG", jz:"JDG", rute:"RUT", rt:"RUT", "1samuel":"1SA", "1sm":"1SA", "2samuel":"2SA", "2sm":"2SA",
  "1reis":"1KI", "1rs":"1KI", "2reis":"2KI", "2rs":"2KI", "1cronicas":"1CH", "1cr":"1CH", "2cronicas":"2CH", "2cr":"2CH",
  esdras:"EZR", ed:"EZR", neemias:"NEH", ne:"NEH", ester:"EST", et:"EST", job:"JOB", salmo:"PSA", salmos:"PSA", sl:"PSA",
  proverbios:"PRO", pv:"PRO", eclesiastes:"ECC", ec:"ECC", cantares:"SNG", ct:"SNG", isaias:"ISA", is:"ISA", jeremias:"JER", jr:"JER",
  lamentacoes:"LAM", lm:"LAM", ezequiel:"EZK", ez:"EZK", daniel:"DAN", dn:"DAN", oseias:"HOS", os:"HOS", joel:"JOL", jl:"JOL",
  amos:"AMO", am:"AMO", obadias:"OBA", ob:"OBA", jonas:"JON", jn:"JON", miqueias:"MIC", mq:"MIC", naum:"NAM", na:"NAM",
  habacuque:"HAB", hc:"HAB", sofonias:"ZEP", sf:"ZEP", ageu:"HAG", ag:"HAG", zacarias:"ZEC", zc:"ZEC", malaquias:"MAL", ml:"MAL",
  mateus:"MAT", mt:"MAT", marcos:"MRK", mc:"MRK", lucas:"LUK", lc:"LUK", joao:"JHN", jo:"JHN", atos:"ACT", at:"ACT",
  romanos:"ROM", rm:"ROM", "1corintios":"1CO", "1co":"1CO", "2corintios":"2CO", "2co":"2CO", galatas:"GAL", gl:"GAL", efesios:"EPH", ef:"EPH",
  filipenses:"PHP", fp:"PHP", colossenses:"COL", cl:"COL", "1tessalonicenses":"1TH", "1ts":"1TH", "2tessalonicenses":"2TH", "2ts":"2TH",
  "1timoteo":"1TI", "1tm":"1TI", "2timoteo":"2TI", "2tm":"2TI", tito:"TIT", tt:"TIT", filemom:"PHM", fm:"PHM", hebreus:"HEB", hb:"HEB",
  tiago:"JAS", tg:"JAS", "1pedro":"1PE", "1pe":"1PE", "2pedro":"2PE", "2pe":"2PE", "1joao":"1JN", "1jo":"1JN", "2joao":"2JN", "2jo":"2JN",
  "3joao":"3JN", "3jo":"3JN", judas:"JUD", jd:"JUD", apocalipse:"REV", ap:"REV"
};

function resolverLivro(token) {
  const original = String(token || "").trim();
  const key = normalizarTexto(original).replace(/\s+/g, "");
  if (key === "jo" && /^j[oó]$/i.test(original)) return "JOB";
  return LIVROS_POR_NOME[key] || null;
}

function parseListaVersiculos(resto) {
  if (!resto) return null;
  const alvo = new Set();
  resto.split(",").map(s => s.trim()).filter(Boolean).forEach(item => {
    const m = item.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!m) return;
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    for (let n = Math.min(a,b); n <= Math.max(a,b); n++) alvo.add(n);
  });
  return alvo.size ? alvo : null;
}

// Aceita referências como "João 3:16", "Mateus 24:6, 7, 10" e "Isaías 41:10-13; João 14:1-3".
function parseReferencias(refString) {
  if (!refString) return [];
  const partes = String(refString).split(";").map(s => s.trim()).filter(Boolean);
  const resultados = [];
  let livroAtual = null;
  let nomeAtual = null;

  for (const parte of partes) {
    const mLivro = parte.match(/^((?:[1-3]\s?)?[A-Za-zÀ-ÖØ-öø-ÿçÇ]+)\s*(\d+)(?::(.+))?$/);
    let capituloStr = null, resto = null;
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
      if (!livroAtual) continue;
      const mCont = parte.match(/^(\d+)(?::(.+))?$/);
      if (!mCont) continue;
      capituloStr = mCont[1];
      resto = mCont[2] || null;
    }
    const versiculosAlvo = parseListaVersiculos(resto);
    resultados.push({
      original: parte,
      abbrev: livroAtual,
      nomeLivro: nomeAtual,
      capitulo: Number(capituloStr),
      versiculosAlvo,
      vIni: versiculosAlvo ? Math.min(...versiculosAlvo) : null,
      vFim: versiculosAlvo ? Math.max(...versiculosAlvo) : null,
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
    const resp = await fetch(url, { cache: "force-cache" });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    dados = await resp.json();
    _cacheBiblia.set(chave, dados);
  }

  const content = dados?.chapter?.content || [];
  let versiculos = content
    .filter(v => v && v.type === "verse")
    .map(v => ({ number: Number(v.number), text: String(v.text || "").trim() }));

  if (citacao.versiculosAlvo) {
    versiculos = versiculos.filter(v => citacao.versiculosAlvo.has(v.number));
  }
  return {
    nomeLivro: dados?.book?.commonName || dados?.book?.name || citacao.nomeLivro,
    versiculos,
    fonte: BIBLIA_VERSAO_NOME
  };
}
