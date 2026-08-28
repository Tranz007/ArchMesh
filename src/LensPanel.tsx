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
import type { ArchitectureLens } from './lenses';

interface LensPanelProps {
  activeLens: ArchitectureLens;
  hiddenNodes?: number;
  healthAvailable?: boolean;
  driftAvailable?: boolean;
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
    description: 'Apps, services, packages, product areas, and the external systems connecting them.',
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

export function LensPanel({
  activeLens,
  hiddenNodes = 0,
  healthAvailable = false,
  driftAvailable = false,
  onSelect,
}: LensPanelProps) {
  const availableLenses = lenses.filter((lens) => {
    if (lens.id === 'health') return healthAvailable;
    if (lens.id === 'drift') return driftAvailable;
    return true;
  });

  return (
    <div className="lens-panel">
      <div className="lens-panel-heading">
        <div className="eyebrow">Architecture lenses</div>
        <h2>How do you want to see this system?</h2>
        <p>Each lens changes what ArchMesh emphasizes without changing the underlying scan.</p>
      </div>

      <div className="lens-grid" role="list" aria-label="Architecture lenses">
        {availableLenses.map((lens) => {
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

      {(!healthAvailable || !driftAvailable) && (
        <div className="lens-capability-note" aria-label="Unavailable architecture capabilities">
          {!healthAvailable && <p><Activity size={12} /> Health appears when diagnostics or health signals are attached to the local scan.</p>}
          {!driftAvailable && <p><History size={12} /> Drift appears after a watch session has two successful scans to compare.</p>}
        </div>
      )}

      {activeLens === 'system' && hiddenNodes > 0 && (
        <p className="lens-disclosure-note">
          {hiddenNodes} lower-priority architecture nodes are hidden in this overview. Use Product Areas or Code Structure to reveal more detail.
        </p>
      )}
    </div>
  );
}
