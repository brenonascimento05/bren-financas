// ui-reserva.js — Tela Reserva: meta de emergência, sugestão de guardar/mês e modo "matar contas"

import {
  obterMetaReserva,
  definirMetaReserva,
  ajustarValorReserva,
  sugestaoGuardarPorMes,
  listarModoMatarContas
} from './reserva.js';
import { formatarMoeda, formatarData, parseMoeda } from './utils.js';

async function renderizarMeta() {
  const { valorAlvo, valorAtual } = await obterMetaReserva();
  document.getElementById('input-meta-valor').value = valorAlvo ? String(valorAlvo).replace('.', ',') : '';

  const percentual = valorAlvo > 0 ? Math.min(100, (valorAtual / valorAlvo) * 100) : 0;
  document.getElementById('barra-progresso-preenchida').style.width = `${percentual}%`;
  document.getElementById('texto-progresso-reserva').textContent =
    `${formatarMoeda(valorAtual)} de ${formatarMoeda(valorAlvo)} (${percentual.toFixed(0)}%)`;

  const sugestao = await sugestaoGuardarPorMes();
  document.getElementById('texto-sugestao-guardar').textContent = sugestao > 0
    ? `Sugestão: guarde ${formatarMoeda(sugestao)}/mês, com base na sobra média dos últimos 3 meses.`
    : 'Sem dados suficientes dos últimos 3 meses para sugerir um valor.';
}

async function renderizarMatarContas() {
  const lista = await listarModoMatarContas();
  const ul = document.getElementById('lista-matar-contas');
  const vazio = document.getElementById('lista-matar-contas-vazia');
  ul.innerHTML = '';

  if (lista.length === 0) {
    vazio.classList.remove('oculto');
    return;
  }
  vazio.classList.add('oculto');

  lista.forEach((item, indice) => {
    const li = document.createElement('li');
    li.className = 'item-matar-conta';
    li.innerHTML = `
      <div class="topo">
        <span>${indice + 1}. ${item.descricao}</span>
        <span>${formatarMoeda(item.saldoDevedor)}</span>
      </div>
      <div class="detalhe">
        ${item.categoria} · Parcela ${item.parcelaAtual}/${item.parcelaTotal} · ${item.parcelasRestantes} restante(s)
        de ${formatarMoeda(item.valorParcela)} · Quitação prevista: ${formatarData(item.dataQuitacao)}
      </div>
    `;
    ul.appendChild(li);
  });
}

export async function renderizarTelaReserva() {
  await renderizarMeta();
  await renderizarMatarContas();
}

export function inicializarTelaReserva() {
  document.getElementById('btn-salvar-meta').addEventListener('click', async () => {
    const valor = parseMoeda(document.getElementById('input-meta-valor').value);
    await definirMetaReserva(valor);
    await renderizarMeta();
  });

  document.getElementById('btn-adicionar-guardado').addEventListener('click', async () => {
    const input = document.getElementById('input-guardar-valor');
    const valor = parseMoeda(input.value);
    if (!valor) return;
    await ajustarValorReserva(valor);
    input.value = '';
    await renderizarMeta();
  });
}
