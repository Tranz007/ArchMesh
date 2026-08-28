import { Bookmark, Focus, Trash2 } from 'lucide-react';
import type { ArchitectureScene } from './scenes';

interface ScenePanelProps {
  candidates: ArchitectureScene[];
  saved: ArchitectureScene[];
  activeSceneId?: string;
  onOpen: (scene: ArchitectureScene) => void;
  onDelete: (sceneId: string) => void;
}

function SceneCard({
  scene,
  active,
  saved,
  onOpen,
  onDelete,
}: {
  scene: ArchitectureScene;
  active: boolean;
  saved: boolean;
  onOpen: (scene: ArchitectureScene) => void;
  onDelete: (sceneId: string) => void;
}) {
  return (
    <div className={`scene-card${active ? ' active' : ''}`}>
      <button type="button" className="scene-open" onClick={() => onOpen(scene)} aria-pressed={active}>
        <span className="scene-icon">{saved ? <Bookmark size={15} /> : <Focus size={15} />}</span>
        <span className="scene-copy">
          <strong>{scene.name}</strong>
          <small>{scene.seedKind} · {scene.depth} hops · {scene.direction}</small>
        </span>
      </button>
      {saved && (
        <button
          type="button"
          className="scene-delete"
          aria-label={`Delete saved view ${scene.name}`}
          title="Delete saved view"
          onClick={() => onDelete(scene.id)}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export function ScenePanel({ candidates, saved, activeSceneId, onOpen, onDelete }: ScenePanelProps) {
  return (
    <section className="scene-panel" aria-label="Focused architecture views">
      <div className="scene-panel-heading">
        <div className="eyebrow">Focus</div>
        <h2>What part do you want to understand?</h2>
        <p>Scenes isolate a bounded part of the scanned architecture without changing the underlying evidence.</p>
      </div>

      {saved.length > 0 && (
        <div className="scene-section">
          <h3><Bookmark size={13} /> Saved views <span>{saved.length}</span></h3>
          <div className="scene-list">
            {saved.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                active={activeSceneId === scene.id}
                saved
                onOpen={onOpen}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}

      <div className="scene-section">
        <h3><Focus size={13} /> Detected scenes <span>{candidates.length}</span></h3>
        <div className="scene-list">
          {candidates.length === 0 && <p className="muted">No strong scene seeds were detected in this projection.</p>}
          {candidates.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              active={activeSceneId === scene.id}
              saved={false}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
