import { CircleStop, Film, Play, Trash2, Video } from 'lucide-react';
import type { JourneyStop } from './journeys';

interface JourneyPanelProps {
  stops: JourneyStop[];
  activeIndex?: number;
  playing: boolean;
  recording: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onClear: () => void;
  onRemove: (stopId: string) => void;
}

export function JourneyPanel({
  stops,
  activeIndex,
  playing,
  recording,
  onPlay,
  onStop,
  onRecord,
  onClear,
  onRemove,
}: JourneyPanelProps) {
  return (
    <section className="journey-panel" aria-label="Architecture journey">
      <div className="journey-heading">
        <div className="eyebrow">Explain</div>
        <h2><Film size={16} /> Journey</h2>
        <p>Add nodes from the inspector, then play or record the sequence as a focused architecture walkthrough.</p>
      </div>

      {stops.length === 0 ? (
        <p className="muted">No stops yet. Select a node and choose <strong>Add to journey</strong>.</p>
      ) : (
        <>
          <ol className="journey-stops">
            {stops.map((stop, index) => (
              <li key={stop.id} className={activeIndex === index ? 'active' : ''}>
                <span className="journey-index">{index + 1}</span>
                <span className="journey-copy">
                  <strong>{stop.title}</strong>
                  <small>{Math.round(stop.durationMs / 100) / 10}s</small>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${stop.title} from journey`}
                  title="Remove stop"
                  disabled={playing || recording}
                  onClick={() => onRemove(stop.id)}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ol>

          <div className="journey-actions">
            {playing || recording ? (
              <button type="button" className="primary-action" onClick={onStop}>
                <CircleStop size={14} /> Stop
              </button>
            ) : (
              <button type="button" className="primary-action" onClick={onPlay} disabled={stops.length === 0}>
                <Play size={14} /> Play
              </button>
            )}
            <button
              type="button"
              className={recording ? 'active' : ''}
              onClick={onRecord}
              disabled={stops.length === 0 || playing || recording}
              title="Record the graph viewport. MP4 is preferred when supported; otherwise ArchMesh exports WebM."
            >
              <Video size={14} /> Record
            </button>
            <button type="button" onClick={onClear} disabled={playing || recording}>
              Clear
            </button>
          </div>
        </>
      )}
    </section>
  );
}
