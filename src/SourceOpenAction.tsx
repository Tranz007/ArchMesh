import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import './source-open.css';

interface SourceOpenActionProps {
  path: string;
}

type OpenState =
  | { status: 'idle' }
  | { status: 'opening' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export function SourceOpenAction({ path }: SourceOpenActionProps) {
  const [state, setState] = useState<OpenState>({ status: 'idle' });

  const openSource = async () => {
    setState({ status: 'opening' });
    try {
      const response = await fetch('/__archmesh/open-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const body = await response.json() as { ok?: boolean; editor?: string; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || 'ArchMesh could not open this source file.');
      setState({
        status: 'success',
        message: `Opened in ${body.editor === 'code' ? 'VS Code' : body.editor === 'cursor' ? 'Cursor' : body.editor === 'zed' ? 'Zed' : 'editor'}.`,
      });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="source-open-action">
      <button
        type="button"
        onClick={() => void openSource()}
        disabled={state.status === 'opening'}
      >
        <ExternalLink size={13} />
        {state.status === 'opening' ? 'Opening…' : 'Open in editor'}
      </button>
      {state.status === 'success' && (
        <span className="source-open-message success" role="status">{state.message}</span>
      )}
      {state.status === 'error' && (
        <span className="source-open-message error" role="alert">{state.message}</span>
      )}
    </div>
  );
}
