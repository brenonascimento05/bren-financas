// ui-config.js — Tela Configurações: categorias, exportação e backup

import { listarCategorias, adicionarCategoria, removerCategoria, ehCategoriaCustomizada } from './db.js';
import { listarModelos, atualizarModelo, excluirModelo, calcularMesFimModelo } from './lancamentos.js';
import { exportarXLSX, exportarCSV } from './export.js';
import { exportarBackupJSON, importarBackupJSON, dataUltimoBackup } from './backup.js';
import { formatarMoeda, formatarData, mesAtualRef, nomeMesRef } from './utils.js';
import { confirmarSimNao } from './ui-modais.js';

async function renderizarCategorias() {
  const tipo = document.getElementById('select-tipo-categoria').value;
  const categorias = await listarCategorias(tipo);
  const ul = document.getElementById('lista-categorias');
  ul.innerHTML = '';

  for (const nome of categorias) {
    const customizada = await ehCategoriaCustomizada(tipo, nome);
    const li = document.createElement('li');
    li.innerHTML = `<span>${nome}</span>`;
    if (customizada) {
      const botao = document.createElement('button');
      botao.textContent = '🗑️';
      botao.addEventListener('click', async () => {
        const ok = await confirmarSimNao(`Remover a categoria "${nome}"?`);
        if (!ok) return;
        await removerCategoria(tipo, nome);
        await renderizarCategorias();
      });
      li.appendChild(botao);
    }
    ul.appendChild(li);
  }
}

async function renderizarModelos() {
  const modelos = await listarModelos();
  const ul = document.getElementById('lista-modelos');
  const vazio = document.getElementById('lista-modelos-vazia');
  ul.innerHTML = '';

  if (modelos.length === 0) {
    vazio.classList.remove('oculto');
    return;
  }
  vazio.classList.add('oculto');

  modelos.forEach((m) => {
    const li = document.createElement('li');
    const tipoRotulo = m.tipo === 'saida' ? 'Fixa' : 'Recorrente';

    const mesFim = calcularMesFimModelo(m);
    let duracaoTexto = 'todos os meses';
    if (mesFim) {
      duracaoTexto = `até ${nomeMesRef(mesFim)}`;
      if (mesAtualRef() > mesFim) duracaoTexto += ' — finalizada';
    }

    li.innerHTML = `<span>${m.descricao} — ${formatarMoeda(m.valor)} (dia ${m.diaVencimento}) · ${tipoRotulo} · ${duracaoTexto} ${m.ativo ? '' : '(pausada)'}</span>`;

    const botaoPausar = document.createElement('button');
    botaoPausar.textContent = m.ativo ? '⏸️' : '▶️';
    botaoPausar.title = m.ativo ? 'Pausar geração automática' : 'Reativar geração automática';
    botaoPausar.addEventListener('click', async () => {
      await atualizarModelo(m.id, { ativo: !m.ativo });
      await renderizarModelos();
    });

    const botaoExcluir = document.createElement('button');
    botaoExcluir.textContent = '🗑️';
    botaoExcluir.addEventListener('click', async () => {
      const ok = await confirmarSimNao(`Excluir o modelo "${m.descricao}"? Os lançamentos já gerados não serão apagados.`);
      if (!ok) return;
      await excluirModelo(m.id);
      await renderizarModelos();
    });

    li.appendChild(botaoPausar);
    li.appendChild(botaoExcluir);
    ul.appendChild(li);
  });
}

async function renderizarUltimoBackup() {
  const data = await dataUltimoBackup();
  const texto = document.getElementById('texto-ultimo-backup');
  texto.textContent = data
    ? `Último backup: ${formatarData(data.toISOString().slice(0, 10))} às ${data.toLocaleTimeString('pt-BR')}`
    : 'Nenhum backup realizado ainda.';
}

function periodoExportSelecionado() {
  const usarPeriodo = document.querySelector('input[name="export-periodo"]:checked').value === 'periodo';
  if (!usarPeriodo) return {};
  return {
    inicio: document.getElementById('export-data-inicio').value || undefined,
    fim: document.getElementById('export-data-fim').value || undefined
  };
}

export async function renderizarTelaConfig() {
  await renderizarCategorias();
  await renderizarModelos();
  await renderizarUltimoBackup();
}

export function inicializarTelaConfig() {
  document.getElementById('select-tipo-categoria').addEventListener('change', renderizarCategorias);

  document.getElementById('btn-adicionar-categoria').addEventListener('click', async () => {
    const tipo = document.getElementById('select-tipo-categoria').value;
    const input = document.getElementById('input-nova-categoria');
    const nome = input.value.trim();
    if (!nome) return;
    await adicionarCategoria(tipo, nome);
    input.value = '';
    await renderizarCategorias();
  });

  document.querySelectorAll('input[name="export-periodo"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      document.getElementById('campos-periodo-export').style.display =
        document.querySelector('input[name="export-periodo"]:checked').value === 'periodo' ? 'flex' : 'none';
    });
  });

  document.getElementById('btn-exportar-xlsx').addEventListener('click', async () => {
    await exportarXLSX(periodoExportSelecionado());
  });

  document.getElementById('btn-exportar-csv').addEventListener('click', async () => {
    await exportarCSV(periodoExportSelecionado());
  });

  document.getElementById('btn-backup-exportar').addEventListener('click', async () => {
    await exportarBackupJSON();
    await renderizarUltimoBackup();
    document.getElementById('banner-backup').classList.add('oculto');
  });

  const inputImportar = document.getElementById('input-importar-backup');
  document.getElementById('btn-backup-importar').addEventListener('click', () => inputImportar.click());
  inputImportar.addEventListener('change', async () => {
    const arquivo = inputImportar.files[0];
    if (!arquivo) return;
    const ok = await confirmarSimNao('Importar este backup vai SUBSTITUIR todos os dados atuais. Continuar?');
    inputImportar.value = '';
    if (!ok) return;
    try {
      await importarBackupJSON(arquivo);
      alert('Backup importado com sucesso! O app será recarregado.');
      location.reload();
    } catch (erro) {
      alert('Não foi possível importar este arquivo: ' + erro.message);
    }
  });
}
