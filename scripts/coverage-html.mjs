import { readdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const percent = (value) => Number.isFinite(value) ? `${value.toFixed(2)}%` : 'N/D';
function cells(stats) {
  return ['Line', 'Branch', 'Function'].map((kind) =>
    `<td>${percent(stats[`covered${kind}Percent`])} <small>(${stats[`covered${kind}Count`]}/${stats[`total${kind}Count`]})</small></td>`
  ).join('');
}
function inventory(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'coverage', 'dist', 'tests', '.git'].includes(entry.name)) return [];
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return inventory(path);
    return /\.(?:js|jsx)$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [path] : [];
  });
}

// Use the public node:test coverage event; never infer percentages from text output.
export default async function* htmlReporter(events) {
  for await (const event of events) {
    if (event.type !== 'test:coverage' || event.data.nesting !== 0) continue;
    const summary = event.data.summary;
    const cwd = summary.workingDirectory;
    const observed = new Set(summary.files.map((file) => resolve(file.path)));
    const unmeasuredFiles = inventory(cwd).filter((file) => !observed.has(file)).map((file) => relative(cwd, file));
    writeFileSync(resolve(cwd, 'coverage/summary.json'), JSON.stringify({
      node: process.version, generatedAt: new Date().toISOString(), ...summary, unmeasuredFiles,
    }, null, 2));
    const rows = summary.files.map((file) => {
      const uncovered = file.lines.filter((line) => line.count === 0).map((line) => line.line).join(', ');
      return `<tr><th scope="row">${escape(relative(cwd, file.path))}</th>${cells(file)}<td>${escape(uncovered || '—')}</td></tr>`;
    }).join('\n');
    yield `<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Cobertura de testes — ${escape(relative(resolve(cwd, '..'), cwd))}</title>
<style>body{font:16px system-ui,sans-serif;color:#182f3c;background:#f4f7f9;margin:2rem auto;padding:0 1rem;max-width:1200px}h1{color:#14644a}table{border-collapse:collapse;background:white;width:100%}th,td{text-align:left;border:1px solid #c4d3dc;padding:.7rem}td:last-child{max-width:26rem;overflow-wrap:anywhere}small{white-space:nowrap;color:#455d6b}tfoot{font-weight:bold}main{overflow:auto}li{margin:.4rem 0}</style>
<h1>Cobertura nativa do Node.js</h1><p>${escape(process.version)} · ${escape(new Date().toISOString())}</p>
<p>Percentuais fornecidos pelo Node para os arquivos JavaScript carregados pela suíte. Arquivos não carregados e componentes JSX não entram nesses denominadores; a lista abaixo mostra essa limitação. Mocks de carregamento podem acrescentar linhas às fontes medidas.</p>
<main><table><thead><tr><th>Arquivo</th><th>Linhas</th><th>Branches</th><th>Funções</th><th>Linhas não cobertas</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th>Total medido</th>${cells(summary.totals)}<td>—</td></tr></tfoot></table></main>
<h2>Arquivos sem medição (${unmeasuredFiles.length})</h2><p>Não representam 0% calculado: não há contadores nativos disponíveis para esses arquivos nesta execução.</p>
<ul>${unmeasuredFiles.map((file) => `<li>${escape(file)}</li>`).join('')}</ul>
<p><a href="lcov.info">LCOV</a> · <a href="summary.json">Dados nativos (JSON)</a></p></html>`;
  }
}
