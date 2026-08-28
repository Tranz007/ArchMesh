import fs from 'node:fs/promises';
import path from 'node:path';
import type { ArchGraphData, ArchNode } from '../types.js';

// Convention-based boundaries are intentionally limited to plural container
// directories. Singular names such as `app/`, `service/`, or `project/` are
// common source-code folders (Next.js App Router is the obvious example) and
// are not evidence that each direct child is an independently meaningful
// system. Explicit workspace configuration can still establish any singular
// path as a real boundary.
const CONVENTION_ROOTS: Record<string, SystemBoundaryType> = {
  apps: 'application',
  services: 'service',
  packages: 'package',
  projects: 'application',
  libs: 'library',
  libraries: 'library',
};

export type SystemBoundaryType = 'application' | 'service' | 'package' | 'library';
export type SystemBoundarySource = 'workspace' | 'convention';

export interface SystemBoundary {
  key: string;
  root: string;
  label: string;
  type: SystemBoundaryType;
  source: SystemBoundarySource;
}

function toPosix(value: string) {
  return value.split(path.sep).join('/').replace(/^\.\//, '').replace(/\/$/, '');
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'system';
}

function titleCase(value: string) {
  return value
    .replace(/^@[^/]+\//, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function readJson(candidate: string) {
  try {
    return JSON.parse(await fs.readFile(candidate, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

async function workspacePatterns(root: string) {
  const packageJson = await readJson(path.join(root, 'package.json'));
  const workspaces = packageJson?.workspaces;
  if (Array.isArray(workspaces)) {
    return workspaces.filter((value): value is string => typeof value === 'string');
  }
  if (workspaces && typeof workspaces === 'object') {
    const packages = (workspaces as { packages?: unknown }).packages;
    if (Array.isArray(packages)) {
      return packages.filter((value): value is string => typeof value === 'string');
    }
  }
  return [];
}

function matchWorkspacePattern(relativePath: string, patternInput: string) {
  const pattern = toPosix(patternInput);
  if (!pattern || pattern === '.') return undefined;

  const pathParts = toPosix(relativePath).split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  const wildcardIndex = patternParts.findIndex((part) => part === '*' || part === '**');

  if (wildcardIndex < 0) {
    if (relativePath === pattern || relativePath.startsWith(`${pattern}/`)) return pattern;
    return undefined;
  }

  const prefix = patternParts.slice(0, wildcardIndex);
  if (pathParts.length <= wildcardIndex) return undefined;
  if (!prefix.every((part, index) => pathParts[index] === part)) return undefined;

  // A workspace is a boundary, not an arbitrary recursive glob. The first
  // concrete path segment captured by the wildcard establishes its root.
  return [...prefix, pathParts[wildcardIndex]].join('/');
}

function conventionBoundary(relativePath: string) {
  const parts = toPosix(relativePath).split('/').filter(Boolean);
  if (parts.length < 3) return undefined;
  const type = CONVENTION_ROOTS[parts[0].toLowerCase()];
  if (!type) return undefined;
  return { root: `${parts[0]}/${parts[1]}`, type };
}

function boundaryTypeFromRoot(root: string): SystemBoundaryType {
  const first = root.split('/')[0]?.toLowerCase();
  return (first && CONVENTION_ROOTS[first]) || 'package';
}

async function packageLabel(root: string, boundaryRoot: string) {
  const packageJson = await readJson(path.join(root, boundaryRoot, 'package.json'));
  if (typeof packageJson?.name === 'string' && packageJson.name.trim()) {
    return titleCase(packageJson.name.trim());
  }

  try {
    const pyproject = await fs.readFile(path.join(root, boundaryRoot, 'pyproject.toml'), 'utf8');
    const projectSection = pyproject.match(/\[project\]([\s\S]*?)(?=\n\[|$)/)?.[1];
    const name = projectSection?.match(/^\s*name\s*=\s*["']([^"']+)["']/m)?.[1];
    if (name) return titleCase(name);
  } catch {
    // A manifest is optional; path identity remains valid evidence.
  }

  return titleCase(path.posix.basename(boundaryRoot));
}

async function detectBoundaryRoots(root: string, nodes: ArchNode[]) {
  const patterns = await workspacePatterns(root);
  const roots = new Map<string, { type: SystemBoundaryType; source: SystemBoundarySource }>();

  for (const node of nodes) {
    if (!node.path) continue;
    const relativePath = toPosix(node.path);

    let workspaceRoot: string | undefined;
    for (const pattern of patterns) {
      const match = matchWorkspacePattern(relativePath, pattern);
      if (!match) continue;
      if (!workspaceRoot || match.length > workspaceRoot.length) workspaceRoot = match;
    }

    if (workspaceRoot) {
      roots.set(workspaceRoot, {
        type: boundaryTypeFromRoot(workspaceRoot),
        source: 'workspace',
      });
      continue;
    }

    const conventional = conventionBoundary(relativePath);
    if (conventional) {
      roots.set(conventional.root, {
        type: conventional.type,
        source: 'convention',
      });
    }
  }

  return roots;
}

function boundaryForPath(pathValue: string, boundaries: SystemBoundary[]) {
  const relativePath = toPosix(pathValue);
  return boundaries
    .filter((boundary) => relativePath === boundary.root || relativePath.startsWith(`${boundary.root}/`))
    .sort((left, right) => right.root.length - left.root.length)[0];
}

export async function detectSystemBoundaries(rootInput: string, graph: ArchGraphData) {
  const root = path.resolve(rootInput);
  const roots = await detectBoundaryRoots(root, graph.nodes);
  const boundaries: SystemBoundary[] = [];

  for (const [boundaryRoot, descriptor] of [...roots.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    boundaries.push({
      key: slug(boundaryRoot),
      root: boundaryRoot,
      label: await packageLabel(root, boundaryRoot),
      type: descriptor.type,
      source: descriptor.source,
    });
  }

  return boundaries;
}

export async function applySystemBoundaries(root: string, graph: ArchGraphData): Promise<ArchGraphData> {
  const boundaries = await detectSystemBoundaries(root, graph);
  if (boundaries.length === 0) return graph;

  const nodes = graph.nodes.map((node) => {
    if (!node.path) return node;
    const boundary = boundaryForPath(node.path, boundaries);
    if (!boundary) return node;

    return {
      ...node,
      metadata: {
        ...(node.metadata ?? {}),
        systemKey: boundary.key,
        systemLabel: boundary.label,
        systemRoot: boundary.root,
        systemType: boundary.type,
        systemSource: boundary.source,
      },
    };
  });

  return {
    ...graph,
    nodes,
    metadata: {
      ...(graph.metadata ?? {}),
      systemBoundaryCount: boundaries.length,
      systemBoundaries: boundaries.map((boundary) => boundary.label).join(', '),
    },
  };
}
