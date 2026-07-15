// ui-dashboard.js — Tela Dashboard: filtros e gráficos (Chart.js)

import { listarCategorias } from './db.js';
import { resumoFiltrado, entradasSaidasUltimos12Meses, saldoAcumuladoUltimos12Meses } from './dashboard.js';
import { formatarMoeda, mesAtualRef, somarMesesRef, nomeMesRef } from './utils.js';

const CORES_CATEGORIAS = [
  '#22c55e', '#f97316', '#3b82f6', '#eab308', '#ec4899',
  '#a855f7', '#14b8a6', '#ef4444', '#84cc16', '#6366f1'
];

let graficoPizza = null;
let graficoBarras = null;
let graficoLinha = null;

const filtroMes = document.getElementById('filtro-mes');
const filtroTipo = document.getElementById('filtro-tipo');
const filtroCategoria = document.getElementById('filtro-categoria');
const filtroStatus = document.getElementById('filtro-status');

async function popularFiltroMes() {
  const mesAtual = mesAtualRef();
  const opcoes = ['<option value="">Todos os meses</option>'];
  for (let i = 0; i < 24; i++) {
    const mesRef = somarMesesRef(mesAtual, -i);
    opcoes.push(`<option value="${mesRef}" ${mesRef === mesAtual ? 'selected' : ''}>${nomeMesRef(mesRef)}</option>`);
  }
  filtroMes.innerHTML = opcoes.join('');
}

async function popularFiltroCategoria() {
  const [entradas, saidas] = await Promise.all([listarCategorias('entrada'), listarCategorias('saida')]);
  const todas = [...new Set([...entradas, ...saidas])];
  filtroCategoria.innerHTML = '<option value="">Todas categorias</option>' + todas.map((c) => `<option value="${c}">${c}</option>`).join('');
}

async function atualizarCards() {
  const dados = await resumoFiltrado({
    mesRef: filtroMes.value || null,
    tipo: filtroTipo.value || null,
    categoria: filtroCategoria.value || null,
    status: filtroStatus.value || null
  });

  document.getElementById('dash-entradas').textContent = formatarMoeda(dados.entradas);
  document.getElementById('dash-saidas').textContent = formatarMoeda(dados.saidas);
  document.getElementById('dash-saldo').textContent = formatarMoeda(dados.saldo);

  const ctxPizza = document.getElementById('grafico-pizza');
  if (graficoPizza) graficoPizza.destroy();
  graficoPizza = new Chart(ctxPizza, {
    type: 'pie',
    data: {
      labels: dados.pizzaCategorias,
      datasets: [{ data: dados.pizzaValores, backgroundColor: CORES_CATEGORIAS }]
    },
    options: {
      plugins: { legend: { labels: { color: '#e2e8f0' } } }
    }
  });
}

async function atualizarGraficosFixos() {
  const { rotulos, entradas, saidas } = await entradasSaidasUltimos12Meses();

  const ctxBarras = document.getElementById('grafico-barras');
  if (graficoBarras) graficoBarras.destroy();
  graficoBarras = new Chart(ctxBarras, {
    type: 'bar',
    data: {
      labels: rotulos,
      datasets: [
        { label: 'Entradas', data: entradas, backgroundColor: '#22c55e' },
        { label: 'Saídas', data: saidas, backgroundColor: '#f97316' }
      ]
    },
    options: {
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { labels: { color: '#e2e8f0' } } }
    }
  });

  const { acumulado } = await saldoAcumuladoUltimos12Meses();
  const ctxLinha = document.getElementById('grafico-linha');
  if (graficoLinha) graficoLinha.destroy();
  graficoLinha = new Chart(ctxLinha, {
    type: 'line',
    data: {
      labels: rotulos,
      datasets: [{ label: 'Saldo acumulado', data: acumulado, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.2)', fill: true, tension: .25 }]
    },
    options: {
      scales: {
        x: { ticks: { color: '#94a3b8' } },
        y: { ticks: { color: '#94a3b8' } }
      },
      plugins: { legend: { labels: { color: '#e2e8f0' } } }
    }
  });
}

export async function renderizarTelaDashboard() {
  await popularFiltroCategoria();
  await atualizarCards();
  await atualizarGraficosFixos();
}

export async function inicializarTelaDashboard() {
  // Não renderiza os gráficos aqui: o canvas fica com display:none até o usuário
  // abrir a aba, e o Chart.js mede um elemento escondido como tendo tamanho zero.
  // A renderização de verdade acontece em renderizarTelaDashboard(), chamada pela
  // navegação (app.js) na primeira vez que a aba Dashboard é aberta.
  await popularFiltroMes();
  [filtroMes, filtroTipo, filtroCategoria, filtroStatus].forEach((el) => {
    el.addEventListener('change', atualizarCards);
  });
}
