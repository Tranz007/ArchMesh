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
  const activeScene = [...saved, ...candidates].find((scene) => scene.id === activeSceneId);

  return (
    <section className="scene-panel" aria-label="Focused architecture views">
      <div className={`scene-panel-heading${activeScene ? ' active' : ''}`}>
        <div className="eyebrow">{activeScene ? 'Focused scene' : 'Focus'}</div>
        <h2>{activeScene ? activeScene.name : 'What part do you want to understand?'}</h2>
        <p>
          {activeScene
            ? 'The graph is now limited to this architectural neighborhood. Use the focus bar above to change depth or direction, select a node to investigate it, or choose Back to return to the full graph.'
            : 'Scenes isolate a bounded part of the scanned architecture without changing the underlying evidence.'}
        </p>
        {activeScene && (
          <div className="scene-active-summary" aria-label="Active scene settings">
            <span>{activeScene.seedKind}</span>
            <span>{activeScene.depth} hops</span>
            <span>{activeScene.direction}</span>
          </div>
        )}
      </div>

      {saved.length > 0 && (
        <div className="scene-section">
          <h3><Bookmark size={13} /> {activeScene ? 'Switch saved view' : 'Saved views'} <span>{saved.length}</span></h3>
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
        <h3><Focus size={13} /> {activeScene ? 'Switch detected scene' : 'Detected scenes'} <span>{candidates.length}</span></h3>
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
