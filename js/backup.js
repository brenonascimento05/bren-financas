// backup.js — Exportação/importação completa do banco em JSON + controle do lembrete de 30 dias

import { db, getConfig, setConfig } from './db.js';

const DIAS_LEMBRETE = 30;

// Exporta todo o banco (lançamentos, modelos, config) em um único arquivo JSON
export async function exportarBackupJSON() {
  const [lancamentos, modelos, config] = await Promise.all([
    db.lancamentos.toArray(),
    db.modelos.toArray(),
    db.config.toArray()
  ]);

  const pacote = {
    versao: 1,
    geradoEm: new Date().toISOString(),
    lancamentos,
    modelos,
    config
  };

  const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const data = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `backup_financas_${data}.json`;
  link.click();
  URL.revokeObjectURL(url);

  await setConfig('ultimoBackup', Date.now());
}

// Importa um backup JSON, substituindo todo o conteúdo atual das tabelas
export async function importarBackupJSON(arquivo) {
  const texto = await arquivo.text();
  const pacote = JSON.parse(texto);

  if (!pacote || !Array.isArray(pacote.lancamentos) || !Array.isArray(pacote.modelos)) {
    throw new Error('Arquivo de backup inválido.');
  }

  await db.transaction('rw', db.lancamentos, db.modelos, db.config, async () => {
    await db.lancamentos.clear();
    await db.modelos.clear();
    await db.config.clear();
    await db.lancamentos.bulkAdd(pacote.lancamentos);
    await db.modelos.bulkAdd(pacote.modelos);
    if (Array.isArray(pacote.config)) {
      await db.config.bulkAdd(pacote.config);
    }
  });
}

// Verifica se já passaram mais de 30 dias desde o último backup (para exibir o banner)
export async function precisaLembrarBackup() {
  const ultimo = await getConfig('ultimoBackup', null);
  if (!ultimo) return true;
  const diasPassados = (Date.now() - ultimo) / (1000 * 60 * 60 * 24);
  return diasPassados > DIAS_LEMBRETE;
}

export async function dataUltimoBackup() {
  const ultimo = await getConfig('ultimoBackup', null);
  return ultimo ? new Date(ultimo) : null;
}
