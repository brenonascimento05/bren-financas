// ui-modais.js — Helper genérico para o modal de confirmação (usado em exclusões e outras decisões)

const modal = document.getElementById('modal-confirmar');
const textoEl = document.getElementById('modal-confirmar-texto');
const opcoesEl = document.getElementById('modal-confirmar-opcoes');

// Mostra o modal de confirmação com botões customizados.
// opcoes: [{ rotulo, classe, valor }] — a Promise resolve com o "valor" do botão clicado, ou null se cancelado (toque fora)
export function confirmar(texto, opcoes) {
  return new Promise((resolve) => {
    textoEl.textContent = texto;
    opcoesEl.innerHTML = '';

    opcoes.forEach((opcao) => {
      const botao = document.createElement('button');
      botao.textContent = opcao.rotulo;
      botao.className = opcao.classe || 'botao-secundario';
      botao.addEventListener('click', () => {
        fechar();
        resolve(opcao.valor);
      });
      opcoesEl.appendChild(botao);
    });

    function fecharNoFundo(evento) {
      if (evento.target === modal) {
        fechar();
        resolve(null);
      }
    }

    function fechar() {
      modal.classList.add('oculto');
      modal.removeEventListener('click', fecharNoFundo);
    }

    modal.addEventListener('click', fecharNoFundo);
    modal.classList.remove('oculto');
  });
}

// Atalho para uma confirmação simples "Sim / Cancelar"
export function confirmarSimNao(texto) {
  return confirmar(texto, [
    { rotulo: 'Cancelar', classe: 'botao-secundario', valor: false },
    { rotulo: 'Confirmar', classe: 'botao-perigo', valor: true }
  ]);
}
