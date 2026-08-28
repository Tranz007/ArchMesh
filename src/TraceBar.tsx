import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  GitFork,
  X,
} from 'lucide-react';
import type { TraceDirection } from './projections/trace';

interface TraceBarProps {
  rootLabel: string;
  direction: TraceDirection;
  depth: number;
  nodeCount: number;
  edgeCount: number;
  onDirectionChange: (direction: TraceDirection) => void;
  onDepthChange: (depth: number) => void;
  onExit: () => void;
}

export function TraceBar({
  rootLabel,
  direction,
  depth,
  nodeCount,
  edgeCount,
  onDirectionChange,
  onDepthChange,
  onExit,
}: TraceBarProps) {
  return (
    <div className="trace-bar" aria-label="Trace investigation controls">
      <div className="trace-context">
        <span className="trace-icon"><GitFork size={14} /></span>
        <span>
          Tracing <strong>{rootLabel}</strong>
          <small>{nodeCount} nodes · {edgeCount} connections · {depth} {depth === 1 ? 'hop' : 'hops'}</small>
        </span>
      </div>

      <div className="trace-direction" role="group" aria-label="Trace direction">
        <button
          type="button"
          className={direction === 'inbound' ? 'active' : ''}
          aria-pressed={direction === 'inbound'}
          onClick={() => onDirectionChange('inbound')}
          title="Show architecture that points into this node"
        >
          <ArrowLeftFromLine size={13} /> Inbound
        </button>
        <button
          type="button"
          className={direction === 'both' ? 'active' : ''}
          aria-pressed={direction === 'both'}
          onClick={() => onDirectionChange('both')}
          title="Show incoming and outgoing architecture"
        >
          <GitFork size={13} /> Both
        </button>
        <button
          type="button"
          className={direction === 'outbound' ? 'active' : ''}
          aria-pressed={direction === 'outbound'}
          onClick={() => onDirectionChange('outbound')}
          title="Show architecture this node points toward"
        >
          Outbound <ArrowRightFromLine size={13} />
        </button>
      </div>

      <label className="trace-depth">
        <span>Depth</span>
        <select value={depth} onChange={(event) => onDepthChange(Number(event.target.value))}>
          {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>

      <button type="button" className="trace-exit" onClick={onExit}>
        <X size={13} /> Back to lens
      </button>
    </div>
  );
}
