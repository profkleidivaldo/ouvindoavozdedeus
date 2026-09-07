// =====================================================================
// Texto bíblico ao vivo, para o popup que abre quando o usuário toca numa
// referência dentro do estudo.
//
// Histórico: a versão anterior usava a API "A Bíblia Digital"
// (abibliadigital.com.br) com a versão NVI. Essa API passou a exigir uma
// chave de autenticação (Authorization: Bearer <token>) para funcionar,
// o que fazia o botão de referência falhar sempre para quem não tinha uma
// chave configurada — por isso ele "nunca funcionava".
//
// Trocamos para a bible-api.com, que não exige nenhuma chave e serve o
// texto de João Ferreira de Almeida (edição histórica, de domínio
// público — a própria API rotula essa tradução como "Public Domain").
// Por ser de domínio público, também é seguro mantê-la ao vivo e, se um
// dia a referência falhar, cair para um link de busca como saída de
// emergência.
// =====================================================================

const BIBLIA_API_BASE = "https://bible-api.com";
const BIBLIA_VERSAO = "almeida";
const BIBLIA_NOME_VERSAO = "João Ferreira de Almeida (edição histórica)";
const BIBLIA_TIMEOUT_MS = 8000;

function normalizarTexto(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// nomes completos em português (normalizados) -> nome do livro em inglês,
// que é o identificador aceito pela bible-api.com
const LIVROS_POR_NOME = {
  genesis: "genesis", exodo: "exodus", levitico: "leviticus", numeros: "numbers", deuteronomio: "deuteronomy",
  josue: "joshua", juizes: "judges", rute: "ruth", "1samuel": "1samuel", "2samuel": "2samuel",
  "1reis": "1kings", "2reis": "2kings", "1cronicas": "1chronicles", "2cronicas": "2chronicles",
  esdras: "ezra", neemias: "nehemiah", ester: "esther",
  salmo: "psalms", salmos: "psalms", proverbios: "proverbs", eclesiastes: "ecclesiastes", cantares: "songofsolomon",
  isaias: "isaiah", jeremias: "jeremiah", lamentacoes: "lamentations", ezequiel: "ezekiel", daniel: "daniel",
  oseias: "hosea", joel: "joel", amos: "amos", obadias: "obadiah", jonas: "jonah",
  miqueias: "micah", naum: "nahum", habacuque: "habakkuk", sofonias: "zephaniah", ageu: "haggai",
  zacarias: "zechariah", malaquias: "malachi",
  mateus: "matthew", marcos: "mark", lucas: "luke", joao: "john", atos: "acts",
  romanos: "romans", "1corintios": "1corinthians", "2corintios": "2corinthians", galatas: "galatians",
  efesios: "ephesians", filipenses: "philippians", colossenses: "colossians",
  "1tessalonicenses": "1thessalonians", "2tessalonicenses": "2thessalonians",
  "1timoteo": "1timothy", "2timoteo": "2timothy", tito: "titus", filemom: "philemon",
  hebreus: "hebrews", tiago: "james", "1pedro": "1peter", "2pedro": "2peter",
  "1joao": "1john", "2joao": "2john", "3joao": "3john", judas: "jude", apocalipse: "revelation",
};

// abreviações já usadas diretamente nos dados (ex.: "Hb 9:6", "Êx 40:22")
// também precisam resolver para o nome em inglês aceito pela API.
const ABREVIACOES_DIRETAS = {
  gn: "genesis", ex: "exodus", lv: "leviticus", nm: "numbers", dt: "deuteronomy",
  js: "joshua", jz: "judges", rt: "ruth", "1sm": "1samuel", "2sm": "2samuel",
  "1rs": "1kings", "2rs": "2kings", "1cr": "1chronicles", "2cr": "2chronicles",
  ed: "ezra", ne: "nehemiah", et: "esther", job: "job", sl: "psalms", pv: "proverbs",
  ec: "ecclesiastes", ct: "songofsolomon", is: "isaiah", jr: "jeremiah", lm: "lamentations",
  ez: "ezekiel", dn: "daniel", os: "hosea", jl: "joel", am: "amos", ob: "obadiah",
  jn: "jonah", mq: "micah", na: "nahum", hc: "habakkuk", sf: "zephaniah", ag: "haggai",
  zc: "zechariah", ml: "malachi", mt: "matthew", mc: "mark", lc: "luke", jo: "john",
  at: "acts", rm: "romans", "1co": "1corinthians", "2co": "2corinthians", gl: "galatians",
  ef: "ephesians", fp: "philippians", cl: "colossians", "1ts": "1thessalonians",
  "2ts": "2thessalonians", "1tm": "1timothy", "2tm": "2timothy", tt: "titus", fm: "philemon",
  hb: "hebrews", tg: "james", "1pe": "1peter", "2pe": "2peter", "1jo": "1john",
  "2jo": "2john", "3jo": "3john", jd: "jude", ap: "revelation",
};
Object.entries(ABREVIACOES_DIRETAS).forEach(([abbrev, ingles]) => { LIVROS_POR_NOME[abbrev] = ingles; });

// "Jó" é um caso especial: sem acento normaliza para "jo", que colide com
// "João". Resolvido checando a grafia original antes de normalizar.
function resolverLivro(tokenOriginal) {
  const raw = tokenOriginal.trim();
  if (/^j[óo]$/i.test(raw) && /ó/i.test(raw)) return "job";
  const key = normalizarTexto(raw.replace(/\s+/g, ""));
  return LIVROS_POR_NOME[key] || null;
}

// Extrai uma lista de citações {original, ingles, nomeLivro, capitulo, vIni, vFim}
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
      const ingles = resolverLivro(mLivro[1]);
      if (ingles) {
        livroAtual = ingles;
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
      ingles: livroAtual,
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
  const termo = `${citacao.nomeLivro || citacao.ingles} ${citacao.capitulo}${citacao.vIni ? ":" + citacao.vIni : ""} bíblia`;
  return "https://www.google.com/search?q=" + encodeURIComponent(termo);
}

function fetchComTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// cache simples em memória: evita rebuscar a mesma passagem na mesma sessão
const _cacheBiblia = new Map();

async function buscarPassagem(citacao) {
  const rangeStr = citacao.vIni
    ? `:${citacao.vIni}${citacao.vFim && citacao.vFim !== citacao.vIni ? "-" + citacao.vFim : ""}`
    : "";
  const chave = `${citacao.ingles}:${citacao.capitulo}${rangeStr}`;
  let dados = _cacheBiblia.get(chave);

  if (!dados) {
    const query = `${citacao.ingles} ${citacao.capitulo}${rangeStr}`;
    const url = `${BIBLIA_API_BASE}/${encodeURIComponent(query)}?translation=${BIBLIA_VERSAO}`;
    let ultimoErro = null;
    // uma tentativa + uma nova tentativa automática, para lidar com falhas passageiras
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const resp = await fetchComTimeout(url, BIBLIA_TIMEOUT_MS);
        if (resp.status === 429) throw new Error("limite");
        if (!resp.ok) throw new Error("http" + resp.status);
        const json = await resp.json();
        if (json.error) throw new Error(json.error);
        dados = json;
        break;
      } catch (err) {
        ultimoErro = err;
      }
    }
    if (!dados) {
      const motivo = ultimoErro && ultimoErro.message === "limite"
        ? "O serviço de texto bíblico está temporariamente sobrecarregado."
        : "Não foi possível contatar o serviço de texto bíblico agora.";
      const erro = new Error(motivo);
      erro.link = linkBuscaAlternativa(citacao);
      throw erro;
    }
    _cacheBiblia.set(chave, dados);
  }

  const versiculos = (dados.verses || []).map((v) => ({
    number: v.verse,
    text: (v.text || "").replace(/\s+/g, " ").trim(),
  }));
  return { nomeLivro: citacao.nomeLivro || dados.verses?.[0]?.book_name, versiculos };
}
