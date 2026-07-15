// ui-nova.js — Formulário completo (tela "Nova") e modal de lançamento rápido (FAB / edição rápida)

import { listarCategorias, adicionarCategoria } from './db.js';
import {
  criarAvulso,
  criarParcelamento,
  criarModelo,
  gerarInstanciaMesAtual,
  atualizarLancamento,
  excluirLancamento,
  excluirParcelada
} from './lancamentos.js';
import { parseMoeda, formatarMoeda, hojeISO } from './utils.js';
import { confirmarSimNao, confirmar } from './ui-modais.js';

// Callback chamado após salvar/editar/excluir, para as outras telas atualizarem (definido pelo app.js)
let aoMudarLancamentos = () => {};
export function definirCallbackMudanca(fn) {
  aoMudarLancamentos = fn;
}

// ===================== FORMULÁRIO COMPLETO (tela "Nova") =====================

const estadoForm = { tipo: 'saida', origem: 'fixa' };
const container = document.getElementById('form-nova-container');

async function renderizarFormCompleto() {
  const categorias = await listarCategorias(estadoForm.tipo);
  const origens = estadoForm.tipo === 'saida'
    ? [['fixa', 'Fixa mensal'], ['parcelada', 'Parcelada'], ['avulsa', 'Avulsa']]
    : [['recorrente', 'Recorrente'], ['avulsa', 'Avulsa']];

  if (!origens.some((o) => o[0] === estadoForm.origem)) {
    estadoForm.origem = origens[0][0];
  }

  let camposEspecificos = '';
  if (estadoForm.origem === 'fixa' || estadoForm.origem === 'recorrente') {
    camposEspecificos = `
      <div class="linha-campo">
        <label for="nova-valor">Valor</label>
        <input type="text" id="nova-valor" inputmode="decimal" placeholder="R$ 0,00">
      </div>
      <div class="linha-campo">
        <label for="nova-dia">Dia do vencimento (todo mês)</label>
        <input type="number" id="nova-dia" min="1" max="31" placeholder="Ex.: 10">
      </div>
      <div class="linha-campo">
        <label>Duração</label>
        <div class="grupo-tipo-origem">
          <button type="button" data-duracao="todos" class="selecionado">Todos os meses</button>
          <button type="button" data-duracao="definida">Por período</button>
        </div>
      </div>
      <div class="linha-campo oculto" id="nova-linha-duracao-meses">
        <label for="nova-duracao-meses">Quantos meses vai durar</label>
        <input type="number" id="nova-duracao-meses" min="1" placeholder="Ex.: 6">
      </div>`;
  } else if (estadoForm.origem === 'parcelada') {
    camposEspecificos = `
      <div class="linha-campo">
        <label>Informar</label>
        <div class="grupo-tipo-origem">
          <button type="button" data-modo="total" class="selecionado">Valor total</button>
          <button type="button" data-modo="parcela">Valor da parcela</button>
        </div>
      </div>
      <div class="linha-campo">
        <label for="nova-valor-parcelamento" id="nova-rotulo-valor-parcelamento">Valor total</label>
        <input type="text" id="nova-valor-parcelamento" inputmode="decimal" placeholder="R$ 0,00">
      </div>
      <div class="linha-campo">
        <label for="nova-num-parcelas">Número de parcelas</label>
        <input type="number" id="nova-num-parcelas" min="2" placeholder="Ex.: 12">
      </div>
      <div class="linha-campo">
        <label for="nova-data-primeira">Vencimento da 1ª parcela</label>
        <input type="date" id="nova-data-primeira" value="${hojeISO()}">
      </div>`;
  } else {
    camposEspecificos = `
      <div class="linha-campo">
        <label for="nova-valor">Valor</label>
        <input type="text" id="nova-valor" inputmode="decimal" placeholder="R$ 0,00">
      </div>
      <div class="linha-campo">
        <label for="nova-data">Data</label>
        <input type="date" id="nova-data" value="${hojeISO()}">
      </div>`;
  }

  container.innerHTML = `
    <div class="bloco">
      <div class="linha-campo">
        <label>Tipo</label>
        <div class="grupo-tipo-origem" id="nova-grupo-tipo">
          <button type="button" data-tipo="saida" class="${estadoForm.tipo === 'saida' ? 'selecionado' : ''}">Saída</button>
          <button type="button" data-tipo="entrada" class="${estadoForm.tipo === 'entrada' ? 'selecionado' : ''}">Entrada</button>
        </div>
      </div>
      <div class="linha-campo">
        <label>Tipo de lançamento</label>
        <div class="grupo-tipo-origem" id="nova-grupo-origem">
          ${origens.map(([valor, rotulo]) => `<button type="button" data-origem="${valor}" class="${estadoForm.origem === valor ? 'selecionado' : ''}">${rotulo}</button>`).join('')}
        </div>
      </div>
      <div class="linha-campo">
        <label for="nova-descricao">Descrição</label>
        <input type="text" id="nova-descricao" placeholder="Ex.: Aluguel">
      </div>
      <div class="linha-campo">
        <label for="nova-categoria">Categoria</label>
        <select id="nova-categoria">
          ${categorias.map((c) => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <button type="button" id="nova-btn-add-categoria" class="botao-secundario">+ Nova categoria</button>
      </div>
      ${camposEspecificos}
      <button type="button" id="nova-btn-salvar" class="botao-primario">Salvar lançamento</button>
    </div>
  `;

  container.querySelectorAll('#nova-grupo-tipo button').forEach((botao) => {
    botao.addEventListener('click', () => {
      estadoForm.tipo = botao.dataset.tipo;
      renderizarFormCompleto();
    });
  });

  container.querySelectorAll('#nova-grupo-origem button').forEach((botao) => {
    botao.addEventListener('click', () => {
      estadoForm.origem = botao.dataset.origem;
      renderizarFormCompleto();
    });
  });

  if (estadoForm.origem === 'parcelada') {
    const rotulo = container.querySelector('#nova-rotulo-valor-parcelamento');
    container.dataset.modoParcelamento = 'total';
    container.querySelectorAll('[data-modo]').forEach((botao) => {
      botao.addEventListener('click', () => {
        container.querySelectorAll('[data-modo]').forEach((b) => b.classList.remove('selecionado'));
        botao.classList.add('selecionado');
        container.dataset.modoParcelamento = botao.dataset.modo;
        rotulo.textContent = botao.dataset.modo === 'total' ? 'Valor total' : 'Valor da parcela';
      });
    });
  }

  if (estadoForm.origem === 'fixa' || estadoForm.origem === 'recorrente') {
    const linhaDuracao = container.querySelector('#nova-linha-duracao-meses');
    container.dataset.duracaoModo = 'todos';
    container.querySelectorAll('[data-duracao]').forEach((botao) => {
      botao.addEventListener('click', () => {
        container.querySelectorAll('[data-duracao]').forEach((b) => b.classList.remove('selecionado'));
        botao.classList.add('selecionado');
        container.dataset.duracaoModo = botao.dataset.duracao;
        linhaDuracao.classList.toggle('oculto', botao.dataset.duracao !== 'definida');
      });
    });
  }

  document.getElementById('nova-btn-add-categoria').addEventListener('click', async () => {
    const nome = prompt('Nome da nova categoria:');
    if (nome && nome.trim()) {
      await adicionarCategoria(estadoForm.tipo, nome.trim());
      await renderizarFormCompleto();
    }
  });

  document.getElementById('nova-btn-salvar').addEventListener('click', salvarFormCompleto);
}

async function salvarFormCompleto() {
  const descricao = document.getElementById('nova-descricao').value.trim();
  const categoria = document.getElementById('nova-categoria').value;

  if (!descricao) { alert('Informe uma descrição.'); return; }

  if (estadoForm.origem === 'fixa' || estadoForm.origem === 'recorrente') {
    const dia = parseInt(document.getElementById('nova-dia').value, 10);
    const valor = parseMoeda(document.getElementById('nova-valor').value);
    if (!dia || dia < 1 || dia > 31) { alert('Informe um dia de vencimento válido (1 a 31).'); return; }
    if (!valor) { alert('Informe o valor.'); return; }

    const duracaoModo = container.dataset.duracaoModo || 'todos';
    let duracaoMeses = null;
    if (duracaoModo === 'definida') {
      duracaoMeses = parseInt(document.getElementById('nova-duracao-meses').value, 10);
      if (!duracaoMeses || duracaoMeses < 1) { alert('Informe por quantos meses essa conta vai durar.'); return; }
    }

    const modeloId = await criarModelo({ tipo: estadoForm.tipo, categoria, descricao, valor, diaVencimento: dia, duracaoMeses });
    await gerarInstanciaMesAtual(modeloId);
  } else if (estadoForm.origem === 'parcelada') {
    const modo = container.dataset.modoParcelamento || 'total';
    const valorInformado = parseMoeda(document.getElementById('nova-valor-parcelamento').value);
    const numParcelas = parseInt(document.getElementById('nova-num-parcelas').value, 10);
    const primeiraData = document.getElementById('nova-data-primeira').value;
    if (!valorInformado || !numParcelas || numParcelas < 2 || !primeiraData) {
      alert('Preencha valor, número de parcelas (mínimo 2) e data da primeira parcela.');
      return;
    }
    await criarParcelamento({
      categoria,
      descricao,
      valorTotal: modo === 'total' ? valorInformado : null,
      valorParcela: modo === 'parcela' ? valorInformado : null,
      parcelaTotal: numParcelas,
      primeiraData
    });
  } else {
    const valor = parseMoeda(document.getElementById('nova-valor').value);
    const data = document.getElementById('nova-data').value;
    if (!valor || !data) { alert('Preencha valor e data.'); return; }
    await criarAvulso({ tipo: estadoForm.tipo, categoria, descricao, valor, data });
  }

  await aoMudarLancamentos();
  estadoForm.origem = estadoForm.tipo === 'saida' ? 'fixa' : 'recorrente';
  await renderizarFormCompleto();
  alert('Lançamento salvo com sucesso!');
}

export function inicializarTelaNova() {
  renderizarFormCompleto();
}

// Chamado sempre que o usuário navega para a aba "Nova", para refletir categorias criadas em outra tela
export function atualizarTelaNova() {
  return renderizarFormCompleto();
}

// ===================== MODAL RÁPIDO (FAB + edição rápida a partir da lista) =====================

const modalRapido = document.getElementById('modal-rapido');
const rapidoTipo = document.getElementById('rapido-tipo');
const rapidoValor = document.getElementById('rapido-valor');
const rapidoDescricao = document.getElementById('rapido-descricao');
const rapidoCategoria = document.getElementById('rapido-categoria');
const rapidoData = document.getElementById('rapido-data');
const rapidoExcluir = document.getElementById('rapido-excluir');

let lancamentoEmEdicao = null; // objeto do lançamento sendo editado, ou null se for um novo (rápido)

async function atualizarCategoriasRapido() {
  const categorias = await listarCategorias(rapidoTipo.value);
  rapidoCategoria.innerHTML = categorias.map((c) => `<option value="${c}">${c}</option>`).join('');
}

export async function abrirModalRapido(lancamento = null) {
  lancamentoEmEdicao = lancamento;
  rapidoTipo.value = lancamento ? lancamento.tipo : 'saida';
  await atualizarCategoriasRapido();

  rapidoValor.value = lancamento ? String(lancamento.valor).replace('.', ',') : '';
  rapidoDescricao.value = lancamento ? lancamento.descricao : '';
  rapidoData.value = lancamento ? lancamento.dataVencimento : hojeISO();
  if (lancamento) rapidoCategoria.value = lancamento.categoria;
  rapidoExcluir.classList.toggle('oculto', !lancamento);

  modalRapido.classList.remove('oculto');
}

function fecharModalRapido() {
  modalRapido.classList.add('oculto');
  lancamentoEmEdicao = null;
}

export function inicializarModalRapido() {
  document.getElementById('fab').addEventListener('click', () => abrirModalRapido(null));
  document.getElementById('rapido-cancelar').addEventListener('click', fecharModalRapido);
  rapidoTipo.addEventListener('change', atualizarCategoriasRapido);

  document.getElementById('rapido-salvar').addEventListener('click', async () => {
    const valor = parseMoeda(rapidoValor.value);
    const descricao = rapidoDescricao.value.trim();
    const categoria = rapidoCategoria.value;
    const data = rapidoData.value;

    if (!valor || !descricao || !data) { alert('Preencha valor, descrição e data.'); return; }

    if (lancamentoEmEdicao) {
      if (lancamentoEmEdicao.origem === 'parcelada') {
        await atualizarLancamento(lancamentoEmEdicao.id, { descricao, categoria, valor });
      } else {
        await atualizarLancamento(lancamentoEmEdicao.id, {
          descricao, categoria, valor,
          dataVencimento: data,
          mesReferencia: data.slice(0, 7)
        });
      }
    } else {
      await criarAvulso({ tipo: rapidoTipo.value, categoria, descricao, valor, data });
    }

    fecharModalRapido();
    await aoMudarLancamentos();
  });

  rapidoExcluir.addEventListener('click', async () => {
    if (!lancamentoEmEdicao) return;
    await excluirComConfirmacao(lancamentoEmEdicao);
    fecharModalRapido();
    await aoMudarLancamentos();
  });
}

// Exclusão com confirmação — se for parcela, pergunta se remove só esta ou todas as futuras
export async function excluirComConfirmacao(lancamento) {
  if (lancamento.origem === 'parcelada') {
    const opcao = await confirmar(
      `Excluir a parcela ${lancamento.parcelaAtual}/${lancamento.parcelaTotal} de "${lancamento.descricao}"?`,
      [
        { rotulo: 'Cancelar', classe: 'botao-secundario', valor: null },
        { rotulo: 'Somente esta', classe: 'botao-secundario', valor: 'somente-esta' },
        { rotulo: 'Esta e futuras', classe: 'botao-perigo', valor: 'todas-futuras' }
      ]
    );
    if (!opcao) return;
    await excluirParcelada(lancamento.id, opcao);
  } else {
    const confirmado = await confirmarSimNao(`Excluir "${lancamento.descricao}"?`);
    if (!confirmado) return;
    await excluirLancamento(lancamento.id);
  }
}
