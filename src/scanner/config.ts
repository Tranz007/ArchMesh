import fs from 'node:fs/promises';
import path from 'node:path';

export interface FeatureConfig {
  id: string;
  label?: string;
  paths: string[];
}

export interface ArchMeshConfig {
  features?: FeatureConfig[];
}

export interface FeatureMatch {
  key: string;
  label?: string;
}

const CONFIG_LOCATIONS = ['archmesh.config.json', path.join('.archmesh', 'config.json')];

function validFeature(value: unknown): value is FeatureConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && candidate.id.trim().length > 0
    && (candidate.label === undefined || typeof candidate.label === 'string')
    && Array.isArray(candidate.paths)
    && candidate.paths.length > 0
    && candidate.paths.every((item) => typeof item === 'string' && item.trim().length > 0);
}

export async function loadArchMeshConfig(root: string): Promise<ArchMeshConfig> {
  for (const relative of CONFIG_LOCATIONS) {
    try {
      const raw = await fs.readFile(path.join(root, relative), 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const features = Array.isArray(parsed.features) ? parsed.features.filter(validFeature) : undefined;
      return { features };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') continue;
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in ${relative}: ${error.message}`);
      }
      throw error;
    }
  }
  return {};
}

function globToRegExp(pattern: string) {
  const normalized = pattern.replace(/\\/g, '/').replace(/^\.\//, '');
  let source = '^';

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const next = normalized[index + 1];

    if (character === '*' && next === '*') {
      const following = normalized[index + 2];
      if (following === '/') {
        source += '(?:.*/)?';
        index += 2;
      } else {
        source += '.*';
        index += 1;
      }
      continue;
    }

    if (character === '*') {
      source += '[^/]*';
      continue;
    }

    if ('\\.^$+?()[]{}|'.includes(character)) source += `\\${character}`;
    else source += character;
  }

  source += '$';
  return new RegExp(source);
}

export function configuredFeatureForPath(relativePath: string, config: ArchMeshConfig): FeatureMatch | undefined {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
  for (const feature of config.features ?? []) {
    if (feature.paths.some((pattern) => globToRegExp(pattern).test(normalized))) {
      return { key: feature.id, label: feature.label };
    }
  }
  return undefined;
}
