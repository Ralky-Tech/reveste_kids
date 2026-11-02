import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Production/CI installations do not need Git hooks or the Husky dev dependency.
if (process.env.HUSKY === '0' || process.env.CI === 'true' || process.env.NODE_ENV === 'production') {
  process.exit(0);
}
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
if (!existsSync('.git')) {
  console.log('Husky: arquivo sem metadados Git; hooks nao instalados.');
  process.exit(0);
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
let hooksPath;
try { hooksPath = git('config', '--get', 'core.hooksPath'); }
catch (error) { if (error.status !== 1) throw error; }
if (hooksPath && hooksPath !== '.husky/_') {
  throw new Error(`core.hooksPath ja configurado (${hooksPath}); integre os hooks existentes antes de instalar Husky.`);
}
if (!hooksPath && existsSync(git('rev-parse', '--git-path', 'hooks/pre-commit'))) {
  throw new Error('Hook pre-commit existente; integre-o antes de instalar Husky.');
}

const gitDir = resolve(git('rev-parse', '--git-dir'));
const commonDir = resolve(git('rev-parse', '--git-common-dir'));
const previousConfig = process.env.GIT_CONFIG;
try {
  if (gitDir !== commonDir) {
    // core.hooksPath must not leak into main or other linked worktrees.
    git('config', '--local', 'extensions.worktreeConfig', 'true');
    process.env.GIT_CONFIG = resolve(gitDir, 'config.worktree');
  }
  const husky = (await import('husky')).default;
  const message = husky();
  if (message) throw new Error(message);
} finally {
  if (previousConfig === undefined) delete process.env.GIT_CONFIG;
  else process.env.GIT_CONFIG = previousConfig;
}
console.log('Husky: pre-commit instalado para esta worktree.');
