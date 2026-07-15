// lancamentos.js — Regras de negócio dos lançamentos (CRUD, parcelamento e geração mensal)

import { db, getConfig, setConfig } from './db.js';
import {
  hojeISO,
  mesAtualRef,
  mesReferenciaDe,
  somarMesesRef,
  somarMesesData,
  montarDataDoMes,
  uuid
} from './utils.js';

// ---------- Consultas ----------

// Lista os lançamentos de um mês (YYYY-MM), ordenados por vencimento
export async function listarPorMes(mesRef) {
  const lista = await db.lancamentos.where('mesReferencia').equals(mesRef).toArray();
  return lista.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
}

// Lista lançamentos dentro de um período (datas ISO inclusivas), com filtros opcionais
export async function listarPorPeriodo({ inicio, fim, tipo, categoria, status } = {}) {
  let colecao = db.lancamentos.toCollection();
  const lista = await colecao.toArray();
  return lista.filter((l) => {
    if (inicio && l.dataVencimento < inicio) return false;
    if (fim && l.dataVencimento > fim) return false;
    if (tipo && l.tipo !== tipo) return false;
    if (categoria && l.categoria !== categoria) return false;
    if (status && l.status !== status) return false;
    return true;
  });
}

// Todas as parcelas de um grupo de parcelamento
export async function listarGrupoParcelamento(grupoParcelamentoId) {
  const lista = await db.lancamentos.where('grupoParcelamentoId').equals(grupoParcelamentoId).toArray();
  return lista.sort((a, b) => a.parcelaAtual - b.parcelaAtual);
}

// Todos os grupos de parcelamento ainda com parcelas pendentes
export async function listarParceladasAtivas() {
  const todas = await db.lancamentos.where('origem').equals('parcelada').toArray();
  const grupos = {};
  for (const l of todas) {
    if (!l.grupoParcelamentoId) continue;
    if (!grupos[l.grupoParcelamentoId]) grupos[l.grupoParcelamentoId] = [];
    grupos[l.grupoParcelamentoId].push(l);
  }
  const ativos = [];
  for (const id in grupos) {
    const parcelas = grupos[id].sort((a, b) => a.parcelaAtual - b.parcelaAtual);
    const pendentes = parcelas.filter((p) => p.status === 'pendente');
    if (pendentes.length > 0) {
      ativos.push({ grupoParcelamentoId: id, parcelas, pendentes });
    }
  }
  return ativos;
}

// ---------- CRUD básico ----------

export async function salvarLancamento(lancamento) {
  return db.lancamentos.add(lancamento);
}

export async function atualizarLancamento(id, dados) {
  return db.lancamentos.update(id, dados);
}

export async function excluirLancamento(id) {
  return db.lancamentos.delete(id);
}

// Exclui uma parcela específica ou todas as parcelas futuras (não pagas) do grupo
export async function excluirParcelada(id, escopo) {
  const lancamento = await db.lancamentos.get(id);
  if (!lancamento) return;
  if (escopo === 'somente-esta' || !lancamento.grupoParcelamentoId) {
    await db.lancamentos.delete(id);
    return;
  }
  // 'todas-futuras': remove esta e as próximas ainda não pagas do mesmo grupo
  const grupo = await listarGrupoParcelamento(lancamento.grupoParcelamentoId);
  const idsParaExcluir = grupo
    .filter((p) => p.parcelaAtual >= lancamento.parcelaAtual && p.status === 'pendente')
    .map((p) => p.id);
  await db.lancamentos.bulkDelete(idsParaExcluir);
}

// Marca um lançamento como pago (registra data de pagamento)
export async function marcarComoPago(id) {
  await db.lancamentos.update(id, { status: 'pago', dataPagamento: hojeISO() });
}

// Reverte o pagamento (volta para pendente)
export async function desmarcarPagamento(id) {
  await db.lancamentos.update(id, { status: 'pendente', dataPagamento: null });
}

// ---------- Criação de lançamento avulso (entrada ou saída única) ----------

export async function criarAvulso({ tipo, categoria, descricao, valor, data }) {
  return salvarLancamento({
    tipo,
    categoria,
    descricao,
    valor,
    dataVencimento: data,
    dataPagamento: null,
    status: 'pendente',
    origem: 'avulsa',
    parcelaAtual: null,
    parcelaTotal: null,
    grupoParcelamentoId: null,
    modeloId: null,
    mesReferencia: mesReferenciaDe(data)
  });
}

// ---------- Criação de parcelamento (gera todas as parcelas futuras de uma vez) ----------

export async function criarParcelamento({ categoria, descricao, valorTotal, valorParcela, parcelaTotal, primeiraData }) {
  const valorCadaParcela = valorParcela || Number((valorTotal / parcelaTotal).toFixed(2));
  const grupoParcelamentoId = uuid();
  const registros = [];
  for (let i = 1; i <= parcelaTotal; i++) {
    const dataVencimento = i === 1 ? primeiraData : somarMesesData(primeiraData, i - 1);
    registros.push({
      tipo: 'saida',
      categoria,
      descricao,
      valor: valorCadaParcela,
      dataVencimento,
      dataPagamento: null,
      status: 'pendente',
      origem: 'parcelada',
      parcelaAtual: i,
      parcelaTotal,
      grupoParcelamentoId,
      modeloId: null,
      mesReferencia: mesReferenciaDe(dataVencimento)
    });
  }
  await db.lancamentos.bulkAdd(registros);
  return grupoParcelamentoId;
}

// ---------- Modelos (contas fixas e receitas recorrentes) ----------

// duracaoMeses: null/undefined = repete todos os meses, sem fim. Um número = repete só por essa quantidade de meses.
export async function criarModelo({ tipo, categoria, descricao, valor, diaVencimento, duracaoMeses = null }) {
  return db.modelos.add({
    tipo,
    categoria,
    descricao,
    valor,
    diaVencimento,
    ativo: true,
    duracaoMeses: duracaoMeses || null,
    mesInicio: mesAtualRef()
  });
}

export async function listarModelos() {
  return db.modelos.toArray();
}

export async function atualizarModelo(id, dados) {
  return db.modelos.update(id, dados);
}

export async function excluirModelo(id) {
  return db.modelos.delete(id);
}

// Último mês (YYYY-MM) em que um modelo com duração definida ainda deve gerar lançamento.
// Retorna null se o modelo não tiver duração definida (repete todos os meses, sem fim).
export function calcularMesFimModelo(modelo) {
  if (!modelo.duracaoMeses || !modelo.mesInicio) return null;
  return somarMesesRef(modelo.mesInicio, modelo.duracaoMeses - 1);
}

// Gera, para um modelo e mês específicos, o lançamento correspondente (se ainda não existir)
async function gerarLancamentoDoModelo(modelo, mesRef) {
  const mesFim = calcularMesFimModelo(modelo);
  if (mesFim && mesRef > mesFim) return; // já passou da duração definida, não gera mais

  const existente = await db.lancamentos
    .where('[modeloId+mesReferencia]')
    .equals([modelo.id, mesRef])
    .first();
  if (existente) return;

  const dataVencimento = montarDataDoMes(mesRef, modelo.diaVencimento);
  await salvarLancamento({
    tipo: modelo.tipo,
    categoria: modelo.categoria,
    descricao: modelo.descricao,
    valor: modelo.valor,
    dataVencimento,
    dataPagamento: null,
    status: 'pendente',
    origem: modelo.tipo === 'saida' ? 'fixa' : 'recorrente',
    parcelaAtual: null,
    parcelaTotal: null,
    grupoParcelamentoId: null,
    modeloId: modelo.id,
    mesReferencia: mesRef
  });
}

// Gera imediatamente o lançamento do mês atual para um modelo recém-criado
// (assim uma conta fixa/recorrente cadastrada no meio do mês já aparece em "Contas do mês")
export async function gerarInstanciaMesAtual(modeloId) {
  const modelo = await db.modelos.get(modeloId);
  if (modelo) await gerarLancamentoDoModelo(modelo, mesAtualRef());
}

// Verifica, ao abrir o app, se é preciso gerar lançamentos de meses ainda não processados.
// Evita duplicar (trava por modeloId+mesReferencia) e cobre meses em que o app ficou fechado.
export async function verificarGeracaoMensal() {
  const mesAtual = mesAtualRef();
  let ultimaGeracao = await getConfig('ultimaGeracaoMes', null);

  // Primeira vez usando o app: gera apenas o mês atual, sem "backfill" de meses anteriores
  if (!ultimaGeracao) {
    ultimaGeracao = somarMesesRef(mesAtual, -1);
  }

  const modelos = await listarModelos();
  const modelosAtivos = modelos.filter((m) => m.ativo);

  let mesProcessando = somarMesesRef(ultimaGeracao, 1);
  while (mesProcessando <= mesAtual) {
    for (const modelo of modelosAtivos) {
      await gerarLancamentoDoModelo(modelo, mesProcessando);
    }
    mesProcessando = somarMesesRef(mesProcessando, 1);
  }

  await setConfig('ultimaGeracaoMes', mesAtual);
}

// ---------- Totais auxiliares ----------

export function totalPendente(lista) {
  return lista.filter((l) => l.tipo === 'saida' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
}

export function totalPago(lista) {
  return lista.filter((l) => l.tipo === 'saida' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
}

export function totalEntradas(lista) {
  return lista.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0);
}

export function totalSaidas(lista) {
  return lista.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0);
}
