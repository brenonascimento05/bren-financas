// utils.js — Formatação em padrão brasileiro e utilidades de data/número

// Formata número para "R$ 1.234,56"
export function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Converte texto digitado pelo usuário ("1234,56" ou "1234.56") em número
export function parseMoeda(texto) {
  if (typeof texto === 'number') return texto;
  if (!texto) return 0;
  const limpo = String(texto)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '') // remove separador de milhar
    .replace(',', '.');
  const numero = parseFloat(limpo);
  return isNaN(numero) ? 0 : numero;
}

// Formata data ISO (YYYY-MM-DD) para "DD/MM/AAAA"
export function formatarData(dataISO) {
  if (!dataISO) return '-';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Retorna a data de hoje em formato ISO (YYYY-MM-DD), no fuso local
export function hojeISO() {
  const hoje = new Date();
  const offset = hoje.getTimezoneOffset();
  const local = new Date(hoje.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

// Retorna o mês/ano atual em formato "YYYY-MM"
export function mesAtualRef() {
  return hojeISO().slice(0, 7);
}

// Extrai "YYYY-MM" de uma data ISO
export function mesReferenciaDe(dataISO) {
  return dataISO.slice(0, 7);
}

// Quantidade de dias em um mês (ano numérico, mes 1-12)
export function diasNoMes(ano, mes) {
  return new Date(ano, mes, 0).getDate();
}

// Soma/subtrai meses a uma referência "YYYY-MM", retornando nova referência "YYYY-MM"
export function somarMesesRef(mesRef, quantidade) {
  const [ano, mes] = mesRef.split('-').map(Number);
  const data = new Date(ano, mes - 1 + quantidade, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

// Monta uma data ISO a partir de uma referência de mês "YYYY-MM" e um dia,
// ajustando (clamp) para o último dia do mês quando o dia não existir (ex.: 31 em fevereiro)
export function montarDataDoMes(mesRef, dia) {
  const [ano, mes] = mesRef.split('-').map(Number);
  const ultimoDia = diasNoMes(ano, mes);
  const diaFinal = Math.min(dia, ultimoDia);
  return `${mesRef}-${String(diaFinal).padStart(2, '0')}`;
}

// Soma "quantidade" de meses a uma data ISO completa, mantendo o dia (com clamp de fim de mês)
export function somarMesesData(dataISO, quantidade) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const refBase = `${ano}-${String(mes).padStart(2, '0')}`;
  const novaRef = somarMesesRef(refBase, quantidade);
  return montarDataDoMes(novaRef, dia);
}

// Nome do mês por extenso a partir de "YYYY-MM", ex.: "Julho/2026"
const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
export function nomeMesRef(mesRef) {
  const [ano, mes] = mesRef.split('-').map(Number);
  return `${NOMES_MESES[mes - 1]}/${ano}`;
}

// Gera um identificador único (para agrupar parcelas, etc.)
export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Compara "hoje" com uma data de vencimento (string ISO) — true se já venceu e não foi paga
export function estaVencida(dataVencimento, status) {
  return status === 'pendente' && dataVencimento < hojeISO();
}
