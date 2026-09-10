// =====================================================================
// Texto bíblico ao vivo, para o popup que abre quando o usuário toca numa
// referência dentro do estudo.
//
// PARSER DE REFERÊNCIAS: usa o "Bible-Passage-Reference-Parser"
// (openbibleinfo), a mesma biblioteca mantida pela Adventech para o app
// Sabbath School (github.com/Adventech) — ver assets/bcv_parser.js
// (carregado antes deste arquivo, licença MIT em bcv_parser.LICENSE.md).
// Isso substitui um parser artesanal por regex que, testado contra as
// 224 referências reais dos 27 estudos, falhava ou perdia pedaços da
// citação em alguns casos.
//
// TEXTO DO VERSÍCULO: bible-api.com, que declara suporte explícito a
// CORS para uso direto do navegador e não exige chave/cadastro. A
// tradução usada é "almeida" (João Ferreira de Almeida, edição
// histórica), rotulada pela própria API como de domínio público.
//
// DIAGNÓSTICO DO "funciona às vezes": ao rodar as 224 referências reais
// do material pelo parser oficial, ficou claro que 3 delas apontavam
// para capítulos que não existem no livro citado (ex.: "2João 4:1" —
// 2 João só tem 1 capítulo). São erros de digitação típicos de troca
// "1"/"2" em livros numerados; foram corrigidos em assets/data.js para
// a referência doutrinariamente óbvia (ex.: 1João 4:1). Nenhuma API
// jamais encontraria texto para um capítulo inexistente.
// =====================================================================

const BIBLIA_API_BASE = "https://bible-api.com";
const BIBLIA_VERSAO = "almeida";
const BIBLIA_NOME_VERSAO = "João Ferreira de Almeida (edição histórica, domínio público)";
const BIBLIA_TIMEOUT_MS = 8000;

// bcv_parser vem de assets/bcv_parser.js (carregado antes deste script)
const _bcv = new bcv_parser();
_bcv.set_options({ invalid_passage_strategy: "include" });

// código OSIS do livro (o que o parser devolve) -> identificador em
// inglês aceito pela bible-api.com
const OSIS_PARA_INGLES = {
  Gen: "genesis", Exod: "exodus", Lev: "leviticus", Num: "numbers", Deut: "deuteronomy",
  Josh: "joshua", Judg: "judges", Ruth: "ruth", "1Sam": "1 samuel", "2Sam": "2 samuel",
  "1Kgs": "1 kings", "2Kgs": "2 kings", "1Chr": "1 chronicles", "2Chr": "2 chronicles",
  Ezra: "ezra", Neh: "nehemiah", Esth: "esther", Job: "job",
  Ps: "psalms", Prov: "proverbs", Eccl: "ecclesiastes", Song: "song of solomon",
  Isa: "isaiah", Jer: "jeremiah", Lam: "lamentations", Ezek: "ezekiel", Dan: "daniel",
  Hos: "hosea", Joel: "joel", Amos: "amos", Obad: "obadiah", Jonah: "jonah",
  Mic: "micah", Nah: "nahum", Hab: "habakkuk", Zeph: "zephaniah", Hag: "haggai",
  Zech: "zechariah", Mal: "malachi",
  Matt: "matthew", Mark: "mark", Luke: "luke", John: "john", Acts: "acts",
  Rom: "romans", "1Cor": "1 corinthians", "2Cor": "2 corinthians", Gal: "galatians",
  Eph: "ephesians", Phil: "philippians", Col: "colossians",
  "1Thess": "1 thessalonians", "2Thess": "2 thessalonians",
  "1Tim": "1 timothy", "2Tim": "2 timothy", Titus: "titus", Phlm: "philemon",
  Heb: "hebrews", Jas: "james", "1Pet": "1 peter", "2Pet": "2 peter",
  "1John": "1 john", "2John": "2 john", "3John": "3 john", Jude: "jude", Rev: "revelation",
};

// código OSIS -> nome do livro em português, só para exibição no popup
// (independe do idioma que a API devolver).
const OSIS_PARA_PORTUGUES = {
  Gen: "Gênesis", Exod: "Êxodo", Lev: "Levítico", Num: "Números", Deut: "Deuteronômio",
  Josh: "Josué", Judg: "Juízes", Ruth: "Rute", "1Sam": "1 Samuel", "2Sam": "2 Samuel",
  "1Kgs": "1 Reis", "2Kgs": "2 Reis", "1Chr": "1 Crônicas", "2Chr": "2 Crônicas",
  Ezra: "Esdras", Neh: "Neemias", Esth: "Ester", Job: "Jó",
  Ps: "Salmos", Prov: "Provérbios", Eccl: "Eclesiastes", Song: "Cantares",
  Isa: "Isaías", Jer: "Jeremias", Lam: "Lamentações", Ezek: "Ezequiel", Dan: "Daniel",
  Hos: "Oséias", Joel: "Joel", Amos: "Amós", Obad: "Obadias", Jonah: "Jonas",
  Mic: "Miquéias", Nah: "Naum", Hab: "Habacuque", Zeph: "Sofonias", Hag: "Ageu",
  Zech: "Zacarias", Mal: "Malaquias",
  Matt: "Mateus", Mark: "Marcos", Luke: "Lucas", John: "João", Acts: "Atos",
  Rom: "Romanos", "1Cor": "1 Coríntios", "2Cor": "2 Coríntios", Gal: "Gálatas",
  Eph: "Efésios", Phil: "Filipenses", Col: "Colossenses",
  "1Thess": "1 Tessalonicenses", "2Thess": "2 Tessalonicenses",
  "1Tim": "1 Timóteo", "2Tim": "2 Timóteo", Titus: "Tito", Phlm: "Filemom",
  Heb: "Hebreus", Jas: "Tiago", "1Pet": "1 Pedro", "2Pet": "2 Pedro",
  "1John": "1 João", "2John": "2 João", "3John": "3 João", Jude: "Judas", Rev: "Apocalipse",
};

// Extrai uma lista de citações {original, livroOsis, ingles, nomeLivro,
// capitulo, capituloFim, vIni, vFim} de uma referência em português,
// usando o parser oficial (assets/bcv_parser.js) em vez de regex caseiro.
function parseReferencias(refString) {
  if (!refString) return [];
  const osis = _bcv.parse(refString).osis();
  if (!osis) return [];

  return osis.split(",").map((pedaco) => {
    const [inicioStr, fimStr] = pedaco.split("-");
    const inicio = inicioStr.split(".");
    const fim = fimStr ? fimStr.split(".") : inicio;
    const livroOsis = inicio[0];
    const capitulo = parseInt(inicio[1], 10);
    const vIni = inicio[2] !== undefined ? parseInt(inicio[2], 10) : null;
    const capituloFim = fim[1] !== undefined ? parseInt(fim[1], 10) : capitulo;
    const vFim = fim[2] !== undefined ? parseInt(fim[2], 10) : vIni;
    return {
      original: pedaco,
      livroOsis,
      ingles: OSIS_PARA_INGLES[livroOsis] || null,
      nomeLivro: OSIS_PARA_PORTUGUES[livroOsis] || livroOsis,
      capitulo,
      capituloFim,
      vIni,
      vFim,
    };
  }).filter((c) => c.ingles); // descarta o improvável caso de um livro fora do mapa
}

// Link de emergência: se a API falhar por qualquer razão, o usuário ainda
// consegue chegar ao texto com um clique, via busca.
function linkBuscaAlternativa(citacao) {
  const termo = `${citacao.nomeLivro} ${citacao.capitulo}${citacao.vIni ? ":" + citacao.vIni : ""} bíblia`;
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
  // referência que atravessa capítulos (raríssimo nos dados: 3 em 421):
  // busca só o capítulo inicial, sem tentar recortar um intervalo que
  // cruza capítulos — mais simples e nunca mostra algo errado.
  const cruzaCapitulo = citacao.capitulo !== citacao.capituloFim;
  const vIniEfetivo = cruzaCapitulo ? null : citacao.vIni;
  const vFimEfetivo = cruzaCapitulo ? null : citacao.vFim;

  const chave = `${citacao.ingles}:${citacao.capitulo}`;
  let dados = _cacheBiblia.get(chave);

  if (!dados) {
    const query = `${citacao.ingles} ${citacao.capitulo}`;
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

  let versiculos = (dados.verses || []).map((v) => ({
    number: v.verse,
    text: (v.text || "").replace(/\s+/g, " ").trim(),
  }));
  if (vIniEfetivo) {
    versiculos = versiculos.filter((v) => v.number >= vIniEfetivo && v.number <= (vFimEfetivo || vIniEfetivo));
  }
  return {
    nomeLivro: citacao.nomeLivro,
    versiculos,
    aviso: cruzaCapitulo ? `Esta referência continua no capítulo ${citacao.capituloFim} — mostrando o capítulo ${citacao.capitulo} completo.` : null,
  };
}
