import type { ArchGraphData } from './types.js';

const DISPLAY_NAMES: Record<string, string> = {
  'javascript-typescript': 'JavaScript / TypeScript',
  python: 'Python',
  nextjs: 'Next.js',
  fastapi: 'FastAPI',
};

function metadataList(graph: ArchGraphData, key: string) {
  const value = graph.metadata?.[key];
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function plural(count: number, singular: string, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

export interface GraphStartupSummary {
  technologies: string[];
  routes: number;
  apis: number;
  dataStores: number;
  integrations: string[];
  securityFindings: number;
  sensitiveFlows: number;
}

export function summarizeGraph(graph: ArchGraphData): GraphStartupSummary {
  const technologyIds = [
    ...metadataList(graph, 'languagePlugins'),
    ...metadataList(graph, 'frameworkAdapters'),
  ];

  const integrations = [...new Set(
    graph.nodes
      .filter((node) => node.kind === 'integration')
      .map((node) => node.label)
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));

  return {
    technologies: technologyIds.map((id) => DISPLAY_NAMES[id] ?? id),
    routes: graph.nodes.filter((node) => node.kind === 'route').length,
    apis: graph.nodes.filter((node) => node.kind === 'api').length,
    dataStores: graph.nodes.filter((node) => node.kind === 'data').length,
    integrations,
    securityFindings: graph.edges.filter((edge) => typeof edge.metadata?.securityFinding === 'string').length,
    sensitiveFlows: graph.edges.filter((edge) => edge.metadata?.securitySensitiveData === true).length,
  };
}

export function startupSummaryLines(graph: ArchGraphData) {
  const summary = summarizeGraph(graph);
  const lines: string[] = [];

  if (summary.technologies.length > 0) {
    lines.push(`Detected: ${summary.technologies.join(' + ')}`);
  }

  const architectureParts = [
    summary.routes > 0 ? plural(summary.routes, 'route') : '',
    summary.apis > 0 ? plural(summary.apis, 'API', 'APIs') : '',
    summary.dataStores > 0 ? plural(summary.dataStores, 'data store') : '',
    summary.integrations.length > 0 ? plural(summary.integrations.length, 'integration') : '',
  ].filter(Boolean);

  if (architectureParts.length > 0) {
    lines.push(`Architecture: ${architectureParts.join(' · ')}`);
  }

  if (summary.integrations.length > 0) {
    const visible = summary.integrations.slice(0, 5);
    const remainder = summary.integrations.length - visible.length;
    lines.push(`Integrations: ${visible.join(', ')}${remainder > 0 ? ` +${remainder} more` : ''}`);
  }

  if (summary.securityFindings > 0 || summary.sensitiveFlows > 0) {
    const securityParts = [
      summary.securityFindings > 0 ? plural(summary.securityFindings, 'security finding') : '',
      summary.sensitiveFlows > 0 ? plural(summary.sensitiveFlows, 'sensitive flow') : '',
    ].filter(Boolean);
    lines.push(`Security evidence: ${securityParts.join(' · ')}`);
  }

  return lines;
}
