import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

async function run(command, args, cwd, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    let stdout = '';
    let stderr = '';
    if (capture) {
      child.stdout?.on('data', (chunk) => { stdout += String(chunk); });
      child.stderr?.on('data', (chunk) => { stderr += String(chunk); });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited ${code}${stderr ? `\n${stderr}` : ''}`));
    });
  });
}

const packageJson = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'archmesh-package-smoke-'));
let tarballPath;

try {
  const packOutput = await run('npm', ['pack', '--json'], repoRoot, true);
  const packResult = JSON.parse(packOutput);
  if (!Array.isArray(packResult) || !packResult[0]?.filename) {
    throw new Error('npm pack did not return a tarball filename.');
  }

  tarballPath = path.join(repoRoot, packResult[0].filename);
  await fs.writeFile(
    path.join(tempRoot, 'package.json'),
    JSON.stringify({ name: 'archmesh-smoke-consumer', version: '1.0.0', private: true }, null, 2),
    'utf8',
  );

  await run('npm', ['install', tarballPath, '--no-audit', '--no-fund'], tempRoot);

  const installedRoot = path.join(tempRoot, 'node_modules', ...String(packageJson.name).split('/'));
  const installedCli = path.join(installedRoot, 'dist', 'cli.js');

  const help = await run(process.execPath, [installedCli, '--help'], tempRoot, true);
  if (!String(help).includes('ArchMesh') || !String(help).includes('Usage:')) {
    throw new Error('Installed ArchMesh CLI help output is incomplete.');
  }

  const version = String(await run(process.execPath, [installedCli, '--version'], tempRoot, true)).trim();
  if (version !== packageJson.version) {
    throw new Error(`Installed ArchMesh CLI version mismatch: expected ${packageJson.version}, got ${version}.`);
  }

  console.log(`Packed install smoke test passed for ${packageJson.name}@${packageJson.version}.`);
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
  if (tarballPath) await fs.rm(tarballPath, { force: true });
}
