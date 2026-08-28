import { ArrowLeft, GitFork, Radar, Route, X } from 'lucide-react';
import type { SceneDirection } from './scenes';

interface WorkflowBarProps {
  kind: 'scene' | 'path-select' | 'path' | 'impact';
  title: string;
  detail: string;
  direction?: SceneDirection;
  depth?: number;
  pathFound?: boolean;
  onDirectionChange?: (direction: SceneDirection) => void;
  onDepthChange?: (depth: number) => void;
  onExit: () => void;
}

const icon = {
  scene: Radar,
  'path-select': Route,
  path: Route,
  impact: GitFork,
};

export function WorkflowBar({
  kind,
  title,
  detail,
  direction,
  depth,
  pathFound,
  onDirectionChange,
  onDepthChange,
  onExit,
}: WorkflowBarProps) {
  const Icon = icon[kind];

  return (
    <div className={`workflow-bar workflow-${kind}`} aria-label="Focused architecture workflow">
      <div className="workflow-context">
        <span className="workflow-icon"><Icon size={14} /></span>
        <span>
          <strong>{title}</strong>
          <small>{detail}</small>
        </span>
        {kind === 'path' && pathFound === false && <span className="workflow-status">No detected path</span>}
      </div>

      {direction && onDirectionChange && (
        <div className="workflow-direction" role="group" aria-label="Traversal direction">
          {(['inbound', 'both', 'outbound'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={direction === value ? 'active' : ''}
              aria-pressed={direction === value}
              onClick={() => onDirectionChange(value)}
            >
              {value === 'both' ? 'Both' : value === 'inbound' ? 'Inbound' : 'Outbound'}
            </button>
          ))}
        </div>
      )}

      {depth && onDepthChange && (
        <label className="workflow-depth">
          <span>Depth</span>
          <select value={depth} onChange={(event) => onDepthChange(Number(event.target.value))}>
            {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      )}

      <button type="button" className="workflow-exit" onClick={onExit}>
        {kind === 'path-select' ? <X size={13} /> : <ArrowLeft size={13} />}
        {kind === 'path-select' ? 'Cancel' : 'Back'}
      </button>
    </div>
  );
}
