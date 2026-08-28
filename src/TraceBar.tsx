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
  nodeCount: number;
  edgeCount: number;
  onDirectionChange: (direction: TraceDirection) => void;
  onExit: () => void;
}

export function TraceBar({
  rootLabel,
  direction,
  nodeCount,
  edgeCount,
  onDirectionChange,
  onExit,
}: TraceBarProps) {
  return (
    <div className="trace-bar" aria-label="Trace investigation controls">
      <div className="trace-context">
        <span className="trace-icon"><GitFork size={14} /></span>
        <span>
          Tracing <strong>{rootLabel}</strong>
          <small>{nodeCount} nodes · {edgeCount} connections</small>
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

      <button type="button" className="trace-exit" onClick={onExit}>
        <X size={13} /> Back to lens
      </button>
    </div>
  );
}
