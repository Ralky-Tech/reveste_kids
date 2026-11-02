import { mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = process.argv[2];
if (!['backend', 'frontend'].includes(project)) throw new Error('Use: coverage.mjs backend|frontend');
if (Number(process.versions.node.split('.')[0]) !== 24) {
  throw new Error('Use Node.js 24 LTS, como no CI e nos Dockerfiles do projeto.');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cwd = resolve(root, project);
const output = resolve(cwd, 'coverage');
mkdirSync(output, { recursive: true });
// Remove only our own previous artifacts, so a failed run cannot look current.
for (const file of ['index.html', 'lcov.info', 'summary.json']) rmSync(resolve(output, file), { force: true });
const result = spawnSync(process.execPath, [
  '--test', '--test-concurrency=1', '--experimental-test-coverage',
  '--test-coverage-include=**/*.js',
  '--test-coverage-exclude=**/node_modules/**',
  '--test-coverage-exclude=**/tests/**',
  '--test-coverage-exclude=**/*.test.js',
  '--test-coverage-exclude=**/coverage/**',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=lcov', '--test-reporter-destination=coverage/lcov.info',
  `--test-reporter=${pathToFileURL(resolve(root, 'scripts/coverage-html.mjs')).href}`,
  '--test-reporter-destination=coverage/index.html',
  project === 'backend' ? 'tests/*.test.js' : 'src/utils/searchPieces.test.js',
], { cwd, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
if (result.status === 0) console.log(`HTML: ${resolve(output, 'index.html')}\nLCOV: ${resolve(output, 'lcov.info')}`);
