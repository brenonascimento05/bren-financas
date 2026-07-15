// db.js — Definição do banco local (IndexedDB via Dexie) e helpers de configuração

export const db = new Dexie('financas');

db.version(1).stores({
  // lancamentos: cada conta a pagar/receber, gerada manualmente ou automaticamente
  lancamentos:
    '++id, tipo, categoria, status, dataVencimento, mesReferencia, grupoParcelamentoId, origem, modeloId, [modeloId+mesReferencia]',
  // modelos: "moldes" de contas fixas (saída) e receitas recorrentes (entrada) que geram lançamentos todo mês
  modelos: '++id, tipo, categoria, ativo',
  // config: tabela chave/valor para preferências e metas
  config: 'chave'
});

// Categorias padrão (o usuário pode adicionar novas, guardadas em config)
export const CATEGORIAS_ENTRADA_PADRAO = [
  'Salário',
  'Juros de empréstimos',
  'Vale alimentação',
  'Vale combustível',
  'Outros'
];

export const CATEGORIAS_SAIDA_PADRAO = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Outros'
];

// Lê um valor da tabela config (retorna o padrão se não existir)
export async function getConfig(chave, padrao = null) {
  const registro = await db.config.get(chave);
  return registro ? registro.valor : padrao;
}

// Grava um valor na tabela config
export async function setConfig(chave, valor) {
  await db.config.put({ chave, valor });
}

// Retorna a lista de categorias (padrão + customizadas) para entrada ou saída
export async function listarCategorias(tipo) {
  const padrao = tipo === 'entrada' ? CATEGORIAS_ENTRADA_PADRAO : CATEGORIAS_SAIDA_PADRAO;
  const chave = tipo === 'entrada' ? 'categoriasEntrada' : 'categoriasSaida';
  const customizadas = (await getConfig(chave, [])) || [];
  // remove "Outros" do meio e recoloca no fim, para as customizadas ficarem antes dele
  const base = padrao.filter((c) => c !== 'Outros');
  return [...base, ...customizadas.filter((c) => !base.includes(c)), 'Outros'];
}

// Adiciona uma nova categoria customizada (entrada ou saída)
export async function adicionarCategoria(tipo, nome) {
  const chave = tipo === 'entrada' ? 'categoriasEntrada' : 'categoriasSaida';
  const atuais = (await getConfig(chave, [])) || [];
  if (!atuais.includes(nome)) {
    atuais.push(nome);
    await setConfig(chave, atuais);
  }
}

// Remove uma categoria customizada (categorias padrão não podem ser removidas)
export async function removerCategoria(tipo, nome) {
  const chave = tipo === 'entrada' ? 'categoriasEntrada' : 'categoriasSaida';
  const atuais = (await getConfig(chave, [])) || [];
  await setConfig(chave, atuais.filter((c) => c !== nome));
}

// Diz se uma categoria é customizada (e portanto pode ser removida)
export async function ehCategoriaCustomizada(tipo, nome) {
  const chave = tipo === 'entrada' ? 'categoriasEntrada' : 'categoriasSaida';
  const customizadas = (await getConfig(chave, [])) || [];
  return customizadas.includes(nome);
}
