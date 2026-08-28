import {
  Activity,
  Boxes,
  Braces,
  Database,
  GitBranch,
  History,
  Network,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { summarizeGraph } from './graph-summary';
import type { ArchitectureLens } from './lenses';
import type { ArchGraphData } from './types';

interface LensPanelProps {
  activeLens: ArchitectureLens;
  data: ArchGraphData;
  hiddenNodes?: number;
  onSelect: (lens: ArchitectureLens) => void;
}

const lenses: Array<{
  id: ArchitectureLens;
  title: string;
  description: string;
  icon: typeof Network;
}> = [
  {
    id: 'system',
    title: 'System Map',
    description: 'Major product areas and the external systems they depend on.',
    icon: Network,
  },
  {
    id: 'areas',
    title: 'Product Areas',
    description: 'Feature-level structure without low-level code or integrations.',
    icon: Boxes,
  },
  {
    id: 'topology',
    title: 'Data & Integrations',
    description: 'Collections, stores, external services, and the areas that use them.',
    icon: Database,
  },
  {
    id: 'request-flow',
    title: 'Routes & APIs',
    description: 'Request-facing routes, APIs, services, and adjacent runtime dependencies.',
    icon: Route,
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Sensitive-data flows, transport evidence, external boundaries, and unknown protections.',
    icon: ShieldCheck,
  },
  {
    id: 'changes',
    title: 'Change Impact',
    description: 'What changed directly and what sits in the structural blast radius.',
    icon: GitBranch,
  },
  {
    id: 'health',
    title: 'Health',
    description: 'Failures, warnings, impacted architecture, and their immediate context.',
    icon: Activity,
  },
  {
    id: 'drift',
    title: 'Architecture Drift',
    description: 'Structural additions, removals, and modified architecture between scans.',
    icon: History,
  },
  {
    id: 'code',
    title: 'Code Structure',
    description: 'The full scanned dependency graph when you need implementation detail.',
    icon: Braces,
  },
];

export function LensPanel({ activeLens, data, hiddenNodes = 0, onSelect }: LensPanelProps) {
  const summary = summarizeGraph(data);
  const architectureFacts = [
    summary.routes > 0 ? `${summary.routes} route${summary.routes === 1 ? '' : 's'}` : '',
    summary.apis > 0 ? `${summary.apis} ${summary.apis === 1 ? 'API' : 'APIs'}` : '',
    summary.dataStores > 0 ? `${summary.dataStores} data store${summary.dataStores === 1 ? '' : 's'}` : '',
    summary.integrations.length > 0 ? `${summary.integrations.length} integration${summary.integrations.length === 1 ? '' : 's'}` : '',
  ].filter(Boolean);

  return (
    <div className="lens-panel">
      <section className="detected-overview" aria-label="Detected codebase overview">
        <div className="eyebrow">Detected in this codebase</div>
        <strong>{summary.technologies.length > 0 ? summary.technologies.join(' + ') : 'Supported source structure'}</strong>
        {architectureFacts.length > 0 && <p>{architectureFacts.join(' · ')}</p>}
        {summary.integrations.length > 0 && (
          <small>{summary.integrations.slice(0, 4).join(', ')}{summary.integrations.length > 4 ? ` +${summary.integrations.length - 4} more` : ''}</small>
        )}
        {(summary.securityFindings > 0 || summary.sensitiveFlows > 0) && (
          <div className="detected-security">
            {summary.securityFindings > 0 && <span>{summary.securityFindings} security finding{summary.securityFindings === 1 ? '' : 's'}</span>}
            {summary.sensitiveFlows > 0 && <span>{summary.sensitiveFlows} sensitive flow{summary.sensitiveFlows === 1 ? '' : 's'}</span>}
          </div>
        )}
      </section>

      <div className="lens-panel-heading">
        <div className="eyebrow">Architecture lenses</div>
        <h2>How do you want to see this system?</h2>
        <p>Each lens changes what ArchMesh emphasizes without changing the underlying scan.</p>
      </div>

      <div className="lens-grid" role="list" aria-label="Architecture lenses">
        {lenses.map((lens) => {
          const Icon = lens.icon;
          const active = activeLens === lens.id;
          return (
            <button
              key={lens.id}
              type="button"
              role="listitem"
              className={`lens-card${active ? ' active' : ''}`}
              aria-pressed={active}
              onClick={() => onSelect(lens.id)}
            >
              <span className="lens-icon"><Icon size={17} /></span>
              <span className="lens-copy">
                <strong>{lens.title}</strong>
                <small>{lens.description}</small>
              </span>
            </button>
          );
        })}
      </div>

      {activeLens === 'system' && hiddenNodes > 0 && (
        <p className="lens-disclosure-note">
          {hiddenNodes} lower-priority architecture nodes are hidden in this overview. Use Product Areas or Code Structure to reveal more detail.
        </p>
      )}
    </div>
  );
}
