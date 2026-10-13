/**
 * ============================================================================
 * FÊNIX CORE v2.3
 *
 * CONVENÇÃO DE NOME (DUAS CÓPIAS A CADA ENTREGA):
 * O endereço oficial é SEMPRE fenix-core.js (sem número de versão no nome nem
 * na URL): é a cópia publicada e referenciada por todos os apps. A cada nova
 * versão é entregue também uma cópia idêntica com a versão no nome (ex:
 * fenix-core-v2.1.js), usada só para controle temporal/histórico — nenhum app
 * deve apontar para ela. O mesmo vale para o index de qualquer app:
 * index.html (publicado) + cópia com a versão no nome (histórico). A versão
 * também é registrada aqui, no comentário de topo (ver Histórico de Versões
 * abaixo). Assim, cada app aponta para o endereço UMA vez, pra sempre, e
 * nunca mais precisa mudar.
 *
 * URL ÚNICA E CENTRALIZADA (usar sempre com barra simples):
 *   https://fenicris-dev.github.io/Fenix-Core/fenix-core.js
 *
 * Módulo central de dados compartilhados entre todos os apps Fênix
 * ============================================================================
 *
 * O QUE É:
 * Este arquivo conecta seu app a um projeto Firebase SEPARADO ("fenix-core"),
 * dedicado exclusivamente a dados que são comuns entre todos os aplicativos:
 *   - Pessoas Físicas (CPF)
 *   - Pessoas Jurídicas (CNPJ)
 *   - Produtos / Serviços / Soluções
 *   - Cidades / UF / Bairros
 *   - Autenticação, Empresas, Convites, Equipe (multiempresa)
 *   - Coleções próprias por app, isoladas por empresa (catálogo genérico)
 *
 * COMO USAR EM QUALQUER APP:
 * Este arquivo é um MÓDULO ES (usa import/export). Não funciona colado como
 * <script> comum. Em qualquer app, use um bloco <script type="module">:
 *
 *   <script type="module">
 *     import { FenixCore } from "https://fenicris-dev.github.io/Fenix-Core/fenix-core.js";
 *     FenixCore.init("nome-do-seu-app");   // uma vez só, no carregamento do app
 *     // depois use: FenixCore.pessoas.buscar(cpfOuCnpj), etc.
 *   </script>
 *
 * Não é preciso preencher credenciais: o firebaseConfig do projeto
 * "fenix-core" já está definido neste arquivo (seção 1).
 *
 * REGRA DE BACKUP (todos os apps):
 * Se o usuário ficar mais de 7 dias sem fazer backup, o app abre um alerta
 * perguntando se ele quer fazer uma cópia de segurança dos dados agora.
 * Chame uma vez, depois do boot do app:
 *   FenixCore.backup.verificarLembrete("nome-do-seu-app", {
 *     aoFazerBackup: () => minhaFuncaoQueExportaOsDados()   // exporta/baixa o JSON
 *   });
 * Quando o usuário fizer backup manualmente (botão do app), chame
 * FenixCore.backup.registrar("nome-do-seu-app") para zerar a contagem. A
 * função FenixCore.backup.baixarJSON(nomeApp, dados) já baixa o arquivo e
 * registra o backup. Na primeira abertura de um app, a contagem dos 7 dias
 * começa a partir desse dia.
 *
 * TELA "SOBRE" (todos os apps):
 * Chame uma vez no boot, ANTES do alerta de backup, informando a versão do app:
 *   const info = FenixCore.sobre.registrarAcesso("nome-do-seu-app", "v1.0");
 * Isso conta 1 acesso por abertura do app (recarregar a página não conta de
 * novo) e devolve tudo pronto para exibir:
 *   info.acessos                -> número de acessos neste aparelho
 *   info.primeiroAcessoTexto    -> "02/10/2026 14:30"
 *   info.ultimaAtualizacaoTexto -> "v1.0 instalada em 02/10/2026"
 * "Última atualização" = data em que a versão atual foi instalada NESTE
 * aparelho (muda sempre que a versão informada muda). Os números são por
 * aparelho/navegador: trocar de aparelho ou limpar os dados zera o contador.
 * Apps que já estavam em uso começam a contar no dia em que adotarem este módulo.
 *
 * SINCRONIA PESSOAL (apps de uso pessoal, multi-aparelho):
 *   const { app, db } = FenixCore.initFirebaseComCache();
 *   const auth = FenixCore.criarModuloAuth(app);
 *   auth.aoMudarEstado(user => {
 *     if (!user) return;
 *     const sinc = FenixCore.criarModuloSincronia(db, user.uid, "meu-app");
 *     sinc.ouvir("tarefas", (mudancas, meta) => { ... }, erro => { ... });
 *     sinc.salvar("tarefas", { id: "abc", nome: "Ler" });
 *   });
 * Cada usuário só enxerga os próprios dados. Regra a acrescentar no
 * firestore.rules (dentro de match /databases/{database}/documents):
 *   match /dados_pessoais/{uid}/{colecao}/{docId} {
 *     allow read, write: if request.auth != null && request.auth.uid == uid;
 *   }
 *
 * REGRA DE ESCRITA DOS TEXTOS (todos os apps):
 *  - Nome de Pessoa Física e de Pessoa Jurídica (razão social e nome
 *    fantasia): sempre em MAIÚSCULAS, por completo.
 *  - Demais campos de texto (endereço, bairro, cidade, produtos, etc.):
 *    primeira letra de cada palavra em maiúscula, exceto preposições, artigos
 *    e "e" (de, da, do, das, dos, em, na, no, para, por, com, e...).
 *  - Ficam de fora da regra: e-mail (minúsculas), UF (maiúsculas), CEP,
 *    telefone, números e textos livres longos (descrição, observações).
 *  O Core já aplica isso ao salvar. Nos campos próprios do app, use
 *  FenixCore.formatarTitulo(texto) e FenixCore.formatarNomeMaiusculo(texto).
 *
 * OBSERVAÇÃO SOBRE O PADRÃO "SEM CDN EXTERNO":
 * Este módulo importa o Firebase SDK de gstatic.com (servidor do Google).
 * É uma exceção fixa do Core ao padrão "sem CDN externo": os apps que usam o
 * Core precisam de internet para carregar essa parte (o service worker do PWA
 * pode guardar uma cópia para uso offline). O restante de cada app continua
 * sem dependências externas.
 *
 * IMPORTANTE:
 * Este módulo NÃO substitui o Firebase do seu app operacional (fenix-rat,
 * fenix-frotas, etc.). Ele roda EM PARALELO. Seu app continua com seu banco
 * próprio para dados específicos (boletins, veículos, aulas...) e usa o
 * fenix-core só para os dados de cadastro comuns.
 *
 * REGRA DE OURO:
 * Nenhum app deve mais ter sua própria coleção de "pessoas" ou "clientes"
 * completa. Ele guarda apenas a referência (CPF/CNPJ) + um cache leve opcional
 * (nome, cidade) pra exibição rápida em listas, sem duplicar o cadastro.
 *
 * HISTÓRICO DE VERSÕES:
 * v1.0 — Módulo base: Pessoas (PF/PJ), Produtos/Serviços, Localidades com
 *        aprendizado orgânico de bairro.
 * v1.1 — Adicionada localidades.buscarPorCEP() via ViaCEP: CEP passa a ser a
 *        fonte primária de logradouro/bairro/cidade/UF, com criação automática
 *        de cidade sob demanda. Bairro manual vira fallback, não regra.
 * v1.2 — Adicionada pessoas.buscarNaReceita() via BrasilAPI: CNPJ passa a ser
 *        consultado automaticamente na Receita Federal (razão social, nome
 *        fantasia, situação cadastral, endereço, CNAE).
 * v1.3–v1.6 — Módulos de Auth/Empresas/Convites/Equipe/AppData/Materiais/
 *        ProdutosServicos/FamiliasMateriais/Pessoas por empresa, construídos
 *        para suportar o Fênix Ativos (multiempresa).
 * v1.7 — Reconstrução completa dos módulos acima após bug fatal de import
 *        duplicado ter quebrado o arquivo publicado; API realinhada com o
 *        uso real do Fênix Ativos.
 * v1.8 — Adicionado excluir() ao helper interno de catálogo por empresa, e
 *        exposta a função pública criarModuloCatalogoEmpresa(db, empresaId,
 *        nomeColecao, campoChave), permitindo que qualquer app crie sua
 *        própria coleção isolada por empresa sem alterar o fenix-core a cada
 *        novo app (usado pela primeira vez pelo Fênix Controle de Obras
 *        Terceirizadas). Puramente aditivo — nenhuma função existente mudou.
 * v1.9 — BUG CRÍTICO CORRIGIDO: todo o módulo de Empresas (criarEmpresa,
 *        obterEmpresaDoUsuario, repararVinculo, aceitar convite, remover
 *        membro) gravava/lia o vínculo usuário→empresa na coleção
 *        "usuariosEmpresa" (camelCase), mas o firestore.rules e os dados
 *        reais em produção usam "usuarios_empresa" (com underline). Como não
 *        existe regra nenhuma pra "usuariosEmpresa", toda leitura/escrita
 *        nela sempre falhava com permission-denied, silenciosamente — é
 *        provável que isso nunca tenha funcionado de verdade em nenhum app
 *        (Ativos incluído). Corrigido pra usar "usuarios_empresa" em todo
 *        lugar, batendo com o que já existe no banco e nas regras.
 * v2.0 — (1) Documentação do topo e exemplo de uso corrigidos: o arquivo é
 *        módulo ES (<script type="module">), a URL é única e com barra
 *        simples, e o exemplo não aponta mais para fenix-core-v1.0.js.
 *        (2) pessoas.buscarPorNome() corrigido: a busca por prefixo agora usa
 *        o campo normalizado "nomeBusca" (maiúsculas, sem acentos), gravado
 *        automaticamente por salvarFisica/salvarJuridica. Antes, a busca
 *        comparava com o termo em maiúsculas, mas o nome era salvo como
 *        digitado, então nomes como "João da Silva" nunca eram encontrados.
 *        ATENÇÃO: cadastros criados antes da v2.0 não têm "nomeBusca" e só
 *        aparecem na busca por nome depois de serem salvos novamente (a
 *        busca por CPF/CNPJ não é afetada). Puramente aditivo — nenhuma
 *        outra função mudou.
 * v2.1 — (1) Dados da Fênix expostos em FenixCore.EMPRESA (nome, CNPJ
 *        60.292.878/0001-70 e e-mail trempodofenix@gmail.com).
 *        (2) Novo módulo FenixCore.backup: alerta de backup após mais de 7
 *        dias sem cópia de segurança (verificarLembrete, registrar,
 *        diasSemBackup, baixarJSON).
 *        (3) Padronização de escrita ao salvar: nome de PF/PJ (razão social
 *        e nome fantasia) em MAIÚSCULAS; demais campos de texto com a
 *        primeira letra de cada palavra em maiúscula, exceto preposições
 *        (novas funções formatarTitulo e formatarNomeMaiusculo); e-mail em
 *        minúsculas e UF em maiúsculas. Vale para pessoas, produtos e
 *        localidades. ATENÇÃO: registros já salvos só são padronizados
 *        quando salvos novamente.
 *        (4) Correção: salvar com merge parcial (sem "nome"/"razaoSocial")
 *        não apaga mais o campo "nomeBusca".
 * v2.2 — Novo módulo FenixCore.sobre para a tela "Sobre" de todos os apps:
 *        contador de acessos (1 por abertura do app), data e hora do primeiro
 *        acesso e data de instalação da versão atual no aparelho (última
 *        atualização), com histórico das últimas 20 versões instaladas. O
 *        primeiro acesso também passa a ser o início da contagem de 7 dias do
 *        alerta de backup. Puramente aditivo — nenhuma função existente mudou.
 * v2.3 — Sincronização pessoal multi-aparelho (usada pelo Fênix Gestor de Tempo
 *        v2.0): (1) initFirebaseComCache(): igual a initFirebase(), mas ativa o
 *        cache offline do Firestore (escritas feitas sem internet ficam na
 *        fila e sobem sozinhas). Deve ser chamada ANTES de qualquer init()/
 *        initFirebase() na mesma página. (2) criarModuloSincronia(db, uid,
 *        nomeApp): dados PRIVADOS do usuário em dados_pessoais/{uid}/
 *        {nomeApp}_{colecao}/{id}, com ouvir() em tempo real, salvar(),
 *        salvarVarios(), excluir() e medirRelogio() (diferença entre o relógio
 *        do aparelho e o do servidor). (3) criarModuloAuth ganhou
 *        recuperarSenha(email). Puramente aditivo — nenhuma função existente
 *        mudou. REQUER regra no firestore.rules (ver SINCRONIA PESSOAL no topo).
 * ============================================================================
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, orderBy, limit as fsLimit,
  serverTimestamp,
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  onSnapshot, writeBatch, getDocFromServer
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ============================================================================
// 1. CONFIGURAÇÃO — credenciais do projeto Firebase "fenix-core"
// ============================================================================
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDU8pGPVrBOS75Fry9FB3H5nokw6Qk5wpA",
  authDomain: "fenix-core-19e82.firebaseapp.com",
  projectId: "fenix-core-19e82",
  storageBucket: "fenix-core-19e82.firebasestorage.app",
  messagingSenderId: "296658490141",
  appId: "1:296658490141:web:cd2ac556069ded075307f4"
};

const CPF_CNPJ_DISCLOSURE = "O CPF/CNPJ é usado apenas para emissão de Notas Fiscais e/ou Recibos.";

// Dados institucionais da Fênix (use em rodapés, documentos, contato, etc.)
const EMPRESA = Object.freeze({
  nome: "Fênix Soluções Tecnológicas",
  cnpj: "60292878000170",
  cnpjFormatado: "60.292.878/0001-70",
  email: "trempodofenix@gmail.com"
});

let _db = null;
let _nomeAppChamador = "app-desconhecido"; // cada app deve se identificar no init()
const _NOME_APP_FIREBASE = "fenix-core-connection";

function _obterAppFirebase(config) {
  const existente = getApps().find(a => a.name === _NOME_APP_FIREBASE);
  if (existente) return existente;
  return initializeApp(config || firebaseConfig, _NOME_APP_FIREBASE);
}

/**
 * Inicializa a conexão com o fenix-core.
 * Chame uma vez só, no boot do app.
 * @param {string} nomeApp - identificador do app chamador, ex: "fenix-frotas", "fenix-financiamentos"
 */
function init(nomeApp) {
  _nomeAppChamador = nomeApp || _nomeAppChamador;
  const app = _obterAppFirebase(firebaseConfig);
  _db = getFirestore(app);
  return _db;
}

/**
 * Alternativa a init(): devolve {app, db} diretamente, sem depender do
 * estado interno _db. Usada por apps (como o Fênix Ativos) que também
 * precisam do objeto `app` pra montar Auth. Reaproveita a MESMA instância
 * do Firebase App que init() usaria, então os dois métodos são
 * intercambiáveis e nunca criam apps Firebase duplicados.
 * @param {object} config - opcional; usa firebaseConfig padrão se omitido
 */
function initFirebase(config) {
  const app = _obterAppFirebase(config);
  _db = getFirestore(app);
  return { app, db: _db };
}

/**
 * Como initFirebase(), mas com cache offline do Firestore (IndexedDB): leituras
 * funcionam sem internet e escritas feitas offline sobem quando a conexão volta.
 * Chame ANTES de qualquer init()/initFirebase() na página; se o Firestore já
 * tiver sido iniciado sem cache, reaproveita-o (sem cache offline).
 */
function initFirebaseComCache(config) {
  const app = _obterAppFirebase(config);
  try {
    _db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (e) {
    _db = getFirestore(app);
  }
  return { app, db: _db };
}

function _garantirInit() {
  if (!_db) throw new Error("FenixCore não inicializado. Chame FenixCore.init('nome-do-seu-app') primeiro.");
}

// ============================================================================
// 2. HELPERS DE VALIDAÇÃO E FORMATAÇÃO (CPF / CNPJ)
// ============================================================================

function limparDocumento(valor) {
  return (valor || "").toString().replace(/\D/g, "");
}

/**
 * Normaliza um texto para busca por prefixo: maiúsculas, sem acentos e sem
 * espaços nas pontas. Ex: "  João da Silva " -> "JOAO DA SILVA".
 */
function normalizarBusca(texto) {
  return (texto || "").toString().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

// Palavras que ficam em minúsculas no meio do texto (preposições, artigos e "e")
const _PALAVRAS_MINUSCULAS = new Set([
  "a", "o", "as", "os", "e", "ou", "de", "da", "do", "das", "dos",
  "em", "na", "no", "nas", "nos", "ao", "aos", "à", "às", "para", "pra",
  "por", "pelo", "pela", "pelos", "pelas", "com", "sem", "sob", "sobre", "um", "uma"
]);

/**
 * Nome de Pessoa Física/Jurídica: sempre MAIÚSCULAS por completo.
 * Ex: "  joão da   silva " -> "JOÃO DA SILVA".
 */
function formatarNomeMaiusculo(texto) {
  return (texto || "").toString().trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

/**
 * Demais campos: primeira letra de cada palavra em maiúscula, exceto
 * preposições/artigos/"e" (que ficam em minúscula, menos na 1ª palavra).
 * Palavras com número (BR-101, 4º, 12A) são mantidas como foram digitadas.
 * Ex: "RUA DA PAZ" -> "Rua da Paz"; "centro de aracaju" -> "Centro de Aracaju".
 */
function formatarTitulo(texto) {
  const limpo = (texto || "").toString().trim().replace(/\s+/g, " ");
  if (!limpo) return "";
  return limpo.split(" ").map((palavra, i) => {
    if (/\d/.test(palavra)) return palavra;
    const baixa = palavra.toLocaleLowerCase("pt-BR");
    if (i > 0 && _PALAVRAS_MINUSCULAS.has(baixa)) return baixa;
    return baixa.split("-").map(p => p ? p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1) : p).join("-");
  }).join(" ");
}

/** Padroniza o objeto de endereço: textos em formatarTitulo, UF em maiúsculas; CEP e número intactos. */
function _formatarEndereco(end) {
  if (!end || typeof end !== "object") return end;
  const out = { ...end };
  ["logradouro", "complemento", "bairro", "cidade"].forEach(c => {
    if (out[c] != null) out[c] = formatarTitulo(out[c]);
  });
  if (out.uf != null) out.uf = out.uf.toString().trim().toUpperCase();
  return out;
}

/**
 * Aplica a regra de escrita aos dados antes de salvar. Só mexe nos campos que
 * vieram preenchidos (não cria campos vazios, para não apagar nada num merge).
 * @param {object} dados
 * @param {string[]} camposNome - campos de nome (MAIÚSCULAS por completo)
 * @param {string[]} camposTitulo - campos de texto curto (Primeira Letra Maiúscula)
 */
function _padronizarCampos(dados, camposNome = [], camposTitulo = []) {
  const out = { ...dados };
  camposNome.forEach(c => { if (out[c] != null) out[c] = formatarNomeMaiusculo(out[c]); });
  camposTitulo.forEach(c => { if (out[c] != null) out[c] = formatarTitulo(out[c]); });
  if (out.email != null) out.email = out.email.toString().trim().toLowerCase();
  if (out.endereco) out.endereco = _formatarEndereco(out.endereco);
  return out;
}

function tipoDocumento(valor) {
  const limpo = limparDocumento(valor);
  if (limpo.length === 11) return "fisica";
  if (limpo.length === 14) return "juridica";
  return null;
}

function validarCPF(cpf) {
  cpf = limparDocumento(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.substring(10, 11));
}

function validarCNPJ(cnpj) {
  cnpj = limparDocumento(cnpj);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0, pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  tamanho++;
  numeros = cnpj.substring(0, tamanho);
  soma = 0; pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

function formatarCPF(cpf) {
  cpf = limparDocumento(cpf);
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarCNPJ(cnpj) {
  cnpj = limparDocumento(cnpj);
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatarDocumento(valor) {
  const limpo = limparDocumento(valor);
  return limpo.length === 14 ? formatarCNPJ(limpo) : formatarCPF(limpo);
}

// ============================================================================
// 3. PESSOAS (Físicas e Jurídicas) — coleção unificada por tipo de documento
// ============================================================================

const pessoas = {

  /**
   * Busca uma pessoa (física ou jurídica) pelo CPF/CNPJ.
   * Detecta o tipo automaticamente pelo tamanho do documento.
   * @returns {object|null} dados da pessoa ou null se não encontrada
   */
  async buscar(cpfOuCnpj) {
    _garantirInit();
    const doc_id = limparDocumento(cpfOuCnpj);
    const tipo = tipoDocumento(doc_id);
    if (!tipo) throw new Error("CPF/CNPJ inválido: " + cpfOuCnpj);
    const colecao = tipo === "fisica" ? "pessoas_fisicas" : "pessoas_juridicas";
    const ref = doc(_db, colecao, doc_id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, tipo, ...snap.data() };
  },

  /**
   * Salva (cria ou atualiza) uma pessoa física.
   * Grava também "nomeBusca" (nome normalizado) para a busca por prefixo.
   * @param {object} dados - { cpf, nome, telefone, email, endereco: {cep, logradouro, numero, complemento, bairro, cidade, uf} }
   */
  async salvarFisica(dados) {
    _garantirInit();
    const cpf = limparDocumento(dados.cpf);
    if (!validarCPF(cpf)) throw new Error("CPF inválido: " + dados.cpf);
    const ref = doc(_db, "pessoas_fisicas", cpf);
    const existente = await getDoc(ref);
    const padrao = _padronizarCampos(dados, ["nome"]);
    const payload = {
      ...padrao,
      cpf,
      ...(padrao.nome != null ? { nomeBusca: normalizarBusca(padrao.nome) } : {}),
      atualizadoEm: serverTimestamp(),
      atualizadoPor: _nomeAppChamador,
      ...(existente.exists() ? {} : { criadoEm: serverTimestamp(), criadoPor: _nomeAppChamador })
    };
    await setDoc(ref, payload, { merge: true });
    return { id: cpf, tipo: "fisica", ...payload };
  },

  /**
   * Busca dados oficiais de um CNPJ na Receita Federal (via BrasilAPI, gratuita, sem chave).
   * Use isso ANTES de salvarJuridica, para pré-preencher o formulário automaticamente
   * assim que o usuário digitar o CNPJ — igual ao fluxo de CEP.
   *
   * Nota: API pública com uso razoável, sem SLA garantido. Para volume alto de
   * consultas no futuro, considerar alternativa paga (ReceitaWS, CNPJá).
   *
   * @returns {object|null} { cnpj, razaoSocial, nomeFantasia, situacaoCadastral,
   *   dataAbertura, cnaePrincipal, telefone, email,
   *   endereco: {cep, logradouro, numero, complemento, bairro, cidade, uf}, origem: 'receita' }
   */
  async buscarNaReceita(cnpj) {
    const cnpjLimpo = limparDocumento(cnpj);
    if (!validarCNPJ(cnpjLimpo)) throw new Error("CNPJ inválido: " + cnpj);

    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    if (!resp.ok) return null; // CNPJ não encontrado ou API indisponível
    const dados = await resp.json();

    return {
      cnpj: cnpjLimpo,
      razaoSocial: dados.razao_social || "",
      nomeFantasia: dados.nome_fantasia || "",
      situacaoCadastral: dados.descricao_situacao_cadastral || "",
      dataAbertura: dados.data_inicio_atividade || "",
      cnaePrincipal: dados.cnae_fiscal_descricao || "",
      telefone: dados.ddd_telefone_1 || "",
      email: dados.email || "",
      endereco: {
        cep: dados.cep || "",
        logradouro: `${dados.descricao_tipo_de_logradouro || ""} ${dados.logradouro || ""}`.trim(),
        numero: dados.numero || "",
        complemento: dados.complemento || "",
        bairro: dados.bairro || "",
        cidade: dados.municipio || "",
        uf: dados.uf || ""
      },
      origem: "receita"
    };
  },

  /**
   * Salva (cria ou atualiza) uma pessoa jurídica.
   * Grava também "nomeBusca" (razão social normalizada) para a busca por prefixo.
   * @param {object} dados - { cnpj, razaoSocial, nomeFantasia, telefone, email, endereco: {...} }
   */
  async salvarJuridica(dados) {
    _garantirInit();
    const cnpj = limparDocumento(dados.cnpj);
    if (!validarCNPJ(cnpj)) throw new Error("CNPJ inválido: " + dados.cnpj);
    const ref = doc(_db, "pessoas_juridicas", cnpj);
    const existente = await getDoc(ref);
    const padrao = _padronizarCampos(dados, ["razaoSocial", "nomeFantasia"], ["situacaoCadastral", "cnaePrincipal"]);
    const payload = {
      ...padrao,
      cnpj,
      ...(padrao.razaoSocial != null ? { nomeBusca: normalizarBusca(padrao.razaoSocial) } : {}),
      atualizadoEm: serverTimestamp(),
      atualizadoPor: _nomeAppChamador,
      ...(existente.exists() ? {} : { criadoEm: serverTimestamp(), criadoPor: _nomeAppChamador })
    };
    await setDoc(ref, payload, { merge: true });
    return { id: cnpj, tipo: "juridica", ...payload };
  },

  /**
   * Salva automaticamente detectando o tipo pelo tamanho do documento.
   */
  async salvar(dados) {
    const doc_id = limparDocumento(dados.cpf || dados.cnpj);
    const tipo = tipoDocumento(doc_id);
    if (tipo === "fisica") return pessoas.salvarFisica({ ...dados, cpf: doc_id });
    if (tipo === "juridica") return pessoas.salvarJuridica({ ...dados, cnpj: doc_id });
    throw new Error("Não foi possível determinar se é CPF ou CNPJ: " + doc_id);
  },

  /**
   * Busca por nome (prefixo, ignorando maiúsculas/minúsculas e acentos).
   * Usa o campo normalizado "nomeBusca", gravado por salvarFisica/salvarJuridica.
   * Cadastros anteriores à v2.0 só aparecem aqui depois de salvos novamente.
   * Para bases grandes, considerar Algolia/Typesense futuramente.
   */
  async buscarPorNome(termo, tipo = "fisica", max = 10) {
    _garantirInit();
    const colecao = tipo === "fisica" ? "pessoas_fisicas" : "pessoas_juridicas";
    const termoNorm = normalizarBusca(termo);
    if (!termoNorm) return [];
    const q = query(
      collection(_db, colecao),
      orderBy("nomeBusca"),
      where("nomeBusca", ">=", termoNorm),
      where("nomeBusca", "<=", termoNorm + "\uf8ff"),
      fsLimit(max)
    );
    const snaps = await getDocs(q);
    return snaps.docs.map(d => ({ id: d.id, tipo, ...d.data() }));
  },

  disclosure: CPF_CNPJ_DISCLOSURE
};

// ============================================================================
// 4. PRODUTOS / SERVIÇOS / SOLUÇÕES — catálogo comum entre apps
// ============================================================================

const produtos = {

  /**
   * @param {object} dados - { nome, tipo: 'produto'|'servico'|'solucao', categoria, descricao, precoBase, unidade, ativo }
   * Se dados.id vier preenchido, atualiza; senão, cria novo com ID automático.
   */
  async salvar(dados) {
    _garantirInit();
    const id = dados.id || doc(collection(_db, "produtos_servicos")).id;
    const ref = doc(_db, "produtos_servicos", id);
    const existente = await getDoc(ref);
    const payload = {
      ...dados,
      ...(dados.nome != null ? { nome: formatarTitulo(dados.nome) } : {}),
      ...(dados.categoria != null ? { categoria: formatarTitulo(dados.categoria) } : {}),
      id,
      ativo: dados.ativo !== undefined ? dados.ativo : true,
      atualizadoEm: serverTimestamp(),
      atualizadoPor: _nomeAppChamador,
      ...(existente.exists() ? {} : { criadoEm: serverTimestamp(), criadoPor: _nomeAppChamador })
    };
    await setDoc(ref, payload, { merge: true });
    return payload;
  },

  async buscar(id) {
    _garantirInit();
    const snap = await getDoc(doc(_db, "produtos_servicos", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  /**
   * Lista produtos/serviços, opcionalmente filtrando por tipo e só ativos.
   */
  async listar({ tipo = null, apenasAtivos = true } = {}) {
    _garantirInit();
    const clausulas = [];
    if (tipo) clausulas.push(where("tipo", "==", tipo));
    if (apenasAtivos) clausulas.push(where("ativo", "==", true));
    const q = query(collection(_db, "produtos_servicos"), ...clausulas);
    const snaps = await getDocs(q);
    return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async excluir(id) {
    _garantirInit();
    await deleteDoc(doc(_db, "produtos_servicos", id));
  }
};

// ============================================================================
// 5. LOCALIDADES — Cidades/UF (base fixa) + Bairros (aprendizado orgânico)
// ============================================================================

const localidades = {

  /**
   * Busca endereço completo a partir do CEP, usando ViaCEP (base oficial dos Correios).
   * Esta é a fonte PRIMÁRIA de bairro/cidade/UF — sempre prefira isso ao preenchimento manual.
   *
   * Também garante que a cidade exista em `cidades/{codigoIBGE}` (cria automaticamente
   * na primeira vez que aparece) e registra o bairro retornado, se houver.
   *
   * @returns {object|null} { cep, logradouro, bairro, cidade, uf, codigoIBGE, origem: 'cep' }
   *          bairro/logradouro podem vir vazios em cidades pequenas com CEP único —
   *          nesse caso, o app deve liberar o campo de bairro para digitação manual
   *          (use localidades.registrarBairro para gravar o valor digitado).
   */
  async buscarPorCEP(cep) {
    const cepLimpo = limparDocumento(cep);
    if (cepLimpo.length !== 8) throw new Error("CEP inválido: " + cep);

    const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const dados = await resp.json();
    if (dados.erro) return null;

    const resultado = {
      cep: cepLimpo,
      logradouro: formatarTitulo(dados.logradouro),
      bairro: formatarTitulo(dados.bairro),
      cidade: formatarTitulo(dados.localidade),
      uf: (dados.uf || "").toString().trim().toUpperCase(),
      codigoIBGE: dados.ibge || null,
      origem: "cep"
    };

    // Garante que a cidade exista na base local (criação automática sob demanda)
    if (resultado.codigoIBGE) {
      _garantirInit();
      const refCidade = doc(_db, "cidades", resultado.codigoIBGE);
      const existeCidade = await getDoc(refCidade);
      if (!existeCidade.exists()) {
        await setDoc(refCidade, {
          nome: resultado.cidade,
          uf: resultado.uf,
          criadoEm: serverTimestamp(),
          criadoPor: _nomeAppChamador,
          origem: "viacep"
        });
      }
      // Se o CEP já trouxe o bairro, registra como oficial (fonte CEP), sem precisar
      // esperar preenchimento manual do usuário.
      if (resultado.bairro) {
        await localidades.registrarBairro(resultado.codigoIBGE, resultado.bairro, "cep");
      }
    }

    return resultado;
  },

  /**
   * Busca cidades por UF (para popular <select>).
   * Populada automaticamente conforme os CEPs vão sendo consultados (buscarPorCEP),
   * sem necessidade de import antecipado.
   */
  async buscarCidadesPorUF(uf) {
    _garantirInit();
    const q = query(collection(_db, "cidades"), where("uf", "==", uf.toUpperCase()), orderBy("nome"));
    const snaps = await getDocs(q);
    return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /**
   * Busca bairros já conhecidos de uma cidade (autocomplete).
   * @param {string} codigoIBGE - id do documento da cidade
   */
  async buscarBairros(codigoIBGE) {
    _garantirInit();
    const snaps = await getDocs(collection(_db, "cidades", codigoIBGE, "bairros"));
    return snaps.docs.map(d => d.id.replace(/-/g, " "));
  },

  /**
   * Registra um bairro novo para uma cidade, se ainda não existir.
   *
   * Chame isso em dois cenários:
   *  1) origem='cep' — automaticamente, dentro de buscarPorCEP (já acontece sozinho).
   *  2) origem='manual' — quando o usuário digita o bairro à mão, porque o CEP
   *     dele não retornou bairro (ex: cidade pequena com CEP único).
   *
   * Bairros com origem='cep' são confiáveis (base oficial dos Correios).
   * Bairros com origem='manual' são aprendizado orgânico — úteis para autocomplete,
   * mas não têm garantia de exatidão oficial.
   */
  async registrarBairro(codigoIBGE, nomeBairro, origem = "manual") {
    _garantirInit();
    if (!codigoIBGE || !nomeBairro) return;
    const slug = nomeBairro.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
    const ref = doc(_db, "cidades", codigoIBGE, "bairros", slug);
    const existente = await getDoc(ref);
    if (!existente.exists()) {
      await setDoc(ref, {
        nomeOriginal: formatarTitulo(nomeBairro),
        origem, // 'cep' (oficial) ou 'manual' (aprendizado orgânico)
        criadoEm: serverTimestamp(),
        criadoPor: _nomeAppChamador
      });
    }
  }
};

// ============================================================================
// 6. AUTENTICAÇÃO (e-mail/senha) — usada por apps multiempresa como o Fênix Ativos
// ============================================================================
/**
 * @param {object} app - o objeto `app` retornado por initFirebase()
 */
function criarModuloAuth(app) {
  const auth = getAuth(app);
  return {
    aoMudarEstado(callback) {
      return onAuthStateChanged(auth, callback);
    },
    entrar(email, senha) {
      return signInWithEmailAndPassword(auth, email, senha).then(cred => cred.user);
    },
    criarConta(email, senha) {
      return createUserWithEmailAndPassword(auth, email, senha).then(cred => cred.user);
    },
    sair() {
      return signOut(auth);
    },
    recuperarSenha(email) {
      return sendPasswordResetEmail(auth, email);
    },
    usuarioAtual() {
      return auth.currentUser;
    }
  };
}

// ============================================================================
// 7. EMPRESAS — cadastro multiempresa e vínculo usuário↔empresa
// ============================================================================
/**
 * Estrutura no Firestore:
 *   empresas/{empresaId}                -> {nome, donoUid, donoEmail, criadoEm}
 *   empresas/{empresaId}/membros/{uid}  -> {email, papel, status, criadoEm}
 *   usuarios_empresa/{uid}                -> {empresaId, papel, status}  (índice rápido pra achar a empresa de um usuário)
 * @param {object} db - o objeto `db` retornado por initFirebase()
 */
function criarModuloEmpresas(db) {
  return {
    criarEmpresa(uid, email, nome) {
      const ref = doc(collection(db, "empresas"));
      const empresa = { nome, donoUid: uid, donoEmail: email, criadoEm: serverTimestamp() };
      return setDoc(ref, empresa).then(() =>
        setDoc(doc(db, "empresas", ref.id, "membros", uid), { email, papel: "dono", status: "aprovado", criadoEm: serverTimestamp() })
      ).then(() =>
        setDoc(doc(db, "usuarios_empresa", uid), { empresaId: ref.id, papel: "dono", status: "aprovado" })
      ).then(() => ({ id: ref.id, nome }));
    },
    obterEmpresa(empresaId) {
      return getDoc(doc(db, "empresas", empresaId)).then(snap => snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    obterEmpresaDoUsuario(uid) {
      return getDoc(doc(db, "usuarios_empresa", uid)).then(snap => snap.exists() ? snap.data() : null);
    },
    repararVinculo(uid, dadosParciais) {
      return updateDoc(doc(db, "usuarios_empresa", uid), dadosParciais);
    }
  };
}

// ============================================================================
// 8. CONVITES — convidar técnicos/membros pra uma empresa por link/token
// ============================================================================
/**
 * @param {object} db
 * @param {string} baseUrl - URL base do app (sem query string) usada pra montar o link do convite
 */
function criarModuloConvites(db, baseUrl) {
  function gerarToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  return {
    criarConvite(empresaId, criadorUid, criadorEmail, destinatario) {
      const token = gerarToken();
      const convite = {
        empresaId, criadoPorUid: criadorUid, criadoPor: criadorEmail,
        destinatario: destinatario || null, usado: false, cancelado: false, criadoEm: serverTimestamp()
      };
      return setDoc(doc(db, "convites", token), convite).then(() => ({ token, link: baseUrl + "?convite=" + token }));
    },
    obterConvite(token) {
      return getDoc(doc(db, "convites", token)).then(snap => snap.exists() ? { token, ...snap.data() } : null);
    },
    aceitarConvite(token, uid, email) {
      const refConvite = doc(db, "convites", token);
      return getDoc(refConvite).then(snap => {
        if (!snap.exists()) throw new Error("Convite não encontrado.");
        const convite = snap.data();
        if (convite.usado) throw new Error("Este convite já foi utilizado.");
        return setDoc(doc(db, "empresas", convite.empresaId, "membros", uid), { email, papel: "tecnico", status: "aprovado", criadoEm: serverTimestamp() })
          .then(() => setDoc(doc(db, "usuarios_empresa", uid), { empresaId: convite.empresaId, papel: "tecnico", status: "aprovado" }))
          .then(() => updateDoc(refConvite, { usado: true, usadoPorUid: uid, usadoEm: serverTimestamp() }))
          .then(() => getDoc(doc(db, "empresas", convite.empresaId)))
          .then(empSnap => ({ id: empSnap.id, ...empSnap.data() }));
      });
    },
    listarConvitesPendentes(empresaId) {
      return getDocs(query(collection(db, "convites"), where("empresaId", "==", empresaId), where("usado", "==", false)))
        .then(snap => snap.docs.filter(d => !d.data().cancelado).map(d => ({ token: d.id, ...d.data() })));
    },
    cancelarConvite(token) {
      return updateDoc(doc(db, "convites", token), { cancelado: true });
    }
  };
}

// ============================================================================
// 9. EQUIPE — membros de uma empresa
// ============================================================================
function criarModuloEquipe(db) {
  return {
    listarMembros(empresaId) {
      return getDocs(collection(db, "empresas", empresaId, "membros"))
        .then(snap => snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    },
    removerMembro(empresaId, uidAlvo) {
      return deleteDoc(doc(db, "empresas", empresaId, "membros", uidAlvo))
        .then(() => deleteDoc(doc(db, "usuarios_empresa", uidAlvo)).catch(() => {}));
    }
  };
}

// ============================================================================
// 10. APPDATA — mirror genérico de "tabelas" locais de um app, por empresa
// ============================================================================
/**
 * Guarda arrays inteiros (localStorage-like) na nuvem, um documento por
 * chave. Usado pelo Fênix Ativos pra sincronizar solucoes/ativos/kits/etc.
 * sem precisar de um schema próprio no fenix-core pra cada app.
 * @param {object} db
 * @param {string} empresaId
 * @param {string} nomeApp - namespace do app chamador (evita colisão entre apps na mesma empresa)
 */
function criarModuloAppData(db, empresaId, nomeApp) {
  return {
    salvar(chave, arr) {
      return setDoc(doc(db, "empresas", empresaId, "appData", nomeApp + "_" + chave), {
        dados: arr, atualizadoEm: serverTimestamp()
      }).then(() => true).catch(() => false);
    },
    carregar(chave) {
      return getDoc(doc(db, "empresas", empresaId, "appData", nomeApp + "_" + chave))
        .then(snap => snap.exists() ? (snap.data().dados || []) : null);
    }
  };
}

// ============================================================================
// 11. CATÁLOGOS POR EMPRESA — materiais, produtos/serviços, famílias de material
// ============================================================================
/** Helper genérico: coleção de catálogo dentro de uma empresa, "salvar" faz upsert pela chave informada. */
function _criarModuloCatalogoEmpresa(db, empresaId, nomeColecao, campoChave) {
  return {
    listar() {
      return getDocs(collection(db, "empresas", empresaId, nomeColecao))
        .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    salvar(obj) {
      const chave = obj[campoChave] || obj.id;
      if (!chave) return Promise.reject(new Error(nomeColecao + ": faltou o campo '" + campoChave + "' pra identificar o registro."));
      return setDoc(doc(db, "empresas", empresaId, nomeColecao, String(chave)), {
        ...obj, atualizadoEm: serverTimestamp()
      }, { merge: true }).then(() => true);
    },
    excluir(chave) {
      if (!chave) return Promise.reject(new Error(nomeColecao + ": faltou a chave pra excluir o registro."));
      return deleteDoc(doc(db, "empresas", empresaId, nomeColecao, String(chave)));
    }
  };
}
/**
 * Versão pública do helper acima — permite que QUALQUER app crie sua própria
 * coleção isolada dentro da empresa (empresas/{empresaId}/{nomeColecao}),
 * sem precisar que o fenix-core conheça o schema daquele app.
 * Ex: FenixCore.criarModuloCatalogoEmpresa(db, empresaId, "obras_terceirizadas", "id")
 * @param {object} db
 * @param {string} empresaId
 * @param {string} nomeColecao - nome livre, escolhido pelo app chamador
 * @param {string} campoChave - campo do objeto usado como ID do documento (default "id")
 */
function criarModuloCatalogoEmpresa(db, empresaId, nomeColecao, campoChave) {
  return _criarModuloCatalogoEmpresa(db, empresaId, nomeColecao, campoChave || "id");
}
function criarModuloMateriais(db, empresaId) {
  return _criarModuloCatalogoEmpresa(db, empresaId, "materiais", "codigoFabricante");
}
function criarModuloProdutosServicos(db, empresaId) {
  return _criarModuloCatalogoEmpresa(db, empresaId, "produtos_servicos", "id");
}
function criarModuloFamiliasMateriais(db, empresaId) {
  return _criarModuloCatalogoEmpresa(db, empresaId, "familias_materiais", "id");
}

// ============================================================================
// 12. PESSOAS POR EMPRESA — clientes de um app específico (distinto do
//     cadastro nacional de CPF/CNPJ compartilhado em `pessoas`, acima)
// ============================================================================
function criarModuloPessoas(db, empresaId) {
  return {
    listar() {
      return getDocs(collection(db, "empresas", empresaId, "pessoas"))
        .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    salvar(obj) {
      if (!obj.id) return Promise.reject(new Error("pessoas: registro sem id."));
      return setDoc(doc(db, "empresas", empresaId, "pessoas", obj.id), {
        ...obj, atualizadoEm: serverTimestamp()
      }, { merge: true }).then(() => true);
    },
    arquivar(obj, arquivado) {
      if (!obj.id) return Promise.reject(new Error("pessoas: registro sem id."));
      return updateDoc(doc(db, "empresas", empresaId, "pessoas", obj.id), { arquivado: !!arquivado });
    },
    excluir(obj) {
      if (!obj.id) return Promise.reject(new Error("pessoas: registro sem id."));
      return deleteDoc(doc(db, "empresas", empresaId, "pessoas", obj.id));
    }
  };
}

// ============================================================================
// 13. BACKUP — alerta quando o usuário passa mais de 7 dias sem cópia de segurança
// ============================================================================
/**
 * O Core cuida do lembrete e da contagem de dias; quem sabe exportar os dados
 * é o próprio app (aoFazerBackup). A data do último backup fica no
 * localStorage do aparelho, separada por app.
 */
const _BACKUP_ULTIMO = "fenix_backup_ultimo__";
const _BACKUP_INICIO = "fenix_backup_inicio__";
const _BACKUP_ADIADO = "fenix_backup_adiado__";
const _MS_DIA = 24 * 60 * 60 * 1000;

function _lerData(chave) {
  try {
    const v = localStorage.getItem(chave);
    const d = v ? new Date(v) : null;
    return d && !isNaN(d.getTime()) ? d : null;
  } catch (e) { return null; }
}

function _perguntarBackup(nomeApp, dias) {
  return new Promise(resolve => {
    const fundo = document.createElement("div");
    fundo.setAttribute("role", "dialog");
    fundo.setAttribute("aria-modal", "true");
    fundo.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,7,51,.6);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;";
    const caixa = document.createElement("div");
    caixa.style.cssText = "background:#fff;color:#000;max-width:400px;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.35);";
    const topo = document.createElement("div");
    topo.style.cssText = "background:linear-gradient(135deg,#040798,#0076CE);color:#fff;padding:14px 18px;font-weight:700;font-size:16px;";
    topo.textContent = "Cópia de segurança";
    const corpo = document.createElement("div");
    corpo.style.cssText = "padding:18px;font-size:15px;line-height:1.45;";
    corpo.textContent = "Faz " + dias + " dias que você não faz uma cópia de segurança dos seus dados. Deseja fazer agora?";
    const botoes = document.createElement("div");
    botoes.style.cssText = "display:flex;gap:10px;padding:0 18px 18px;justify-content:flex-end;flex-wrap:wrap;";
    const btnNao = document.createElement("button");
    btnNao.type = "button";
    btnNao.textContent = "Agora não";
    btnNao.style.cssText = "padding:10px 16px;border-radius:8px;border:1px solid #0076CE;background:#fff;color:#0076CE;font-size:15px;cursor:pointer;";
    const btnSim = document.createElement("button");
    btnSim.type = "button";
    btnSim.textContent = "Fazer backup agora";
    btnSim.style.cssText = "padding:10px 16px;border-radius:8px;border:0;background:#0076CE;color:#fff;font-size:15px;font-weight:600;cursor:pointer;";
    function fechar(resposta) {
      document.removeEventListener("keydown", aoTeclar);
      fundo.remove();
      resolve(resposta);
    }
    function aoTeclar(ev) { if (ev.key === "Escape") fechar(false); }
    btnNao.addEventListener("click", () => fechar(false));
    btnSim.addEventListener("click", () => fechar(true));
    document.addEventListener("keydown", aoTeclar);
    botoes.append(btnNao, btnSim);
    caixa.append(topo, corpo, botoes);
    fundo.appendChild(caixa);
    document.body.appendChild(fundo);
    btnSim.focus();
  });
}

const backup = {
  DIAS_PADRAO: 7,

  /** Data do último backup registrado (Date) ou null. */
  ultimo(nomeApp) {
    return _lerData(_BACKUP_ULTIMO + nomeApp);
  },

  /** Marca que um backup acabou de ser feito (zera a contagem). */
  registrar(nomeApp) {
    try { localStorage.setItem(_BACKUP_ULTIMO + nomeApp, new Date().toISOString()); } catch (e) { /* sem storage */ }
  },

  /** Dias inteiros desde o último backup (ou desde a 1ª abertura, se nunca fez). null se não der para saber. */
  diasSemBackup(nomeApp) {
    const ref = backup.ultimo(nomeApp) || _lerData(_BACKUP_INICIO + nomeApp);
    return ref ? Math.floor((Date.now() - ref.getTime()) / _MS_DIA) : null;
  },

  /**
   * Baixa um arquivo JSON com os dados e registra o backup.
   * Nome do arquivo: {nomeApp}-backup-AAAA-MM-DD.json
   */
  baixarJSON(nomeApp, dados) {
    const hoje = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeApp + "-backup-" + hoje + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    backup.registrar(nomeApp);
  },

  /**
   * Chame uma vez depois do boot do app. Se passou MAIS de `dias` dias sem
   * backup, abre o alerta. "Fazer backup agora" chama aoFazerBackup e, se não
   * der erro (e não retornar false), registra o backup. "Agora não" não
   * pergunta de novo até a próxima abertura do app.
   * @param {string} nomeApp
   * @param {object} opcoes - { dias = 7, aoFazerBackup: async () => {...}, aoRecusar }
   * @returns {Promise<"nao-necessario"|"adiado"|"feito"|"erro">}
   */
  async verificarLembrete(nomeApp, opcoes = {}) {
    const { dias = backup.DIAS_PADRAO, aoFazerBackup, aoRecusar } = opcoes;
    if (typeof aoFazerBackup !== "function") {
      throw new Error("backup.verificarLembrete: informe a função aoFazerBackup.");
    }
    // Primeira abertura: a contagem dos dias começa hoje.
    let inicio = _lerData(_BACKUP_INICIO + nomeApp);
    if (!inicio) {
      try { localStorage.setItem(_BACKUP_INICIO + nomeApp, new Date().toISOString()); } catch (e) { /* sem storage */ }
      inicio = new Date();
    }
    const referencia = backup.ultimo(nomeApp) || inicio;
    if (Date.now() - referencia.getTime() <= dias * _MS_DIA) return "nao-necessario";

    try {
      if (sessionStorage.getItem(_BACKUP_ADIADO + nomeApp)) return "adiado";
    } catch (e) { /* sem sessionStorage */ }

    const quer = await _perguntarBackup(nomeApp, backup.diasSemBackup(nomeApp));
    if (!quer) {
      try { sessionStorage.setItem(_BACKUP_ADIADO + nomeApp, "1"); } catch (e) { /* sem sessionStorage */ }
      if (typeof aoRecusar === "function") aoRecusar();
      return "adiado";
    }
    try {
      const resultado = await aoFazerBackup();
      if (resultado !== false) backup.registrar(nomeApp);
      return "feito";
    } catch (e) {
      console.error("FenixCore.backup: falha ao fazer o backup:", e);
      return "erro";
    }
  }
};

// ============================================================================
// 14. SOBRE — contador de acessos e datas do app neste aparelho
// ============================================================================
/**
 * Tudo fica no localStorage do aparelho, separado por app. Não envia nada
 * para fora do aparelho.
 */
const _SOBRE_DADOS = "fenix_sobre__";
const _SOBRE_SESSAO = "fenix_sobre_sessao__";

function _lerSobre(nomeApp) {
  try {
    const bruto = localStorage.getItem(_SOBRE_DADOS + nomeApp);
    const obj = bruto ? JSON.parse(bruto) : null;
    return obj && typeof obj === "object" && obj.primeiroAcesso ? obj : null;
  } catch (e) { return null; }
}

function _montarSobre(d) {
  const dataCurta = sobre.formatarData(d.instaladaEm, false);
  return {
    acessos: d.acessos || 0,
    primeiroAcesso: d.primeiroAcesso,
    primeiroAcessoTexto: sobre.formatarData(d.primeiroAcesso),
    versao: d.versao || null,
    instaladaEm: d.instaladaEm,
    instaladaEmTexto: sobre.formatarData(d.instaladaEm),
    ultimaAtualizacaoTexto: (d.versao ? d.versao + " instalada em " : "Instalada em ") + dataCurta,
    historico: d.historico || []
  };
}

const sobre = {
  /**
   * Formata uma data ISO como "02/10/2026 14:30" (ou só "02/10/2026" se comHora = false).
   * Usa o fuso do aparelho. Retorna "" se a data for inválida.
   */
  formatarData(iso, comHora = true) {
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return "";
    const dois = n => String(n).padStart(2, "0");
    const data = dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear();
    return comHora ? data + " " + dois(d.getHours()) + ":" + dois(d.getMinutes()) : data;
  },

  /**
   * Registra a abertura do app. Chame uma vez no boot.
   * - Conta 1 acesso por sessão (recarregar a página não conta de novo).
   * - Guarda data/hora do primeiro acesso neste aparelho.
   * - Se a versão informada mudou, guarda a data da instalação da nova versão.
   * @param {string} nomeApp - mesmo identificador usado em init()/backup
   * @param {string} versao - versão atual do app, ex: "v1.0"
   * @returns {object} { acessos, primeiroAcesso, primeiroAcessoTexto, versao,
   *   instaladaEm, instaladaEmTexto, ultimaAtualizacaoTexto, historico }
   */
  registrarAcesso(nomeApp, versao) {
    const agora = new Date().toISOString();
    let dados = _lerSobre(nomeApp);
    if (!dados) {
      dados = { acessos: 0, primeiroAcesso: agora, versao: versao || null, instaladaEm: agora, historico: versao ? [{ versao, em: agora }] : [] };
      // A contagem dos 7 dias do alerta de backup parte do primeiro acesso.
      try {
        if (!localStorage.getItem(_BACKUP_INICIO + nomeApp)) localStorage.setItem(_BACKUP_INICIO + nomeApp, agora);
      } catch (e) { /* sem storage */ }
    } else if (versao && dados.versao !== versao) {
      dados.versao = versao;
      dados.instaladaEm = agora;
      dados.historico = [...(dados.historico || []), { versao, em: agora }].slice(-20);
    }
    let novaSessao = true;
    try {
      if (sessionStorage.getItem(_SOBRE_SESSAO + nomeApp)) novaSessao = false;
      else sessionStorage.setItem(_SOBRE_SESSAO + nomeApp, "1");
    } catch (e) { /* sem sessionStorage: conta como nova sessão */ }
    if (novaSessao) dados.acessos = (dados.acessos || 0) + 1;
    try { localStorage.setItem(_SOBRE_DADOS + nomeApp, JSON.stringify(dados)); } catch (e) { /* sem storage */ }
    return _montarSobre(dados);
  },

  /** Lê os dados atuais sem contar acesso. Retorna null se o app nunca registrou acesso. */
  obter(nomeApp) {
    const dados = _lerSobre(nomeApp);
    return dados ? _montarSobre(dados) : null;
  }
};

// ============================================================================
// 15. SINCRONIA PESSOAL — dados privados do usuário, multi-aparelho
// ============================================================================
/**
 * Estrutura: dados_pessoais/{uid}/{nomeApp}_{colecao}/{id}
 * Cada documento é gravado por inteiro (a última gravação vale) e leva o campo
 * interno "_u" (horário corrigido pelo servidor, em ms), que não é devolvido
 * ao app: o app recebe "atualizadoEm" à parte.
 * @param {object} db - de initFirebaseComCache() (ou initFirebase())
 * @param {string} uid - uid do usuário logado
 * @param {string} nomeApp - namespace do app, ex: "fenix-tempo"
 */
function criarModuloSincronia(db, uid, nomeApp) {
  if (!uid) throw new Error("criarModuloSincronia: faltou o uid do usuário logado.");
  if (!nomeApp) throw new Error("criarModuloSincronia: faltou o nomeApp.");
  const CHAVE_RELOGIO = "fenix_relogio__" + nomeApp;
  let offset = 0;
  try { const v = Number(localStorage.getItem(CHAVE_RELOGIO)); if (isFinite(v)) offset = v; } catch (e) { /* sem storage */ }
  const nomeCol = nome => nomeApp + "_" + nome;
  const col = nome => collection(db, "dados_pessoais", uid, nomeCol(nome));
  const ref = (nome, id) => doc(db, "dados_pessoais", uid, nomeCol(nome), String(id));
  const agora = () => Date.now() + offset;
  // Firestore não aceita "undefined": remove-os (e copia o objeto).
  const limpar = obj => JSON.parse(JSON.stringify(obj));
  const comMarca = obj => ({ ...limpar(obj), _u: agora() });

  return {
    /** Horário atual corrigido pela diferença com o servidor. */
    agora,
    /** Diferença atual (ms) entre o servidor e o relógio do aparelho. */
    relogio() { return offset; },

    /**
     * Escuta uma coleção em tempo real.
     * aoMudar(mudancas, meta): mudancas = [{tipo:"added"|"modified"|"removed", id, dados,
     *   atualizadoEm, pendente}]; pendente=true é uma gravação deste aparelho ainda não
     *   confirmada. meta = {doCache, pendente}; doCache=true quando veio só do cache.
     * @returns {function} cancela a escuta
     */
    ouvir(nome, aoMudar, aoErro) {
      return onSnapshot(col(nome), snap => {
        const mudancas = snap.docChanges().map(c => {
          const dados = c.doc.data();
          const atualizadoEm = dados._u || 0;
          delete dados._u;
          return { tipo: c.type, id: c.doc.id, dados, atualizadoEm, pendente: c.doc.metadata.hasPendingWrites };
        });
        aoMudar(mudancas, { doCache: snap.metadata.fromCache, pendente: snap.metadata.hasPendingWrites });
      }, err => {
        if (typeof aoErro === "function") aoErro(err);
        else console.error("FenixCore.sincronia:", err);
      });
    },

    /** Grava (substitui) um documento; obj.id é obrigatório. */
    salvar(nome, obj) {
      if (!obj || obj.id == null) return Promise.reject(new Error(nome + ": registro sem id."));
      return setDoc(ref(nome, obj.id), comMarca(obj));
    },

    /** Grava vários documentos (em lotes de 400). */
    async salvarVarios(nome, lista) {
      for (let i = 0; i < lista.length; i += 400) {
        const lote = writeBatch(db);
        lista.slice(i, i + 400).forEach(o => {
          if (o == null || o.id == null) throw new Error(nome + ": registro sem id.");
          lote.set(ref(nome, o.id), comMarca(o));
        });
        await lote.commit();
      }
      return true;
    },

    excluir(nome, id) {
      if (id == null) return Promise.reject(new Error(nome + ": faltou o id para excluir."));
      return deleteDoc(ref(nome, id));
    },

    /**
     * Mede a diferença entre o relógio do aparelho e o do servidor (ms) e guarda
     * no aparelho. Precisa de internet; sem resposta em 8 s mantém o valor anterior.
     */
    async medirRelogio() {
      const r = doc(db, "dados_pessoais", uid, nomeCol("sistema"), "relogio");
      const medir = (async () => {
        const t0 = Date.now();
        await setDoc(r, { t: serverTimestamp() });
        const t1 = Date.now();
        const snap = await getDocFromServer(r);
        const t = snap.data() && snap.data().t;
        if (!t || !t.toMillis) return offset;
        return Math.round(t.toMillis() - (t0 + t1) / 2);
      })();
      const limite = new Promise(res => setTimeout(() => res(null), 8000));
      const novo = await Promise.race([medir, limite]).catch(() => null);
      if (novo != null && isFinite(novo)) {
        offset = novo;
        try { localStorage.setItem(CHAVE_RELOGIO, String(offset)); } catch (e) { /* sem storage */ }
      }
      return offset;
    }
  };
}

// ============================================================================
// EXPORTAÇÃO
// ============================================================================

export const FenixCore = {
  init,
  initFirebase,
  initFirebaseComCache,
  criarModuloAuth,
  criarModuloEmpresas,
  criarModuloConvites,
  criarModuloEquipe,
  criarModuloAppData,
  criarModuloMateriais,
  criarModuloProdutosServicos,
  criarModuloFamiliasMateriais,
  criarModuloCatalogoEmpresa,
  criarModuloPessoas,
  criarModuloSincronia,
  pessoas,
  produtos,
  localidades,
  backup,
  sobre,
  validarCPF,
  validarCNPJ,
  formatarCPF,
  formatarCNPJ,
  formatarDocumento,
  limparDocumento,
  normalizarBusca,
  formatarTitulo,
  formatarNomeMaiusculo,
  tipoDocumento,
  CPF_CNPJ_DISCLOSURE,
  EMPRESA
};

/**
 * ============================================================================
 * EXEMPLO DE USO EM UM APP (ex: Fênix Financiamentos)
 * ============================================================================
 *
 * <script type="module">
 *   import { FenixCore } from "https://fenicris-dev.github.io/Fenix-Core/fenix-core.js";
 *
 *   FenixCore.init("fenix-financiamentos");
 *
 *   // Tela "Sobre": conta o acesso e devolve os textos prontos
 *   const info = FenixCore.sobre.registrarAcesso("fenix-financiamentos", "v1.0");
 *   // info.acessos | info.primeiroAcessoTexto | info.ultimaAtualizacaoTexto
 *
 *   // Alerta de backup (mais de 7 dias sem cópia de segurança):
 *   FenixCore.backup.verificarLembrete("fenix-financiamentos", {
 *     aoFazerBackup: () => FenixCore.backup.baixarJSON("fenix-financiamentos", meusDados)
 *   });
 *
 *   // Dados da Fênix (rodapé, documentos): FenixCore.EMPRESA.cnpjFormatado, FenixCore.EMPRESA.email
 *
 *   // Ao digitar o CPF do cliente no formulário:
 *   const cpfDigitado = "12345678900";
 *   const pessoa = await FenixCore.pessoas.buscar(cpfDigitado);
 *
 *   if (pessoa) {
 *     // preenche o formulário automaticamente
 *     document.getElementById("nome").value = pessoa.nome;
 *     document.getElementById("endereco").value = pessoa.endereco?.logradouro || "";
 *   } else {
 *     // mostra formulário de cadastro novo
 *
 *     // 1) Ao digitar o CEP, busca endereço oficial (Correios via ViaCEP):
 *     const endereco = await FenixCore.localidades.buscarPorCEP("49000-000");
 *     if (endereco) {
 *       document.getElementById("logradouro").value = endereco.logradouro;
 *       document.getElementById("cidade").value = endereco.cidade;
 *       document.getElementById("uf").value = endereco.uf;
 *       if (endereco.bairro) {
 *         // CEP trouxe o bairro (caso comum) — já preenche e já está registrado
 *         document.getElementById("bairro").value = endereco.bairro;
 *       } else {
 *         // CEP genérico de cidade pequena, sem bairro — libera campo manual
 *         document.getElementById("bairro").disabled = false;
 *         // ao usuário digitar e sair do campo:
 *         // await FenixCore.localidades.registrarBairro(endereco.codigoIBGE, valorDigitado, "manual");
 *       }
 *     }
 *
 *     // 2) Ao salvar o cadastro:
 *     await FenixCore.pessoas.salvarFisica({
 *       cpf: cpfDigitado,
 *       nome: "João da Silva",
 *       telefone: "(79) 99999-0000",
 *       email: "joao@email.com",
 *       endereco: {
 *         cep: "49000-000", logradouro: "Rua Y", numero: "123",
 *         bairro: "Centro", cidade: "Aracaju", uf: "SE"
 *       }
 *     });
 *   }
 *
 *   // Autocomplete por nome (prefixo, sem diferenciar maiúsculas/acentos):
 *   // const achados = await FenixCore.pessoas.buscarPorNome("joao", "fisica");
 *
 *   // Mesma lógica serve para CNPJ, buscando na Receita Federal:
 *   const dadosReceita = await FenixCore.pessoas.buscarNaReceita("12345678000199");
 *   if (dadosReceita) {
 *     document.getElementById("razaoSocial").value = dadosReceita.razaoSocial;
 *     document.getElementById("cidade").value = dadosReceita.endereco.cidade;
 *     // etc. — depois, ao salvar, chama FenixCore.pessoas.salvarJuridica(dadosReceita)
 *   }
 * </script>
 *
 * // No app operacional (banco próprio do Financiamentos), grava só a referência:
 * // { cpfCliente: "12345678900", valorFinanciado: 15000, ... }
 * // Nunca duplica nome/endereço lá — sempre busca no FenixCore quando precisar exibir.
 * ============================================================================
 */
