// app.js — Bootstrap do app: inicializa banco, geração mensal, navegação entre telas e service worker

import { verificarGeracaoMensal } from './lancamentos.js';
import { precisaLembrarBackup } from './backup.js';
import { inicializarTelaContas, renderizarTelaContas } from './ui-contas.js';
import { inicializarTelaNova, atualizarTelaNova, inicializarModalRapido, definirCallbackMudanca } from './ui-nova.js';
import { inicializarTelaDashboard, renderizarTelaDashboard } from './ui-dashboard.js';
import { inicializarTelaReserva, renderizarTelaReserva } from './ui-reserva.js';
import { inicializarTelaConfig, renderizarTelaConfig } from './ui-config.js';

// ---------- Navegação entre telas ----------

const TELAS = ['contas', 'dashboard', 'nova', 'reserva', 'config'];

const rendersPorTela = {
  contas: renderizarTelaContas,
  dashboard: renderizarTelaDashboard,
  nova: atualizarTelaNova,
  reserva: renderizarTelaReserva,
  config: renderizarTelaConfig
};

async function irParaTela(nomeTela) {
  TELAS.forEach((t) => {
    document.getElementById(`tela-${t}`).classList.toggle('ativa', t === nomeTela);
  });
  document.querySelectorAll('.nav-botao').forEach((botao) => {
    botao.classList.toggle('ativo', botao.dataset.tela === nomeTela);
  });
  const render = rendersPorTela[nomeTela];
  if (render) await render();
}

function inicializarNavegacao() {
  document.querySelectorAll('.nav-botao').forEach((botao) => {
    botao.addEventListener('click', () => irParaTela(botao.dataset.tela));
  });
}

// ---------- Banner de lembrete de backup ----------

async function verificarBannerBackup() {
  const banner = document.getElementById('banner-backup');
  const precisa = await precisaLembrarBackup();
  banner.classList.toggle('oculto', !precisa);
}

function inicializarBannerBackup() {
  document.getElementById('btn-fechar-banner').addEventListener('click', () => {
    document.getElementById('banner-backup').classList.add('oculto');
  });
  document.getElementById('btn-banner-backup').addEventListener('click', () => {
    document.getElementById('banner-backup').classList.add('oculto');
    irParaTela('config');
  });
}

// ---------- Service worker ----------

function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((erro) => {
        console.error('Falha ao registrar o service worker:', erro);
      });
    });
  }
}

// ---------- Inicialização geral ----------

async function iniciar() {
  await verificarGeracaoMensal();

  inicializarNavegacao();
  inicializarBannerBackup();
  inicializarModalRapido();
  inicializarTelaNova();
  await inicializarTelaContas();
  await inicializarTelaDashboard();
  await inicializarTelaReserva();
  await inicializarTelaConfig();

  // Sempre que um lançamento é criado/editado/excluído (via FAB ou formulário completo),
  // atualiza a tela de Contas do Mês para refletir a mudança na hora
  definirCallbackMudanca(async () => {
    await renderizarTelaContas();
  });

  await verificarBannerBackup();
  registrarServiceWorker();
}

iniciar();
