// dashboard.js — Monta os conjuntos de dados usados pelos gráficos (Chart.js) do Dashboard

import { listarPorMes, listarPorPeriodo, totalEntradas, totalSaidas } from './lancamentos.js';
import { mesAtualRef, somarMesesRef, nomeMesRef } from './utils.js';

// Resumo (cards) + pizza de categorias, aplicando os filtros da tela
export async function resumoFiltrado({ mesRef, tipo, categoria, status }) {
  let lista;
  if (mesRef) {
    lista = await listarPorMes(mesRef);
  } else {
    lista = await listarPorPeriodo({});
  }
  if (tipo) lista = lista.filter((l) => l.tipo === tipo);
  if (categoria) lista = lista.filter((l) => l.categoria === categoria);
  if (status) lista = lista.filter((l) => l.status === status);

  const entradas = totalEntradas(lista);
  const saidas = totalSaidas(lista);

  // Agrupa saídas por categoria para o gráfico de pizza
  const porCategoria = {};
  lista
    .filter((l) => l.tipo === 'saida')
    .forEach((l) => {
      porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + l.valor;
    });

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
    pizzaCategorias: Object.keys(porCategoria),
    pizzaValores: Object.values(porCategoria)
  };
}

// Entradas x Saídas dos últimos 12 meses (para o gráfico de barras)
export async function entradasSaidasUltimos12Meses() {
  const mesAtual = mesAtualRef();
  const meses = [];
  for (let i = 11; i >= 0; i--) {
    meses.push(somarMesesRef(mesAtual, -i));
  }
  const entradas = [];
  const saidas = [];
  for (const mesRef of meses) {
    const lista = await listarPorMes(mesRef);
    entradas.push(totalEntradas(lista));
    saidas.push(totalSaidas(lista));
  }
  return {
    rotulos: meses.map((m) => nomeMesRef(m)),
    entradas,
    saidas
  };
}

// Saldo acumulado mês a mês, últimos 12 meses (para o gráfico de linha)
export async function saldoAcumuladoUltimos12Meses() {
  const { rotulos, entradas, saidas } = await entradasSaidasUltimos12Meses();
  const acumulado = [];
  let soma = 0;
  for (let i = 0; i < entradas.length; i++) {
    soma += entradas[i] - saidas[i];
    acumulado.push(soma);
  }
  return { rotulos, acumulado };
}
