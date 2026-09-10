// =====================================================================
// Texto bíblico ao vivo, para o popup que abre quando o usuário toca numa
// referência dentro do estudo.
//
// Esta é a versão por regex (sem bcv_parser), revisada para corrigir os
// casos que faziam algumas referências não funcionarem:
//
// 1) Abreviações com ponto (ex.: "Mt. 5:3", "1 Jo. 4:8") não casavam com
//    a regex antiga, que exigia as letras do livro seguidas direto de
//    espaço. Agora o ponto é aceito e ignorado entre o livro e o capítulo.
//
// 2) Listas/intervalos de versos ("6, 7, 10" ou "31-33,46") eram
//    colapsados para um único intervalo mín-máx (ex.: virava 6-10,
//    incluindo por engano os versos 8 e 9, que não foram citados). Agora
//    a especificação original é enviada quase intacta para a bible-api,
//    que já entende listas e intervalos separados por vírgula nativamente
//    (é o próprio formato de exemplo da documentação deles).
//
// 3) Pontuação sobrando no final da citação (parêntese, ponto final de
//    frase, vírgula) fazia a regex falhar por inteiro e a referência
//    inteira era descartada. Agora essas sobras são removidas antes do
//    parse.
//
// 4) Referência que cruza capítulos (ex.: "13:24-14:2") era misturada com
//    a extração ingênua de números e podia gerar um intervalo sem sentido
//    dentro de um único capítulo. Agora isso é detectado e tratado
//    buscando o capítulo inicial completo, com um aviso de que a citação
//    continua no próximo.
//
// 5) Citação de um livro sem capítulo/verso (rara, mas possível, ex. só
//    "Filemom") antes não casava com nenhuma regex e era descartada;
//    agora assume-se o capítulo 1 como melhor aproximação.
//
// 6) Travessão "–"/"—" (comum em texto tipografado) usado no lugar do
//    hífen comum agora é normalizado antes de montar a consulta, para
//    não depender de como a bible-api interpreta esse caractere.
//
// TEXTO DO VERSÍCULO: bible-api.com, que não exige chave/cadastro e
// serve a tradução de João Ferreira de Almeida (edição histórica),
// rotulada pela própria API como de domínio público.
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
// a abreviação de "João". Resolvido checando a grafia original antes de
// normalizar (só cai em "job" quando o acento está presente).
function resolverLivro(prefixo, nomeLetras) {
  if (!prefixo && /^j[óo]$/i.test(nomeLetras) && /ó/i.test(nomeLetras)) return "job";
  const chave = normalizarTexto(`${prefixo || ""}${nomeLetras}`);
  return LIVROS_POR_NOME[chave] || null;
}

// Remove pontuação/parênteses/aspas sobrando nas bordas de uma citação.
// Seguro porque uma referência válida sempre termina em dígito — nunca em
// ")", ".", "," etc. — então essas sobras nunca fazem parte da referência.
function limparParte(s) {
  return s
    .replace(/^[\s(\[«"'"]+/, "")
    .replace(/[\s)\]»"'".,;]+$/, "")
    .trim();
}

// Livro + capítulo (+ verso opcional). Aceita ponto depois da abreviação
// do livro (ex.: "Mt. 5:3", "1 Jo. 4:8").
const RX_REF = /^(?:([1-3])\s*)?([A-Za-zÀ-ÖØ-öø-ÿçÇ]+)\.?\s+(\d+)(?::\s*(.+))?$/;
// Só o nome do livro, sem capítulo/verso (ex.: citação genérica a um livro).
const RX_SOBRENOME = /^(?:([1-3])\s*)?([A-Za-zÀ-ÖØ-öø-ÿçÇ]+)\.?$/;
// Continuação sem nome de livro (herda o livro da citação anterior),
// ex.: "8:32" depois de "João 16:13;".
const RX_CONT = /^(\d+)(?::\s*(.+))?$/;

// Extrai uma lista de citações {original, ingles, nomeLivro, capitulo,
// capituloFim, versoSpec, aviso} de uma string de referência como
// "Mateus 24:6, 7, 10; 2Timóteo 3:1-4".
function parseReferencias(refString) {
  if (!refString) return [];
  const partes = refString.split(";").map(limparParte).filter(Boolean);
  const resultados = [];
  let livroAtual = null;
  let nomeAtual = null;

  for (const parteOriginal of partes) {
    let ingles = null;
    let nomeLivro = null;
    let capitulo = null;
    let resto = null;

    let m = parteOriginal.match(RX_REF);
    if (m) {
      const resolvido = resolverLivro(m[1], m[2]);
      if (resolvido) {
        ingles = resolvido;
        nomeLivro = (m[1] ? m[1] + " " : "") + m[2];
        capitulo = parseInt(m[3], 10);
        resto = m[4] || null;
      }
    }

    if (ingles === null) {
      m = parteOriginal.match(RX_SOBRENOME);
      if (m) {
        const resolvido = resolverLivro(m[1], m[2]);
        if (resolvido) {
          ingles = resolvido;
          nomeLivro = (m[1] ? m[1] + " " : "") + m[2];
          capitulo = 1; // sem capítulo/verso informado: melhor aproximação
          resto = null;
        }
      }
    }

    if (ingles === null) {
      if (!livroAtual) continue; // sem livro (atual ou herdado): não há o que buscar
      m = parteOriginal.match(RX_CONT);
      if (!m) continue;
      ingles = livroAtual;
      nomeLivro = nomeAtual;
      capitulo = parseInt(m[1], 10);
      resto = m[2] || null;
    }

    livroAtual = ingles;
    nomeAtual = nomeLivro;

    let versoSpec = null;
    let aviso = null;
    let capituloFim = capitulo;

    if (resto) {
      const restoLimpo = resto.replace(/[–—]/g, "-").replace(/\s+/g, "");
      const cruza = restoLimpo.match(/^(\d+)-(\d+):(\d+)$/);
      if (cruza) {
        // referência atravessa capítulos: buscamos o capítulo inicial
        // completo (a partir do verso citado) em vez de tentar recortar
        // um intervalo que a API não entenderia, e avisamos o usuário.
        capituloFim = parseInt(cruza[2], 10);
        aviso = `Esta referência continua no capítulo ${capituloFim} — mostrando o capítulo ${capitulo} completo a partir do verso ${cruza[1]}.`;
        versoSpec = null;
      } else {
        // Mantém listas/intervalos ("6,7,10" ou "31-33,46") como estão:
        // a bible-api já entende essa sintaxe nativamente, evitando
        // colapsar tudo num único intervalo contínuo errado.
        versoSpec = restoLimpo;
      }
    }

    resultados.push({
      original: parteOriginal,
      ingles,
      nomeLivro,
      capitulo,
      capituloFim,
      versoSpec,
      aviso,
    });
  }

  return resultados;
}

// Link de emergência: se a API falhar por qualquer razão, o usuário ainda
// consegue chegar ao texto com um clique, via busca.
function linkBuscaAlternativa(citacao) {
  const primeiroVerso = citacao.versoSpec ? citacao.versoSpec.match(/\d+/)?.[0] : null;
  const termo = `${citacao.nomeLivro || citacao.ingles} ${citacao.capitulo}${primeiroVerso ? ":" + primeiroVerso : ""} bíblia`;
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
  const rangeStr = citacao.versoSpec ? `:${citacao.versoSpec}` : "";
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

  return {
    nomeLivro: citacao.nomeLivro || dados.verses?.[0]?.book_name,
    versiculos,
    aviso: citacao.aviso || null,
  };
}
