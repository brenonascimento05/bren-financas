// ui-contas.js — Tela principal "Contas do mês"

import { listarPorMes, marcarComoPago, desmarcarPagamento, totalPendente, totalPago, totalEntradas } from './lancamentos.js';
import { verificarAlertaGastoAlto } from './reserva.js';
import { formatarMoeda, formatarData, estaVencida, mesAtualRef, somarMesesRef, nomeMesRef } from './utils.js';
import { abrirModalRapido, excluirComConfirmacao } from './ui-nova.js';

let mesVisualizado = mesAtualRef();

const tituloMes = document.getElementById('titulo-mes');
const listaEl = document.getElementById('lista-contas');
const listaVaziaEl = document.getElementById('lista-contas-vazia');
const alertaEl = document.getElementById('alerta-gasto');

function rotuloOrigem(l) {
  if (l.origem === 'parcelada') return `Parcela ${l.parcelaAtual}/${l.parcelaTotal}`;
  if (l.origem === 'fixa') return 'Fixa';
  if (l.origem === 'recorrente') return 'Recorrente';
  return 'Avulsa';
}

function statusClasse(l) {
  if (l.status === 'pago') return 'status-pago';
  if (estaVencida(l.dataVencimento, l.status)) return 'status-vencida';
  return 'status-pendente';
}

function criarItemLista(l) {
  const li = document.createElement('li');
  li.className = `item-conta tipo-${l.tipo} ${statusClasse(l)}`;
  li.dataset.id = l.id;

  li.innerHTML = `
    <input type="checkbox" ${l.status === 'pago' ? 'checked' : ''} aria-label="Marcar como pago">
    <div class="item-conta-info">
      <div class="item-conta-descricao">
        ${l.descricao}
        <span class="badge">${l.categoria}</span>
        <span class="badge">${rotuloOrigem(l)}</span>
      </div>
      <div class="item-conta-detalhe">
        Vence ${formatarData(l.dataVencimento)}${l.dataPagamento ? ` · Pago em ${formatarData(l.dataPagamento)}` : ''}
      </div>
    </div>
    <div class="item-conta-valor">${l.tipo === 'saida' ? '-' : '+'} ${formatarMoeda(l.valor)}</div>
    <div class="item-conta-acoes">
      <button class="botao-editar" aria-label="Editar">✏️</button>
      <button class="botao-excluir" aria-label="Excluir">🗑️</button>
    </div>
  `;

  li.querySelector('input[type="checkbox"]').addEventListener('change', async (evento) => {
    if (evento.target.checked) await marcarComoPago(l.id);
    else await desmarcarPagamento(l.id);
    await renderizarTelaContas();
  });

  li.querySelector('.botao-editar').addEventListener('click', () => abrirModalRapido(l));

  li.querySelector('.botao-excluir').addEventListener('click', async () => {
    await excluirComConfirmacao(l);
    await renderizarTelaContas();
  });

  return li;
}

export async function renderizarTelaContas() {
  tituloMes.textContent = nomeMesRef(mesVisualizado);

  const lista = await listarPorMes(mesVisualizado);

  document.getElementById('resumo-pendente').textContent = formatarMoeda(totalPendente(lista));
  document.getElementById('resumo-pago').textContent = formatarMoeda(totalPago(lista));
  const saldoDisponivel = totalEntradas(lista) - totalPago(lista);
  document.getElementById('resumo-saldo').textContent = formatarMoeda(saldoDisponivel);

  listaEl.innerHTML = '';
  if (lista.length === 0) {
    listaVaziaEl.classList.remove('oculto');
  } else {
    listaVaziaEl.classList.add('oculto');
    lista.forEach((l) => listaEl.appendChild(criarItemLista(l)));
  }

  // Alerta de gasto alto só faz sentido olhando para o mês atual real
  if (mesVisualizado === mesAtualRef()) {
    const resultado = await verificarAlertaGastoAlto();
    if (resultado.alerta) {
      alertaEl.textContent = `⚠️ Suas saídas este mês (${formatarMoeda(resultado.gastoAtual)}) já passam de 110% da média dos últimos 3 meses (${formatarMoeda(resultado.media)}).`;
      alertaEl.classList.remove('oculto');
    } else {
      alertaEl.classList.add('oculto');
    }
  } else {
    alertaEl.classList.add('oculto');
  }
}

export function inicializarTelaContas() {
  document.getElementById('mes-anterior').addEventListener('click', async () => {
    mesVisualizado = somarMesesRef(mesVisualizado, -1);
    await renderizarTelaContas();
  });
  document.getElementById('mes-proximo').addEventListener('click', async () => {
    mesVisualizado = somarMesesRef(mesVisualizado, 1);
    await renderizarTelaContas();
  });
  return renderizarTelaContas();
}
