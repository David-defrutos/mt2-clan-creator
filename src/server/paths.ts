import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
export const applicationRoot = path.resolve(sourceDir, path.basename(sourceDir) === 'server' ? '../..' : '..');
export const projectRoot = process.env.CLAN_CREATOR_HOME
  ? path.resolve(process.env.CLAN_CREATOR_HOME)
  : applicationRoot;
export const dataRoot = path.join(projectRoot, 'data');
export const configRoot = path.join(projectRoot, 'config');

export function keyForPath(root: string): string {
  return createHash('sha256').update(path.resolve(root).toLowerCase()).digest('hex').slice(0, 20);
}

export function inside(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
// 2026-11-15-0927||codex-clan-editor||clan-creator/src\server\paths.ts||Aislar también la variable de entorno del creador para no reutilizar datos del editor original
// 2026-11-21-1105||codex-clan-editor||clan-creator/src/server/paths.ts||Distinguir la raíz del programa de los datos configurables al leer la versión
