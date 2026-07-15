// export.js — Exportação para planilha (XLSX via SheetJS) e CSV

import { listarPorPeriodo } from './lancamentos.js';
import { hojeISO } from './utils.js';

// Converte "YYYY-MM-DD" em objeto Date (meio-dia, para evitar problemas de fuso na exibição)
function dataISOParaDate(iso) {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
}

const CABECALHO_LANCAMENTO = [
  'Descrição', 'Categoria', 'Valor', 'Vencimento', 'Pagamento', 'Status', 'Origem', 'Parcela'
];

function linhaLancamento(l) {
  const parcela = l.parcelaTotal ? `${l.parcelaAtual}/${l.parcelaTotal}` : '';
  return [
    l.descricao,
    l.categoria,
    l.valor, // número real
    dataISOParaDate(l.dataVencimento), // data real
    dataISOParaDate(l.dataPagamento),
    l.status,
    l.origem,
    parcela
  ];
}

// Monta a aba "Resumo Mensal": mês, total entradas, total saídas, saldo
function montarResumoMensal(lancamentos) {
  const porMes = {};
  for (const l of lancamentos) {
    const mesRef = l.mesReferencia;
    if (!porMes[mesRef]) porMes[mesRef] = { entradas: 0, saidas: 0 };
    if (l.tipo === 'entrada') porMes[mesRef].entradas += l.valor;
    else porMes[mesRef].saidas += l.valor;
  }
  const meses = Object.keys(porMes).sort();
  const linhas = [['Mês', 'Total Entradas', 'Total Saídas', 'Saldo']];
  for (const mesRef of meses) {
    const { entradas, saidas } = porMes[mesRef];
    linhas.push([mesRef, entradas, saidas, entradas - saidas]);
  }
  return linhas;
}

// Aplica formato de data (dd/mm/aaaa) às células de uma coluna, a partir da linha 2
function formatarColunaData(planilha, colunaIndice, quantidadeLinhas) {
  for (let linha = 2; linha <= quantidadeLinhas; linha++) {
    const endereco = XLSX.utils.encode_cell({ r: linha - 1, c: colunaIndice });
    const celula = planilha[endereco];
    if (celula && celula.v instanceof Date) {
      celula.t = 'd';
      celula.z = 'dd/mm/yyyy';
    }
  }
}

// Gera e baixa o arquivo XLSX com as abas Entradas, Saídas e Resumo Mensal
export async function exportarXLSX({ inicio, fim } = {}) {
  const lancamentos = await listarPorPeriodo({ inicio, fim });
  const entradas = lancamentos.filter((l) => l.tipo === 'entrada');
  const saidas = lancamentos.filter((l) => l.tipo === 'saida');

  const wb = XLSX.utils.book_new();

  const abaEntradas = XLSX.utils.aoa_to_sheet([CABECALHO_LANCAMENTO, ...entradas.map(linhaLancamento)]);
  formatarColunaData(abaEntradas, 3, entradas.length + 1);
  formatarColunaData(abaEntradas, 4, entradas.length + 1);
  XLSX.utils.book_append_sheet(wb, abaEntradas, 'Entradas');

  const abaSaidas = XLSX.utils.aoa_to_sheet([CABECALHO_LANCAMENTO, ...saidas.map(linhaLancamento)]);
  formatarColunaData(abaSaidas, 3, saidas.length + 1);
  formatarColunaData(abaSaidas, 4, saidas.length + 1);
  XLSX.utils.book_append_sheet(wb, abaSaidas, 'Saídas');

  const abaResumo = XLSX.utils.aoa_to_sheet(montarResumoMensal(lancamentos));
  XLSX.utils.book_append_sheet(wb, abaResumo, 'Resumo Mensal');

  const nomeArquivo = `financas_${hojeISO()}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}

// Gera e baixa um CSV simples (uma aba só, todos os lançamentos do período)
export async function exportarCSV({ inicio, fim } = {}) {
  const lancamentos = await listarPorPeriodo({ inicio, fim });
  const linhas = [
    ['Tipo', 'Descrição', 'Categoria', 'Valor', 'Vencimento', 'Pagamento', 'Status', 'Origem', 'Parcela'].join(';')
  ];
  for (const l of lancamentos) {
    const parcela = l.parcelaTotal ? `${l.parcelaAtual}/${l.parcelaTotal}` : '';
    linhas.push(
      [
        l.tipo,
        l.descricao,
        l.categoria,
        String(l.valor).replace('.', ','),
        l.dataVencimento ? l.dataVencimento.split('-').reverse().join('/') : '',
        l.dataPagamento ? l.dataPagamento.split('-').reverse().join('/') : '',
        l.status,
        l.origem,
        parcela
      ].join(';')
    );
  }
  const conteudo = '﻿' + linhas.join('\r\n'); // BOM para acentuação correta no Excel/Sheets
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `financas_${hojeISO()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
