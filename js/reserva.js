// reserva.js — Reserva de emergência, sugestão de guardar/mês, "matar contas" (bola de neve) e alerta de gasto alto

import { db, getConfig, setConfig } from './db.js';
import { listarPorMes, listarParceladasAtivas, totalEntradas, totalSaidas } from './lancamentos.js';
import { mesAtualRef, somarMesesRef, somarMesesData } from './utils.js';

// ---------- Meta de reserva de emergência ----------

export async function obterMetaReserva() {
  return {
    valorAlvo: await getConfig('metaReservaValor', 0),
    valorAtual: await getConfig('metaReservaAtual', 0)
  };
}

export async function definirMetaReserva(valorAlvo) {
  await setConfig('metaReservaValor', valorAlvo);
}

// Soma (ou subtrai, se negativo) um valor ao total já guardado na reserva
export async function ajustarValorReserva(delta) {
  const atual = await getConfig('metaReservaAtual', 0);
  const novo = Math.max(0, atual + delta);
  await setConfig('metaReservaAtual', novo);
  return novo;
}

// ---------- Sugestão de quanto guardar por mês ----------

// Média da sobra (entradas - saídas) dos últimos 3 meses fechados (não considera o mês atual)
export async function sugestaoGuardarPorMes() {
  const mesAtual = mesAtualRef();
  let soma = 0;
  let meses = 0;
  for (let i = 1; i <= 3; i++) {
    const mesRef = somarMesesRef(mesAtual, -i);
    const lista = await listarPorMes(mesRef);
    if (lista.length === 0) continue;
    const sobra = totalEntradas(lista) - totalSaidas(lista);
    soma += sobra;
    meses++;
  }
  if (meses === 0) return 0;
  const media = soma / meses;
  return media > 0 ? media : 0;
}

// ---------- Modo "matar contas" (bola de neve) ----------

// Lista os parcelamentos ativos ordenados do menor para o maior saldo devedor,
// com a projeção de data de quitação (vencimento da última parcela pendente)
export async function listarModoMatarContas() {
  const grupos = await listarParceladasAtivas();
  const resultado = grupos.map((g) => {
    const saldoDevedor = g.pendentes.reduce((s, p) => s + p.valor, 0);
    const ultimaPendente = g.pendentes[g.pendentes.length - 1];
    const primeira = g.parcelas[0];
    return {
      grupoParcelamentoId: g.grupoParcelamentoId,
      descricao: primeira.descricao,
      categoria: primeira.categoria,
      saldoDevedor,
      parcelasRestantes: g.pendentes.length,
      parcelaTotal: primeira.parcelaTotal,
      parcelaAtual: primeira.parcelaTotal - g.pendentes.length + 1,
      valorParcela: primeira.valor,
      dataQuitacao: ultimaPendente.dataVencimento
    };
  });
  return resultado.sort((a, b) => a.saldoDevedor - b.saldoDevedor);
}

// ---------- Alerta de gasto acima da média ----------

// Compara as saídas do mês atual com 110% da média das saídas dos últimos 3 meses fechados
export async function verificarAlertaGastoAlto() {
  const mesAtual = mesAtualRef();
  const listaAtual = await listarPorMes(mesAtual);
  const gastoAtual = totalSaidas(listaAtual);

  let soma = 0;
  let meses = 0;
  for (let i = 1; i <= 3; i++) {
    const mesRef = somarMesesRef(mesAtual, -i);
    const lista = await listarPorMes(mesRef);
    if (lista.length === 0) continue;
    soma += totalSaidas(lista);
    meses++;
  }
  if (meses === 0) return { alerta: false };

  const media = soma / meses;
  const limite = media * 1.1;
  return {
    alerta: gastoAtual > limite && media > 0,
    gastoAtual,
    media,
    limite
  };
}
